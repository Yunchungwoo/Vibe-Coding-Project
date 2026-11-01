import { describe, expect, it } from "vitest";
import { dailyPrompt, missions, prompts, categories } from "./content";
import {
  archiveDraft,
  beginRevision,
  emptyNotebook,
  entryStatus,
  newDraft,
  parseNotebook,
} from "./model";
describe("content and local date", () => {
  it("offers original prompts in all categories and 8 missions", () => {
    expect(prompts.length).toBeGreaterThanOrEqual(20);
    expect(new Set(prompts.map((p) => p.id)).size).toBe(prompts.length);
    expect(new Set(prompts.map((p) => p.category))).toEqual(
      new Set(categories),
    );
    expect(missions.length).toBeGreaterThanOrEqual(8);
  });
  it("keeps the prompt stable within a local calendar day", () => {
    expect(dailyPrompt(new Date(2026, 10, 1, 0, 1))).toEqual(
      dailyPrompt(new Date(2026, 10, 1, 23, 59)),
    );
    expect(dailyPrompt(new Date(2026, 10, 1))).not.toEqual(
      dailyPrompt(new Date(2026, 10, 2)),
    );
  });
});
describe("draft and archive invariants", () => {
  it("allows one sentence and locks its original across revisits", () => {
    const d = { ...newDraft(prompts[0]), draftText: "빛이 들었다." };
    const revision = beginRevision(d, missions[0]);
    const again = beginRevision(
      { ...revision, revisionText: "빛이 길게 들었다." },
      missions[1],
    );
    expect(again.originalText).toBe("빛이 들었다.");
    expect(again.revisionText).toBe("빛이 길게 들었다.");
    expect(again.missionSnapshot).toEqual(missions[0]);
    expect(() => beginRevision(newDraft(prompts[0]), missions[0])).toThrow();
  });
  it.each([
    ["빛", "별", "revised"],
    ["빛", "빛", "unchanged"],
    ["빛", null, "skipped"],
  ] as const)("classifies %s / %s as %s", (a, b, status) =>
    expect(entryStatus(a, b)).toBe(status),
  );
  it("snapshots context, preserves newlines, clears draft and prevents duplicate archive", () => {
    const draft = {
      ...beginRevision(
        { ...newDraft(prompts[0]), draftText: "하나.\n둘." },
        missions[0],
      ),
      step: "preview" as const,
      reflection: "내 말로 바꿨다.",
    };
    const b = archiveDraft({ ...emptyNotebook(), activeDraft: draft });
    expect(b.entries[0].originalText).toBe("하나.\n둘.");
    expect(b.entries[0].reflection).toBe(draft.reflection);
    expect(b.activeDraft).toBeNull();
    expect(archiveDraft({ ...b, activeDraft: draft }).entries).toHaveLength(1);
    expect(parseNotebook(JSON.stringify(b))).toEqual(b);
  });
  it("rejects corrupt schemas and partial objects without repairing or deleting", () => {
    for (const raw of [
      "{",
      "null",
      '{"schemaVersion":2}',
      '{"schemaVersion":1,"entries":[{}],"activeDraft":null}',
      '{"schemaVersion":1,"entries":[]}',
    ])
      expect(() => parseNotebook(raw)).toThrow();
  });
});
