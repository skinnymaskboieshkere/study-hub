import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import type { CourseDetailDto, RoadmapDto } from "../src/shared/api";

/** Marks whole lectures of a course watched, in order, until `share` of its length is covered. */
async function watch(request: APIRequestContext, slug: string, share: number) {
  const course = (await (await request.get(`/api/courses/${slug}`)).json()) as CourseDetailDto;
  const lessons = course.units.flatMap((unit) => unit.lessons).filter((l) => l.kind !== "short");
  const total = lessons.reduce((sum, lesson) => sum + lesson.durationSec, 0);
  let covered = 0;
  for (const lesson of lessons) {
    if (covered >= share * total) break;
    await request.post(`/api/progress/${lesson.youtubeId}/complete`, { data: { completed: true } });
    covered += lesson.durationSec;
  }
}

const hoursLeft = async (request: APIRequestContext) =>
  ((await (await request.get("/api/roadmap")).json()) as RoadmapDto).hoursLeft;

/** The EECS 498 card in the list view. */
const eecs498 = (page: Page) =>
  page.getByRole("listitem").filter({ has: page.getByRole("link", { name: /^EECS 498-007/ }) });

/** SPEC §6.3 acceptance: 60% of 18.06 opens EECS 498, and the hours to CV go down. */
test("passing 60% of 18.06 opens EECS 498 on the roadmap", async ({ page, request }) => {
  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { level: 1, name: "Траектории" })).toBeVisible();
  await expect(page.getByTestId("rf__node-goal")).toContainText("Computer Vision");
  await expect(page.locator(".react-flow__edge").first()).toBeAttached();

  // Everything else EECS 498 needs is already done; only linear algebra is missing.
  await watch(request, "cs50p", 0.8);
  await watch(request, "mit-18-01", 0.8);
  await watch(request, "mit-18-06", 0.4);
  const before = await hoursLeft(request);

  await page.reload();
  await page.getByRole("radio", { name: "Списком" }).click();
  await expect(eecs498(page)).toContainText("Лучше подождать");
  await eecs498(page)
    .getByRole("link", { name: /^EECS 498-007/ })
    .hover();
  await expect(page.getByRole("tooltip")).toContainText(
    /Рекомендуется сначала пройти 18\.06 — сейчас 4\d% из 60%/,
  );

  await watch(request, "mit-18-06", 0.6);
  await page.reload();
  await page.getByRole("radio", { name: "Списком" }).click();
  await expect(eecs498(page)).toContainText("Можно начинать");
  expect(await hoursLeft(request)).toBeLessThan(before);
});

test("a roadmap course goes to the plan wizard already ticked", async ({ page }) => {
  await page.goto("/roadmap");
  await page.getByRole("radio", { name: "Списком" }).click();
  await page.getByRole("link", { name: "Добавить CS106B в план" }).click();
  await expect(page).toHaveURL(/\/plan\?add=stanford-cs106b$/);
  await expect(page.getByRole("status")).toContainText("Курс «CS106B» отмечен");
});
