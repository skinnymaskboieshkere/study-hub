import { expect, test } from "@playwright/test";

/** PWA (SPEC §3, stage 7c): installable, and a clear page when the server is not running. */

test("the manifest and its icons are served", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const manifest = (await (await request.get("/manifest.webmanifest")).json()) as {
    name: string;
    display: string;
    start_url: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };
  expect(manifest).toMatchObject({ name: "Study Hub", display: "standalone", start_url: "/" });
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(["192x192", "512x512", "512x512"]);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});

test("without the server the app shows how to start it", async ({ page, context }) => {
  await page.goto("/");
  // Strings: the e2e tsconfig has no DOM types.
  await page.evaluate("navigator.serviceWorker.ready.then(() => true)");
  await page.reload();
  await expect.poll(() => page.evaluate("Boolean(navigator.serviceWorker.controller)")).toBe(true);

  await context.setOffline(true);
  await page.goto("/notes");
  await expect(page.getByRole("heading", { level: 1, name: "Study Hub не запущен" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Проверить сейчас" })).toBeVisible();
  await context.setOffline(false);
});
