const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const questionDir = path.join(__dirname, '問題用フォルダ');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/questions', express.static(questionDir));
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html')),
);
app.get('/api/questions', (req, res) => {
  const files = fs.existsSync(questionDir) ? fs.readdirSync(questionDir) : [];
  const questions = files
    .filter((file) => /\.(json|txt|md)$/i.test(file))
    .map((file) => {
      const fullPath = path.join(questionDir, file);
      try {
        if (file.endsWith('.json')) {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          return { ...data, id: data.id || file, source: file };
        }
        return {
          id: file,
          source: file,
          type: 'text',
          count: 5,
          text: fs.readFileSync(fullPath, 'utf8').trim(),
        };
      } catch (error) {
        return {
          id: file,
          source: file,
          type: 'text',
          count: 5,
          text: '読み込みエラー: ' + file,
        };
      }
    });
  res.json(questions);
});

let state = {
  question: {
    id: 'demo',
    type: 'text',
    count: 5,
    text: '文化祭へようこそ！ 管理画面から問題を選択してください。',
    answers: [],
  },
  duration: 60,
  remaining: 60,
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
  socket.on('admin:setQuestion', (question) => {
    state.question = {
      ...question,
      count: Number(question.count) === 10 ? 10 : 5,
    };
    state.accepted = [];
    state.bombPosition = 0;
    state.direction = 1;
    state.answerText = '';
    state.remaining = state.duration;
    stopTimer('ready');
    broadcast();
  });
  socket.on('admin:setDuration', (duration) => {
    state.duration = Math.max(5, Math.min(600, Number(duration) || 60));
    state.remaining = state.duration;
    broadcast();
  });
  socket.on('admin:start', () => {
    if (state.status !== 'cleared') startTimer();
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
