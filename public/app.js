const socket = io();
const isAdmin = location.pathname === '/admin';
let currentState;
let availableQuestions = [];
const colors = ['cyan', 'green', 'yellow', 'orange', 'red'];

// タイマー開始中に流すBGMと正解/不正解の効果音、クリア/時間切れ時に流すBGM
const bgmAudio = new Audio('/bgm/normalbgm.mp3');
bgmAudio.loop = true;
const goodAudio = new Audio('/bgm/goodsound.mp3');
const badAudio = new Audio('/bgm/badsound.mp3');
const clearAudio = new Audio('/bgm/clearbgm.mp3');
const failAudio = new Audio('/bgm/failbgm.mp3');
// ブラウザの自動再生制限を回避するため、初回操作時に無音再生して再生を許可させる
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  [bgmAudio, goodAudio, badAudio, clearAudio, failAudio].forEach((audio) => {
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {});
  });
}
document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
let previousStatus = null;
socket.on('sfx', (type) => {
  const audio = type === 'good' ? goodAudio : type === 'bad' ? badAudio : null;
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
});

function normalizeQuestionType(value) {
  if (value === 'char' || value === '文字出題型') return 'char';
  if (value === 'image' || value === '画像出題型') return 'image';
  return 'text';
}
function normalizeQuestionText(question = {}) {
  return question.text ?? question.questionText ?? '';
}
function normalizeAnswerCount(value, fallback = 5) {
  const count = Number(value ?? fallback);
  return count === 10 ? 10 : 5;
}
function normalizeDuration(question = {}, fallback = 60) {
  return Number(question.duration ?? question.timeLimit) || fallback;
}
function normalizeQuestionNumber(question = {}) {
  return String(question.number ?? '01');
}
function toImageList(question = {}) {
  const rawValue =
    question.images ?? question.imageUrl ?? question.imageUrls ?? [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === 'string') return [rawValue];
  return [];
}
function toTargetList(question = {}) {
  const rawValue = question.target ?? [];
  if (Array.isArray(rawValue)) return rawValue;
  if (typeof rawValue === 'string') return [rawValue];
  return [];
}

if (isAdmin)
  fetch('/api/questions')
    .then((response) => response.json())
    .then((questions) => {
      availableQuestions = questions;
      render();
    });
socket.on('state', (state) => {
  const isRunning = state.status === 'running';
  if (isRunning && previousStatus !== 'running') {
    bgmAudio.currentTime = 0;
    bgmAudio.play().catch(() => {});
  } else if (!isRunning && previousStatus === 'running') {
    bgmAudio.pause();
  }
  if (state.status === 'cleared' && previousStatus !== 'cleared') {
    clearAudio.currentTime = 0;
    clearAudio.play().catch(() => {});
  } else if (state.status !== 'cleared' && previousStatus === 'cleared') {
    clearAudio.pause();
    clearAudio.currentTime = 0;
  }
  if (state.status === 'over' && previousStatus !== 'over') {
    failAudio.currentTime = 0;
    failAudio.play().catch(() => {});
  } else if (state.status !== 'over' && previousStatus === 'over') {
    failAudio.pause();
    failAudio.currentTime = 0;
  }
  previousStatus = state.status;
  currentState = state;
  render();
});
function escapeHtml(value = '') {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ],
  );
}
function render() {
  if (!currentState) return;
  document.querySelector('#app').innerHTML = isAdmin
    ? adminTemplate(currentState)
    : boardTemplate(currentState);
}
function boardTemplate(state) {
  // 進行中は実際のラウンドの問題を、それ以外は管理画面でセット中の問題をリアルタイムに反映する
  const question =
    (state.status === 'running' ? state.question : state.pendingQuestion) ||
    state.question ||
    {};
  const normalizedType = normalizeQuestionType(
    question.type ?? question.questionType,
  );
  const count = normalizeAnswerCount(question.count ?? question.answerCount, 5);
  const positions = Array.from({ length: 5 }, (_, i) => i);
  const images = toImageList(question).slice(0, count);
  const targetList = toTargetList(question).slice(0, count);
  const questionText = normalizeQuestionText(question);
  // タイマーは進行中のみ、問題文は管理画面の表示/非表示トグルに従う
  const isActive = state.status === 'running';
  const isQuestionVisible = Boolean(state.questionVisible);
  const timerText = isActive
    ? `${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}`
    : '';
  const questionPanelContent = isQuestionVisible
    ? normalizedType === 'image'
      ? images
          .map(
            (image, i) =>
              `<div class="question-image"><img src="${escapeHtml(image)}" alt="出題画像 ${i + 1}">${state.accepted.includes(i) ? '<span class="check">✓</span>' : ''}</div>`,
          )
          .join('')
      : normalizedType === 'char'
        ? targetList
            .map(
              (item, i) =>
                `<div class="question-image char-tile"><span>${escapeHtml(item)}</span>${state.accepted.includes(i) ? '<span class="check">✓</span>' : ''}</div>`,
            )
            .join('')
        : `<p>${escapeHtml(questionText)}</p>`
    : '';
  return `<section class="board-screen ${state.status}">
    <header class="topbar"><div class="brand">TERA <strong>BOMBER</strong></div><div class="question-number">QUESTION <b>${isQuestionVisible ? escapeHtml(normalizeQuestionNumber(question)) : ''}</b></div><div class="timer">${timerText}</div></header>
    <div class="question-panel ${isQuestionVisible && (normalizedType === 'image' || normalizedType === 'char') ? 'image-question' : ''}">${questionPanelContent}</div>
    <div class="status-ribbon">${state.status === 'cleared' ? 'GAME CLEAR' : state.status === 'over' ? 'GAME OVER' : state.status === 'running' ? 'TIME ATTACK' : 'READY?'}</div>
    <div class="lanes">${positions.map((position, i) => `<div class="lane ${colors[i % 5]}"><div class="helmet">${['BLUE', 'GREEN', 'GOLD', 'SUNSET', 'SCARLET'][i % 5]}</div><div class="tube"><div class="progress" style="height:${state.running && position === state.bombPosition % 5 ? Math.max(8, 100 - (state.remaining / state.duration) * 100) : 8}%"></div>${state.bombPosition % 5 === position && state.status !== 'cleared' ? '<div class="bomb">💣</div>' : ''}${state.accepted.some((acceptedPosition) => acceptedPosition % 5 === position) ? '<div class="hit">✓</div>' : ''}</div><div class="player-label">PLAYER ${i + 1}</div></div>`).join('')}</div>
    <div class="answer-display"><span>ANSWER</span><b>${escapeHtml(state.answerText) || '回答入力待ち'}</b></div>
    <footer><span>5 PLAYERS</span><span>HOST CONTROLLED</span><span>${count} ANSWERS TO CLEAR</span></footer>
  </section>`;
}
function adminTemplate(state) {
  const active = state.question || {};
  const pendingQuestion = state.pendingQuestion || active;
  const currentId = normalizeQuestionNumber(pendingQuestion);
  const selected =
    availableQuestions.find(
      (question) => normalizeQuestionNumber(question) === currentId,
    ) ||
    availableQuestions[0] ||
    pendingQuestion;
  const currentType = normalizeQuestionType(
    selected.type ?? selected.questionType,
  );
  const currentCount = normalizeAnswerCount(
    selected.count ?? selected.answerCount,
    5,
  );
  const currentDuration = normalizeDuration(selected, state.duration);
  const typeLabel =
    currentType === 'char'
      ? '文字出題型'
      : currentType === 'image'
        ? '画像出題型'
        : '問題文型';
  const activeCount = normalizeAnswerCount(
    active.count ?? active.answerCount,
    5,
  );
  // 進行中は実際のラウンドの問題形式、それ以外はセット中の問題形式をリアルタイムに反映する
  const displayQuestion =
    (state.status === 'running' ? active : state.pendingQuestion) || active;
  const activeType = normalizeQuestionType(
    displayQuestion.type ?? displayQuestion.questionType,
  );
  const activeTargetList = toTargetList(displayQuestion);
  const displayCount = normalizeAnswerCount(
    displayQuestion.count ?? displayQuestion.answerCount,
    5,
  );
  const pendingLabel = state.pendingQuestion
    ? `${escapeHtml(normalizeQuestionNumber(state.pendingQuestion))}. ${escapeHtml(normalizeQuestionText(state.pendingQuestion))}`
    : '未選択';
  const activeLabel =
    state.status === 'running'
      ? `${escapeHtml(normalizeQuestionNumber(active))}. ${escapeHtml(normalizeQuestionText(active))}`
      : '停止中（タイマー開始で反映されます）';
  const shiftButtons = `<div class="shift-control"><button class="shift-back" id="shift-back">◀戻す</button><button class="shift-forward" id="shift-forward">進む▶</button></div>`;
  const judgeContent =
    activeType === 'char'
      ? `<div class="answer-grid">${Array.from(
          { length: displayCount },
          (_, i) => {
            const label = activeTargetList[i] || `${i + 1}`;
            const status = state.accepted.includes(i)
              ? 'correct'
              : (state.rejected || []).includes(i)
                ? 'wrong'
                : 'none';
            return `<div class="answer-item"><span class="answer-label">${escapeHtml(label)}</span><button class="answer-toggle status-${status}" data-index="${i}" data-status="${status}"></button></div>`;
          },
        ).join('')}${shiftButtons}`
      : `<label>現在の回答<input id="answer" value="${escapeHtml(state.answerText)}" placeholder="回答を入力"></label><div><button class="correct" id="correct">正解 ✓</button><button class="wrong" id="wrong">不正解 ×</button></div>${shiftButtons}`;
  return `<section class="admin-shell"><header class="admin-header"><div><span class="eyebrow">CULTURAL FESTIVAL / CONTROL ROOM</span><h1>Tera Bomber <em>司会者コンソール</em></h1></div><a class="view-link" href="/" target="_blank">表示画面を開く ↗</a></header>
    <div class="admin-grid"><div class="control-panel"><h2>ROUND SETUP</h2><label>出題する問題<select id="question-select">${availableQuestions.map((question) => `<option value="${escapeHtml(normalizeQuestionNumber(question))}" ${normalizeQuestionNumber(question) === currentId ? 'selected' : ''}>${escapeHtml(normalizeQuestionNumber(question))}. ${escapeHtml(normalizeQuestionText(question))}</option>`).join('')}</select></label><div class="split"><label>問題形式<span class="readonly-value" id="question-type-display">${escapeHtml(typeLabel)}</span></label><label>回答数<span class="readonly-value" id="answer-count-display">${currentCount}問</span></label></div><label>制限時間<span class="readonly-value" id="duration-display">${currentDuration}秒</span></label><label>問題文<div class="readonly-value question-preview" id="question-preview">${escapeHtml(normalizeQuestionText(selected))}</div></label><button class="primary" id="apply-question">問題をセットする</button><div class="pending-banner" id="pending-banner">✔ 次回タイマー開始でセットされる問題: <strong>${pendingLabel}</strong></div></div>
    <div class="control-panel live"><div class="panel-title"><h2>LIVE CONTROL</h2><span class="live-dot">● ${state.status.toUpperCase()}</span></div><div class="active-question" id="active-question">出題中: <strong>${activeLabel}</strong></div><div class="big-time">${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}</div><div class="control-actions"><button class="primary" id="start">${state.running ? 'タイマー進行中' : 'タイマーを開始'}</button><button id="reset">ラウンドをリセット</button></div><div class="control-actions"><button class="${state.questionVisible ? 'wrong' : 'correct'}" id="toggle-question-visible">${state.questionVisible ? '問題文を非表示にする' : '問題文を表示する'}</button></div><div class="judge">${judgeContent}</div><div class="position-control"><span>爆弾位置</span>${Array.from({ length: activeCount === 10 ? 10 : 5 }, (_, i) => `<button class="position ${i === state.bombPosition ? 'selected' : ''}" data-position="${i}">${i + 1}</button>`).join('')}</div></div></div></section>`;
}
document.addEventListener('click', (event) => {
  const id = event.target.id;
  if (id === 'start') socket.emit('admin:start');
  if (id === 'reset') socket.emit('admin:reset');
  if (id === 'toggle-question-visible')
    socket.emit('admin:setQuestionVisible', !currentState.questionVisible);
  if (id === 'apply-question') {
    const selected =
      availableQuestions.find(
        (question) =>
          normalizeQuestionNumber(question) ===
          document.querySelector('#question-select').value,
      ) || {};
    const normalizedType = normalizeQuestionType(
      selected.type ?? selected.questionType,
    );
    const normalizedCount = normalizeAnswerCount(
      selected.count ?? selected.answerCount,
      5,
    );
    const duration = normalizeDuration(selected, currentState.duration);
    socket.emit('admin:setQuestion', {
      ...selected,
      id: selected.id || normalizeQuestionNumber(selected),
      number: normalizeQuestionNumber(selected),
      type: normalizedType,
      questionType:
        normalizedType === 'char'
          ? '文字出題型'
          : normalizedType === 'image'
            ? '画像出題型'
            : '問題文型',
      count: normalizedCount,
      answerCount: String(normalizedCount),
      text: normalizeQuestionText(selected),
      questionText: normalizeQuestionText(selected),
      target: toTargetList(selected),
      duration,
      timeLimit: String(duration),
    });
  }
  if (id === 'correct' || id === 'wrong')
    socket.emit('admin:answer', {
      correct: id === 'correct',
      answer: document.querySelector('#answer').value,
    });
  if (event.target.matches('.position'))
    socket.emit('admin:manualPosition', event.target.dataset.position);
  if (id === 'shift-forward')
    socket.emit('admin:shiftPosition', { direction: 1 });
  if (id === 'shift-back')
    socket.emit('admin:shiftPosition', { direction: -1 });
  if (event.target.matches('.answer-toggle')) {
    const current = event.target.dataset.status;
    const next =
      current === 'none' ? 'correct' : current === 'correct' ? 'wrong' : 'none';
    socket.emit('admin:markAnswer', {
      index: Number(event.target.dataset.index),
      status: next,
    });
  }
});
document.addEventListener('change', (event) => {
  if (event.target.id !== 'question-select') return;
  const question = availableQuestions.find(
    (item) => normalizeQuestionNumber(item) === event.target.value,
  );
  if (!question) return;
  const normalizedType = normalizeQuestionType(
    question.type ?? question.questionType ?? 'text',
  );
  const normalizedCount = normalizeAnswerCount(
    question.count ?? question.answerCount,
    5,
  );
  const duration = normalizeDuration(question, 60);
  document.querySelector('#question-type-display').textContent =
    normalizedType === 'char'
      ? '文字出題型'
      : normalizedType === 'image'
        ? '画像出題型'
        : '問題文型';
  document.querySelector('#answer-count-display').textContent =
    `${normalizedCount}問`;
  document.querySelector('#duration-display').textContent = `${duration}秒`;
  document.querySelector('#question-preview').textContent =
    normalizeQuestionText(question) || '';
});
