import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronLeft,
  FileText,
  Folder,
  FolderHeart,
  Italic,
  List,
  ListOrdered,
  PanelLeft,
  Plus,
  Quote,
  Redo2,
  RefreshCw,
  Search,
  Trash2,
  Underline,
  Undo2,
} from "lucide-react";
import { Modal, TextArea } from "./WritingControls";
import {
  archiveManuscript,
  archivePractice,
  newManuscript,
  newPractice,
  randomWord,
  type Manuscript,
  type StudioStore,
} from "./studioModel";

function SaveStatus({ status }: { status: StudioStore["status"] }) {
  return (
    <span className={`save-status ${status}`} role="status">
      {status === "saving"
        ? "저장 중…"
        : status === "failed"
          ? "저장 실패"
          : "저장됨"}
    </span>
  );
}
export function PracticePage({
  store,
  navigate,
}: {
  store: StudioStore;
  navigate: (route: string) => void;
}) {
  const { book, update, commit, status } = store;
  const [message, setMessage] = useState("");
  const [changeWord, setChangeWord] = useState(false);
  const archiving = useRef(false);
  useEffect(() => {
    update((b) => (b.practice ? b : { ...b, practice: newPractice() }));
  }, []);
  const draft = book.practice;
  function nextWord() {
    update((b) =>
      b.practice
        ? {
            ...b,
            practice: {
              ...b.practice,
              word: randomWord(b.practice.word),
              updatedAt: new Date().toISOString(),
            },
          }
        : b,
    );
    setChangeWord(false);
  }
  function archive() {
    if (!draft?.text.trim()) {
      setMessage("한 문장만 적어도 괜찮아요. 떠오른 말을 남겨주세요.");
      document.getElementById("practice-text")?.focus();
      return;
    }
    if (archiving.current) return;
    archiving.current = true;
    if (commit(archivePractice(book))) navigate(`entry/${draft.id}`);
    else {
      archiving.current = false;
      setMessage(
        "보관하지 못했어요. 작성한 문장은 그대로 있어요. 다시 시도해주세요.",
      );
    }
  }
  if (!draft) return null;
  return (
    <div className="practice-page writing-page">
      <div className="writing-top">
        <button className="text-button" onClick={() => navigate("home")}>
          <ChevronLeft size={16} />
          홈으로
        </button>
        <SaveStatus status={status} />
      </div>
      <div className="page-heading">
        <h1>한 단어에서, 나만의 문장으로.</h1>
        <p>
          우연히 만난 단어 하나를 문장에 담아보세요. 어떤 장면이 떠오르나요?
        </p>
      </div>
      <section className="word-card" aria-label="랜덤 단어">
        <div>
          <span>이번에 만난 단어</span>
          <h2>{draft.word}</h2>
        </div>
        <button
          className="secondary"
          onClick={() => (draft.text.trim() ? setChangeWord(true) : nextWord())}
        >
          <RefreshCw size={16} />
          다른 단어
        </button>
      </section>
      <p className="practice-hint">
        단어에 감각이나 움직임을 더해보세요. 짧은 한 문장도 좋아요.
      </p>
      <div className="paper editor">
        <TextArea
          id="practice-text"
          label="나의 연습 문장"
          value={draft.text}
          placeholder={`‘${draft.word}’에서 떠오른 장면을 써보세요.`}
          onChange={(text) => {
            setMessage("");
            update((b) =>
              b.practice
                ? {
                    ...b,
                    practice: {
                      ...b.practice,
                      text,
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : b,
            );
          }}
        />
        <div className="editor-footer">
          <span>정답 없이, 나만의 표현으로.</span>
          <span>{Array.from(draft.text).length}자</span>
        </div>
      </div>
      {message && (
        <p className="inline-error" role="alert">
          {message}
        </p>
      )}
      <div className="action-row">
        <span className="muted">단어와 문장은 함께 보관돼요.</span>
        <button className="primary" onClick={archive}>
          <FolderHeart size={18} />
          문장 보관하기
        </button>
      </div>
      {changeWord && (
        <Modal
          title="다른 단어를 만나볼까요?"
          close={() => setChangeWord(false)}
        >
          <p>
            쓰던 문장은 유지하고 단어만 바꿔요. 보관할 때는 새 단어와 함께
            남아요.
          </p>
          <div className="modal-actions">
            <button className="primary" onClick={nextWord}>
              문장 유지하고 단어 바꾸기
            </button>
            <button className="secondary" onClick={() => setChangeWord(false)}>
              취소
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`format-button ${active ? "is-active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
function ManuscriptEditor({
  doc,
  patch,
  status,
}: {
  doc: Manuscript;
  patch: (changes: Partial<Manuscript>) => void;
  status: StudioStore["status"];
}) {
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "여기서 당신의 이야기를 시작해보세요.",
      }),
    ],
    content: doc.content,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "문서 본문",
        "aria-multiline": "true",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) =>
      patchRef.current({ content: editor.getJSON(), text: editor.getText() }),
  });
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            underline: editor.isActive("underline"),
            left:
              editor.isActive({ textAlign: "left" }) ||
              !["center", "right", "justify"].some((textAlign) =>
                editor.isActive({ textAlign }),
              ),
            center: editor.isActive({ textAlign: "center" }),
            right: editor.isActive({ textAlign: "right" }),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });
  return (
    <>
      <div className="manuscript-toolbar" role="group" aria-label="문서 서식">
        <div className="toolbar-group">
          <ToolbarButton
            label="실행 취소"
            disabled={!state?.undo}
            onClick={() => {
              editor?.chain().focus().undo().run();
            }}
          >
            <Undo2 size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="다시 실행"
            disabled={!state?.redo}
            onClick={() => {
              editor?.chain().focus().redo().run();
            }}
          >
            <Redo2 size={17} />
          </ToolbarButton>
        </div>
        <div className="toolbar-group">
          <select
            aria-label="문서 글꼴"
            value={doc.font}
            onChange={(e) =>
              patch({ font: e.target.value as Manuscript["font"] })
            }
          >
            <option value="sans">고딕</option>
            <option value="serif">명조</option>
          </select>
          <select
            aria-label="문서 글자 크기"
            value={doc.fontSize}
            onChange={(e) => patch({ fontSize: Number(e.target.value) })}
          >
            {[16, 18, 20, 24].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="toolbar-group">
          <ToolbarButton
            label="굵게"
            active={state?.bold}
            onClick={() => {
              editor?.chain().focus().toggleBold().run();
            }}
          >
            <Bold size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="기울임"
            active={state?.italic}
            onClick={() => {
              editor?.chain().focus().toggleItalic().run();
            }}
          >
            <Italic size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="밑줄"
            active={state?.underline}
            onClick={() => {
              editor?.chain().focus().toggleUnderline().run();
            }}
          >
            <Underline size={17} />
          </ToolbarButton>
        </div>
        <div className="toolbar-group">
          <ToolbarButton
            label="왼쪽 정렬"
            active={state?.left}
            onClick={() => {
              editor?.chain().focus().setTextAlign("left").run();
            }}
          >
            <AlignLeft size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="가운데 정렬"
            active={state?.center}
            onClick={() => {
              editor?.chain().focus().setTextAlign("center").run();
            }}
          >
            <AlignCenter size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="오른쪽 정렬"
            active={state?.right}
            onClick={() => {
              editor?.chain().focus().setTextAlign("right").run();
            }}
          >
            <AlignRight size={17} />
          </ToolbarButton>
        </div>
        <div className="toolbar-group">
          <ToolbarButton
            label="글머리 목록"
            active={state?.bullet}
            onClick={() => {
              editor?.chain().focus().toggleBulletList().run();
            }}
          >
            <List size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="번호 목록"
            active={state?.ordered}
            onClick={() => {
              editor?.chain().focus().toggleOrderedList().run();
            }}
          >
            <ListOrdered size={17} />
          </ToolbarButton>
          <ToolbarButton
            label="인용문"
            active={state?.quote}
            onClick={() => {
              editor?.chain().focus().toggleBlockquote().run();
            }}
          >
            <Quote size={17} />
          </ToolbarButton>
        </div>
        <span className="document-count">
          {Array.from(doc.text).length.toLocaleString("ko-KR")}자
        </span>
      </div>
      <div className="document-scroll">
        <article
          className="manuscript-paper"
          style={{
            fontFamily: doc.font === "serif" ? "var(--serif)" : "var(--sans)",
            fontSize: doc.fontSize,
          }}
        >
          <label className="sr-only" htmlFor="document-title">
            문서 제목
          </label>
          <input
            id="document-title"
            className="document-title"
            placeholder="제목 없는 글"
            value={doc.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <EditorContent editor={editor} />
        </article>
      </div>
      <div className="document-status">
        <span>이 브라우저에 자동 저장돼요.</span>
        <SaveStatus status={status} />
      </div>
    </>
  );
}

export function StudioPage({
  store,
  route,
  navigate,
}: {
  store: StudioStore;
  route: string;
  navigate: (route: string) => void;
}) {
  const { book, update, commit, status } = store;
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const archived = useRef(false);
  const selectedId = route.startsWith("studio/")
    ? route.slice(7)
    : book.documents[0]?.id;
  const doc = book.documents.find((d) => d.id === selectedId);
  useEffect(() => {
    setMessage("");
    archived.current = false;
  }, [selectedId]);
  function create() {
    const next = newManuscript();
    update((b) => ({ ...b, documents: [...b.documents, next] }));
    setQuery("");
    setListOpen(false);
    navigate(`studio/${next.id}`);
  }
  function patch(changes: Partial<Manuscript>) {
    if (!doc) return;
    update((b) => ({
      ...b,
      documents: b.documents.map((d) =>
        d.id === doc.id
          ? { ...d, ...changes, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
  }
  function archive() {
    if (!doc || archived.current) return;
    archived.current = true;
    if (commit(archiveManuscript(book, doc.id))) {
      setArchiveId(null);
      navigate(`entry/${doc.id}`);
    } else {
      archived.current = false;
      setMessage("보관하지 못했어요. 문서는 그대로 있어요. 다시 시도해주세요.");
    }
  }
  return (
    <div className={`studio-shell ${listOpen ? "documents-open" : ""}`}>
      <aside className="document-sidebar" aria-label="작성 중인 문서">
        <div className="document-sidebar-heading">
          <h1>나의 원고</h1>
          <button
            className="format-button document-list-close"
            aria-label="문서 목록 닫기"
            onClick={() => setListOpen(false)}
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
        <div className="document-folder">
          <span>
            <Folder size={16} />
            문서 <small>{book.documents.length}</small>
          </span>
          <button
            className="format-button"
            onClick={create}
            aria-label="새 문서"
          >
            <Plus size={18} />
          </button>
        </div>
        <nav aria-label="문서 목록">
          {book.documents
            .filter((d) => `${d.title} ${d.text}`.includes(query))
            .map((d) => (
              <button
                key={d.id}
                className={`document-link ${d.id === doc?.id ? "selected" : ""}`}
                aria-current={d.id === doc?.id ? "page" : undefined}
                onClick={() => {
                  navigate(`studio/${d.id}`);
                  setListOpen(false);
                }}
              >
                <FileText size={17} />
                <span>{d.title.trim() || "제목 없는 글"}</span>
              </button>
            ))}
        </nav>
        {query &&
          !book.documents.some((d) =>
            `${d.title} ${d.text}`.includes(query),
          ) && <p className="document-empty-search">찾는 문서가 없어요.</p>}
        <button className="text-button new-document" onClick={create}>
          <Plus size={17} />새 문서 만들기
        </button>
        <p className="document-sidebar-note">
          생각이 떠오르는 대로 적어요.
          <br />
          완성한 글은 보관함에 남겨요.
        </p>
      </aside>
      <section className="document-workspace" aria-label="자유 글쓰기">
        <div className="document-topbar">
          <div>
            <button
              className="format-button document-list-toggle"
              onClick={() => setListOpen(!listOpen)}
              aria-label="문서 목록 열기"
              aria-expanded={listOpen}
            >
              <PanelLeft size={18} />
            </button>
            <Folder size={16} />
            <span className="document-crumb">원고 /</span>
            <span className="current-document">
              {doc?.title.trim() || (doc ? "제목 없는 글" : "자유 글쓰기")}
            </span>
          </div>
          {doc && (
            <div>
              <button
                className="format-button"
                aria-label="현재 문서 삭제"
                onClick={() => setDeleteId(doc.id)}
              >
                <Trash2 size={17} />
              </button>
              <button
                className="document-archive"
                onClick={() => {
                  if (!doc.text.trim()) {
                    setMessage("본문에 한 문장만 적어도 괜찮아요.");
                    document
                      .querySelector<HTMLElement>('[aria-label="문서 본문"]')
                      ?.focus();
                  } else setArchiveId(doc.id);
                }}
              >
                <FolderHeart size={16} />
                보관하기
              </button>
            </div>
          )}
        </div>
        {message && !archiveId && !deleteId && (
          <p className="inline-error studio-message" role="alert">
            {message}
          </p>
        )}
        {doc ? (
          <ManuscriptEditor
            key={doc.id}
            doc={doc}
            patch={patch}
            status={status}
          />
        ) : (
          <div className="studio-empty">
            <FileText size={42} strokeWidth={1} />
            <h2>
              {selectedId
                ? "문서를 찾을 수 없어요."
                : "비어 있는 페이지, 새로운 이야기."}
            </h2>
            <p>
              {selectedId
                ? "보관한 문서는 나의 보관함에서 다시 읽을 수 있어요."
                : "제목부터 시작해도, 한 문장부터 시작해도 좋아요."}
            </p>
            <button className="primary" onClick={create}>
              <Plus size={17} />첫 문서 만들기
            </button>
          </div>
        )}
      </section>
      {deleteId && (
        <Modal
          title="문서를 삭제할까요?"
          close={() => {
            setDeleteId(null);
            setMessage("");
          }}
        >
          <p>
            작성 중인 문서와 서식이 삭제돼요. 삭제한 문서는 되돌릴 수 없어요.
          </p>
          <div className="modal-actions">
            <button
              className="danger-button"
              onClick={() => {
                if (
                  commit({
                    ...book,
                    documents: book.documents.filter((d) => d.id !== deleteId),
                  })
                ) {
                  setDeleteId(null);
                  navigate("studio");
                } else setMessage("삭제하지 못했어요. 문서는 그대로 있어요.");
              }}
            >
              삭제하기
            </button>
            <button
              className="secondary"
              onClick={() => {
                setDeleteId(null);
                setMessage("");
              }}
            >
              취소
            </button>
          </div>
          {message && (
            <p role="alert" className="inline-error">
              {message}
            </p>
          )}
        </Modal>
      )}
      {archiveId && (
        <Modal
          title="완성한 글을 보관할까요?"
          close={() => {
            setArchiveId(null);
            setMessage("");
          }}
        >
          <p>
            본문을 나의 보관함에 읽기 전용으로 남겨요. 원고 목록에서는 빠지고,
            서식은 제외한 문장 그대로 보관돼요.
          </p>
          <div className="modal-actions">
            <button className="primary" onClick={archive}>
              글 보관하기
            </button>
            <button
              className="secondary"
              onClick={() => {
                setArchiveId(null);
                setMessage("");
              }}
            >
              계속 쓰기
            </button>
          </div>
          {message && (
            <p role="alert" className="inline-error">
              {message}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
