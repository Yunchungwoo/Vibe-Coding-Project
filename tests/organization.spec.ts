import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import JSZip from "jszip";
const key = "firstline.studio.v1";
const stored = (page: Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
async function openList(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) <= 1100) {
    await expect(
      page.getByRole("button", { name: "문서 목록 열기" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "문서 목록 열기" }).click();
  }
}
async function createDoc(page: Page, title = "첫 문서") {
  await page.goto("/#studio");
  await page
    .getByRole("button", { name: "첫 문서 만들기", exact: true })
    .click();
  await page.getByLabel("문서 제목", { exact: true }).fill(title);
  await page
    .getByRole("textbox", { name: "문서 본문" })
    .fill("기존에 작성한 본문.");
  await expect(
    page.getByRole("status").filter({ hasText: "저장됨" }),
  ).toBeVisible();
}
async function wordFile() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>워드에서 가져온 한글 문장.</w:t></w:r></w:p><w:p><w:r><w:t>두 번째 문단.</w:t></w:r></w:p></w:body></w:document>',
  );
  return {
    name: "한글 원고.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: await zip.generateAsync({ type: "nodebuffer" }),
  };
}
test("home title and editor name reflect the requested labels", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".daily-card h2")).toHaveText("작성의 순간");
  await page.getByRole("button", { name: "다른 글감", exact: true }).click();
  await expect(page).toHaveURL(/#prompts$/);
  await expect(page.locator(".browse-grid .prompt-card")).toHaveCount(24);
  await page.goto("/#home");
  await expect(page.getByRole("button", { name: /작성 에디터/ })).toBeVisible();
  await page.getByRole("button", { name: /작성 에디터/ }).click();
  await expect(page.locator(".document-workspace")).toHaveAttribute(
    "aria-label",
    "작성 에디터",
  );
  await expect(page.getByText("자유 글쓰기", { exact: true })).toHaveCount(0);
});
test("folders and document colors persist, documents move, and deleting a folder keeps its contents", async ({
  page,
}, info) => {
  await createDoc(page);
  await openList(page);
  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  await page.getByLabel("폴더 이름").fill("여행 기록");
  await page.getByRole("button", { name: "파랑 색상" }).click();
  await page.getByRole("button", { name: "폴더 만들기", exact: true }).click();
  await page
    .getByRole("button", { name: "문서 설정: 첫 문서", exact: true })
    .click();
  const folderId = (await stored(page)).folders[0].id;
  await page.getByLabel("문서가 들어갈 폴더").selectOption(folderId);
  await page.getByRole("button", { name: "분홍 색상" }).click();
  await page.getByRole("button", { name: "설정 저장", exact: true }).click();
  await page.reload();
  await openList(page);
  await expect(
    page
      .getByRole("region", { name: "폴더: 여행 기록", exact: true })
      .getByRole("button", { name: "첫 문서", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).documents[0]).toMatchObject({
    folderId,
    color: "rose",
    text: "기존에 작성한 본문.",
  });
  expect((await stored(page)).folders[0].color).toBe("blue");
  await page.getByRole("button", { name: "새 문서", exact: true }).click();
  await page.getByLabel("문서 제목", { exact: true }).fill("같은 폴더의 문서");
  await page.getByRole("textbox", { name: "문서 본문" }).fill("다른 문서.");
  await expect(
    page.getByRole("status").filter({ hasText: "저장됨" }),
  ).toBeVisible();
  expect((await stored(page)).documents[1].folderId).toBe(folderId);
  await openList(page);
  await page.screenshot({
    path: `test-results/folders-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "폴더 설정: 여행 기록", exact: true })
    .click();
  await page.getByRole("button", { name: "폴더 삭제", exact: true }).click();
  await page.getByRole("button", { name: "폴더만 삭제", exact: true }).click();
  expect((await stored(page)).folders).toHaveLength(0);
  expect((await stored(page)).documents).toHaveLength(2);
  expect(
    (await stored(page)).documents.every((d: any) => d.folderId === null),
  ).toBe(true);
});
test("TXT Markdown and DOCX import as independent documents, with markup rendered as text", async ({
  page,
}) => {
  await page.goto("/#studio");
  await openList(page);
  await page
    .getByLabel("문서 파일 선택")
    .setInputFiles([
      {
        name: "일기.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(
          "첫 번째 문장.\n<script>window.injected=true</script>",
        ),
      },
      {
        name: "메모.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("# 나의 메모\n마크다운 본문."),
      },
      await wordFile(),
    ]);
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "일기",
  );
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toContainText(
    "<script>window.injected=true</script>",
  );
  expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
  expect((await stored(page)).documents).toHaveLength(3);
  await openList(page);
  await page.getByRole("button", { name: "한글 원고", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toContainText(
    "워드에서 가져온 한글 문장.",
  );
  await page.reload();
  await expect(page.getByRole("textbox", { name: "문서 본문" })).toContainText(
    "두 번째 문단.",
  );
  await openList(page);
  await page.getByLabel("문서 파일 선택").setInputFiles([
    {
      name: "지원하지않음.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf"),
    },
    { name: "빈파일.txt", mimeType: "text/plain", buffer: Buffer.from("  ") },
  ]);
  await expect(page.locator(".import-result")).toContainText(
    "TXT, Markdown, DOCX",
  );
  await expect(page.locator(".import-result")).toContainText("본문이 없어요");
  expect((await stored(page)).documents).toHaveLength(3);
});
test("async import preserves edits made while reading, and failed import can be retried", async ({
  page,
}) => {
  await createDoc(page);
  await page.evaluate(() => {
    const read = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return read.call(this);
    };
  });
  await openList(page);
  await page
    .getByLabel("문서 파일 선택")
    .setInputFiles({
      name: "추가.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("새로운 파일의 내용."),
    });
  if (await page.getByRole("button", { name: "문서 목록 닫기" }).isVisible())
    await page.getByRole("button", { name: "문서 목록 닫기" }).click();
  await page
    .getByRole("textbox", { name: "문서 본문" })
    .fill("파일을 읽는 동안 고친 본문.");
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "추가",
  );
  expect(
    (await stored(page)).documents.find((d: any) => d.title === "첫 문서").text,
  ).toBe("파일을 읽는 동안 고친 본문.");
  await openList(page);
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page
    .getByLabel("문서 파일 선택")
    .setInputFiles({
      name: "재시도.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("저장 실패에도 남아 있는 본문."),
    });
  await expect(page.getByRole("dialog")).toContainText(
    "불러온 문서를 저장하지 못했어요",
  );
  expect((await stored(page)).documents).toHaveLength(2);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "불러오기 다시 시도" }).click();
  await expect(page.getByLabel("문서 제목", { exact: true })).toHaveValue(
    "재시도",
  );
  expect((await stored(page)).documents).toHaveLength(3);
});
async function archive(page: Page, kind: string) {
  if (kind === "practice") {
    await page.goto("/#practice");
    await page.getByLabel("나의 연습 문장").fill("처음 보관한 문장.");
    await page.getByRole("button", { name: "문장 보관하기" }).click();
  } else if (kind === "document") {
    await createDoc(page);
    await page.getByRole("button", { name: "보관하기", exact: true }).click();
    await page
      .getByRole("button", { name: "글 보관하기", exact: true })
      .click();
  } else {
    await page.goto("/");
    await page.getByRole("button", { name: "이 글감으로 시작하기" }).click();
    await page
      .getByLabel("처음 쓴 글", { exact: false })
      .fill("처음 보관한 문장.");
    await page.getByRole("button", { name: "이제 조금 다듬어볼까요?" }).click();
    await page.getByRole("button", { name: "함께 읽어보기" }).click();
    await page.getByRole("button", { name: "보관하기", exact: true }).click();
  }
  await expect(page).toHaveURL(/#entry\//);
}
for (const kind of ["prompt", "practice", "document"])
  test(`edit archived ${kind} in place and restore after reload`, async ({
    page,
  }) => {
    await archive(page, kind);
    const url = page.url();
    await page.goto("/#library");
    await page.locator(".entry-card").click();
    await page.getByRole("button", { name: "글 수정", exact: true }).click();
    await page
      .getByLabel("글 제목", { exact: true })
      .fill("보관함에서 바꾼 제목");
    await page.locator("#entry-original").fill("보관함에서 수정한 문장.");
    if (kind === "prompt") {
      await page
        .getByLabel("다듬은 글", { exact: true })
        .fill("보관함에서 수정한 문장.");
      await page.getByLabel("메모", { exact: true }).fill("수정한 이유.");
    }
    await page.getByRole("button", { name: "수정 저장", exact: true }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "보관함에서 바꾼 제목",
    );
    await page.reload();
    await expect(page.locator(".writing-text").first()).toHaveText(
      "보관함에서 수정한 문장.",
    );
    if (kind === "prompt")
      await expect(page.locator(".status-tag")).toHaveText("내용 변경 없음");
    await page.goto("/#library");
    await expect(page.locator(".entry-card")).toHaveCount(1);
  });
test("archive edit cancellation and write failure keep existing text and editable input", async ({
  page,
}) => {
  await archive(page, "practice");
  const original = await stored(page);
  await page.getByRole("button", { name: "글 수정", exact: true }).click();
  await page
    .getByLabel("보관한 본문", { exact: true })
    .fill("취소할 수정 내용.");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "변경 버리기", exact: true }).click();
  expect(await stored(page)).toEqual(original);
  await page.getByRole("button", { name: "글 수정", exact: true }).click();
  await page
    .getByLabel("보관한 본문", { exact: true })
    .fill("재시도할 수정 내용.");
  await page.evaluate(() => {
    (window as any).realSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "저장하지 못했어요",
  );
  await expect(page.getByLabel("보관한 본문", { exact: true })).toHaveValue(
    "재시도할 수정 내용.",
  );
  expect(await stored(page)).toEqual(original);
  await page.evaluate(() => {
    Storage.prototype.setItem = (window as any).realSet;
  });
  await page.getByRole("button", { name: "수정 저장", exact: true }).click();
  await expect(page.locator(".archived-writing")).toContainText(
    "재시도할 수정 내용.",
  );
});
test("organization controls and archive edit dialog have no automatic accessibility violations", async ({
  page,
}, info) => {
  await createDoc(page);
  await openList(page);
  const check = async () =>
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  await check();
  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  await check();
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await archive(page, "practice");
  await page.getByRole("button", { name: "글 수정", exact: true }).click();
  await check();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    info.project.name === "mobile" ? 360 : 1280,
  );
});
