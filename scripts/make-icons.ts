/**
 * Renders the app icons from scripts/icons/*.svg (PWA manifest, Apple touch icon, Windows
 * shortcut). Uses the Playwright browser that the e2e tests already need: no image library.
 *
 *   npx tsx scripts/make-icons.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "icons");

const svg = (name: string) => readFileSync(path.join(ROOT, "scripts", "icons", name), "utf8");

/** A Windows .ico holding one PNG image (allowed since Windows Vista). */
function icoFromPng(png: Buffer): Buffer {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(0, 6); // width 256 is written as 0
  header.writeUInt8(0, 7); // height 256
  header.writeUInt8(0, 8); // no palette
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10); // planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // image data offset
  return Buffer.concat([header, png]);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.CI ? undefined : "chrome" });
  const page = await browser.newPage();

  async function render(source: string, size: number, transparent = true): Promise<Buffer> {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${source.replace(
        "<svg ",
        `<svg width="${size}" height="${size}" `,
      )}</body></html>`,
    );
    return page.screenshot({
      omitBackground: transparent,
      clip: { x: 0, y: 0, width: size, height: size },
    });
  }

  const icon = svg("icon.svg");
  const maskable = svg("icon-maskable.svg");
  const files: [string, Buffer][] = [
    ["icon-192.png", await render(icon, 192)],
    ["icon-512.png", await render(icon, 512)],
    ["icon-maskable-512.png", await render(maskable, 512, false)],
    ["apple-touch-icon.png", await render(maskable, 180, false)],
  ];
  for (const [name, data] of files) writeFileSync(path.join(OUT, name), data);
  writeFileSync(
    path.join(ROOT, "scripts", "windows", "study-hub.ico"),
    icoFromPng(await render(icon, 256)),
  );
  await browser.close();
  console.log(`icons: ${files.map(([name]) => name).join(", ")}, study-hub.ico`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
