(() => {
  "use strict";

  const STORE_KEY = "jp-licence-study-v1";
  const PASS_RATE = 0.9; // The real learner's permit test requires 90%.

  // ---------- persistence ----------
  // stats: { "<setId>:<n>": { right: number, wrong: number, last: boolean } }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* storage unavailable */ }
    return { setId: QUESTION_SETS[0].id, stats: {} };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) { /* ignore */ }
  }
  const state = load();
  if (!QUESTION_SETS.some((s) => s.id === state.setId)) state.setId = QUESTION_SETS[0].id;

  const currentSet = () => QUESTION_SETS.find((s) => s.id === state.setId);
  const key = (q) => `${state.setId}:${q.n}`;
  const stat = (q) => state.stats[key(q)];

  function record(q, correct) {
    const s = state.stats[key(q)] || { right: 0, wrong: 0, last: null };
    correct ? s.right++ : s.wrong++;
    s.last = correct;
    state.stats[key(q)] = s;
    save();
  }

  // ---------- helpers ----------
  const app = document.getElementById("app");
  const topInfo = document.getElementById("topInfo");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const tf = (b) => (b ? "True" : "False");
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- home ----------
  function home() {
    session = null;
    topInfo.textContent = "";
    const set = currentSet();
    const qs = set.questions;
    const seen = qs.filter((q) => stat(q)).length;
    const mastered = qs.filter((q) => stat(q) && stat(q).last === true).length;
    const missed = qs.filter((q) => stat(q) && stat(q).last === false).length;

    const setOptions = QUESTION_SETS.map(
      (s) => `<option value="${s.id}" ${s.id === set.id ? "selected" : ""}>${esc(s.title)} (${s.questions.length} questions)</option>`
    ).join("");

    app.innerHTML = `
      <div class="card">
        <h1>Japanese Driver's Licence</h1>
        <p class="muted small">Study the True / False questions for the learner's permit test. Pass mark: ${PASS_RATE * 100}%.</p>
        ${QUESTION_SETS.length > 1 ? `<select id="setSel">${setOptions}</select>` : `<b>${esc(set.title)}</b>`}
      </div>

      <div class="card stats">
        <div class="stat"><b>${seen}/${qs.length}</b><span class="muted small">answered</span></div>
        <div class="stat"><b style="color:var(--ok)">${mastered}</b><span class="muted small">last correct</span></div>
        <div class="stat"><b style="color:var(--bad)">${missed}</b><span class="muted small">to review</span></div>
      </div>

      <div class="modes">
        <button class="btn mode" data-mode="practice"><span class="icon">📘</span><span><b>Practice in order</b><span class="d">Answer each question and see the explanation right away.</span></span></button>
        <button class="btn mode" data-mode="shuffle"><span class="icon">🔀</span><span><b>Random practice</b><span class="d">All questions in random order, with instant feedback.</span></span></button>
        <button class="btn mode" data-mode="exam"><span class="icon">📝</span><span><b>Mock exam</b><span class="d">All questions, random order, results only at the end.</span></span></button>
        <button class="btn mode" data-mode="review" ${missed ? "" : "disabled"}><span class="icon">🔁</span><span><b>Review mistakes (${missed})</b><span class="d">Only questions you got wrong last time.</span></span></button>
        <button class="btn mode" data-mode="browse"><span class="icon">📄</span><span><b>Browse answers</b><span class="d">Read every question with its answer and explanation.</span></span></button>
      </div>

      <p style="text-align:center;margin-top:20px"><button class="link muted small" id="resetBtn">Reset progress for this set</button></p>
    `;

    const sel = document.getElementById("setSel");
    if (sel) sel.onchange = () => { state.setId = sel.value; save(); home(); };
    app.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => start(b.dataset.mode)));
    document.getElementById("resetBtn").onclick = () => {
      if (!confirm("Reset all progress for this question set?")) return;
      qs.forEach((q) => delete state.stats[key(q)]);
      save();
      home();
    };
  }

  // ---------- quiz session ----------
  let session = null;

  function start(mode) {
    const qs = currentSet().questions;
    if (mode === "browse") return browse();
    let list;
    if (mode === "practice") list = qs.slice();
    else if (mode === "review") list = shuffle(qs.filter((q) => stat(q) && stat(q).last === false));
    else list = shuffle(qs);
    if (!list.length) return home();
    session = { mode, list, i: 0, answers: new Array(list.length).fill(null) };
    renderQuestion();
  }

  function renderQuestion() {
    const { list, i, answers, mode } = session;
    const q = list[i];
    const answered = answers[i];
    const exam = mode === "exam";
    const correctCount = answers.filter((a, k) => a !== null && a === list[k].a).length;
    const doneCount = answers.filter((a) => a !== null).length;
    topInfo.textContent = exam ? `${doneCount}/${list.length}` : `✔ ${correctCount} / ${doneCount}`;

    const btnClass = (val) => {
      if (answered === null) return "btn";
      if (exam) return answered === val ? "btn primary" : "btn";
      if (val === q.a) return "btn correct";
      if (val === answered) return "btn wrong";
      return "btn";
    };

    let feedback = "";
    if (answered !== null && !exam) {
      const ok = answered === q.a;
      feedback = `
        <div class="feedback ${ok ? "ok" : "bad"}">
          <div class="verdict">${ok ? "Correct!" : "Wrong"} — the answer is ${tf(q.a)}.</div>
          <div>${esc(q.e)}</div>
        </div>`;
    }

    const last = i === list.length - 1;
    app.innerHTML = `
      <div class="progress"><div style="width:${((i + 1) / list.length) * 100}%"></div></div>
      <div class="card">
        <div class="qnum">Question ${i + 1} of ${list.length} · #${q.n}</div>
        <p class="qtext">${esc(q.q)}</p>
        ${q.img ? `<div class="figure"><img src="${q.img}" alt="Figure for question ${q.n}"></div>` : ""}
        <div class="answers">
          <button class="${btnClass(true)}" data-v="1" ${answered !== null && !exam ? "disabled" : ""}>⭕ True</button>
          <button class="${btnClass(false)}" data-v="0" ${answered !== null && !exam ? "disabled" : ""}>❌ False</button>
        </div>
        ${feedback}
      </div>
      <div class="nav">
        <button class="btn" id="prevBtn" ${i === 0 ? "disabled" : ""}>← Back</button>
        <button class="btn primary" id="nextBtn" ${answered === null ? "disabled" : ""}>${last ? "Finish" : "Next →"}</button>
      </div>
      <p style="text-align:center"><button class="link muted small" id="quitBtn">Quit to menu</button></p>
    `;

    app.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => answer(b.dataset.v === "1")));
    document.getElementById("prevBtn").onclick = () => { session.i--; renderQuestion(); };
    document.getElementById("nextBtn").onclick = next;
    document.getElementById("quitBtn").onclick = () => {
      if (doneCount && !confirm("Quit this session?")) return;
      home();
    };
  }

  function answer(val) {
    const { list, i, mode, answers } = session;
    if (mode !== "exam" && answers[i] !== null) return;
    answers[i] = val;
    if (mode !== "exam") record(list[i], val === list[i].a);
    renderQuestion();
  }

  function next() {
    if (session.answers[session.i] === null) return;
    if (session.i < session.list.length - 1) {
      session.i++;
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    const { list, answers, mode } = session;
    if (mode === "exam") list.forEach((q, k) => record(q, answers[k] === q.a));
    const correct = list.filter((q, k) => answers[k] === q.a).length;
    const rate = correct / list.length;
    const passed = rate >= PASS_RATE;
    const wrong = list.map((q, k) => ({ q, a: answers[k] })).filter((x) => x.a !== x.q.a);
    topInfo.textContent = "";

    app.innerHTML = `
      <div class="card" style="text-align:center">
        <h2>${mode === "exam" ? "Mock exam result" : "Session complete"}</h2>
        <div class="result-score ${passed ? "pass" : "fail"}">${correct}/${list.length}</div>
        <div class="${passed ? "pass" : "fail"}"><b>${Math.round(rate * 100)}% — ${passed ? "Pass 🎉" : `Not yet (need ${PASS_RATE * 100}%)`}</b></div>
      </div>
      ${wrong.length ? `
      <div class="card">
        <h2>Questions you missed (${wrong.length})</h2>
        ${wrong.map(({ q, a }) => itemHtml(q, `You answered ${tf(a)}.`)).join("")}
      </div>` : ""}
      <div class="nav">
        <button class="btn" id="menuBtn">Menu</button>
        ${wrong.length ? `<button class="btn primary" id="retryBtn">Retry missed</button>` : `<button class="btn primary" id="againBtn">Again</button>`}
      </div>
    `;
    document.getElementById("menuBtn").onclick = home;
    const retry = document.getElementById("retryBtn");
    if (retry) retry.onclick = () => {
      session = { mode: "review", list: shuffle(wrong.map((w) => w.q)), i: 0, answers: new Array(wrong.length).fill(null) };
      renderQuestion();
    };
    const again = document.getElementById("againBtn");
    if (again) again.onclick = () => start(mode);
    window.scrollTo(0, 0);
  }

  // ---------- browse ----------
  function itemHtml(q, extra) {
    return `
      <div class="list-item">
        <div><span class="badge ${q.a ? "T" : "F"}">${q.a ? "T" : "F"}</span><b>#${q.n}</b> ${esc(q.q)}</div>
        ${q.img ? `<img src="${q.img}" alt="Figure for question ${q.n}">` : ""}
        <div class="muted small">${extra ? esc(extra) + " " : ""}${esc(q.e)}</div>
      </div>`;
  }

  function browse() {
    const set = currentSet();
    topInfo.textContent = "";
    app.innerHTML = `
      <div class="card">
        <h2>${esc(set.title)} — all answers</h2>
        ${set.questions.map((q) => itemHtml(q)).join("")}
      </div>
      <div class="nav"><button class="btn" id="menuBtn">Back to menu</button></div>
    `;
    document.getElementById("menuBtn").onclick = home;
    window.scrollTo(0, 0);
  }

  // ---------- keyboard shortcuts ----------
  document.addEventListener("keydown", (e) => {
    if (!session || !document.getElementById("nextBtn")) return;
    const k = e.key.toLowerCase();
    if (k === "t" || k === "o" || k === "1") answer(true);
    else if (k === "f" || k === "x" || k === "2") answer(false);
    else if (k === "enter" || k === "arrowright") next();
    else if (k === "arrowleft" && session.i > 0) { session.i--; renderQuestion(); }
  });

  document.getElementById("homeBtn").onclick = () => {
    if (session && session.answers.some((a) => a !== null) && !confirm("Quit this session?")) return;
    home();
  };

  home();
})();
