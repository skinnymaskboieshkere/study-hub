import { expect, test } from "@playwright/test";

/** Statistics, settings and backups (SPEC §6.7, §6.8). */

test("statistics show the week and switch to the month", async ({ page }) => {
  await page.goto("/stats");
  await expect(page.getByRole("heading", { level: 1, name: "Статистика" })).toBeVisible();
  await expect(page.getByText("Время учёбы")).toBeVisible();
  await expect(page.getByRole("heading", { name: "По дням" })).toBeVisible();
  await page.getByRole("radio", { name: "Месяц" }).click();
  await expect(page).toHaveURL(/period=month/);
  await expect(page.getByText("за месяц")).toBeVisible();
});

test("the timecode hotkey setting is kept", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Alt+K" }).click();
  await expect(page.getByText("Сохранено")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Alt+K" })).toHaveAttribute("aria-checked", "true");
  // Back to the default for the other tests.
  await page.getByRole("radio", { name: "Alt+T", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Alt+T", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});

test("a backup is made and restored without touching the vault", async ({ page }) => {
  await page.goto("/settings#backups");
  await page.getByRole("button", { name: "Сделать бэкап" }).click();
  await expect(page.getByText(/Бэкап готов: база и \d+ файл/)).toBeVisible();
  const list = page.getByRole("list", { name: "Бэкапы" });
  await expect(list.getByRole("listitem")).toHaveCount(1);

  await list.getByRole("button", { name: "Восстановить" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Заметки не перезаписываются");
  await dialog.getByRole("button", { name: "Восстановить" }).click();

  const status = page.getByRole("status").filter({ hasText: "восстановлены" });
  await expect(status).toContainText("Заметки из бэкапа распакованы сюда");
  // The state before the restore was saved first: now there are two backups.
  await expect(list.getByRole("listitem")).toHaveCount(2);
});
