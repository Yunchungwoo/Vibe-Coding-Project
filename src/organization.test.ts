import { expect, it } from "vitest";
import {
  emptyStudio,
  manuscriptFromText,
  newFolder,
  newManuscript,
  parseStudio,
  removeFolder,
} from "./studioModel";
import { parseNotebook } from "./model";

it("adds organization defaults when reading existing manuscripts without losing text or formatting", () => {
  const doc = {
    ...newManuscript(),
    title: "이전 원고",
    text: "보존할 글",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "보존할 글", marks: [{ type: "bold" }] },
          ],
        },
      ],
    },
  };
  const { folderId, color, ...legacyDoc } = doc;
  const { folders, ...legacyBook } = emptyStudio();
  const raw = JSON.stringify({ ...legacyBook, documents: [legacyDoc] });
  const loaded = parseStudio(raw);
  expect(loaded.folders).toEqual([]);
  expect(loaded.documents[0]).toEqual(doc);
  expect(JSON.parse(raw).documents[0]).not.toHaveProperty("folderId");
});
it("round-trips folders and colors, and removes only the folder while preserving its documents", () => {
  const folder = newFolder(" 여행 ", "blue");
  const doc = {
    ...newManuscript(folder.id),
    text: "사라지지 않는 문장",
    color: "rose" as const,
  };
  const book = { ...emptyStudio(), folders: [folder], documents: [doc] };
  expect(parseStudio(JSON.stringify(book))).toEqual(book);
  const next = removeFolder(book, folder.id);
  expect(next.folders).toHaveLength(0);
  expect(next.documents).toEqual([{ ...doc, folderId: null }]);
  expect(book.documents[0].folderId).toBe(folder.id);
  expect(() => parseStudio(JSON.stringify({ ...book, folders: [] }))).toThrow();
  expect(() =>
    parseStudio(
      JSON.stringify({ ...book, documents: [{ ...doc, color: "bad" }] }),
    ),
  ).toThrow();
  expect(() => newFolder("  ")).toThrow();
});
it("creates plain-text documents without executing markup, and rejects blank or excessive content", () => {
  const doc = manuscriptFromText(
    "메모",
    "첫 문장.\r\n<script>alert(1)</script>",
  );
  expect(doc.text).toBe("첫 문장.\n<script>alert(1)</script>");
  expect(doc.content.content?.[1].content?.[0]).toEqual({
    type: "text",
    text: "<script>alert(1)</script>",
  });
  expect(() => manuscriptFromText("빈 문서", " \n ")).toThrow();
  expect(() => manuscriptFromText("긴 문서", "x".repeat(200001))).toThrow();
});
it("keeps historical storage valid when an archive modification timestamp is present", () => {
  const book = {
    schemaVersion: 1,
    activeDraft: null,
    entries: [
      {
        id: "saved",
        promptSnapshot: {
          id: "p",
          title: "제목",
          question: "질문",
          category: "관찰",
        },
        originalText: "수정한 본문.",
        revisionText: null,
        missionSnapshot: null,
        reflection: "",
        status: "skipped",
        createdAt: "2026-11-01T00:00:00Z",
        archivedAt: "2026-11-01T01:00:00Z",
        updatedAt: "2026-11-01T02:00:00Z",
      },
    ],
  };
  expect(parseNotebook(JSON.stringify(book))).toEqual(book);
  expect(() =>
    parseNotebook(
      JSON.stringify({
        ...book,
        entries: [{ ...book.entries[0], updatedAt: "bad" }],
      }),
    ),
  ).toThrow();
});
