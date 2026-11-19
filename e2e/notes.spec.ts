import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * Notes end to end (SPEC §6.5 acceptance): link through autocompletion → backlink → rename
 * rewrites links → both notes on the graph → the formula is drawn. Tests share one vault and
 * run in order.
 */

const notesUrl = (path: string) => `/notes?path=${encodeURIComponent(path)}`;

async function fileText(request: APIRequestContext, path: string): Promise<string> {
  const response = await request.get(`/api/notes/file?path=${encodeURIComponent(path)}`);
  return response.ok() ? ((await response.json()) as { content: string }).content : "";
}

test("link, backlink, rename, graph and formula", async ({ page, request }) => {
  // 1. A link through autocompletion.
  await page.goto(notesUrl("Матанализ/Пределы.md"));
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("См. [[Произв");
  await expect(page.locator(".cm-tooltip-autocomplete")).toContainText("Производная");
  // CodeMirror ignores Enter for ~75 ms after the list opens (against accidental picks);
  // a person is never that fast, the test waits like one.
  await page.waitForTimeout(250);
  await page.keyboard.press("Enter");
  await expect
    .poll(() => fileText(request, "Матанализ/Пределы.md"))
    .toContain("См. [[Производная]]");

  // 2. The backlink appears.
  await page.goto(notesUrl("Матанализ/Производная.md"));
  const panel = page.getByRole("complementary", { name: "Связи заметки" });
  await expect(panel).toContainText("Пределы");

  // 3. Renaming rewrites the link.
  await page.getByRole("button", { name: "Переименовать или перенести" }).click();
  await page.getByLabel("Название").fill("Производная функции");
  await page.getByRole("button", { name: "Переименовать", exact: true }).click();
  await expect(page.getByText("Готово. Обновлено 1 ссылка в 1 заметке")).toBeVisible();
  await expect.poll(() => decodeURIComponent(page.url())).toMatch(/Производная[+ ]функции\.md$/);
  expect(await fileText(request, "Матанализ/Пределы.md")).toContain("См. [[Производная функции]]");

  // 4. Both notes are on the graph, linked.
  const graph = (await (await request.get("/api/notes/graph")).json()) as {
    links: { source: string; target: string }[];
  };
  expect(graph.links).toContainEqual({
    source: "Матанализ/Пределы.md",
    target: "Матанализ/Производная функции.md",
  });
  await page.goto("/notes/graph");
  await expect(page.getByText("3 заметки · 1 связь")).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();

  // 5. The formula is drawn by KaTeX.
  await page.goto(notesUrl("Матанализ/Производная функции.md"));
  await page.getByRole("radio", { name: "Просмотр" }).click();
  await expect(page.locator(".katex-display")).toBeVisible();
});

test("embeds another note and its section", async ({ page, request }) => {
  const note = (await (
    await request.get(`/api/notes/file?path=${encodeURIComponent("Входящие.md")}`)
  ).json()) as { hash: string; content: string };
  await request.put("/api/notes/file", {
    data: { path: "Входящие.md", content: `${note.content}\n![[Пределы]]\n`, baseHash: note.hash },
  });
  await page.goto(notesUrl("Входящие.md"));
  await page.getByRole("radio", { name: "Просмотр" }).click();
  const embed = page.locator(".md-embed");
  await expect(embed).toContainText("Нужны для производной");
});

test("quick switcher and command palette", async ({ page }) => {
  await page.goto("/notes");
  await expect(page.getByText("Выбери заметку слева или создай новую")).toBeVisible();
  await page.keyboard.press("Control+O");
  await page.keyboard.type("пред");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Пределы" })).toBeVisible();

  await page.keyboard.press("Control+P");
  await expect(page.getByRole("combobox", { name: "Палитра команд" })).toBeVisible();
  await page.keyboard.type("граф");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/notes\/graph$/);
});

test("delete to the trash and bring the note back", async ({ page }) => {
  await page.goto(notesUrl("Входящие.md"));
  await page.getByRole("button", { name: "Удалить в корзину хранилища" }).click();
  await page.getByRole("button", { name: "Удалить", exact: true }).click();
  await expect(page.getByText("Заметка перемещена в .trash хранилища")).toBeVisible();

  await page.getByRole("button", { name: "Корзина хранилища" }).click();
  const trash = page.getByRole("dialog");
  await expect(trash).toContainText("Входящие");
  await trash.getByRole("button", { name: "Вернуть" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Входящие" })).toBeVisible();
});
