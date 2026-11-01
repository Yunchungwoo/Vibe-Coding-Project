import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const key = "firstline.studio.v1";
const saved = async (page: Page) =>
  expect(page.getByRole("status").filter({ hasText: "저장됨" })).toBeVisible();
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
async function document(page: Page) {
  await page.goto("/#studio");
  await page
    .getByRole("button", { name: "첫 문서 만들기", exact: true })
    .click();
  await page.getByLabel("문서 제목", { exact: true }).fill("창가의 기록");
  await page
    .getByRole("textbox", { name: "문서 본문" })
    .fill("창가에 앉아 오늘을 떠올렸다.");
}
test("requested home edits and shared header removals", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "이야기의 첫 시작은 한 줄에서.",
  );
  await expect(page.locator(".daily-content > p")).toHaveText(
    "오늘의 첫 문장을 함께 기록해봐요.",
  );
  await expect(
    page.locator(
      ".small-flower, .daily-top, .daily-art, .journey, .note-drawing",
    ),
  ).toHaveCount(0);
  for (const route of ["home", "prompts", "library", "practice", "studio"]) {
    await page.goto(`/#${route}`);
    await expect(page.locator(".topbar-right svg")).toHaveCount(0);
    await expect(
      page.getByText("나의 작은 작업실", { exact: false }),
    ).toHaveCount(0);
    await expect(
      page.getByText(
        /A LITTLE SPACE FOR YOUR WORDS|FIND YOUR FIRST LINE|YOUR WORDS, COLLECTED/,
      ),
    ).toHaveCount(0);
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      info.project.name === "mobile" ? 360 : 1280,
    );
  }
});
test("random word practice retains input, reloads and archives only once", async ({
  page,
}) => {
  await page.goto("/#practice");
  await page.getByRole("button", { name: "문장 보관하기" }).click();
  await expect(page.getByRole("alert")).toContainText("한 문장");
  const word = await page.locator(".word-card h2").textContent();
  await page
    .getByLabel("나의 연습 문장")
    .fill("한 단어가 이야기가 되었다.\n다음 문장.");
  await page.getByRole("button", { name: "다른 단어", exact: true }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.locator(".word-card h2")).toHaveText(word!);
  await page.getByRole("button", { name: "다른 단어", exact: true }).click();
  await page.getByRole("button", { name: "문장 유지하고 단어 바꾸기" }).click();
  await expect(page.locator(".word-card h2")).not.toHaveText(word!);
  const newWord = await page.locator(".word-card h2").textContent();
  await saved(page);
  await page.reload();
  await expect(page.locator(".word-card h2")).toHaveText(newWord!);
  await expect(page.getByLabel("나의 연습 문장")).toHaveValue(
    "한 단어가 이야기가 되었다.\n다음 문장.",
  );
  await page.getByRole("button", { name: "문장 보관하기" }).dblclick();
  await expect(page).toHaveURL(/#entry\//);
  await expect(page.locator(".archived-writing")).toContainText(
    "한 단어가 이야기가 되었다.",
  );
  expect((await stored(page)).entries).toHaveLength(1);
  expect((await stored(page)).practice).toBeNull();
  await page.goto("/#library");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await expect(page.locator(".entry-card")).toContainText(newWord!);
});
test("practice archive failure retains text and retry saves", async ({
  page,
}) => {
  await page.goto("/#practice");
  await page.getByLabel("나의 연습 문장").fill("잃어버리지 않을 문장.");
  await saved(page);
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "문장 보관하기" }).click();
  await expect(page.getByLabel("나의 연습 문장")).toHaveValue(
    "잃어버리지 않을 문장.",
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "보관하지 못했어요" }),
  ).toBeVisible();
  expect((await stored(page)).entries).toHaveLength(0);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "문장 보관하기" }).click();
  await expect(page).toHaveURL(/#entry\//);
});
test("manuscript supports formatting, undo, reload and archiving", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await document(page);
  const editor = page.getByRole("textbox", { name: "문서 본문" });
  await editor.press("Control+a");
  await page.getByRole("button", { name: "굵게", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText(
    "창가에 앉아 오늘을 떠올렸다.",
  );
  await page.getByRole("button", { name: "실행 취소", exact: true }).click();
  await expect(editor.locator("strong")).toHaveCount(0);
  await page.getByRole("button", { name: "다시 실행", exact: true }).click();
  await expect(editor.locator("strong")).toHaveCount(1);
  await page.getByRole("button", { name: "가운데 정렬", exact: true }).click();
  await page.getByLabel("문서 글꼴").selectOption("serif");
  await page.getByLabel("문서 글자 크기").selectOption("20");
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "창가의 기록",
  );
  await expect(editor.locator("strong")).toHaveText(
    "창가에 앉아 오늘을 떠올렸다.",
  );
  await expect(editor.locator("p").first()).toHaveCSS("text-align", "center");
  await expect(page.getByLabel("문서 글꼴")).toHaveValue("serif");
  await expect(page.getByLabel("문서 글자 크기")).toHaveValue("20");
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.name === "mobile" ? 360 : 1280,
  );
  await page.screenshot({
    path: `test-results/studio-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await page.getByRole("button", { name: "계속 쓰기" }).click();
  await expect(editor).toContainText("창가에 앉아");
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await page.getByRole("button", { name: "글 보관하기", exact: true }).click();
  await expect(page).toHaveURL(/#entry\//);
  await expect(page.locator(".archived-writing")).toContainText(
    "창가에 앉아 오늘을 떠올렸다.",
  );
  expect((await stored(page)).documents).toHaveLength(0);
  expect((await stored(page)).entries).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "창가의 기록",
  );
  expect(errors).toEqual([]);
});
test("document switching, search and delete preserve the other draft", async ({
  page,
}, info) => {
  await document(page);
  const firstUrl = page.url();
  const openList = async () => {
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "문서 목록 열기" }).click();
  };
  await openList();
  await page.getByRole("button", { name: "새 문서", exact: true }).click();
  await page.getByLabel("문서 제목", { exact: true }).fill("두 번째 기록");
  await page
    .getByRole("textbox", { name: "문서 본문" })
    .fill("두 번째 문서의 문장.");
  await openList();
  await page.getByLabel("문서 검색").fill("창가");
  await expect(
    page.getByRole("navigation", { name: "문서 목록" }).getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "창가의 기록", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toContainText(
    "창가에 앉아",
  );
  await expect(page).toHaveURL(firstUrl);
  await page.getByRole("button", { name: "현재 문서 삭제" }).click();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "창가의 기록",
  );
  await page.getByRole("button", { name: "현재 문서 삭제" }).click();
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "두 번째 기록",
  );
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toContainText(
    "두 번째 문서의 문장.",
  );
});
test("failed document archive and corrupt studio data never discard input", async ({
  page,
}) => {
  await document(page);
  await saved(page);
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await page.getByRole("button", { name: "글 보관하기", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "보관하지 못했어요",
  );
  expect((await stored(page)).documents).toHaveLength(1);
  expect((await stored(page)).entries).toHaveLength(0);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "글 보관하기", exact: true }).click();
  await expect(page).toHaveURL(/#entry\//);
  await page.evaluate((k) => localStorage.setItem(k, "{broken"), key);
  await page.goto("/#studio");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "기존 데이터는 그대로 보존",
  );
  await page
    .getByRole("button", { name: "첫 문서 만들기", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "문서 본문" })
    .fill("복사할 수 있도록 유지한다.");
  await expect(
    page.getByRole("status").filter({ hasText: "저장 실패" }),
  ).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(
    "{broken",
  );
});
test("new pages are accessible and the library includes legacy and practice entries", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "이 글감으로 시작하기" }).click();
  await page
    .getByLabel("처음 쓴 글", { exact: false })
    .fill("기존 방식으로 쓴 글.");
  await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  const oldRaw = await page.evaluate(() =>
    localStorage.getItem("firstline.notebook.v1"),
  );
  await page.goto("/#practice");
  await page.getByLabel("나의 연습 문장").fill("새로운 방식으로 쓴 문장.");
  const check = async () =>
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await check();
  await page.getByRole("button", { name: "문장 보관하기" }).click();
  await page.goto("/#library");
  await expect(page.locator(".entry-card")).toHaveCount(2);
  await page.getByLabel("보관한 글 검색").fill("새로운 방식");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  expect(
    await page.evaluate(() => localStorage.getItem("firstline.notebook.v1")),
  ).toBe(oldRaw);
  await document(page);
  await check();
});
