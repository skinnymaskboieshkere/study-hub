import { z } from "zod";

/** Hotkeys the timecode can live on (BRIEF: Ctrl+Shift+T belongs to the browser). */
export const TIMECODE_HOTKEYS = ["alt-t", "alt-k", "ctrl-alt-t"] as const;
export type TimecodeHotkey = (typeof TIMECODE_HOTKEYS)[number];

const HOTKEY: Record<TimecodeHotkey, { label: string; code: string; ctrl: boolean }> = {
  "alt-t": { label: "Alt+T", code: "KeyT", ctrl: false },
  "alt-k": { label: "Alt+K", code: "KeyK", ctrl: false },
  "ctrl-alt-t": { label: "Ctrl+Alt+T", code: "KeyT", ctrl: true },
};

export const hotkeyLabel = (hotkey: TimecodeHotkey) => HOTKEY[hotkey].label;

/** Whether a key press is the timecode hotkey; by key position, so it works in any layout. */
export function isTimecodeHotkey(
  event: { code: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  hotkey: TimecodeHotkey,
): boolean {
  const key = HOTKEY[hotkey];
  return (
    event.code === key.code &&
    event.altKey &&
    event.ctrlKey === key.ctrl &&
    !event.metaKey &&
    !event.shiftKey
  );
}

/** App settings (SPEC §6.8). Plan budgets and study days live in the plan wizard. */
export const AppSettingsSchema = z.object({
  /** youtube-nocookie.com: privacy-enhanced embeds. */
  youtubeNoCookie: z.boolean().default(false),
  /** Russian subtitles on English videos (BRIEF). */
  captions: z.boolean().default(true),
  /** Pause the video when a timecode goes into the note. */
  pauseOnTimecode: z.boolean().default(false),
  timecodeHotkey: z.enum(TIMECODE_HOTKEYS).default("alt-t"),
  /** Vault folder chosen in the app; null → VAULT_PATH from .env. */
  vaultPath: z.string().nullable().default(null),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const SettingsPatchSchema = z
  .object({
    youtubeNoCookie: z.boolean(),
    captions: z.boolean(),
    pauseOnTimecode: z.boolean(),
    timecodeHotkey: z.enum(TIMECODE_HOTKEYS),
    vaultPath: z.string().trim().min(1).max(1000).nullable(),
  })
  .partial()
  .strict();
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;

export interface SettingsDto {
  settings: AppSettings;
  vault: {
    /** Folder in use, or null when none is set. */
    path: string | null;
    /** VAULT_PATH from .env: what "по умолчанию" means. */
    envPath: string | null;
    available: boolean;
    notes: number;
  };
  /** Where the database and the backups live. */
  dataDir: string;
  backupsDir: string;
}
