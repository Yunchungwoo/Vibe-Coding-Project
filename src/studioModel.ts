import type { JSONContent } from "@tiptap/react";
import { useLocalNotebook } from "./useNotebook";

export const STUDIO_KEY = "firstline.studio.v1";
export const practiceWords = [
  "창문",
  "바람",
  "골목",
  "연필",
  "새벽",
  "약속",
  "그림자",
  "우산",
  "파도",
  "기다림",
  "온기",
  "계단",
  "구름",
  "편지",
  "나무",
  "여백",
  "별빛",
  "마중",
  "향기",
  "발자국",
  "햇살",
  "고요",
  "여행",
  "씨앗",
  "노을",
  "책갈피",
  "물결",
  "용기",
  "기억",
  "눈송이",
  "안부",
  "쉼표",
];
export function randomWord(previous?: string) {
  const choices = practiceWords.filter((word) => word !== previous);
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return choices[Math.floor((value[0] / 4294967296) * choices.length)];
}
export type PracticeDraft = {
  id: string;
  word: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};
export type Manuscript = {
  id: string;
  title: string;
  content: JSONContent;
  text: string;
  font: "sans" | "serif";
  fontSize: number;
  createdAt: string;
  updatedAt: string;
};
export type StudioEntry = {
  id: string;
  kind: "practice" | "document";
  promptSnapshot: {
    id: string;
    title: string;
    question: string;
    category: "문장 연습" | "자유 글쓰기";
  };
  originalText: string;
  revisionText: null;
  missionSnapshot: null;
  reflection: string;
  status: "written";
  createdAt: string;
  archivedAt: string;
};
export type StudioBook = {
  schemaVersion: 1;
  practice: PracticeDraft | null;
  documents: Manuscript[];
  entries: StudioEntry[];
};
export const emptyStudio = (): StudioBook => ({
  schemaVersion: 1,
  practice: null,
  documents: [],
  entries: [],
});
export function newPractice(previous?: string): PracticeDraft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    word: randomWord(previous),
    text: "",
    createdAt: now,
    updatedAt: now,
  };
}
export function newManuscript(): Manuscript {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    content: { type: "doc", content: [{ type: "paragraph" }] },
    text: "",
    font: "sans",
    fontSize: 18,
    createdAt: now,
    updatedAt: now,
  };
}
export function archivePractice(book: StudioBook): StudioBook {
  const draft = book.practice;
  if (!draft?.text.trim()) throw new Error("empty practice");
  const entry: StudioEntry = {
    id: draft.id,
    kind: "practice",
    promptSnapshot: {
      id: draft.word,
      title: `${draft.word}로 쓴 문장`,
      question: `‘${draft.word}’에서 떠오른 나의 문장`,
      category: "문장 연습",
    },
    originalText: draft.text,
    revisionText: null,
    missionSnapshot: null,
    reflection: "",
    status: "written",
    createdAt: draft.createdAt,
    archivedAt: new Date().toISOString(),
  };
  return {
    ...book,
    practice: null,
    entries: book.entries.some((e) => e.id === entry.id)
      ? book.entries
      : [entry, ...book.entries],
  };
}
export function archiveManuscript(book: StudioBook, id: string): StudioBook {
  const doc = book.documents.find((d) => d.id === id);
  if (!doc?.text.trim()) throw new Error("empty manuscript");
  const entry: StudioEntry = {
    id,
    kind: "document",
    promptSnapshot: {
      id,
      title: doc.title.trim() || "제목 없는 글",
      question: "자유롭게 기록한 나의 이야기",
      category: "자유 글쓰기",
    },
    originalText: doc.text,
    revisionText: null,
    missionSnapshot: null,
    reflection: "",
    status: "written",
    createdAt: doc.createdAt,
    archivedAt: new Date().toISOString(),
  };
  return {
    ...book,
    documents: book.documents.filter((d) => d.id !== id),
    entries: book.entries.some((e) => e.id === id)
      ? book.entries
      : [entry, ...book.entries],
  };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string";
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const common = (v: unknown): v is Record<string, unknown> =>
  object(v) && text(v.id) && !!v.id && date(v.createdAt);
const nodes = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "hardBreak",
  "horizontalRule",
  "codeBlock",
]);
const marks = new Set(["bold", "italic", "underline", "strike", "code"]);
function validContent(v: unknown, depth = 0): boolean {
  if (depth > 50 || !object(v) || !text(v.type) || !nodes.has(v.type))
    return false;
  if (v.text !== undefined && !text(v.text)) return false;
  if (v.type === "text" && (!text(v.text) || !v.text)) return false;
  if (
    v.attrs !== undefined &&
    (!object(v.attrs) ||
      Object.entries(v.attrs).some(([key, value]) => {
        if (key === "textAlign")
          return (
            value !== null &&
            !["left", "center", "right", "justify"].includes(String(value))
          );
        if (key === "level") return ![1, 2, 3].includes(Number(value));
        if (key === "start") return !Number.isInteger(value);
        if (key === "language") return value !== null && !text(value);
        return true;
      }))
  )
    return false;
  if (
    v.marks !== undefined &&
    (!Array.isArray(v.marks) ||
      !v.marks.every(
        (m) =>
          object(m) &&
          text(m.type) &&
          marks.has(m.type) &&
          m.attrs === undefined,
      ))
  )
    return false;
  return (
    v.content === undefined ||
    (Array.isArray(v.content) &&
      v.content.every((node) => validContent(node, depth + 1)))
  );
}
export function parseStudio(raw: string): StudioBook {
  const b: unknown = JSON.parse(raw);
  if (
    !object(b) ||
    b.schemaVersion !== 1 ||
    !Array.isArray(b.documents) ||
    !Array.isArray(b.entries)
  )
    throw new Error("invalid studio");
  if (
    b.practice !== null &&
    !(
      common(b.practice) &&
      text(b.practice.word) &&
      practiceWords.includes(b.practice.word) &&
      text(b.practice.text) &&
      date(b.practice.updatedAt)
    )
  )
    throw new Error("invalid practice");
  if (
    !b.documents.every(
      (d) =>
        common(d) &&
        text(d.title) &&
        text(d.text) &&
        object(d.content) &&
        d.content.type === "doc" &&
        validContent(d.content) &&
        ["sans", "serif"].includes(String(d.font)) &&
        [16, 18, 20, 24].includes(Number(d.fontSize)) &&
        date(d.updatedAt),
    )
  )
    throw new Error("invalid documents");
  if (
    !b.entries.every(
      (e) =>
        common(e) &&
        ["practice", "document"].includes(String(e.kind)) &&
        e.status === "written" &&
        text(e.originalText) &&
        !!e.originalText.trim() &&
        e.revisionText === null &&
        e.missionSnapshot === null &&
        text(e.reflection) &&
        date(e.archivedAt) &&
        object(e.promptSnapshot) &&
        text(e.promptSnapshot.id) &&
        text(e.promptSnapshot.title) &&
        text(e.promptSnapshot.question) &&
        e.promptSnapshot.category ===
          (e.kind === "practice" ? "문장 연습" : "자유 글쓰기"),
    )
  )
    throw new Error("invalid studio entries");
  const ids = [
    ...b.documents,
    ...b.entries,
    ...(b.practice ? [b.practice] : []),
  ].map((x) => (x as { id: string }).id);
  if (new Set(ids).size !== ids.length) throw new Error("duplicate studio IDs");
  return b as StudioBook;
}
export function useStudio() {
  return useLocalNotebook(STUDIO_KEY, emptyStudio, parseStudio);
}
export type StudioStore = ReturnType<typeof useStudio>;
