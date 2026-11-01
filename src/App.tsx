import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Feather,
  FolderHeart,
  FileText,
  Shuffle,
  Leaf,
  LockKeyhole,
  PencilLine,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  categories,
  dailyPrompt,
  missions,
  prompts,
  type Category,
  type Prompt,
} from "./content";
import {
  archiveDraft,
  beginRevision,
  entryStatus,
  newDraft,
  type Draft,
  type Entry,
  type EntryStatus,
} from "./model";
import { useNotebook } from "./useNotebook";
import { Modal, TextArea } from "./WritingControls";
const PracticePage = lazy(() =>
  import("./Studio").then((m) => ({ default: m.PracticePage })),
);
const StudioPage = lazy(() =>
  import("./Studio").then((m) => ({ default: m.StudioPage })),
);
import { useStudio, type StudioEntry } from "./studioModel";
import "./styles.css";
import "./studio.css";
const labels: Record<EntryStatus | "written", string> = {
  revised: "다듬은 글",
  unchanged: "내용 변경 없음",
  skipped: "퇴고 건너뜀",
  written: "보관한 글",
};
const dateText = (date: string) =>
  new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
function useRoute() {
  const read = () => window.location.hash.slice(1) || "home";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const listener = () => setRoute(read());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return {
    route,
    go: (next: string) => {
      window.location.hash = next;
      setRoute(next);
    },
  };
}
function Compare({
  original,
  revision,
}: {
  original: string;
  revision: string | null;
}) {
  return (
    <div className="comparison">
      <section className="paper">
        <span className="eyebrow">BEFORE</span>
        <h3>처음 쓴 글</h3>
        <p className="writing-text">{original}</p>
      </section>
      <section className="paper revised">
        <span className="eyebrow">AFTER</span>
        <h3>{revision === null ? "퇴고 건너뜀" : "다듬은 글"}</h3>
        {revision === null ? (
          <p className="muted">오늘은 처음 쓴 문장 그대로 간직해요.</p>
        ) : (
          <p className="writing-text">
            {revision || "비워둔 문장도 그대로 보관돼요."}
          </p>
        )}
      </section>
    </div>
  );
}
export default function App() {
  const { book, update, commit, status, issue, retry } = useNotebook();
  const studio = useStudio();
  const allEntries: (Entry | StudioEntry)[] = [
    ...book.entries,
    ...studio.book.entries,
  ].sort((a, b) => b.archivedAt.localeCompare(a.archivedAt));
  const { route, go } = useRoute();
  const studioMode = route === "studio" || route.startsWith("studio/");
  const storageIssue = issue || studio.issue;
  const [chosen, setChosen] = useState<Prompt>(dailyPrompt);
  const [category, setCategory] = useState<Category | "전체">("전체");
  const [pendingPrompt, setPendingPrompt] = useState<Prompt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const main = useRef<HTMLElement>(null);
  const draft = book.activeDraft;
  const detail = route.startsWith("entry/")
    ? allEntries.find((e) => e.id === route.slice(6))
    : undefined;
  const writing = ["write", "revise", "preview"].includes(route);
  const navigate = (next: string) => {
    setMenu(false);
    setMessage("");
    go(next);
  };
  useEffect(() => {
    main.current?.focus();
    window.scrollTo(0, 0);
    setMessage("");
  }, [route]);
  useEffect(() => {
    if ((window.location.hash.slice(1) || "home") !== route) return;
    if (writing && !draft) go("home");
    if (
      (route === "revise" || route === "preview") &&
      draft?.originalText === null
    )
      go("write");
    if (
      route === "revise" &&
      draft?.originalText != null &&
      draft.revisionText === null
    ) {
      patchDraft({ revisionText: draft.originalText, step: "revising" });
    }
  }, [route, draft]);
  function patchDraft(patch: Partial<Draft>) {
    if (draft)
      update({
        ...book,
        activeDraft: {
          ...draft,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      });
  }
  function resume() {
    if (!draft) return;
    navigate(
      draft.step === "drafting"
        ? "write"
        : draft.step === "revising"
          ? "revise"
          : "preview",
    );
  }
  function selectPrompt(p: Prompt) {
    if (draft && (draft.draftText.length > 0 || draft.originalText !== null)) {
      setPendingPrompt(p);
      return;
    }
    setChosen(p);
    update({ ...book, activeDraft: newDraft(p) });
    navigate("write");
  }
  function resolvePrompt(keep: boolean) {
    if (!pendingPrompt) return;
    if (keep && draft) {
      // A locked original remains attached to its original prompt and mission.
      resume();
    } else {
      setChosen(pendingPrompt);
      update({ ...book, activeDraft: newDraft(pendingPrompt) });
      navigate("write");
    }
    setPendingPrompt(null);
  }
  function startRevision() {
    if (!draft?.draftText.trim()) {
      setMessage("한 문장만 적어도 괜찮아요. 떠오른 말을 남겨주세요.");
      document.getElementById("draft-text")?.focus();
      return;
    }
    patchDraft(beginRevision(draft, missions[0]));
    navigate("revise");
  }
  function preview(skip = false) {
    if (!draft) return;
    patchDraft({ step: "preview", ...(skip ? { revisionText: null } : {}) });
    navigate("preview");
  }
  function archive() {
    if (!draft || draft.originalText === null) return;
    const next = archiveDraft({
      ...book,
      activeDraft: { ...draft, step: "preview" },
    });
    if (commit(next)) {
      setNotice("글을 보관했어요. 나의 문장이 하나 더 쌓였네요.");
      navigate(`entry/${draft.id}`);
    } else
      setMessage(
        "보관하지 못했어요. 작성 내용은 그대로 있어요. 저장 공간을 확인한 뒤 다시 보관해주세요.",
      );
  }
  const saveLabel =
    status === "saving"
      ? "저장 중…"
      : status === "failed"
        ? "저장 실패"
        : "저장됨";
  function entryCard(e: Entry | StudioEntry) {
    return (
      <button
        className="entry-card"
        key={e.id}
        onClick={() => navigate(`entry/${e.id}`)}
      >
        <div className="entry-top">
          <span className={`category cat-${e.promptSnapshot.category}`}>
            {e.promptSnapshot.category}
          </span>
          <time>{dateText(e.createdAt)}</time>
        </div>
        <h3>{e.promptSnapshot.title}</h3>
        <p>{e.originalText.split(/\n|(?<=[.!?])\s/)[0]}</p>
        <div className="entry-bottom">
          <span>
            <Check size={13} />
            {labels[e.status]}
          </span>
          <ArrowRight size={18} />
        </div>
      </button>
    );
  }
  const heading = (eyebrow: string, title: string, description: string) => (
    <div className="page-heading">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
  return (
    <div className={`app-shell ${studioMode ? "studio-mode" : ""}`}>
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#home"
          onClick={() => setMenu(false)}
          aria-label="첫줄 홈"
        >
          <span className="brand-icon">
            <Feather size={23} />
          </span>
          <span>
            첫줄<span className="brand-caption">나의 문장이 시작되는 곳</span>
          </span>
        </a>
        <div className="nav-caption">나만의 글쓰기 공간</div>
        <nav aria-label="주 메뉴">
          <a
            href="#home"
            onClick={() => setMenu(false)}
            className={route === "home" ? "active" : ""}
            aria-current={route === "home" ? "page" : undefined}
          >
            <BookOpen size={19} />
            오늘의 글감
          </a>
          <a
            href="#prompts"
            onClick={() => setMenu(false)}
            className={route === "prompts" ? "active" : ""}
            aria-current={route === "prompts" ? "page" : undefined}
          >
            <Sparkles size={19} />
            글감 둘러보기
          </a>
          <a
            href="#practice"
            onClick={() => setMenu(false)}
            className={route === "practice" ? "active" : ""}
            aria-current={route === "practice" ? "page" : undefined}
          >
            <Shuffle size={19} />
            문장 연습
          </a>
          <a
            href="#studio"
            onClick={() => setMenu(false)}
            className={studioMode ? "active" : ""}
            aria-current={studioMode ? "page" : undefined}
          >
            <FileText size={19} />
            자유 글쓰기
          </a>
          <a
            href="#library"
            onClick={() => setMenu(false)}
            className={route === "library" || detail ? "active" : ""}
            aria-current={route === "library" ? "page" : undefined}
          >
            <FolderHeart size={19} />
            나의 보관함<span className="nav-count">{allEntries.length}</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <p>
            서두르지 않아도 괜찮아요.
            <br />
            당신의 속도로 한 줄씩.
          </p>
          <div className="local-note">
            <LockKeyhole size={14} />
            <span>이 브라우저에 남기는 나의 노트</span>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <Feather size={20} />
            첫줄
          </div>
          <div className="breadcrumb">
            {route === "home"
              ? "오늘의 글감"
              : route === "prompts"
                ? "글감 둘러보기"
                : route === "practice"
                  ? "문장 연습"
                  : studioMode
                    ? "자유 글쓰기"
                    : writing
                      ? "글쓰기"
                      : "나의 보관함"}
          </div>
          <div className="topbar-right">
            <span className="today">
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
          </div>
          <button
            className="text-button menu-toggle"
            aria-label="메뉴 열기"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            메뉴
          </button>
        </header>
        <main
          ref={main}
          tabIndex={-1}
          id="main-content"
          className={studioMode ? "studio-main" : undefined}
        >
          {storageIssue && (
            <div className="alert" role="alert">
              <strong>기존 글을 안전하게 보존하고 있어요.</strong>
              <p>{storageIssue}</p>
              <p>
                새로 쓴 내용은 복사해두세요. 자동 복구가 어려우면 브라우저
                데이터를 지우지 말고 도움을 요청해주세요.
              </p>
            </div>
          )}
          {(status === "failed" || studio.status === "failed") &&
            !storageIssue && (
              <div className="alert" role="alert">
                <p>
                  저장하지 못했어요. 작성 내용은 복사해두고 다시 시도해주세요.
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    if (status === "failed") retry();
                    if (studio.status === "failed") studio.retry();
                  }}
                >
                  <RefreshCw size={16} />
                  저장 다시 시도
                </button>
              </div>
            )}
          {notice && (
            <div className="notice" role="status">
              <CircleCheck size={18} />
              {notice}
              <button
                className="icon-button"
                aria-label="알림 닫기"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {route === "home" && (
            <>
              <div className="home-heading">
                <div>
                  <h1>
                    이야기의 첫 시작은 <em>한 줄에서.</em>
                  </h1>
                  <p>
                    잘 쓰려는 마음은 잠시 내려놓고, 오늘의 생각을 남겨보세요.
                  </p>
                </div>
              </div>
              {draft && (
                <div className="resume-card">
                  <span className="resume-icon">
                    <PencilLine size={21} />
                  </span>
                  <div>
                    <strong>아직 끝나지 않은 이야기가 있어요</strong>
                    <p>
                      {draft.promptSnapshot.title} ·{" "}
                      {draft.step === "drafting"
                        ? "작성 중"
                        : draft.step === "revising"
                          ? "다듬는 중"
                          : "보관 전 미리보기"}
                    </p>
                  </div>
                  <button className="text-button" onClick={resume}>
                    이어서 쓰기
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <section className="daily-card">
                <div className="daily-content">
                  <h2>{chosen.title}</h2>
                  <p>오늘의 첫 문장을 함께 기록해봐요.</p>
                  <div className="daily-actions">
                    <button
                      className="primary"
                      onClick={() => selectPrompt(chosen)}
                    >
                      <PencilLine size={17} />이 글감으로 시작하기
                      <ArrowRight size={17} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        const next =
                          prompts[
                            (prompts.findIndex((p) => p.id === chosen.id) + 1) %
                              prompts.length
                          ];
                        if (
                          draft &&
                          (draft.draftText || draft.originalText !== null)
                        )
                          setPendingPrompt(next);
                        else setChosen(next);
                      }}
                    >
                      <RefreshCw size={15} />
                      다른 글감
                    </button>
                  </div>
                  <span className="gentle-note">
                    한 문장만 적어도 괜찮아요.
                  </span>
                </div>
              </section>
              <div className="writing-options">
                <button onClick={() => navigate("practice")}>
                  <span>
                    <Shuffle size={19} />
                    <strong>한 단어로 문장 연습</strong>
                  </span>
                  <p>랜덤 단어에서 나만의 표현을 찾아요.</p>
                  <ArrowRight size={17} />
                </button>
                <button onClick={() => navigate("studio")}>
                  <span>
                    <FileText size={19} />
                    <strong>자유롭게 글쓰기</strong>
                  </span>
                  <p>빈 페이지에 긴 이야기도 차근차근.</p>
                  <ArrowRight size={17} />
                </button>
              </div>
              <section className="suggestions">
                <div className="section-title">
                  <div>
                    <h2>마음이 가는 글감으로</h2>
                    <p>어떤 이야기부터 시작해볼까요?</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("prompts")}
                  >
                    모든 글감 보기
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="prompt-grid">
                  {[prompts[0], prompts[9], prompts[14], prompts[11]].map(
                    (p) => (
                      <button
                        key={p.id}
                        className={`prompt-card prompt-${p.category}`}
                        onClick={() => selectPrompt(p)}
                      >
                        <span className="category">{p.category}</span>
                        <h3>{p.title}</h3>
                        <p>{p.question}</p>
                        <ArrowRight size={17} />
                      </button>
                    ),
                  )}
                </div>
              </section>
              {allEntries.length > 0 && (
                <section className="recent">
                  <div className="section-title">
                    <h2>차곡차곡 쌓인 나의 문장</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("library")}
                    >
                      보관함 보기
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="entry-grid">
                    {allEntries.slice(0, 2).map(entryCard)}
                  </div>
                </section>
              )}
            </>
          )}
          {route === "practice" && (
            <Suspense fallback={<p role="status">연습장을 열고 있어요…</p>}>
              <PracticePage store={studio} navigate={navigate} />
            </Suspense>
          )}
          {studioMode && (
            <Suspense fallback={<p role="status">원고를 열고 있어요…</p>}>
              <StudioPage store={studio} route={route} navigate={navigate} />
            </Suspense>
          )}
          {route === "prompts" && (
            <>
              {heading(
                "",
                "어디서부터 시작해볼까요?",
                "작은 풍경, 오래된 기억, 문득 떠오른 마음. 마음이 닿는 글감을 골라보세요.",
              )}
              <div className="filters" role="group" aria-label="글감 분류">
                {(["전체", ...categories] as const).map((c) => (
                  <button
                    key={c}
                    className={category === c ? "selected" : ""}
                    aria-pressed={category === c}
                    onClick={() => setCategory(c)}
                  >
                    {c}
                    {c === "전체" && <span>{prompts.length}</span>}
                  </button>
                ))}
              </div>
              <div className="prompt-grid browse-grid">
                {prompts
                  .filter((p) => category === "전체" || category === p.category)
                  .map((p) => (
                    <button
                      key={p.id}
                      className={`prompt-card prompt-${p.category}`}
                      onClick={() => selectPrompt(p)}
                    >
                      <span className="category">{p.category}</span>
                      <h3>{p.title}</h3>
                      <p>{p.question}</p>
                      <ArrowRight size={17} />
                    </button>
                  ))}
              </div>
            </>
          )}
          {writing && draft && (
            <div className="writing-page">
              <div className="writing-top">
                <button
                  className="text-button"
                  onClick={() => navigate("home")}
                >
                  <ArrowLeft size={16} />
                  작업실로
                </button>
                <span className={`save-status ${status}`} role="status">
                  {status === "saved" && <Check size={14} />} {saveLabel}
                </span>
              </div>
              <ol className="progress" aria-label="글쓰기 단계">
                {[
                  ["write", "한 줄 쓰기"],
                  ["revise", "다듬기"],
                  ["preview", "함께 읽기"],
                ].map(([r, label], i) => (
                  <li
                    key={r}
                    aria-current={route === r ? "step" : undefined}
                    className={route === r ? "current" : ""}
                  >
                    <span>{i + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>
              {route === "write" && (
                <>
                  {heading(
                    "LET YOUR WORDS BEGIN",
                    "지금 떠오르는 말을 적어보세요.",
                    "1~3문장부터 시작해보세요. 길이나 완성도는 중요하지 않아요.",
                  )}
                  <div className="prompt-strip">
                    <span className="category">
                      {draft.promptSnapshot.category}
                    </span>
                    <div>
                      <strong>{draft.promptSnapshot.title}</strong>
                      <p>{draft.promptSnapshot.question}</p>
                    </div>
                    {draft.originalText === null && (
                      <button
                        className="text-button"
                        onClick={() => navigate("prompts")}
                      >
                        글감 변경
                        <RefreshCw size={14} />
                      </button>
                    )}
                  </div>
                  <div className="editor paper">
                    <TextArea
                      id="draft-text"
                      label="처음 쓴 글"
                      value={draft.draftText}
                      onChange={(draftText) => patchDraft({ draftText })}
                      placeholder="여기, 당신의 첫 문장을 남겨주세요."
                      readOnly={draft.originalText !== null}
                    />
                    <div className="editor-footer">
                      <span>
                        {draft.originalText !== null
                          ? "퇴고를 시작한 원문은 그대로 간직해요."
                          : "멋진 문장이 아니어도 괜찮아요."}
                      </span>
                      <span>{Array.from(draft.draftText).length}자</span>
                    </div>
                  </div>
                  <div className="action-row">
                    <span className="muted">
                      <LockKeyhole size={14} />이 브라우저에 자동 저장돼요
                    </span>
                    <button className="primary" onClick={startRevision}>
                      {draft.originalText !== null
                        ? "다듬기 이어가기"
                        : "이제 조금 다듬어볼까요?"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}
              {route === "revise" && (
                <>
                  {heading(
                    "A SMALL CHANGE, YOUR OWN VOICE",
                    "조금 다른 표현을 만나볼까요?",
                    "한 번에 한 가지씩. 마음이 가는 만큼만 고쳐보세요.",
                  )}
                  <div className="mission-card">
                    <span className="mission-icon">
                      <Sparkles size={24} />
                    </span>
                    <div>
                      <span className="eyebrow">오늘의 퇴고 미션</span>
                      <h2>{draft.missionSnapshot?.title}</h2>
                      <p>{draft.missionSnapshot?.instruction}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() =>
                        patchDraft({
                          missionSnapshot:
                            missions[
                              (missions.findIndex(
                                (m) => m.id === draft.missionSnapshot?.id,
                              ) +
                                1) %
                                missions.length
                            ],
                        })
                      }
                    >
                      <RefreshCw size={15} />
                      다른 미션
                    </button>
                  </div>
                  <p className="mission-help">
                    이 글에 맞지 않는 미션이라면 바꾸거나 건너뛰어도 괜찮아요.
                  </p>
                  <div className="revision-grid">
                    <section className="paper original-panel">
                      <label className="editor-label">
                        처음 쓴 글
                        <span>
                          <LockKeyhole size={13} />
                          원문 보존 중
                        </span>
                      </label>
                      <p className="writing-text">{draft.originalText}</p>
                    </section>
                    <section className="paper editor">
                      <TextArea
                        id="revision-text"
                        label="다듬은 글"
                        value={draft.revisionText ?? draft.originalText ?? ""}
                        onChange={(revisionText) =>
                          patchDraft({ revisionText })
                        }
                      />
                      <div className="editor-footer">
                        <span>당신만의 표현을 찾아보세요.</span>
                        <span>
                          {Array.from(draft.revisionText ?? "").length}자
                        </span>
                      </div>
                    </section>
                  </div>
                  <div className="action-row">
                    <button
                      className="text-button"
                      onClick={() => navigate("write")}
                    >
                      <ArrowLeft size={16} />
                      처음 쓴 글 보기
                    </button>
                    <div className="button-group">
                      <button
                        className="text-button"
                        onClick={() => preview(true)}
                      >
                        이번엔 건너뛰기
                      </button>
                      <button className="primary" onClick={() => preview()}>
                        함께 읽어보기
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                </>
              )}
              {route === "preview" && (
                <>
                  {heading(
                    "LOOK AT YOUR WORDS",
                    "나의 문장을 나란히 읽어요.",
                    "바뀐 표현이 있나요? 그대로 남겨도 좋아요. 모두 당신의 문장이니까요.",
                  )}
                  <div className="comparison-heading">
                    <h2>{draft.promptSnapshot.title}</h2>
                    <span className="status-tag">
                      {
                        labels[
                          entryStatus(
                            draft.originalText ?? "",
                            draft.revisionText,
                          )
                        ]
                      }
                    </span>
                  </div>
                  <Compare
                    original={draft.originalText ?? ""}
                    revision={draft.revisionText}
                  />
                  <div className="mission-summary">
                    <Sparkles size={17} />
                    <p>
                      <strong>함께한 미션</strong>
                      {draft.missionSnapshot?.title}
                    </p>
                  </div>
                  <div className="reflection">
                    <label htmlFor="reflection">
                      바꾼 이유를 남겨볼까요? <span>선택</span>
                    </label>
                    <input
                      id="reflection"
                      value={draft.reflection}
                      onChange={(e) =>
                        patchDraft({ reflection: e.target.value })
                      }
                      placeholder="어떤 표현이 마음에 들었는지, 짧은 메모도 좋아요."
                    />
                  </div>
                  <div className="action-row">
                    <button
                      className="text-button"
                      onClick={() => {
                        patchDraft({
                          step: "revising",
                          revisionText:
                            draft.revisionText ?? draft.originalText,
                        });
                        navigate("revise");
                      }}
                    >
                      <ArrowLeft size={16} />
                      다듬기로 돌아가기
                    </button>
                    <button className="primary" onClick={archive}>
                      <FolderHeart size={18} />
                      보관하기
                    </button>
                  </div>
                  <p className="archive-hint">
                    보관한 글은 다시 읽기 전용으로 남아요.
                  </p>
                </>
              )}
              {message && (
                <p className="inline-error" role="alert">
                  {message}
                </p>
              )}
            </div>
          )}
          {route === "library" && (
            <>
              {heading(
                "",
                "차곡차곡, 나의 보관함",
                "처음의 생각도, 새로 찾은 표현도. 지나온 문장들을 다시 만나보세요.",
              )}
              <div className="library-toolbar">
                <span>
                  나의 글 <strong>{allEntries.length}</strong>편
                </span>
                {allEntries.length > 0 && (
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="보관한 글 검색"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="글감이나 문장으로 찾아보기"
                    />
                  </label>
                )}
              </div>
              {allEntries.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-art">
                    <FolderHeart size={46} strokeWidth={1} />
                    <span className="little-leaf">
                      <Leaf size={20} />
                    </span>
                  </div>
                  <h2>이곳에 당신의 문장이 쌓일 거예요.</h2>
                  <p>
                    아직 보관한 글이 없어요.
                    <br />첫 문장부터 천천히 시작해볼까요?
                  </p>
                  <button className="primary" onClick={() => navigate("home")}>
                    <Plus size={17} />첫 글 쓰러 가기
                  </button>
                </div>
              ) : (
                <>
                  <div className="entry-grid">
                    {allEntries
                      .filter((e) =>
                        `${e.promptSnapshot.title} ${e.originalText} ${e.revisionText ?? ""}`.includes(
                          query,
                        ),
                      )
                      .map(entryCard)}
                  </div>
                  {!allEntries.some((e) =>
                    `${e.promptSnapshot.title} ${e.originalText} ${e.revisionText ?? ""}`.includes(
                      query,
                    ),
                  ) && (
                    <div className="empty-state">
                      <Search size={30} />
                      <h2>찾는 문장이 아직 없어요.</h2>
                      <button
                        className="text-button"
                        onClick={() => setQuery("")}
                      >
                        검색 지우기
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {detail && (
            <div className="writing-page">
              <div className="writing-top">
                <button
                  className="text-button"
                  onClick={() => navigate("library")}
                >
                  <ArrowLeft size={16} />
                  보관함으로
                </button>
                <span className="read-only">
                  <LockKeyhole size={13} />
                  읽기 전용
                </span>
              </div>
              {heading(
                "A PAGE OF YOUR STORY",
                detail.promptSnapshot.title,
                detail.promptSnapshot.question,
              )}
              <div className="detail-meta">
                <span className="category">
                  {detail.promptSnapshot.category}
                </span>
                <time>{dateText(detail.createdAt)}</time>
                <span className="status-tag">{labels[detail.status]}</span>
              </div>
              {"kind" in detail ? (
                <section className="paper archived-writing">
                  <h2>내가 쓴 글</h2>
                  <p className="writing-text">{detail.originalText}</p>
                </section>
              ) : (
                <Compare
                  original={detail.originalText}
                  revision={detail.revisionText}
                />
              )}
              {detail.missionSnapshot && (
                <div className="mission-summary">
                  <Sparkles size={18} />
                  <p>
                    <strong>
                      함께한 미션 · {detail.missionSnapshot.title}
                    </strong>
                    {detail.missionSnapshot.instruction}
                  </p>
                </div>
              )}
              {detail.reflection && (
                <div className="reflection saved-reflection">
                  <h3>그때의 메모</h3>
                  <p className="writing-text">{detail.reflection}</p>
                </div>
              )}
              <div className="action-row">
                <button
                  className="text-button danger"
                  onClick={() => setDeleteId(detail.id)}
                >
                  <Trash2 size={16} />이 글 삭제
                </button>
                <button className="secondary" onClick={() => navigate("home")}>
                  새로운 문장 만나기
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}
          {route.startsWith("entry/") && !detail && (
            <div className="empty-state">
              <BookOpen size={36} />
              <h1>이 글을 찾을 수 없어요.</h1>
              <button className="primary" onClick={() => navigate("library")}>
                보관함으로
              </button>
            </div>
          )}
          {![
            "home",
            "prompts",
            "library",
            "write",
            "revise",
            "preview",
            "practice",
          ].includes(route) &&
            !route.startsWith("entry/") &&
            !studioMode && (
              <div className="empty-state">
                <h1>새로운 첫줄로 돌아갈까요?</h1>
                <button className="primary" onClick={() => navigate("home")}>
                  작업실로 돌아가기
                </button>
              </div>
            )}
          <footer>
            <div>
              <Feather size={16} />
              <span>한 줄에서 시작되는, 나다운 이야기.</span>
            </div>
            <p>
              글은 이 브라우저에 저장돼요. 다른 기기에서는 이어볼 수 없어요.
              <br />
              브라우저 데이터를 삭제하면 글이 사라질 수 있어요. 공용 기기에서는
              다른 사람도 볼 수 있어요.
            </p>
          </footer>
        </main>
      </div>
      {pendingPrompt && (
        <Modal
          title="쓰던 이야기가 있어요"
          close={() => setPendingPrompt(null)}
        >
          <p>
            쓰던 글을 이어갈까요? ‘{pendingPrompt.title}’로 새 글을 시작하면
            진행 중인 초안과 수정 내용이 사라져요.
          </p>
          <div className="modal-actions">
            <button className="primary" onClick={() => resolvePrompt(true)}>
              기존 글 유지 · 이어서 쓰기
            </button>
            <button className="secondary" onClick={() => resolvePrompt(false)}>
              새 글 시작
            </button>
            <button
              className="text-button"
              onClick={() => setPendingPrompt(null)}
            >
              취소
            </button>
          </div>
        </Modal>
      )}
      {deleteId && (
        <Modal
          title="이 글을 보내줄까요?"
          close={() => {
            setDeleteId(null);
            setMessage("");
          }}
        >
          <p>
            선택한 글과 함께 보관한 내용이 삭제돼요. 삭제한 글은 되돌릴 수
            없어요.
          </p>
          <div className="modal-actions">
            <button
              className="danger-button"
              onClick={() => {
                if (
                  studio.book.entries.some((e) => e.id === deleteId)
                    ? studio.commit({
                        ...studio.book,
                        entries: studio.book.entries.filter(
                          (e) => e.id !== deleteId,
                        ),
                      })
                    : commit({
                        ...book,
                        entries: book.entries.filter((e) => e.id !== deleteId),
                      })
                ) {
                  setDeleteId(null);
                  setNotice("글을 삭제했어요.");
                  navigate("library");
                } else
                  setMessage(
                    "삭제하지 못했어요. 글은 그대로 보관되어 있어요. 다시 시도해주세요.",
                  );
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
            <p className="inline-error" role="alert">
              {message}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
