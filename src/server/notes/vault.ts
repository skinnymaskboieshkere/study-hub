import { createHash, randomUUID } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export class VaultError extends Error {
  readonly status: 400 | 404 | 409 | 503;

  constructor(message: string, status: 400 | 404 | 409 | 503 = 400) {
    super(message);
    this.status = status;
  }
}

export interface VaultFile {
  /** Path inside the vault with "/" separators: "Курсы/CS50x/Лекция 1.md". */
  path: string;
  mtimeMs: number;
  size: number;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "folder" | "note";
  children?: TreeNode[];
}

/** Characters Obsidian does not allow in names (links would break on them). */
const BAD_NAME = /[\\/:*?"<>|#^[\]]/;

export const hashText = (text: string) => createHash("sha1").update(text, "utf8").digest("hex");

const isHidden = (name: string) => name.startsWith(".");

export function checkName(name: string): string {
  const clean = name.normalize("NFC").trim();
  if (!clean || clean === "." || clean === "..") throw new VaultError("Пустое имя");
  if (BAD_NAME.test(clean))
    throw new VaultError('В имени нельзя использовать \\ / : * ? " < > | # ^ [ ]');
  if (isHidden(clean)) throw new VaultError("Имя не может начинаться с точки");
  return clean;
}

/**
 * The Obsidian vault on disk (SPEC §6.5). Every path from the outside is checked: it must stay
 * inside the vault and must not point into hidden folders like `.obsidian` or `.trash`.
 */
export class Vault {
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  exists(): boolean {
    return existsSync(this.root) && statSync(this.root).isDirectory();
  }

  /** Absolute path for a vault path; throws on anything that leaves the vault. */
  resolve(relative: string): string {
    const clean = relative.replace(/\\/g, "/").replace(/^\/+/, "");
    if (
      !clean ||
      clean.split("/").some((part) => part === ".." || part === "." || isHidden(part))
    ) {
      throw new VaultError("Недопустимый путь");
    }
    const absolute = path.resolve(this.root, clean);
    const inside = path.relative(this.root, absolute);
    if (!inside || inside.startsWith("..") || path.isAbsolute(inside)) {
      throw new VaultError("Путь выходит за пределы хранилища");
    }
    return absolute;
  }

  notePath(relative: string): string {
    if (!/\.md$/i.test(relative)) throw new VaultError("Заметка должна быть файлом .md");
    return this.resolve(relative);
  }

  toRelative(absolute: string): string {
    return path.relative(this.root, absolute).split(path.sep).join("/").normalize("NFC");
  }

  /** All notes with their times, hidden folders skipped. */
  async listNotes(): Promise<VaultFile[]> {
    const files: VaultFile[] = [];
    const walk = async (folder: string) => {
      const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (isHidden(entry.name)) continue;
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) await walk(full);
        else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          const info = await stat(full).catch(() => undefined);
          if (info)
            files.push({ path: this.toRelative(full), mtimeMs: info.mtimeMs, size: info.size });
        }
      }
    };
    await walk(this.root);
    return files;
  }

  /** Folders and notes for the file tree: folders first, then names in Russian order. */
  async tree(): Promise<TreeNode[]> {
    const build = async (folder: string): Promise<TreeNode[]> => {
      const entries = await readdir(folder, { withFileTypes: true }).catch(() => []);
      const nodes: TreeNode[] = [];
      for (const entry of entries) {
        if (isHidden(entry.name)) continue;
        const full = path.join(folder, entry.name);
        if (entry.isDirectory()) {
          nodes.push({
            name: entry.name.normalize("NFC"),
            path: this.toRelative(full),
            type: "folder",
            children: await build(full),
          });
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          nodes.push({
            name: entry.name.replace(/\.md$/i, "").normalize("NFC"),
            path: this.toRelative(full),
            type: "note",
          });
        }
      }
      return nodes.sort(
        (a, b) =>
          (a.type === b.type ? 0 : a.type === "folder" ? -1 : 1) ||
          a.name.localeCompare(b.name, "ru", { numeric: true }),
      );
    };
    return build(this.root);
  }

  async read(relative: string): Promise<{ content: string; mtimeMs: number; size: number }> {
    const file = this.notePath(relative);
    try {
      const [content, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
      return { content, mtimeMs: info.mtimeMs, size: info.size };
    } catch {
      throw new VaultError("Заметка не найдена", 404);
    }
  }

  /**
   * Writes through a temporary file and a rename, so Obsidian or OneDrive never see half a
   * note. OneDrive may hold the file for a moment: then it retries, then writes in place.
   */
  async write(relative: string, content: string): Promise<{ mtimeMs: number; size: number }> {
    const file = this.notePath(relative);
    await mkdir(path.dirname(file), { recursive: true });
    const temp = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
    await writeFile(temp, content, "utf8");
    let moved = false;
    for (let attempt = 0; attempt < 5 && !moved; attempt += 1) {
      try {
        await rename(temp, file);
        moved = true;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
      }
    }
    if (!moved) {
      await rm(temp, { force: true });
      await writeFile(file, content, "utf8");
    }
    const info = await stat(file);
    return { mtimeMs: info.mtimeMs, size: info.size };
  }

  /** A free name in the folder: "Без названия.md", "Без названия 1.md", … */
  freeNotePath(folder: string, name: string): string {
    const base = folder ? `${folder}/` : "";
    for (let index = 0; ; index += 1) {
      const candidate = `${base}${index === 0 ? name : `${name} ${index}`}.md`;
      if (!existsSync(this.resolve(candidate))) return candidate;
    }
  }

  async createFolder(parent: string, name: string): Promise<string> {
    const relative = parent ? `${parent}/${checkName(name)}` : checkName(name);
    const absolute = this.resolve(relative);
    if (existsSync(absolute)) throw new VaultError("Такая папка уже есть", 409);
    await mkdir(absolute, { recursive: true });
    return this.toRelative(absolute);
  }

  /** Moves a note to `.trash/` like Obsidian does, so it can be brought back by hand. */
  async trash(relative: string): Promise<string> {
    const file = this.notePath(relative);
    if (!existsSync(file)) throw new VaultError("Заметка не найдена", 404);
    const trash = path.join(this.root, ".trash");
    await mkdir(trash, { recursive: true });
    const name = path.basename(file, ".md");
    let target = path.join(trash, `${name}.md`);
    for (let index = 1; existsSync(target); index += 1) {
      target = path.join(trash, `${name} ${index}.md`);
    }
    await rename(file, target);
    return this.toRelative(target);
  }
}
