import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("WCAG 2 AA checks across home, draft, revision, preview and library", async ({
  page,
}) => {
  const check = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  };
  await page.goto("/");
  await check();
  await page.getByRole("button", { name: "이 글감으로 시작하기" }).click();
  await check();
  await page
    .getByLabel("처음 쓴 글", { exact: false })
    .fill("오늘을 기억한다.");
  await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
  await check();
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await check();
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await check();
  await page.getByRole("button", { name: "보관함으로", exact: true }).click();
  await check();
});
