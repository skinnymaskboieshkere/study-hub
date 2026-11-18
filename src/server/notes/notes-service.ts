import path from "node:path";
import type {
  NoteFileDto,
  NoteListItemDto,
  NoteSavedDto,
  NotesStatusDto,
  NoteTreeNodeDto,
} from "@shared/api";
import { noteName, parseNote } from "@shared/notes";
import { watch, type FSWatcher } from "chokidar";
import type { AppDatabase } from "../db/client";
import { indexedFiles, indexNote, listNotes, readFrontmatter, removeNote } from "./note-index";
import { checkName, hashText, Vault, VaultError } from "./vault";

/** A save based on an old version: the file was changed outside (Obsidian, OneDrive). */
export class NoteConflictError extends VaultError {
  readonly current: { content: string; hash: string };

  constructor(current: { content: string; hash: string }) {
    super("Заметку изменили снаружи — сначала посмотри новую версию", 409);
    this.current = current;
  }
}

/**
 * Notes on top of the vault and its index (SPEC §5, §6.5, §9.3). The files are the truth: the
 * index is synced on start by mtime and follows the watcher afterwards.
 */
export class NotesService {
  private changes = 0;
  private watcher: FSWatcher | undefined;
  private readonly db: AppDatabase;
  readonly vault: Vault | null;

  constructor(db: AppDatabase, vaultPath: string | undefined) {
    this.db = db;
    this.vault = vaultPath ? new Vault(vaultPath) : null;
  }

  /** Grows on every change of notes or folders: the client polls it to refresh. */
  get version(): number {
    return this.changes;
  }

  status(): NotesStatusDto {
    const available = Boolean(this.vault?.exists());
    return {
      configured: this.vault !== null,
      available,
      vaultName: this.vault ? path.basename(this.vault.root) : null,
      notes: available ? listNotes(this.db).length : 0,
    };
  }

  private requireVault(): Vault {
    if (!this.vault) throw new VaultError("Хранилище не подключено: укажи VAULT_PATH в .env", 503);
    if (!this.vault.exists()) throw new VaultError("Папка хранилища не найдена", 503);
    return this.vault;
  }

  /** Brings the index up to date with the files: new, changed and deleted notes. */
  async sync(): Promise<{ indexed: number; removed: number }> {
    const vault = this.requireVault();
    const files = await vault.listNotes();
    const known = indexedFiles(this.db);
    let indexed = 0;
    for (const file of files) {
      const before = known.get(file.path);
      known.delete(file.path);
      if (before && before.mtimeMs === file.mtimeMs && before.size === file.size) continue;
      const { content } = await vault.read(file.path).catch(() => ({ content: null }));
      if (content !== null && indexNote(this.db, file.path, content, file)) indexed += 1;
    }
    for (const gone of known.keys()) removeNote(this.db, gone);
    if (indexed || known.size) this.changes += 1;
    return { indexed, removed: known.size };
  }

  /** Follows edits made in Obsidian, by OneDrive or in Explorer. */
  watch() {
    const vault = this.requireVault();
    const hidden = (absolute: string) =>
      path
        .relative(vault.root, absolute)
        .split(path.sep)
        .some((part) => part.startsWith("."));
    this.watcher = watch(vault.root, {
      ignoreInitial: true,
      ignored: (absolute) => absolute !== vault.root && hidden(absolute),
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
    });
    const refresh = (absolute: string) => void this.refresh(vault.toRelative(absolute));
    this.watcher
      .on("add", refresh)
      .on("change", refresh)
      .on("unlink", (absolute) => {
        if (removeNote(this.db, vault.toRelative(absolute))) this.changes += 1;
      })
      .on("addDir", () => (this.changes += 1))
      .on("unlinkDir", () => void this.sync().then(() => (this.changes += 1)))
      .on("error", () => undefined);
  }

  async close() {
    await this.watcher?.close();
  }

  /**
   * Re-reads one note. Our own saves are already in the index with the same hash, so their
   * watcher events change nothing (SPEC §9.3).
   */
  async refresh(notePath: string) {
    if (!notePath.toLowerCase().endsWith(".md")) return;
    const vault = this.requireVault();
    try {
      const file = await vault.read(notePath);
      if (indexNote(this.db, notePath, file.content, file)) this.changes += 1;
    } catch {
      if (removeNote(this.db, notePath)) this.changes += 1;
    }
  }

  async tree(): Promise<NoteTreeNodeDto[]> {
    return this.requireVault().tree();
  }

  list(): NoteListItemDto[] {
    this.requireVault();
    return listNotes(this.db);
  }

  async read(notePath: string): Promise<NoteFileDto> {
    const vault = this.requireVault();
    const file = await vault.read(notePath);
    if (indexNote(this.db, notePath, file.content, file)) this.changes += 1;
    return {
      path: notePath,
      title: noteName(notePath),
      content: file.content,
      hash: hashText(file.content),
      mtimeMs: file.mtimeMs,
      frontmatter: readFrontmatter(parseNote(file.content).frontmatter),
    };
  }

  /** Autosave. Refuses to overwrite a version the editor has not seen. */
  async save(notePath: string, content: string, baseHash: string | null): Promise<NoteSavedDto> {
    const vault = this.requireVault();
    const current = await vault.read(notePath).catch((error: unknown) => {
      if (error instanceof VaultError && error.status === 404) return null;
      throw error;
    });
    if (current && baseHash === null) throw new VaultError("Такая заметка уже есть", 409);
    if (current && hashText(current.content) !== baseHash) {
      throw new NoteConflictError({ content: current.content, hash: hashText(current.content) });
    }
    const file = await vault.write(notePath, content);
    if (indexNote(this.db, notePath, content, file)) this.changes += 1;
    return { path: notePath, hash: hashText(content), mtimeMs: file.mtimeMs };
  }

  async create(folder: string, name = "Без названия"): Promise<NoteSavedDto> {
    const vault = this.requireVault();
    if (folder) vault.resolve(folder);
    const notePath = vault.freeNotePath(folder.replace(/\/+$/, ""), checkName(name));
    return this.save(notePath, "", null);
  }

  async createFolder(parent: string, name: string): Promise<string> {
    const created = await this.requireVault().createFolder(parent.replace(/\/+$/, ""), name);
    this.changes += 1;
    return created;
  }

  async trash(notePath: string): Promise<string> {
    const target = await this.requireVault().trash(notePath);
    removeNote(this.db, notePath);
    this.changes += 1;
    return target;
  }
}
