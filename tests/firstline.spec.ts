import { test, expect, type Page } from "@playwright/test";
const key = "firstline.notebook.v1";
async function start(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "이 글감으로 시작하기" }).click();
}
async function write(page: Page, text = "오늘 창가에 빛이 들었다.") {
  await start(page);
  await page.getByLabel("처음 쓴 글", { exact: false }).fill(text);
  await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
}
async function saved(page: Page) {
  await expect(
    page.getByRole("status").filter({ hasText: "저장됨" }),
  ).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
}
async function goLibrary(page: Page) {
  await page.goto("/#library");
}

test("home, prompt filtering, daily stability and responsive layout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /이야기의 첫 시작은 한 줄에서\./,
    }),
  ).toBeVisible();
  const title = await page.locator(".daily-card h2").textContent();
  await page.reload();
  await expect(page.locator(".daily-card h2")).toHaveText(title!);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.name === "mobile" ? 360 : 1280,
  );
  await page.screenshot({
    path: `test-results/home-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "모든 글감 보기" }).click();
  await expect(page.locator(".browse-grid .prompt-card")).toHaveCount(24);
  await page.getByRole("button", { name: "기억", exact: true }).click();
  await expect(page.locator(".browse-grid .prompt-card")).toHaveCount(6);
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.name === "mobile" ? 360 : 1280,
  );
  expect(errors).toEqual([]);
});
test("one sentence, blank validation, autosave and resume", async ({
  page,
}) => {
  await start(page);
  await page.getByLabel("처음 쓴 글", { exact: false }).fill("   ");
  await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
  await expect(page.getByRole("alert")).toContainText("한 문장만");
  await expect(page).toHaveURL(/#write$/);
  await page.getByLabel("처음 쓴 글", { exact: false }).fill("한 문장.");
  await expect(page.getByText("5자", { exact: true })).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveValue(
    "한 문장.",
  );
  await page.getByRole("button", { name: "작업실로" }).click();
  await page.getByRole("button", { name: "이어서 쓰기", exact: true }).click();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveValue(
    "한 문장.",
  );
  await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
  await expect(page.getByLabel("다듬은 글")).toHaveValue("한 문장.");
});
test("changing prompt offers cancel, preserve and fresh start", async ({
  page,
}) => {
  await start(page);
  await page.getByLabel("처음 쓴 글", { exact: false }).fill("소중한 초안");
  const select = async () => {
    await page.getByRole("button", { name: "글감 변경" }).click();
    await page.locator(".browse-grid .prompt-card").nth(4).click();
  };
  await select();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator(".browse-grid .prompt-card").nth(5).click();
  await page
    .getByRole("button", { name: "기존 글 유지 · 이어서 쓰기" })
    .click();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveValue(
    "소중한 초안",
  );
  await select();
  await page.getByRole("button", { name: "새 글 시작", exact: true }).click();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveValue("");
  await expect(page.locator(".prompt-strip strong")).toHaveText(
    "기다리는 동안",
  );
});
test("mission replacement, original lock, revision restore and back navigation", async ({
  page,
}, info) => {
  await write(page);
  await page
    .getByLabel("다듬은 글")
    .fill("커튼 사이로 금빛이 번졌다.\n따뜻한 오후였다.");
  const title = await page.locator(".mission-card h2").textContent();
  await page.getByRole("button", { name: "다른 미션" }).click();
  await expect(page.locator(".mission-card h2")).not.toHaveText(title!);
  await saved(page);
  await page.reload();
  await expect(page.getByLabel("다듬은 글")).toHaveValue(
    "커튼 사이로 금빛이 번졌다.\n따뜻한 오후였다.",
  );
  await expect(page.locator(".original-panel")).toContainText(
    "오늘 창가에 빛이 들었다.",
  );
  await page.screenshot({
    path: `test-results/revise-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "처음 쓴 글 보기" }).click();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByRole("button", { name: "다듬기 이어가기" }).click();
  await expect(page.getByLabel("다듬은 글")).toHaveValue(
    "커튼 사이로 금빛이 번졌다.\n따뜻한 오후였다.",
  );
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.name === "mobile" ? 360 : 1280,
  );
});
for (const status of ["revised", "unchanged", "skipped"]) {
  test(`archive ${status}: accurate snapshots, reflection, no duplicates and deletion`, async ({
    page,
  }, info) => {
    await write(page, "하나.\n둘. <img src=x onerror=alert(1)>");
    if (status === "revised")
      await page.getByLabel("다듬은 글").fill("다르게 쓴 문장.\n새로운 줄.");
    await page
      .getByRole("button", {
        name: status === "skipped" ? "이번엔 건너뛰기" : "함께 읽어보기",
      })
      .click();
    await page.getByLabel("바꾼 이유를 남겨볼까요?").fill("내 말처럼 읽히게.");
    await saved(page);
    await page.reload();
    await expect(page.getByLabel("바꾼 이유를 남겨볼까요?")).toHaveValue(
      "내 말처럼 읽히게.",
    );
    await page
      .getByRole("button", { name: "보관하기", exact: true })
      .dblclick();
    await expect(page).toHaveURL(/#entry\//);
    await expect(
      page.getByText("글을 보관했어요.", { exact: false }),
    ).toBeVisible();
    const book = await stored(page);
    expect(book.activeDraft).toBeNull();
    expect(book.entries).toHaveLength(1);
    expect(book.entries[0].status).toBe(status);
    expect(book.entries[0].reflection).toBe("내 말처럼 읽히게.");
    expect(book.entries[0].promptSnapshot.question).toBeTruthy();
    expect(book.entries[0].missionSnapshot.title).toBeTruthy();
    if (status === "skipped") expect(book.entries[0].revisionText).toBeNull();
    await expect(page.locator(".comparison img")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".comparison")).toContainText("하나.\n둘.");
    await expect(page.locator("body")).toHaveJSProperty(
      "scrollWidth",
      info.project.name === "mobile" ? 360 : 1280,
    );
    await page.screenshot({
      path: `test-results/${status}-${info.project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "이 글 삭제" }).click();
    await page.getByRole("button", { name: "취소", exact: true }).click();
    expect((await stored(page)).entries).toHaveLength(1);
    await page.getByRole("button", { name: "이 글 삭제" }).click();
    await page.getByRole("button", { name: "삭제하기", exact: true }).click();
    await expect(
      page.getByText("아직 보관한 글이 없어요.", { exact: false }),
    ).toBeVisible();
    expect((await stored(page)).entries).toHaveLength(0);
  });
}
test("failed write keeps input, failed archive is not success, retry succeeds", async ({
  page,
}) => {
  await write(page);
  await page.getByLabel("다듬은 글").fill("다듬은 문장");
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await saved(page);
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page
    .getByLabel("바꾼 이유를 남겨볼까요?")
    .fill("실패해도 남아야 하는 메모");
  await expect(page.getByText("저장 실패", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await expect(page).toHaveURL(/#preview$/);
  await expect(
    page.getByText("보관하지 못했어요.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("바꾼 이유를 남겨볼까요?")).toHaveValue(
    "실패해도 남아야 하는 메모",
  );
  expect((await stored(page)).entries).toHaveLength(0);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "저장 다시 시도" }).click();
  await saved(page);
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await expect(page).toHaveURL(/#entry\//);
  expect((await stored(page)).entries[0].reflection).toBe(
    "실패해도 남아야 하는 메모",
  );
});
for (const raw of [
  '{"schemaVersion":2,"activeDraft":null,"entries":[]}',
  "{broken",
  '{"schemaVersion":1,"activeDraft":null,"entries":[{}]}',
]) {
  test(`protect malformed storage ${raw.slice(0, 25)}`, async ({ page }) => {
    await page.goto("/");
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, raw]);
    await page.reload();
    await expect(page.getByRole("alert")).toContainText("기존");
    await page.getByRole("button", { name: "이 글감으로 시작하기" }).click();
    await page
      .getByLabel("처음 쓴 글", { exact: false })
      .fill("보호할 새 초안");
    await expect(page.getByText("저장 실패", { exact: true })).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBe(raw);
  });
}
test("keyboard-only complete flow and dialog focus", async ({ page }) => {
  await page.goto("/");
  const activate = async (name: string) => {
    const target = page.getByRole("button", { name, exact: true });
    for (let i = 0; i < 90; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) {
        await page.keyboard.press("Enter");
        return;
      }
      await page.keyboard.press("Tab");
    }
    throw new Error(`Could not keyboard-reach ${name}`);
  };
  await activate("이 글감으로 시작하기");
  for (let i = 0; i < 30; i++) {
    if (
      await page
        .getByLabel("처음 쓴 글", { exact: false })
        .evaluate((el) => el === document.activeElement)
    )
      break;
    await page.keyboard.press("Tab");
  }
  await page.keyboard.type("My first line.");
  await activate("이제 조금 다듬어볼까요?");
  await activate("함께 읽어보기");
  await activate("보관하기");
  await expect(page).toHaveURL(/#entry\//);
  await activate("이 글 삭제");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "이 글 삭제", exact: true }),
  ).toBeFocused();
  expect((await stored(page)).entries).toHaveLength(1);
});

test("history back after skipping restores an editable revision with consistent status", async ({
  page,
}) => {
  await write(page, "잠시 쉬어갔다.");
  await page.getByRole("button", { name: "이번엔 건너뛰기" }).click();
  await page.goBack();
  await expect(page.getByLabel("다듬은 글")).toHaveValue("잠시 쉬어갔다.");
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await expect(page.locator(".comparison-heading")).toContainText(
    "내용 변경 없음",
  );
});

test("failed deletion retains entry and succeeds when retried", async ({
  page,
}) => {
  await write(page);
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await page.getByRole("button", { name: "이 글 삭제" }).click();
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("삭제하지 못했어요.");
  expect((await stored(page)).entries).toHaveLength(1);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "삭제하기", exact: true }).click();
  await expect(
    page.getByText("아직 보관한 글이 없어요.", { exact: false }),
  ).toBeVisible();
});

test("library lists saved text and searches without mutating it", async ({
  page,
}) => {
  await write(page, "잊지 못할 산책이었다.");
  await page.getByRole("button", { name: "함께 읽어보기" }).click();
  await page.getByRole("button", { name: "보관하기", exact: true }).click();
  await page.getByRole("button", { name: "보관함으로", exact: true }).click();
  await expect(page.locator(".entry-card")).toContainText(
    "잊지 못할 산책이었다.",
  );
  await page.getByLabel("보관한 글 검색").fill("없는말");
  await expect(page.getByText("찾는 문장이 아직 없어요.")).toBeVisible();
  await page.getByRole("button", { name: "검색 지우기" }).click();
  await page.locator(".entry-card").click();
  await expect(
    page.getByRole("button", { name: "글 수정", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).entries).toHaveLength(1);
});

test("refresh flushes pending input before debounce and concurrent tabs do not overwrite", async ({
  page,
  context,
}) => {
  await start(page);
  await page
    .getByLabel("처음 쓴 글", { exact: false })
    .fill("바로 새로고침할 초안");
  await page.reload();
  await expect(page.getByLabel("처음 쓴 글", { exact: false })).toHaveValue(
    "바로 새로고침할 초안",
  );
  const second = await context.newPage();
  await second.goto("/#write");
  await page.getByLabel("처음 쓴 글", { exact: false }).fill("첫 탭의 새 문장");
  await saved(page);
  await second
    .getByLabel("처음 쓴 글", { exact: false })
    .fill("다른 탭에서 쓴 문장");
  await expect(second.getByRole("alert")).toContainText(
    "다른 탭에서 보관함이 변경되었어요.",
  );
  expect((await stored(page)).activeDraft.draftText).toBe("첫 탭의 새 문장");
  await expect(second.getByLabel("처음 쓴 글", { exact: false })).toHaveValue(
    "다른 탭에서 쓴 문장",
  );
});
