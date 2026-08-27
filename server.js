const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('ts-node/register/transpile-only');
const { eventData } = require('./question-list/question-list.ts');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

// question-list.ts の問題データを管理画面/表示画面が扱う形式に変換する
function toApiQuestion(question) {
  const type = question.questionType === '文字出題型' ? 'char' : 'text';
  const count = Number(question.answerCount) === 10 ? 10 : 5;
  const duration = Number(question.timeLimit) || 60;
  return {
    id: question.number,
    number: question.number,
    type,
    questionType: question.questionType,
    text: question.questionText,
    questionText: question.questionText,
    count,
    answerCount: String(count),
    duration,
    timeLimit: String(duration),
    target: question.target || [],
  };
}

const questions = eventData.map(toApiQuestion);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')),
);
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

const initialQuestion = questions[0] || {
  id: 'demo',
  number: '00',
  type: 'text',
  count: 5,
  text: '文化祭へようこそ！ 管理画面から問題を選択してください。',
  duration: 60,
};

let state = {
  question: initialQuestion,
  // 管理画面でセットされ、次回タイマー開始時に反映される予定の問題
  pendingQuestion: initialQuestion,
  duration: initialQuestion.duration,
  remaining: initialQuestion.duration,
  running: false,
  bombPosition: 0,
  direction: 1,
  accepted: [],
  answerText: '',
  status: 'ready',
};
let timer;

function broadcast() {
  io.emit('state', state);
}
function stopTimer(status = 'ready') {
  clearInterval(timer);
  state.running = false;
  state.status = status;
}
function startTimer() {
  clearInterval(timer);
  state.running = true;
  state.status = 'running';
  state.remaining = Math.max(0, Number(state.remaining) || state.duration);
  timer = setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.remaining = 0;
      stopTimer('over');
    }
    broadcast();
  }, 1000);
}

io.on('connection', (socket) => {
  socket.emit('state', state);
  // セットしただけでは進行中のラウンドには反映せず、次回のタイマー開始時に適用する
  socket.on('admin:setQuestion', (question) => {
    const count = Number(question.count) === 10 ? 10 : 5;
    const duration = Math.max(
      5,
      Math.min(600, Number(question.duration ?? question.timeLimit) || 60),
    );
    state.pendingQuestion = {
      ...question,
      count,
      answerCount: String(count),
      duration,
      timeLimit: String(duration),
    };
    // 進行中でなければ、管理画面のタイマー表示にもセットした問題の制限時間を即反映する
    if (state.status !== 'running') {
      state.duration = duration;
      state.remaining = duration;
    }
    broadcast();
  });
  socket.on('admin:setDuration', (duration) => {
    state.duration = Math.max(5, Math.min(600, Number(duration) || 60));
    state.remaining = state.duration;
    broadcast();
  });
  socket.on('admin:start', () => {
    if (state.status === 'cleared') {
      broadcast();
      return;
    }
    if (state.status !== 'running' && state.pendingQuestion) {
      state.question = state.pendingQuestion;
      state.duration = state.pendingQuestion.duration;
      state.remaining = state.duration;
      state.accepted = [];
      state.bombPosition = 0;
      state.direction = 1;
      state.answerText = '';
    }
    startTimer();
    broadcast();
  });
  socket.on('admin:reset', () => {
    stopTimer('ready');
    state.remaining = state.duration;
    state.bombPosition = 0;
    state.direction = 1;
    state.accepted = [];
    state.answerText = '';
    broadcast();
  });
  socket.on('admin:answer', ({ correct, answer }) => {
    state.answerText = String(answer || '');
    if (correct && state.accepted.length < state.question.count) {
      state.accepted.push(state.bombPosition);
      if (state.accepted.length === state.question.count) {
        stopTimer('cleared');
      } else {
        state.bombPosition += state.direction;
        if (
          state.question.count === 10 &&
          (state.bombPosition === 4 || state.bombPosition === 9)
        )
          state.direction *= -1;
      }
    }
    broadcast();
  });
  socket.on('admin:manualPosition', (position) => {
    state.bombPosition = Math.max(
      0,
      Math.min(state.question.count - 1, Number(position)),
    );
    broadcast();
  });
});

server.listen(port, () =>
  console.log(`Tera Bomber is running at http://localhost:${port}`),
);
