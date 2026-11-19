import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { sql } from "drizzle-orm";
import yauzl from "yauzl";
import yazl from "yazl";
import { openDatabase, type AppDatabase } from "../db/client";

export interface BackupDto {
  name: string;
  size: number;
  createdAt: string;
}

export class BackupError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const NAME = /^study-hub-\d{4}-\d{2}-\d{2}-\d{6}\.zip$/;
const DB_ENTRY = "study.db";
const VAULT_DIR = "vault/";

const pad = (n: number) => String(n).padStart(2, "0");

/** "study-hub-2026-11-19-143005.zip": sorts by time, readable in Explorer. */
export function backupName(now = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `study-hub-${date}-${time}.zip`;
}

/** A consistent copy of the live database, safe while the server keeps writing. */
function snapshotDatabase(db: AppDatabase, file: string) {
  db.run(sql.raw(`VACUUM INTO '${file.replaceAll("'", "''")}'`));
}

/** Every file of the vault, hidden folders (.obsidian, .trash) included. */
async function vaultFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)));
}

/**
 * "Сделать бэкап" (SPEC §6.8): a zip with the database and the whole vault in the backups
 * folder. Written under a temporary name first, so a half-written zip never looks finished.
 */
export async function createBackup(options: {
  db: AppDatabase;
  backupsDir: string;
  vaultRoot: string | null;
  now?: Date;
}): Promise<BackupDto & { files: number }> {
  await mkdir(options.backupsDir, { recursive: true });
  // Two backups in one second (a restore right after "Сделать бэкап"): the next free second.
  const start = (options.now ?? new Date()).getTime();
  let name = backupName(new Date(start));
  for (let step = 1; existsSync(path.join(options.backupsDir, name)); step++) {
    name = backupName(new Date(start + step * 1000));
  }
  const target = path.join(options.backupsDir, name);
  const partial = `${target}.part`;
  const snapshot = path.join(options.backupsDir, `${name}.db`);

  try {
    snapshotDatabase(options.db, snapshot);
    const zip = new yazl.ZipFile();
    zip.addFile(snapshot, DB_ENTRY);
    let files = 0;
    if (options.vaultRoot && existsSync(options.vaultRoot)) {
      for (const file of await vaultFiles(options.vaultRoot)) {
        // Cloud-only OneDrive files are downloaded here, as the user agreed (stage 7a).
        zip.addFile(path.join(options.vaultRoot, file), VAULT_DIR + file.split(path.sep).join("/"));
        files += 1;
      }
    }
    zip.addBuffer(
      Buffer.from(
        JSON.stringify(
          { app: "study-hub", createdAt: new Date().toISOString(), vaultFiles: files },
          null,
          2,
        ),
      ),
      "manifest.json",
    );
    zip.end();
    await pipeline(zip.outputStream, createWriteStream(partial));
    await rename(partial, target);
    const info = await stat(target);
    return { name, size: info.size, createdAt: info.mtime.toISOString(), files };
  } finally {
    await rm(snapshot, { force: true });
    await rm(partial, { force: true });
  }
}

export async function listBackups(backupsDir: string): Promise<BackupDto[]> {
  if (!existsSync(backupsDir)) return [];
  const names = (await readdir(backupsDir)).filter((name) => NAME.test(name));
  const backups = await Promise.all(
    names.map(async (name) => {
      const info = await stat(path.join(backupsDir, name));
      return { name, size: info.size, createdAt: info.mtime.toISOString() };
    }),
  );
  return backups.sort((a, b) => b.name.localeCompare(a.name));
}

/** The entries of a zip one by one (yauzl reads lazily, so big backups stay out of memory). */
function nextEntry(zip: yauzl.ZipFile): Promise<yauzl.Entry | null> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      zip.off("entry", onEntry).off("end", onEnd).off("error", onError);
    };
    const onEntry = (entry: yauzl.Entry) => (cleanup(), resolve(entry));
    const onEnd = () => (cleanup(), resolve(null));
    const onError = (error: Error) => (cleanup(), reject(error));
    zip.on("entry", onEntry).on("end", onEnd).on("error", onError);
    zip.readEntry();
  });
}

/** Unpacks a backup into an empty folder; entries can never leave it. */
async function extract(zipFile: string, folder: string): Promise<void> {
  const zip = await yauzl.openPromise(zipFile, { lazyEntries: true });
  const root = path.resolve(folder);
  try {
    for (let entry = await nextEntry(zip); entry; entry = await nextEntry(zip)) {
      if (entry.fileName.endsWith("/")) continue;
      const target = path.resolve(root, entry.fileName);
      if (!target.startsWith(root + path.sep))
        throw new BackupError("В бэкапе подозрительный путь — восстановление отменено");
      await mkdir(path.dirname(target), { recursive: true });
      await pipeline(await zip.openReadStreamPromise(entry), createWriteStream(target));
    }
  } finally {
    zip.close();
  }
}

/** Tables copied back on restore. The notes index is rebuilt from the vault instead. */
function restorableTables(db: AppDatabase): string[] {
  return db
    .all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'
          AND name NOT LIKE 'notes_fts%' AND name NOT IN ('notes', 'note_links', 'note_tags')`,
    )
    .map((row) => row.name);
}

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

/**
 * Puts the data of a backed-up database into the live one, in one transaction. The copy is
 * migrated first, so a backup from an older version fits the current tables.
 */
export function restoreDatabase(db: AppDatabase, file: string, migrationsDir: string) {
  openDatabase({ file, migrationsDir }).close();
  db.run(sql`ATTACH DATABASE ${file} AS restored`);
  db.run(sql`PRAGMA foreign_keys = OFF`);
  try {
    db.transaction((tx) => {
      for (const table of restorableTables(db)) {
        const columns = tx
          .all<{ name: string }>(sql.raw(`PRAGMA main.table_info(${quote(table)})`))
          .map((column) => quote(column.name))
          .join(", ");
        tx.run(sql.raw(`DELETE FROM main.${quote(table)}`));
        tx.run(
          sql.raw(
            `INSERT INTO main.${quote(table)} (${columns}) SELECT ${columns} FROM restored.${quote(table)}`,
          ),
        );
      }
    });
  } finally {
    db.run(sql`PRAGMA foreign_keys = ON`);
    db.run(sql`DETACH DATABASE restored`);
  }
}

/**
 * Restore (SPEC §6.8, ASSESSMENT): first a backup of the current state, then the backup is
 * unpacked into its own folder and the database is copied back. The vault is never written:
 * its files stay in the unpacked folder for the user to take what they need.
 */
export async function restoreBackup(options: {
  db: AppDatabase;
  backupsDir: string;
  vaultRoot: string | null;
  migrationsDir: string;
  name: string;
  now?: Date;
}): Promise<{ safetyBackup: string; folder: string; vaultFolder: string | null }> {
  if (!NAME.test(options.name)) throw new BackupError("Такого бэкапа нет", 404);
  const zipFile = path.join(options.backupsDir, options.name);
  if (!existsSync(zipFile)) throw new BackupError("Такого бэкапа нет", 404);

  const safety = await createBackup({
    db: options.db,
    backupsDir: options.backupsDir,
    vaultRoot: options.vaultRoot,
    now: options.now,
  });
  const folder = path.join(options.backupsDir, `restored-${options.name.replace(/\.zip$/, "")}`);
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
  await extract(zipFile, folder);

  const dbFile = path.join(folder, DB_ENTRY);
  if (!existsSync(dbFile)) throw new BackupError("В бэкапе нет базы данных");
  restoreDatabase(options.db, dbFile, options.migrationsDir);
  await rm(dbFile, { force: true });
  await rm(`${dbFile}-wal`, { force: true });
  await rm(`${dbFile}-shm`, { force: true });

  const vaultFolder = path.join(folder, "vault");
  return {
    safetyBackup: safety.name,
    folder,
    vaultFolder: existsSync(vaultFolder) ? vaultFolder : null,
  };
}
