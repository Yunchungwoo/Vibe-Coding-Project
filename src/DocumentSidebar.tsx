import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Folder,
  FolderPlus,
  Palette,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Modal } from "./WritingControls";
import { importDocument } from "./importDocument";
import {
  itemColors,
  newFolder,
  removeFolder,
  type ItemColor,
  type Manuscript,
  type StudioStore,
} from "./studioModel";

export function ColorPicker({
  value,
  change,
}: {
  value: ItemColor;
  change: (color: ItemColor) => void;
}) {
  return (
    <fieldset className="color-picker">
      <legend>표시 색상</legend>
      <div>
        {Object.entries(itemColors).map(([id, color]) => (
          <button
            type="button"
            key={id}
            style={{ "--item-color": color.value } as CSSProperties}
            className={`color-choice ${value === id ? "selected" : ""}`}
            aria-label={`${color.name} 색상`}
            aria-pressed={value === id}
            onClick={() => change(id as ItemColor)}
          >
            <span aria-hidden="true" />
            {color.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
type Settings =
  { type: "folder"; id: string | null } | { type: "document"; id: string };
export function DocumentSidebar({
  store,
  docId,
  activeFolderId,
  setActiveFolderId,
  create,
  select,
  close,
  imported,
  report,
}: {
  store: StudioStore;
  docId?: string;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  create: () => void;
  select: (doc: Manuscript) => void;
  close: () => void;
  imported: (id: string) => void;
  report: (result: { messages: string[]; error: boolean } | null) => void;
}) {
  const { book, commit } = store;
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<ItemColor>("amber");
  const [folder, setFolder] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [deleteFolder, setDeleteFolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importNotice, setImportNotice] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<Manuscript[] | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (activeFolderId)
      setCollapsed((ids) => ids.filter((id) => id !== activeFolderId));
  }, [docId]);
  function openSettings(target: Settings) {
    setSettings(target);
    setMessage("");
    setDeleteFolder(false);
    const item =
      target.type === "folder"
        ? book.folders.find((f) => f.id === target.id)
        : book.documents.find((d) => d.id === target.id);
    setName(item && "name" in item ? item.name : "");
    setColor(item?.color ?? (target.type === "folder" ? "amber" : "sage"));
    setFolder(item && "folderId" in item ? item.folderId : null);
  }
  function saveSettings() {
    if (!settings) return;
    if (settings.type === "folder" && !name.trim()) {
      setMessage("폴더 이름을 입력해주세요.");
      return;
    }
    const created =
      settings.type === "folder" && settings.id === null
        ? newFolder(name, color)
        : null;
    const success = commit((b) =>
      settings.type === "folder"
        ? {
            ...b,
            folders: created
              ? [...b.folders, created]
              : b.folders.map((f) =>
                  f.id === settings.id ? { ...f, name: name.trim(), color } : f,
                ),
          }
        : {
            ...b,
            documents: b.documents.map((d) =>
              d.id === settings.id
                ? {
                    ...d,
                    color,
                    folderId: folder,
                    updatedAt: new Date().toISOString(),
                  }
                : d,
            ),
          },
    );
    if (success) {
      if (created) setActiveFolderId(created.id);
      if (settings.type === "document" && settings.id === docId)
        setActiveFolderId(folder);
      setSettings(null);
    } else setMessage("변경 내용을 저장하지 못했어요. 다시 시도해주세요.");
  }
  function saveImported(documents: Manuscript[], errors = importErrors) {
    const success = commit((b) => ({
      ...b,
      documents: [
        ...b.documents,
        ...documents
          .filter((d) => !b.documents.some((current) => current.id === d.id))
          .map((d) => ({
            ...d,
            folderId: b.folders.some((f) => f.id === d.folderId)
              ? d.folderId
              : null,
          })),
      ],
    }));
    if (success) {
      setPendingImport(null);
      setImportNotice(`${documents.length}개 문서의 본문을 불러왔어요.`);
      setQuery("");
      report({
        messages: [
          `${documents.length}개 문서의 본문을 불러왔어요.`,
          ...errors,
        ],
        error: errors.length > 0,
      });
      imported(documents[0].id);
    } else setPendingImport(documents);
  }
  async function readFiles(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setImportNotice("");
    setImportErrors([]);
    report(null);
    const documents: Manuscript[] = [];
    const errors: string[] = [];
    for (const file of files) {
      try {
        documents.push(await importDocument(file, activeFolderId));
      } catch (error) {
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : "파일을 읽을 수 없어요."}`,
        );
      }
    }
    if (!mounted.current) return;
    setBusy(false);
    setImportErrors(errors);
    if (documents.length) saveImported(documents, errors);
    else report({ messages: errors, error: true });
  }
  function documentRow(d: Manuscript) {
    return (
      <div
        key={d.id}
        className={`document-row ${d.id === docId ? "selected" : ""}`}
        style={{ "--item-color": itemColors[d.color].value } as CSSProperties}
      >
        <button
          className={`document-link ${d.id === docId ? "selected" : ""}`}
          aria-current={d.id === docId ? "page" : undefined}
          onClick={() => select(d)}
        >
          <FileText size={17} />
          <span>{d.title.trim() || "제목 없는 글"}</span>
        </button>
        <button
          className="item-settings"
          aria-label={`문서 설정: ${d.title.trim() || "제목 없는 글"}`}
          title="폴더와 색상 변경"
          onClick={() => openSettings({ type: "document", id: d.id })}
        >
          <Palette size={14} />
        </button>
      </div>
    );
  }
  const matches = (d: Manuscript) =>
    `${d.title} ${d.text}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase());
  return (
    <aside className="document-sidebar" aria-label="작성 중인 문서">
      <div className="document-sidebar-heading">
        <h1>나의 원고</h1>
        <button
          className="format-button document-list-close"
          aria-label="문서 목록 닫기"
          onClick={close}
        >
          <ChevronLeft size={18} />
        </button>
      </div>
      <label className="document-search">
        <Search size={16} />
        <input
          aria-label="문서 검색"
          placeholder="문서 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="sidebar-create-actions">
        <button
          className="text-button"
          onClick={() => openSettings({ type: "folder", id: null })}
        >
          <FolderPlus size={16} />새 폴더
        </button>
        <button
          className="text-button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
        >
          <Upload size={16} />
          {busy ? "불러오는 중…" : "파일 불러오기"}
        </button>
      </div>
      <input
        ref={fileInput}
        className="sr-only"
        type="file"
        tabIndex={-1}
        aria-label="문서 파일 선택"
        accept=".txt,.md,.markdown,.docx"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void readFiles(files);
        }}
      />
      <p className="import-help">
        TXT · MD · DOCX / 파일당 5MB
        <br />
        서식과 이미지를 제외한 본문을 가져와요.
      </p>
      {(importNotice || importErrors.length > 0) && (
        <div
          className="import-result"
          role={importErrors.length ? "alert" : "status"}
        >
          {importNotice && <p>{importNotice}</p>}
          {importErrors.map((error, i) => (
            <p key={i}>{error}</p>
          ))}
        </div>
      )}
      <div className="document-folder">
        <span>
          <Folder size={16} />
          문서 <small>{book.documents.length}</small>
        </span>
        <button className="format-button" onClick={create} aria-label="새 문서">
          <Plus size={18} />
        </button>
      </div>
      <nav aria-label="문서 목록" className="document-tree">
        <button
          className={`root-folder ${activeFolderId === null ? "active" : ""}`}
          onClick={() => setActiveFolderId(null)}
        >
          <FileText size={15} />
          미분류 문서
        </button>
        {book.documents
          .filter((d) => d.folderId === null && matches(d))
          .map(documentRow)}
        {book.folders.map((f) => {
          const children = book.documents.filter(
            (d) =>
              d.folderId === f.id &&
              (f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
                matches(d)),
          );
          if (
            query &&
            !children.length &&
            !f.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())
          )
            return null;
          const expanded = !!query || !collapsed.includes(f.id);
          return (
            <section
              key={f.id}
              className="folder-group"
              aria-label={`폴더: ${f.name}`}
              style={
                { "--item-color": itemColors[f.color].value } as CSSProperties
              }
            >
              <div
                className={`folder-row ${activeFolderId === f.id ? "active" : ""}`}
              >
                <button
                  className="folder-toggle"
                  aria-expanded={expanded}
                  onClick={() => {
                    setActiveFolderId(f.id);
                    setCollapsed((ids) =>
                      ids.includes(f.id)
                        ? ids.filter((id) => id !== f.id)
                        : [...ids, f.id],
                    );
                  }}
                >
                  {expanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                  <Folder size={17} />
                  <span>{f.name}</span>
                  <small>
                    {book.documents.filter((d) => d.folderId === f.id).length}
                  </small>
                </button>
                <button
                  className="item-settings"
                  aria-label={`폴더 설정: ${f.name}`}
                  onClick={() => openSettings({ type: "folder", id: f.id })}
                >
                  <Palette size={14} />
                </button>
              </div>
              {expanded && (
                <div className="folder-children">
                  {children.map(documentRow)}
                  {!children.length && <p>아직 문서가 없어요.</p>}
                </div>
              )}
            </section>
          );
        })}
      </nav>
      {query &&
        !book.documents.some(matches) &&
        !book.folders.some((f) => f.name.includes(query)) && (
          <p className="document-empty-search">찾는 문서가 없어요.</p>
        )}
      <button className="text-button new-document" onClick={create}>
        <Plus size={17} />새 문서 만들기
      </button>
      <p className="selected-folder-note">
        새 문서 위치:{" "}
        {book.folders.find((f) => f.id === activeFolderId)?.name ??
          "미분류 문서"}
      </p>
      <p className="document-sidebar-note">
        폴더를 선택해 문서를 모으고,
        <br />
        팔레트 버튼으로 색상을 바꿔요.
      </p>
      {settings && (
        <Modal
          title={
            deleteFolder
              ? "폴더만 삭제할까요?"
              : settings.type === "document"
                ? "문서 설정"
                : settings.id
                  ? "폴더 설정"
                  : "새 폴더 만들기"
          }
          close={() => setSettings(null)}
        >
          {deleteFolder ? (
            <>
              <p>폴더 안의 문서는 삭제되지 않고 ‘미분류 문서’로 이동해요.</p>
              <div className="modal-actions">
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      settings.type === "folder" &&
                      settings.id &&
                      commit((b) => removeFolder(b, settings.id!))
                    ) {
                      if (activeFolderId === settings.id)
                        setActiveFolderId(null);
                      setSettings(null);
                    } else
                      setMessage(
                        "폴더를 삭제하지 못했어요. 다시 시도해주세요.",
                      );
                  }}
                >
                  폴더만 삭제
                </button>
                <button
                  className="secondary"
                  onClick={() => setDeleteFolder(false)}
                >
                  취소
                </button>
              </div>
            </>
          ) : (
            <form
              className="organization-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveSettings();
              }}
            >
              {settings.type === "folder" ? (
                <>
                  <label htmlFor="folder-name">폴더 이름</label>
                  <input
                    id="folder-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="예: 일상 기록"
                  />
                </>
              ) : (
                <>
                  <label htmlFor="document-folder">문서가 들어갈 폴더</label>
                  <select
                    id="document-folder"
                    value={folder ?? ""}
                    onChange={(e) => setFolder(e.target.value || null)}
                  >
                    <option value="">미분류 문서</option>
                    {book.folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <ColorPicker value={color} change={setColor} />
              <div className="entry-edit-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setSettings(null)}
                >
                  취소
                </button>
                <button className="primary" type="submit">
                  {settings.type === "folder" && !settings.id
                    ? "폴더 만들기"
                    : "설정 저장"}
                </button>
              </div>
              {settings.type === "folder" && settings.id && (
                <button
                  className="text-button danger"
                  type="button"
                  onClick={() => setDeleteFolder(true)}
                >
                  폴더 삭제
                </button>
              )}
            </form>
          )}
          {message && (
            <p className="inline-error" role="alert">
              {message}
            </p>
          )}
        </Modal>
      )}
      {pendingImport && (
        <Modal
          title="불러온 문서를 저장하지 못했어요"
          close={() => setPendingImport(null)}
        >
          <p>
            읽어온 {pendingImport.length}개 문서는 다시 시도할 수 있도록
            유지하고 있어요. 원래 파일과 기존 문서는 변경되지 않았어요.
          </p>
          <div className="modal-actions">
            <button
              className="primary"
              onClick={() => saveImported(pendingImport)}
            >
              불러오기 다시 시도
            </button>
            <button
              className="secondary"
              onClick={() => setPendingImport(null)}
            >
              취소
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
