import { describe, expect, it } from "vitest";
import {
  archiveManuscript,
  archivePractice,
  emptyStudio,
  newManuscript,
  newPractice,
  parseStudio,
  practiceWords,
  randomWord,
} from "./studioModel";

describe("writing studio storage", () => {
  it("provides a different random word and round-trips an unfinished practice", () => {
    const draft = { ...newPractice(), text: "나의 한 문장.\n다음 문장." };
    const next = randomWord(draft.word);
    expect(practiceWords).toContain(next);
    expect(next).not.toBe(draft.word);
    const book = { ...emptyStudio(), practice: draft };
    expect(parseStudio(JSON.stringify(book))).toEqual(book);
  });
  it("archives the practice and its word once without changing input state", () => {
    const draft = { ...newPractice(), text: "창문을 열자 바람이 들어왔다." };
    const book = { ...emptyStudio(), practice: draft };
    const archived = archivePractice(book);
    expect(archived.practice).toBeNull();
    expect(book.practice).toEqual(draft);
    expect(archived.entries[0].originalText).toBe(draft.text);
    expect(archived.entries[0].promptSnapshot.id).toBe(draft.word);
    expect(
      archivePractice({ ...archived, practice: draft }).entries,
    ).toHaveLength(1);
    expect(parseStudio(JSON.stringify(archived))).toEqual(archived);
    expect(() =>
      archivePractice({ ...book, practice: { ...draft, text: "  " } }),
    ).toThrow();
  });
  it("round-trips document formatting and archives its text independently of other documents", () => {
    const doc = {
      ...newManuscript(),
      title: "내 이야기",
      text: "빛이 들었다.",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { textAlign: "center" },
            content: [
              {
                type: "text",
                text: "빛이 들었다.",
                marks: [{ type: "bold" }, { type: "underline" }],
              },
            ],
          },
        ],
      },
    };
    const other = newManuscript();
    const book = { ...emptyStudio(), documents: [doc, other] };
    expect(parseStudio(JSON.stringify(book))).toEqual(book);
    const archived = archiveManuscript(book, doc.id);
    expect(archived.documents).toEqual([other]);
    expect(archived.entries[0].originalText).toBe(doc.text);
    expect(archived.entries[0].promptSnapshot.title).toBe(doc.title);
    expect(book.documents).toHaveLength(2);
    expect(parseStudio(JSON.stringify(archived))).toEqual(archived);
    expect(() => archiveManuscript(book, other.id)).toThrow();
  });
  it("rejects malformed storage, duplicate IDs and unsupported rich content", () => {
    const doc = newManuscript();
    for (const book of [
      { schemaVersion: 2 },
      { ...emptyStudio(), practice: {} },
      { ...emptyStudio(), documents: [doc, doc] },
      {
        ...emptyStudio(),
        documents: [
          {
            ...doc,
            content: {
              type: "doc",
              content: [
                { type: "image", attrs: { src: "javascript:alert(1)" } },
              ],
            },
          },
        ],
      },
      {
        ...emptyStudio(),
        documents: [
          {
            ...doc,
            content: {
              type: "doc",
              content: [{ type: "paragraph", attrs: { style: "color:red" } }],
            },
          },
        ],
      },
      { ...emptyStudio(), entries: [{}] },
    ])
      expect(() => parseStudio(JSON.stringify(book))).toThrow();
  });
});
