"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type ReviewStatus = "PENDING" | "REVIEWED";
type QuestionItem = {
  question: string;
  answer: string;
  status: ReviewStatus;
};
type StatusFilter = "ALL" | ReviewStatus;
type Notice = { kind: "success" | "error"; message: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function Icon({
  name,
  className,
}: {
  name: "upload" | "download" | "check" | "left" | "right" | "search" | "edit" | "close" | "file";
  className?: string;
}) {
  const paths = {
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
    download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M20 16.5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    left: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
    right: <><path d="M5 12h11" /><path d="m13 6 6 6-6 6" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    edit: <><path d="m15 5 4 4" /><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /></>,
    close: <><path d="m18 6-12 12" /><path d="m6 6 12 12" /></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3v7h7" /><path d="M8 14h8M8 18h8" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

function parseQuestionFile(value: unknown): QuestionItem[] {
  if (!Array.isArray(value)) {
    throw new Error('The JSON file must contain a list, for example: [{"question":"...","answer":"..."}].');
  }
  if (value.length === 0) {
    throw new Error("This file has no questions. Add at least one question and answer, then try again.");
  }

  return value.map((item: unknown, index: number) => {
    const number = index + 1;
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`Question ${number} must be an object with "question" and "answer" text.`);
    }

    const record = item as Record<string, unknown>;
    if (typeof record.question !== "string" || !record.question.trim()) {
      throw new Error(`Question ${number} is missing non-empty "question" text.`);
    }
    if (typeof record.answer !== "string" || !record.answer.trim()) {
      throw new Error(`Question ${number} is missing non-empty "answer" text.`);
    }

    return {
      question: record.question,
      answer: record.answer,
      status: "PENDING",
    };
  });
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [datasetName, setDatasetName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [goToValue, setGoToValue] = useState("1");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [dragging, setDragging] = useState(false);

  const reviewedCount = questions.filter((item) => item.status === "REVIEWED").length;
  const pendingCount = questions.length - reviewedCount;
  const visibleIndices = useMemo(
    () =>
      questions.reduce<number[]>((matches, item, index) => {
        const matchesSearch = item.question.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
        const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
        if (matchesSearch && matchesStatus) matches.push(index);
        return matches;
      }, []),
    [questions, search, statusFilter],
  );
  const currentQuestion = questions[currentIndex];
  const currentPosition = visibleIndices.indexOf(currentIndex);
  const progress = questions.length ? Math.round((reviewedCount / questions.length) * 100) : 0;

  useEffect(() => {
    if (visibleIndices.length > 0 && !visibleIndices.includes(currentIndex)) {
      setCurrentIndex(visibleIndices[0]);
    }
  }, [currentIndex, visibleIndices]);

  useEffect(() => {
    setGoToValue(questions.length ? String(currentIndex + 1) : "");
  }, [currentIndex, questions.length]);

  function beginEdit() {
    if (!currentQuestion) return;
    setDraftQuestion(currentQuestion.question);
    setDraftAnswer(currentQuestion.answer);
    setEditing(true);
    setNotice(null);
  }

  function cancelEdit() {
    setEditing(false);
    setDraftQuestion("");
    setDraftAnswer("");
    setNotice(null);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftQuestion.trim() || !draftAnswer.trim()) {
      setNotice({ kind: "error", message: "Both the question and answer are required." });
      return;
    }

    setQuestions((items) =>
      items.map((item, index) =>
        index === currentIndex
          ? { question: draftQuestion, answer: draftAnswer, status: "REVIEWED" }
          : item,
      ),
    );
    setEditing(false);
    setNotice({ kind: "success", message: "Correction saved and marked as reviewed." });
  }

  function setReviewStatus(status: ReviewStatus) {
    setQuestions((items) =>
      items.map((item, index) => (index === currentIndex ? { ...item, status } : item)),
    );
    setNotice({
      kind: "success",
      message: status === "REVIEWED" ? "Question marked as reviewed." : "Question moved back to pending.",
    });
  }

  function moveQuestion(direction: -1 | 1) {
    if (!visibleIndices.length) return;
    const nextPosition =
      currentPosition < 0
        ? 0
        : (currentPosition + direction + visibleIndices.length) % visibleIndices.length;
    setCurrentIndex(visibleIndices[nextPosition]);
    setEditing(false);
    setNotice(null);
  }

  function goToQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = Number(goToValue);
    if (!Number.isInteger(number) || number < 1 || number > questions.length) {
      setNotice({ kind: "error", message: `Enter a question number from 1 to ${questions.length}.` });
      return;
    }
    setSearch("");
    setStatusFilter("ALL");
    setCurrentIndex(number - 1);
    setEditing(false);
    setNotice(null);
  }

  async function importFile(file?: File) {
    if (!file) return;
    setNotice(null);
    if (!file.name.toLocaleLowerCase().endsWith(".json")) {
      setNotice({ kind: "error", message: "Choose a .json file to import." });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setNotice({ kind: "error", message: "This file is larger than 5 MB. Choose a smaller JSON file." });
      return;
    }

    try {
      const imported = parseQuestionFile(JSON.parse(await file.text()) as unknown);
      if (questions.length > 0) {
        const sameContent =
          JSON.stringify(imported.map(({ question, answer }) => ({ question, answer }))) ===
          JSON.stringify(questions.map(({ question, answer }) => ({ question, answer })));
        if (sameContent) {
          setNotice({ kind: "success", message: "These questions are already open. Your corrections are unchanged." });
          return;
        }
        if (
          !window.confirm(
            "Replace the open questions? Any corrections that have not been downloaded will be lost.",
          )
        ) {
          return;
        }
      }

      setQuestions(imported);
      setDatasetName(file.name);
      setCurrentIndex(0);
      setEditing(false);
      setSearch("");
      setStatusFilter("ALL");
      setNotice({ kind: "success", message: `${imported.length} questions imported successfully.` });
    } catch (error) {
      setNotice({
        kind: "error",
        message:
          error instanceof SyntaxError
            ? "This file is not valid JSON. Check the commas, quotation marks, and brackets."
            : error instanceof Error
              ? error.message
              : "The file could not be read. Please try again.",
      });
    }
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    await importFile(event.target.files?.[0]);
    event.target.value = "";
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    await importFile(event.dataTransfer.files[0]);
  }

  function exportFile() {
    if (!questions.length) return;
    const json = JSON.stringify(
      questions.map(({ question, answer }) => ({ question, answer })),
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = datasetName.replace(/\.json$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
    link.href = url;
    link.download = `${baseName || "questions"}-corrected.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice({ kind: "success", message: "Corrected JSON downloaded. Your original file was not changed." });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Khmer Q&A home">
          <span className="brand-mark">K<span>Q</span></span>
          <span className="brand-name">Khmer Q&amp;A<span>Correction workspace</span></span>
        </Link>

        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-current">
          <span className="sidebar-current-icon"><Icon name="file" /></span>
          <span>Question review</span>
          <span className="sidebar-current-dot" />
        </div>

        <div className="sidebar-note">
          <span className="privacy-icon"><Icon name="check" /></span>
          <p><strong>Your file stays private</strong><br />Questions are handled in this browser and are not uploaded to a server.</p>
        </div>

        <div className="sidebar-bottom">
          <span className="sidebar-bottom-mark">ក</span>
          <span>Made for Khmer educators</span>
        </div>
      </aside>

      <section className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Review questions</strong></div>
          <div className="profile"><span className="profile-avatar">T</span><span>Teacher workspace</span></div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">QUESTION REVIEW</p>
              <h1>Review your questions</h1>
              <p className="page-subtitle">Check each answer, make corrections, and download your verified file.</p>
            </div>
            <button
              className="button button-primary import-button"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Icon name="upload" />
              Import JSON
            </button>
            <input
              accept=".json,application/json"
              className="visually-hidden"
              onChange={onFileChange}
              ref={fileInputRef}
              type="file"
            />
          </div>

          {notice && (
            <div className={`notice notice-${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
              <span className="notice-icon">{notice.kind === "success" ? <Icon name="check" /> : "!"}</span>
              <span>{notice.message}</span>
              <button aria-label="Dismiss message" className="notice-dismiss" onClick={() => setNotice(null)} type="button">
                <Icon name="close" />
              </button>
            </div>
          )}

          {questions.length === 0 ? (
            <div
              className={`empty-state${dragging ? " empty-state-dragging" : ""}`}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDrop}
            >
              <div className="empty-illustration">
                <div className="empty-paper empty-paper-back" />
                <div className="empty-paper empty-paper-front">
                  <span /><span /><span />
                  <span className="empty-paper-check"><Icon name="check" /></span>
                </div>
                <span className="empty-plus">+</span>
              </div>
              <p className="eyebrow">GET STARTED</p>
              <h2>Bring your questions in</h2>
              <p className="empty-description">Upload a JSON file to review questions one by one. Your file stays on this device.</p>
              <button className="button button-primary" onClick={() => fileInputRef.current?.click()} type="button">
                <Icon name="upload" />
                Choose a JSON file
              </button>
              <p className="drop-hint">or drag and drop it here <span>·</span> up to 5 MB</p>
              <div className="format-hint">
                <Icon name="file" />
                <code>[&#123; &quot;question&quot;: &quot;...&quot;, &quot;answer&quot;: &quot;...&quot; &#125;]</code>
              </div>
            </div>
          ) : (
            <>
              <section aria-label="Review progress" className="stats-grid">
                <article className="stat-card">
                  <span className="stat-icon stat-icon-blue"><Icon name="file" /></span>
                  <div><p>Total questions</p><strong>{questions.length}</strong></div>
                  <span className="stat-footnote">in this file</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-icon-green"><Icon name="check" /></span>
                  <div><p>Reviewed</p><strong>{reviewedCount}</strong></div>
                  <span className="stat-footnote">{progress}% complete</span>
                </article>
                <article className="stat-card">
                  <span className="stat-icon stat-icon-amber"><span className="pending-dot" /></span>
                  <div><p>Pending</p><strong>{pendingCount}</strong></div>
                  <span className="stat-footnote">still to review</span>
                </article>
              </section>

              <div className="toolbar">
                <div className="dataset-label">
                  <span className="dataset-file-icon"><Icon name="file" /></span>
                  <div><strong>{datasetName}</strong><span>{questions.length} questions loaded</span></div>
                </div>
                <div className="toolbar-actions">
                  <label className="search-field">
                    <Icon name="search" />
                    <input
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search questions"
                      type="search"
                      value={search}
                    />
                  </label>
                  <label className="filter-field">
                    <span className="visually-hidden">Filter questions</span>
                    <select onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} value={statusFilter}>
                      <option value="ALL">All questions</option>
                      <option value="PENDING">Pending</option>
                      <option value="REVIEWED">Reviewed</option>
                    </select>
                  </label>
                  <button className="button button-outline export-button" disabled={!questions.length} onClick={exportFile} type="button">
                    <Icon name="download" />
                    Export JSON
                  </button>
                </div>
              </div>

              <section aria-label="Question review" className="review-card">
                <div className="review-card-top">
                  <div className="question-count">
                    <span className="eyebrow">QUESTION</span>
                    <strong>{currentQuestion ? currentIndex + 1 : 0}<span> / {questions.length}</span></strong>
                  </div>
                  <div className="review-top-right">
                    <form className="goto-form" onSubmit={goToQuestion}>
                      <label htmlFor="goto-question">Go to</label>
                      <input
                        id="goto-question"
                        inputMode="numeric"
                        max={questions.length}
                        min={1}
                        onChange={(event) => setGoToValue(event.target.value)}
                        type="number"
                        value={goToValue}
                      />
                    </form>
                    {currentQuestion && (
                      <span className={`status-badge ${currentQuestion.status === "REVIEWED" ? "status-reviewed" : "status-pending"}`}>
                        <span />{currentQuestion.status === "REVIEWED" ? "Reviewed" : "Pending"}
                      </span>
                    )}
                  </div>
                </div>

                {currentQuestion ? (
                  editing ? (
                    <form className="question-content edit-form" onSubmit={saveEdit}>
                      <div className="field-group">
                        <label htmlFor="edit-question">Question</label>
                        <textarea
                          autoFocus
                          id="edit-question"
                          onChange={(event) => setDraftQuestion(event.target.value)}
                          rows={3}
                          value={draftQuestion}
                        />
                      </div>
                      <div className="field-group">
                        <label htmlFor="edit-answer">Answer</label>
                        <textarea
                          id="edit-answer"
                          onChange={(event) => setDraftAnswer(event.target.value)}
                          rows={5}
                          value={draftAnswer}
                        />
                      </div>
                      <div className="edit-actions">
                        <span>Saving a correction also marks this question as reviewed.</span>
                        <div>
                          <button className="button button-outline" onClick={cancelEdit} type="button">Cancel</button>
                          <button className="button button-primary" type="submit"><Icon name="check" />Save correction</button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="question-content">
                      <article className="qa-block">
                        <div className="qa-label"><span className="qa-label-mark question-mark">Q</span><span>QUESTION</span></div>
                        <p className="khmer-text" lang="km">{currentQuestion.question}</p>
                      </article>
                      <div className="qa-divider" />
                      <article className="qa-block">
                        <div className="qa-label"><span className="qa-label-mark answer-mark">A</span><span>ANSWER</span></div>
                        <p className="khmer-text answer-text" lang="km">{currentQuestion.answer}</p>
                      </article>
                      <div className="review-actions">
                        <button className="button button-outline" onClick={beginEdit} type="button">
                          <Icon name="edit" />Edit question &amp; answer
                        </button>
                        {currentQuestion.status === "PENDING" ? (
                          <button className="button button-primary" onClick={() => setReviewStatus("REVIEWED")} type="button">
                            <Icon name="check" />Mark as reviewed
                          </button>
                        ) : (
                          <button className="button button-reviewed" onClick={() => setReviewStatus("PENDING")} type="button">
                            <Icon name="check" />Reviewed
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  <div className="no-results">
                    <span className="no-results-icon"><Icon name="search" /></span>
                    <h2>No matching questions</h2>
                    <p>Try a different search or status filter.</p>
                    <button className="button button-outline" onClick={() => { setSearch(""); setStatusFilter("ALL"); }} type="button">
                      Show all questions
                    </button>
                  </div>
                )}

                <div className="review-card-bottom">
                  <div className="progress-copy"><span>Review progress</span><strong>{reviewedCount} of {questions.length} reviewed</strong></div>
                  <div aria-label={`${progress}% reviewed`} className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="navigation-row">
                    <span>{visibleIndices.length ? `Showing ${currentPosition + 1} of ${visibleIndices.length}` : "No results"}</span>
                    <div className="navigation-buttons">
                      <button
                        aria-label="Previous question"
                        className="button button-outline nav-button"
                        disabled={visibleIndices.length < 2}
                        onClick={() => moveQuestion(-1)}
                        type="button"
                      ><Icon name="left" />Previous</button>
                      <button
                        aria-label="Next question"
                        className="button button-primary nav-button"
                        disabled={visibleIndices.length < 2}
                        onClick={() => moveQuestion(1)}
                        type="button"
                      >Next<Icon name="right" /></button>
                    </div>
                  </div>
                </div>
              </section>
              <p className="save-note"><Icon name="check" />Changes are held in this browser until you export the corrected JSON.</p>
            </>
          )}
          <footer className="page-footer"><span>Khmer Q&amp;A Correction System</span><span>Human-reviewed answers · Khmer Unicode supported</span></footer>
        </div>
      </section>
    </main>
  );
}
