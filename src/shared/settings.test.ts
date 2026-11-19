import { describe, expect, it } from "vitest";
import { AppSettingsSchema, isTimecodeHotkey, SettingsPatchSchema } from "./settings";

const press = (code: string, mods: { alt?: boolean; ctrl?: boolean; shift?: boolean } = {}) => ({
  code,
  altKey: mods.alt ?? false,
  ctrlKey: mods.ctrl ?? false,
  metaKey: false,
  shiftKey: mods.shift ?? false,
});

describe("isTimecodeHotkey", () => {
  it("matches by key position, so the Russian layout works too", () => {
    expect(isTimecodeHotkey(press("KeyT", { alt: true }), "alt-t")).toBe(true);
    expect(isTimecodeHotkey(press("KeyK", { alt: true }), "alt-k")).toBe(true);
    expect(isTimecodeHotkey(press("KeyT", { alt: true, ctrl: true }), "ctrl-alt-t")).toBe(true);
  });

  it("does not fire for other modifiers", () => {
    expect(isTimecodeHotkey(press("KeyT", { alt: true, ctrl: true }), "alt-t")).toBe(false);
    expect(isTimecodeHotkey(press("KeyT", { alt: true, shift: true }), "alt-t")).toBe(false);
    expect(isTimecodeHotkey(press("KeyT"), "alt-t")).toBe(false);
    expect(isTimecodeHotkey(press("KeyT", { alt: true }), "alt-k")).toBe(false);
  });
});

describe("settings schemas", () => {
  it("fills defaults and refuses unknown keys in a change", () => {
    expect(AppSettingsSchema.parse({})).toEqual({
      youtubeNoCookie: false,
      captions: true,
      pauseOnTimecode: false,
      timecodeHotkey: "alt-t",
      vaultPath: null,
    });
    expect(SettingsPatchSchema.safeParse({ captions: false }).success).toBe(true);
    expect(SettingsPatchSchema.safeParse({ theme: "light" }).success).toBe(false);
    expect(SettingsPatchSchema.safeParse({ timecodeHotkey: "ctrl-shift-t" }).success).toBe(false);
  });
});
