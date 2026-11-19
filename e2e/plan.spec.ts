import { expect, test } from "@playwright/test";

/** Plan end to end (SPEC §6.4): the wizard builds a plan and "Сегодня" shows today's parts. */
test("the plan wizard fills today's plan", async ({ page }) => {
  await page.goto("/plan");
  await expect(page.getByRole("heading", { level: 1, name: "План обучения" })).toBeVisible();

  // Every weekday on: the test passes on any day of the week.
  for (const day of ["Сб", "Вс"]) {
    const toggle = page.getByRole("button", { name: day, exact: true });
    if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click();
  }
  await page.getByRole("button", { name: "Составить план" }).click();

  await expect(page).toHaveURL(/\/$/);
  const plan = page.locator("section", {
    has: page.getByRole("heading", { name: "План на сегодня" }),
  });
  await expect(plan).toBeVisible();
  await expect(plan.locator('a[href^="/watch/"]').first()).toBeVisible();
  await expect(plan).toContainText(/Сделано 0 мин из/);
});
