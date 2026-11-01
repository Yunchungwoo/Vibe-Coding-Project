import type { Mission, Prompt } from "./content";
export type Step = "drafting" | "revising" | "preview";
export type EntryStatus = "revised" | "unchanged" | "skipped";
export type Draft = {
  id: string;
  promptSnapshot: Prompt;
  draftText: string;
  originalText: string | null;
  revisionText: string | null;
  missionSnapshot: Mission | null;
  reflection: string;
  step: Step;
  createdAt: string;
  updatedAt: string;
};
export type Entry = {
  id: string;
  promptSnapshot: Prompt;
  originalText: string;
  revisionText: string | null;
  missionSnapshot: Mission | null;
  reflection: string;
  status: EntryStatus;
  createdAt: string;
  archivedAt: string;
  updatedAt?: string;
};
export type Notebook = {
  schemaVersion: 1;
  activeDraft: Draft | null;
  entries: Entry[];
};
export const emptyNotebook = (): Notebook => ({
  schemaVersion: 1,
  activeDraft: null,
  entries: [],
});
export const STORAGE_KEY = "firstline.notebook.v1";
export function newDraft(prompt: Prompt): Draft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    promptSnapshot: { ...prompt },
    draftText: "",
    originalText: null,
    revisionText: null,
    missionSnapshot: null,
    reflection: "",
    step: "drafting",
    createdAt: now,
    updatedAt: now,
  };
}
export function beginRevision(draft: Draft, mission: Mission): Draft {
  if (!draft.draftText.trim()) throw new Error("empty draft");
  return {
    ...draft,
    originalText: draft.originalText ?? draft.draftText,
    revisionText: draft.revisionText ?? draft.originalText ?? draft.draftText,
    missionSnapshot: draft.missionSnapshot ?? { ...mission },
    step: "revising",
    updatedAt: new Date().toISOString(),
  };
}
export function entryStatus(
  original: string,
  revision: string | null,
): EntryStatus {
  return revision === null
    ? "skipped"
    : revision === original
      ? "unchanged"
      : "revised";
}
export function archiveDraft(book: Notebook): Notebook {
  const d = book.activeDraft;
  if (!d || d.originalText === null || d.step !== "preview")
    throw new Error("draft not ready");
  if (book.entries.some((e) => e.id === d.id))
    return { ...book, activeDraft: null };
  const entry: Entry = {
    id: d.id,
    promptSnapshot: { ...d.promptSnapshot },
    originalText: d.originalText,
    revisionText: d.revisionText,
    missionSnapshot: d.missionSnapshot ? { ...d.missionSnapshot } : null,
    reflection: d.reflection,
    status: entryStatus(d.originalText, d.revisionText),
    createdAt: d.createdAt,
    archivedAt: new Date().toISOString(),
  };
  return { ...book, activeDraft: null, entries: [entry, ...book.entries] };
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const nullable = (v: unknown) => v === null || str(v);
const date = (v: unknown) => str(v) && Number.isFinite(Date.parse(v));
const prompt = (v: unknown) =>
  object(v) &&
  str(v.id) &&
  str(v.title) &&
  str(v.question) &&
  ["관찰", "기억", "상상", "감정"].includes(String(v.category));
const mission = (v: unknown) =>
  v === null || (object(v) && str(v.id) && str(v.title) && str(v.instruction));
export function parseNotebook(raw: string): Notebook {
  const b: unknown = JSON.parse(raw);
  if (!object(b) || b.schemaVersion !== 1 || !Array.isArray(b.entries))
    throw new Error("unsupported notebook");
  const common = (v: Record<string, unknown>) =>
    str(v.id) &&
    v.id.length > 0 &&
    prompt(v.promptSnapshot) &&
    mission(v.missionSnapshot) &&
    str(v.reflection) &&
    date(v.createdAt);
  if (
    !b.entries.every(
      (e) =>
        object(e) &&
        common(e) &&
        str(e.originalText) &&
        e.originalText.trim().length > 0 &&
        nullable(e.revisionText) &&
        date(e.archivedAt) &&
        (e.updatedAt === undefined || date(e.updatedAt)) &&
        e.status ===
          entryStatus(e.originalText, e.revisionText as string | null),
    )
  )
    throw new Error("invalid entries");
  if (new Set(b.entries.map((e) => e.id)).size !== b.entries.length)
    throw new Error("duplicate entries");
  const d = b.activeDraft;
  if (d !== null) {
    if (
      !object(d) ||
      !common(d) ||
      !str(d.draftText) ||
      !nullable(d.originalText) ||
      !nullable(d.revisionText) ||
      !date(d.updatedAt) ||
      !["drafting", "revising", "preview"].includes(String(d.step))
    )
      throw new Error("invalid draft");
    if (
      d.originalText !== null &&
      (!str(d.originalText) ||
        !d.originalText.trim() ||
        d.originalText !== d.draftText)
    )
      throw new Error("invalid original");
    if (
      d.step !== "drafting" &&
      (d.originalText === null || d.missionSnapshot === null)
    )
      throw new Error("missing original or mission");
    if (d.step === "revising" && d.revisionText === null)
      throw new Error("missing revision");
    if (b.entries.some((e) => e.id === d.id))
      throw new Error("archived draft still active");
  }
  return b as Notebook;
}
