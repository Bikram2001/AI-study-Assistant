import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Brain, Check, ChevronLeft, ChevronRight, RotateCcw, Sparkles, X } from "lucide-react";

export default function App() {
  const [topic, setTopic] = useState("");
  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [retryOnly, setRetryOnly] = useState(false);
  const [quizIndexes, setQuizIndexes] = useState([]);
  const requestRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => () => requestRef.current?.abort(), []);

  const questions = studySet?.quiz || [];
  const activeQuizIndexes = quizIndexes.length ? quizIndexes : questions.map((_, i) => i);
  const wrongIndexes = useMemo(
    () => activeQuizIndexes.filter(i => answers[i] !== questions[i]?.answerIndex),
    [activeQuizIndexes, questions, answers]
  );
  const visibleQuestions = activeQuizIndexes.map(i => questions[i]);
  const score = activeQuizIndexes.reduce((total, i) => total + (answers[i] === questions[i]?.answerIndex ? 1 : 0), 0);

  async function generateStudySet() {
    if (!topic.trim()) {
      setError("Enter a topic or paste your notes first.");
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError("");
    setStudySet(null);
    setAnswers({});
    setSubmitted(false);
    setKnown([]);
    setCardIndex(0);
    setFlipped(false);
    setRetryOnly(false);

    try {
      const response = await fetch("/api/study-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not generate study materials.");
      if (requestId !== requestIdRef.current) return;
      if (!data || !Array.isArray(data.flashcards) || !Array.isArray(data.quiz)) {
        throw new Error("The server returned data in an unexpected format. Please retry.");
      }
      setStudySet(data);
    } catch (err) {
      if (err.name !== "AbortError" && requestId === requestIdRef.current) {
        setError(err.message || "Something went wrong. Please retry.");
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function moveCard(direction) {
    setCardIndex(index => Math.max(0, Math.min(studySet.flashcards.length - 1, index + direction)));
    setFlipped(false);
  }

  function chooseAnswer(questionIndex, optionIndex) {
    if (submitted) return;
    setAnswers(current => ({ ...current, [questionIndex]: optionIndex }));
  }

  function resetQuiz() {
    setAnswers({});
    setSubmitted(false);
    setRetryOnly(false);
  }

  const card = studySet?.flashcards?.[cardIndex];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-icon"><BookOpen size={19} /></span> StudyFlow</a>
        <span className="top-note">YOUR AI STUDY COMPANION</span>
      </header>

      <main className="main">
        <section className="hero">
          <div className="eyebrow"><Sparkles size={14} /> LEARN SMARTER</div>
          <h1>Turn your notes into<br /><span>knowledge that sticks.</span></h1>
          <p>Paste your notes or enter a topic. Get flashcards and a quick quiz, made for the way you learn.</p>
        </section>

        <section className="input-panel">
          <label htmlFor="topic">What are you studying today?</label>
          <textarea
            id="topic"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Paste your class notes, or type a topic like “Photosynthesis”..."
            maxLength={12000}
          />
          <div className="input-footer">
            <span>{topic.length.toLocaleString()} / 12,000 characters</span>
            <button className="primary-btn" onClick={generateStudySet} disabled={loading || !topic.trim()}>
              {loading ? <><span className="spinner" /> Creating...</> : <><Sparkles size={16} /> Generate study set</>}
            </button>
          </div>
        </section>

        {loading && <div className="status-panel"><span className="spinner dark" /><div><strong>Building your study set</strong><p>Reading your notes and preparing cards and questions...</p></div></div>}
        {error && <div className="error-panel"><div><strong>We couldn't create your study set</strong><p>{error}</p></div><button className="secondary-btn" onClick={generateStudySet}><RotateCcw size={15} /> Retry</button></div>}

        {!studySet && !loading && !error && (
          <div className="empty-state"><div className="empty-icon"><Brain size={24} /></div><strong>Your study space is ready</strong><p>Your flashcards and quiz will appear here.</p></div>
        )}

        {studySet && (
          <section className="results">
            <div className="result-heading">
              <div><div className="eyebrow">YOUR STUDY SET</div><h2>{studySet.title}</h2></div>
              <span className="count-pill">{studySet.flashcards.length} cards · {studySet.quiz.length} questions</span>
            </div>
            <div className="tabs">
              <button className={tab === "cards" ? "tab active" : "tab"} onClick={() => setTab("cards")}><BookOpen size={16} /> Flashcards</button>
              <button className={tab === "quiz" ? "tab active" : "tab"} onClick={() => setTab("quiz")}><Brain size={16} /> Quiz</button>
            </div>

            {tab === "cards" && (
              <div className="cards-area">
                <div className="card-progress"><span>Card {cardIndex + 1} of {studySet.flashcards.length}</span><span>{known.length} mastered</span></div>
                <div className="progress-track"><div style={{ width: `${((cardIndex + 1) / studySet.flashcards.length) * 100}%` }} /></div>
                <button className={`flashcard ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped(v => !v)} aria-label="Flip flashcard">
                  <span className="card-label">{flipped ? "ANSWER" : "QUESTION"}</span>
                  <span className="card-content">{flipped ? card.back : card.front}</span>
                  <span className="flip-hint"><RotateCcw size={14} /> Click to flip</span>
                </button>
                <div className="card-actions">
                  <button className="secondary-btn" onClick={() => moveCard(-1)} disabled={cardIndex === 0}><ChevronLeft size={17} /> Previous</button>
                  <button className="know-btn" onClick={() => setKnown(list => list.includes(cardIndex) ? list : [...list, cardIndex])}><Check size={16} /> {known.includes(cardIndex) ? "Mastered" : "I know this"}</button>
                  <button className="secondary-btn" onClick={() => moveCard(1)} disabled={cardIndex === studySet.flashcards.length - 1}>Next <ChevronRight size={17} /></button>
                </div>
              </div>
            )}

            {tab === "quiz" && (
              <div className="quiz-area">
                <div className="quiz-topline">
                  <span>{retryOnly ? "RETEST · INCORRECT ANSWERS" : "CHECK YOUR UNDERSTANDING"}</span>
                  {submitted && <strong>{score} / {questions.length} correct</strong>}
                </div>
                {visibleQuestions.length === 0 && submitted ? (
                  <div className="success-state"><div className="success-icon"><Check size={24} /></div><h3>Perfect score!</h3><p>You answered every question correctly.</p></div>
                ) : visibleQuestions.map((q) => {
                  const originalIndex = questions.indexOf(q);
                  return (
                    <div className="question-card" key={originalIndex}>
                      <h3><span>Q{originalIndex + 1}</span>{q.question}</h3>
                      <div className="options">
                        {q.options.map((option, optionIndex) => {
                          const selected = answers[originalIndex] === optionIndex;
                          const correct = q.answerIndex === optionIndex;
                          let className = selected ? "option selected" : "option";
                          if (submitted && correct) className += " correct";
                          if (submitted && selected && !correct) className += " incorrect";
                          return <button key={optionIndex} className={className} onClick={() => chooseAnswer(originalIndex, optionIndex)} disabled={submitted}>
                            <span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span>{option}
                            {submitted && correct && <Check size={16} />}
                            {submitted && selected && !correct && <X size={16} />}
                          </button>;
                        })}
                      </div>
                      {submitted && <p className="explanation"><strong>Explanation:</strong> {q.explanation}</p>}
                    </div>
                  );
                })}
                {!submitted ? (
                  <button className="primary-btn submit-quiz" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length !== questions.length}>Submit answers</button>
                ) : (
                  <div className="quiz-actions">
                    {wrongIndexes.length > 0 && <button className="secondary-btn" onClick={() => { setQuizIndexes(wrongIndexes); setRetryOnly(true); setSubmitted(false); setAnswers({}); }}><RotateCcw size={15} /> Retest wrong answers ({wrongIndexes.length})</button>}
                    <button className="primary-btn" onClick={resetQuiz}>Try quiz again</button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        <footer>Made for focused learning <span>·</span> Powered by AI</footer>
      </main>
    </div>
  );
}
