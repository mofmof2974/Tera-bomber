const socket = io();
const isAdmin = location.pathname === '/admin';
let currentState;
let availableQuestions = [];
const colors = ['cyan', 'green', 'yellow', 'orange', 'red'];
// 回答ステップ(bombPosition, 0始まり)を実際のレーン(0-4)へ変換する。
// 5問なら単純に1対1、10問は右端(P5)まで進んだあと折り返して逆順にもう一周する
// 「往復」順序になるため、専用の対応表を使う
function laneForStep(step, count) {
  const s = Math.max(0, Number(step) || 0);
  if (Number(count) !== 10) return s % 5;
  const sequence = [0, 1, 2, 3, 4, 4, 3, 2, 1, 0];
  return sequence[Math.min(9, s)];
}
// 回答欄(回答者ごと5個)の入力中の値。再描画や送信時にstate.answerTextsより優先して使う
const answerDrafts = {};
document.addEventListener('input', (event) => {
  const id = event.target && event.target.id;
  if (!id || !id.startsWith('answer-')) return;
  const index = Number(id.slice('answer-'.length));
  answerDrafts[index] = event.target.value;
  socket.emit('admin:setAnswerText', { index, text: event.target.value });
});

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
// 正解時、爆弾が隣のレーンへ移る直前のレーン位置のバーを一瞬傾ける演出
let tiltLane = null;
let tiltDirection = 'right';
let tiltTimeout = null;
// バーが爆弾の下端に接する際のオフセット(%)。未停止のバーは全レーンとも爆弾と同じ
// 落下率でずっと落ち続け、正解が押された回答者のレーンだけその高さで停止する
const BAR_TOUCH_OFFSET = 12;
let barHeights = Array(5).fill(BAR_TOUCH_OFFSET);
let frozenLanes = Array(5).fill(false);
socket.on('sfx', (type) => {
  const audio = type === 'good' ? goodAudio : type === 'bad' ? badAudio : null;
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
  if (type === 'good' && currentState) {
    const count = normalizeAnswerCount(
      currentState.question?.count ?? currentState.question?.answerCount,
      5,
    );
    const step = currentState.bombPosition;
    const lane = laneForStep(step, count);
    tiltLane = lane;
    // 10問で右端まで達したあとの2週目(左へ爆弾を渡す間)はバーも左向きに傾ける
    tiltDirection = count === 10 && step >= 5 ? 'left' : 'right';
    // 停止する瞬間の高さ(爆弾が今いる高さ+接触オフセット)でそのレーンのバーを固定する
    const bombTop = Math.max(
      0,
      Math.min(85, (1 - currentState.remaining / currentState.duration) * 100),
    );
    // 10問の場合、各回答者は2回答えるまで停止しない(ステップ0-4が1回目、5-9が2回目)
    const shouldFreeze = count !== 10 || step >= 5;
    if (shouldFreeze) {
      barHeights[lane] = Math.min(96, bombTop + BAR_TOUCH_OFFSET);
      frozenLanes[lane] = true;
    }
    clearTimeout(tiltTimeout);
    tiltTimeout = setTimeout(() => {
      tiltLane = null;
      render();
    }, 600);
    render();
  }
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
  // ラウンドがリセット/新規開始されたら、各レーンのバーの高さ・停止状態も初期化する
  if (state.status === 'ready' || (isRunning && previousStatus !== 'running')) {
    barHeights = Array(5).fill(BAR_TOUCH_OFFSET);
    frozenLanes = Array(5).fill(false);
  }
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
  // 入力中(IME変換中含む)は#answer-*のDOMを一切触らない。触ると変換が毎秒中断されるため
  if (
    document.activeElement &&
    document.activeElement.id &&
    document.activeElement.id.startsWith('answer-')
  ) {
    updateLiveDisplaysOnly(currentState);
    return;
  }
  document.querySelector('#app').innerHTML = isAdmin
    ? adminTemplate(currentState)
    : boardTemplate(currentState);
}
// #answer入力中でもタイマー等の表示だけは、DOMを作り直さず直接書き換えて進行させる
function updateLiveDisplaysOnly(state) {
  const timeText = `${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}`;
  const bigTime = document.querySelector('.big-time');
  if (bigTime) bigTime.textContent = timeText;
  const liveDot = document.querySelector('.live-dot');
  if (liveDot) liveDot.textContent = `● ${state.status.toUpperCase()}`;
}
// 回答欄からフォーカスが外れたタイミングで、保留していた再描画を反映する
document.addEventListener(
  'focusout',
  (event) => {
    if (
      event.target &&
      event.target.id &&
      event.target.id.startsWith('answer-')
    )
      render();
  },
  true,
);
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
  // タイマーは常に表示、問題文は管理画面の表示/非表示トグルに従う
  const isActive = state.status === 'running';
  const isQuestionVisible = Boolean(state.questionVisible);
  const timerText = `${String(Math.floor(state.remaining / 60)).padStart(2, '0')}:${String(state.remaining % 60).padStart(2, '0')}`;
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
  const isUrgent = isActive && state.remaining <= 10;
  // クリア/オーバー後もその瞬間の爆弾位置・水位で画面を固定表示する
  const isFrozen = state.status === 'cleared' || state.status === 'over';
  const isRoundVisual = isActive || isFrozen;
  const resultBanner =
    state.status === 'cleared'
      ? '<div class="result-banner clear">GAME<br>CLEAR</div>'
      : state.status === 'over'
        ? '<div class="result-banner over">GAME<br>OVER</div>'
        : '';
  const answerTexts = state.answerTexts || ['', '', '', '', ''];
  // 停止していないレーンのバーは全て爆弾と同じ落下率で一緒に落ち続ける。
  // 正解が押されて停止(frozen)したレーンだけ、その高さのまま動かなくなる
  const bombTop = isRoundVisual
    ? Math.max(0, Math.min(85, (1 - state.remaining / state.duration) * 100))
    : 0;
  const laneHtml = positions
    .map((position, i) => {
      const isBombLane = laneForStep(state.bombPosition, count) === position;
      const isLaneFrozen = frozenLanes[position];
      if (isRoundVisual && !isLaneFrozen) {
        // バーの上端が爆弾の下端に接するよう、爆弾の落下率に一定のオフセットを加える
        barHeights[position] = Math.min(96, bombTop + BAR_TOUCH_OFFSET);
      }
      const barTop = barHeights[position];
      const isTilting = tiltLane === position;
      const tiltClass = isTilting ? ` tilt-${tiltDirection}` : '';
      return `<div class="lane ${colors[i % 5]}"><div class="helmet"></div><div class="tube"><div class="progress" style="height:${isRoundVisual && isBombLane ? Math.max(8, 100 - (state.remaining / state.duration) * 100) : 8}%"></div><div class="bar${tiltClass}" style="top:${barTop}%"></div>${isBombLane && state.status !== 'cleared' ? `<div class="bomb" style="top:${bombTop}%"></div>` : ''}${state.accepted.some((acceptedStep) => laneForStep(acceptedStep, count) === position) ? '<div class="hit">✓</div>' : ''}</div></div>`;
    })
    .join('');
  return `<section class="board-screen ${state.status}${isUrgent ? ' urgent' : ''}">
    <header class="topbar"><div class="timer">${timerText}</div></header>
    <div class="question-panel ${isQuestionVisible && (normalizedType === 'image' || normalizedType === 'char') ? 'image-question' : ''}">${questionPanelContent}</div>
    <div class="lanes">${laneHtml}</div>
    <div class="answer-panel">${answerTexts.map((text, i) => `<div class="answer-slot"><span class="answer-slot-label">P${i + 1}</span><b>${escapeHtml(text) || '　'}</b></div>`).join('')}</div>
    ${resultBanner}
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
      : `<div class="answer-fields">${Array.from(
          { length: 5 },
          (_, i) =>
            `<label>回答者${i + 1}<input id="answer-${i}" value="${escapeHtml(answerDrafts[i] ?? (state.answerTexts || [])[i] ?? '')}" placeholder="回答を入力"></label>`,
        ).join(
          '',
        )}</div><div><button class="correct" id="correct">正解 ✓</button><button class="wrong" id="wrong">不正解 ×</button></div>${shiftButtons}`;
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
  if (id === 'correct' || id === 'wrong') {
    socket.emit('admin:answer', { correct: id === 'correct' });
  }
  if (id === 'start' || id === 'reset') {
    Object.keys(answerDrafts).forEach((key) => delete answerDrafts[key]);
  }
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
