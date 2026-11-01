import { useEffect, useState } from "react";
import { type Entry, entryStatus } from "./model";
import type { StudioEntry } from "./studioModel";
import { Modal } from "./WritingControls";

export function EntryEditor({
  entry,
  save,
  close,
}: {
  entry: Entry | StudioEntry;
  save: (entry: Entry | StudioEntry) => boolean;
  close: () => void;
}) {
  const [title, setTitle] = useState(entry.promptSnapshot.title);
  const [original, setOriginal] = useState(entry.originalText);
  const [revision, setRevision] = useState(entry.revisionText);
  const [reflection, setReflection] = useState(entry.reflection);
  const [message, setMessage] = useState("");
  const [discard, setDiscard] = useState(false);
  const dirty =
    title !== entry.promptSnapshot.title ||
    original !== entry.originalText ||
    revision !== entry.revisionText ||
    reflection !== entry.reflection;
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function submit() {
    if (!title.trim() || !original.trim()) {
      setMessage("제목과 본문을 입력해주세요. 한 문장도 괜찮아요.");
      return;
    }
    const updates = {
      originalText: original,
      reflection,
      updatedAt: new Date().toISOString(),
    };
    const next: Entry | StudioEntry =
      "kind" in entry
        ? {
            ...entry,
            ...updates,
            promptSnapshot: { ...entry.promptSnapshot, title: title.trim() },
          }
        : {
            ...entry,
            ...updates,
            promptSnapshot: { ...entry.promptSnapshot, title: title.trim() },
            revisionText: revision,
            status: entryStatus(original, revision),
          };
    if (!save(next))
      setMessage(
        "수정 내용을 저장하지 못했어요. 입력은 그대로 있어요. 다시 시도해주세요.",
      );
  }
  return (
    <Modal
      title={discard ? "수정을 취소할까요?" : "보관한 글 수정"}
      close={() => (dirty ? setDiscard(true) : close())}
    >
      {discard ? (
        <>
          <p>
            아직 저장하지 않은 변경을 버려요. 보관되어 있던 글은 그대로 남아요.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setDiscard(false)}>
              계속 수정
            </button>
            <button className="danger-button" onClick={close}>
              변경 버리기
            </button>
          </div>
        </>
      ) : (
        <form
          className="entry-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="entry-title">글 제목</label>
          <input
            id="entry-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="entry-original">
            {"kind" in entry ? "보관한 본문" : "처음 쓴 글"}
          </label>
          <textarea
            id="entry-original"
            rows={6}
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
          />
          {revision !== null && (
            <>
              <label htmlFor="entry-revision">다듬은 글</label>
              <textarea
                id="entry-revision"
                rows={6}
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
              />
            </>
          )}
          {!("kind" in entry) && (
            <>
              <label htmlFor="entry-reflection">메모</label>
              <textarea
                id="entry-reflection"
                rows={2}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </>
          )}
          <p className="muted">저장하면 이 보관 글에 수정 내용이 반영돼요.</p>
          {message && (
            <p className="inline-error" role="alert">
              {message}
            </p>
          )}
          <div className="entry-edit-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => (dirty ? setDiscard(true) : close())}
            >
              취소
            </button>
            <button type="submit" className="primary">
              수정 저장
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
