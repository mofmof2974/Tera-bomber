const socket = io();
const isAdmin = location.pathname === '/admin';
let currentState;
let availableQuestions = [];
const colors = ['cyan', 'green', 'yellow', 'orange', 'red'];

function normalizeQuestionType(value) {
  return value === 'image' || value === '画像出題型' ? 'image' : 'text';
}
function normalizeQuestionText(question = {}) {
  return question.text ?? question.questionText ?? '';
}
function normalizeAnswerCount(value, fallback = 5) {
  const count = Number(value ?? fallback);
  return count === 10 ? 10 : 5;
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

if (isAdmin)
  fetch('/api/questions')
    .then((response) => response.json())
    .then((questions) => {
      availableQuestions = questions;
      render();
    });
socket.on('state', (state) => {
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
  const question = state.question || {};
  const normalizedType = normalizeQuestionType(
    question.type ?? question.questionType,
  );
  const count = normalizeAnswerCount(question.count ?? question.answerCount, 5);
  const positions = Array.from({ length: 5 }, (_, i) => i);
  const images = toImageList(question).slice(0, count);
  const questionText = normalizeQuestionText(question);
  return `<section class="board-screen ${state.status}">
    <header class="topbar"><div class="brand">TERA <strong>BOMBER</strong></div><div class="question-number">QUESTION <b>${escapeHtml(normalizeQuestionNumber(question))}</b></div><div class="timer">${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}</div></header>
    <div class="question-panel ${normalizedType === 'image' ? 'image-question' : ''}">${normalizedType === 'image' ? images.map((image, i) => `<div class="question-image"><img src="${escapeHtml(image)}" alt="出題画像 ${i + 1}">${state.accepted.includes(i) ? '<span class="check">✓</span>' : ''}</div>`).join('') : `<p>${escapeHtml(questionText)}</p>`}</div>
    <div class="status-ribbon">${state.status === 'cleared' ? 'GAME CLEAR' : state.status === 'over' ? 'GAME OVER' : state.status === 'running' ? 'TIME ATTACK' : 'READY?'}</div>
    <div class="lanes">${positions.map((position, i) => `<div class="lane ${colors[i % 5]}"><div class="helmet">${['BLUE', 'GREEN', 'GOLD', 'SUNSET', 'SCARLET'][i % 5]}</div><div class="tube"><div class="progress" style="height:${state.running && position === state.bombPosition % 5 ? Math.max(8, 100 - (state.remaining / state.duration) * 100) : 8}%"></div>${state.bombPosition % 5 === position && state.status !== 'cleared' ? '<div class="bomb">💣</div>' : ''}${state.accepted.some((acceptedPosition) => acceptedPosition % 5 === position) ? '<div class="hit">✓</div>' : ''}</div><div class="player-label">PLAYER ${i + 1}</div></div>`).join('')}</div>
    <div class="answer-display"><span>ANSWER</span><b>${escapeHtml(state.answerText) || '回答入力待ち'}</b></div>
    <footer><span>5 PLAYERS</span><span>HOST CONTROLLED</span><span>${count} ANSWERS TO CLEAR</span></footer>
  </section>`;
}
function adminTemplate(state) {
  const q = state.question || {};
  const currentType = normalizeQuestionType(q.type ?? q.questionType);
  const questionOptions = availableQuestions.length
    ? availableQuestions
    : [
        {
          id: 'demo',
          source: 'demo',
          type: currentType,
          count: normalizeAnswerCount(q.count ?? q.answerCount, 5),
          text: normalizeQuestionText(q),
          number: normalizeQuestionNumber(q),
        },
      ];
  return `<section class="admin-shell"><header class="admin-header"><div><span class="eyebrow">CULTURAL FESTIVAL / CONTROL ROOM</span><h1>Tera Bomber <em>司会者コンソール</em></h1></div><a class="view-link" href="/" target="_blank">表示画面を開く ↗</a></header>
    <div class="admin-grid"><div class="control-panel"><h2>ROUND SETUP</h2><label>出題する問題<select id="question-select">${questionOptions.map((question) => `<option value="${escapeHtml(question.id || question.source || question.number || 'manual')}">${escapeHtml(question.source || question.number || question.id || '問題')}</option>`).join('')}</select></label><div class="split"><label>問題タイプ<select id="question-type"><option value="text" ${currentType === 'text' ? 'selected' : ''}>問題文型</option><option value="image" ${currentType === 'image' ? 'selected' : ''}>画像出題型</option></select></label><label>回答数<select id="answer-count"><option value="5" ${normalizeAnswerCount(q.count ?? q.answerCount, 5) !== 10 ? 'selected' : ''}>5問</option><option value="10" ${normalizeAnswerCount(q.count ?? q.answerCount, 5) === 10 ? 'selected' : ''}>10問</option></select></label></div><label>問題文<textarea id="question-text">${escapeHtml(normalizeQuestionText(q))}</textarea></label><label>制限時間（秒）<input id="duration" type="number" min="5" max="600" value="${state.duration}"></label><button class="primary" id="apply-question">問題をセットする</button></div>
    <div class="control-panel live"><div class="panel-title"><h2>LIVE CONTROL</h2><span class="live-dot">● ${state.status.toUpperCase()}</span></div><div class="big-time">${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}</div><div class="control-actions"><button class="primary" id="start">${state.running ? 'タイマー進行中' : 'タイマーを開始'}</button><button id="reset">ラウンドをリセット</button></div><div class="judge"><label>現在の回答<input id="answer" value="${escapeHtml(state.answerText)}" placeholder="回答を入力"></label><div><button class="correct" id="correct">正解 ✓</button><button class="wrong" id="wrong">不正解 ×</button></div></div><div class="position-control"><span>爆弾位置</span>${Array.from({ length: normalizeAnswerCount(q.count ?? q.answerCount, 5) === 10 ? 10 : 5 }, (_, i) => `<button class="position ${i === state.bombPosition ? 'selected' : ''}" data-position="${i}">${i + 1}</button>`).join('')}</div></div></div><div class="admin-note">問題ファイルは <strong>問題用フォルド</strong> に JSON / TXT / MD 形式で追加できます。JSON は <code>{"type":"text","count":5,"text":"問題文"}</code> を基本形にしてください。</div></section>`;
}
document.addEventListener('click', (event) => {
  const id = event.target.id;
  if (id === 'start') socket.emit('admin:start');
  if (id === 'reset') socket.emit('admin:reset');
  if (id === 'apply-question') {
    const selected =
      availableQuestions.find(
        (question) =>
          (question.id || question.source || question.number || 'manual') ===
          document.querySelector('#question-select').value,
      ) || {};
    const typeValue = document.querySelector('#question-type').value;
    const countValue = document.querySelector('#answer-count').value;
    const textValue = document.querySelector('#question-text').value;
    const normalizedType = normalizeQuestionType(typeValue);
    const normalizedCount = normalizeAnswerCount(countValue, 5);
    const normalizedImageList = toImageList(selected);
    socket.emit('admin:setQuestion', {
      ...selected,
      id: selected.id || selected.source || 'manual',
      number: selected.number || '01',
      type: normalizedType,
      questionType: normalizedType === 'image' ? '画像出題型' : '問題文型',
      count: normalizedCount,
      answerCount: String(normalizedCount),
      text: textValue,
      questionText: textValue,
      images: normalizedImageList.length
        ? normalizedImageList
        : selected.images,
      imageUrl:
        selected.imageUrl ||
        (normalizedImageList.length ? normalizedImageList[0] : ''),
    });
    socket.emit('admin:setDuration', document.querySelector('#duration').value);
  }
  if (id === 'correct' || id === 'wrong')
    socket.emit('admin:answer', {
      correct: id === 'correct',
      answer: document.querySelector('#answer').value,
    });
  if (event.target.matches('.position'))
    socket.emit('admin:manualPosition', event.target.dataset.position);
});
document.addEventListener('change', (event) => {
  if (event.target.id !== 'question-select') return;
  const question = availableQuestions.find(
    (item) =>
      (item.id || item.source || item.number || 'manual') ===
      event.target.value,
  );
  if (!question) return;
  const normalizedType = normalizeQuestionType(
    question.type ?? question.questionType ?? 'text',
  );
  const normalizedCount = normalizeAnswerCount(
    question.count ?? question.answerCount ?? 5,
  );
  document.querySelector('#question-type').value = normalizedType;
  document.querySelector('#answer-count').value =
    normalizedCount === 10 ? '10' : '5';
  document.querySelector('#question-text').value =
    normalizeQuestionText(question) || '';
});
