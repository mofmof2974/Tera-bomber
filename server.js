const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 8000;
const PLAYER_LIMIT = 8;

app.use(express.static(path.join(__dirname, 'public')));

const players = new Map();
const votes = new Map();
const roomState = {
  status: 'waiting',
  round: 1,
  maxRounds: 5,
  roundTime: 20,
  selectedTheme: '',
  winnerId: null,
  log: [],
};

function getPublicState() {
  return {
    status: roomState.status,
    round: roomState.round,
    maxRounds: roomState.maxRounds,
    roundTime: roomState.roundTime,
    selectedTheme: roomState.selectedTheme,
    winnerId: roomState.winnerId,
    players: Array.from(players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      score: player.score,
      isReady: player.isReady,
      isAlive: player.isAlive,
      vote: player.vote,
      isHost: player.isHost,
    })),
    log: roomState.log.slice(-6),
  };
}

function broadcastState() {
  io.emit('state:update', getPublicState());
}

function assignColor(index) {
  const palette = [
    '#4ecdc4',
    '#ffe66d',
    '#ff6b6b',
    '#5dade2',
    '#a8e6cf',
    '#ffd3b6',
    '#f7aef8',
    '#c7ceea',
  ];
  return palette[index % palette.length];
}

function resetRoundState() {
  votes.clear();
  for (const player of players.values()) {
    player.vote = null;
    player.isAlive = true;
  }
  roomState.winnerId = null;
  roomState.selectedTheme = '';
  roomState.log = roomState.log.slice(-20);
}

function updateScoresForRound() {
  const sorted = Array.from(players.values()).sort((a, b) => b.score - a.score);
  const leader = sorted[0];
  if (leader) {
    roomState.winnerId = leader.id;
    roomState.log.push(`${leader.name} がこのラウンドを制しました。`);
  }
}

function startRound() {
  const activePlayers = Array.from(players.values()).filter(
    (player) => player.isReady,
  );
  if (activePlayers.length < 2) {
    roomState.status = 'waiting';
    roomState.log.push('参加者が2人未満のため開始できません。');
    broadcastState();
    return;
  }

  resetRoundState();
  roomState.status = 'playing';
  roomState.selectedTheme = ['自然', '学校', '食べ物', 'アニメ', '音楽'][
    Math.floor(Math.random() * 5)
  ];
  roomState.log.push(`テーマ: ${roomState.selectedTheme}`);
  io.emit('round:start', {
    theme: roomState.selectedTheme,
    roundTime: roomState.roundTime,
  });
  broadcastState();
}

function endRound() {
  const activePlayers = Array.from(players.values()).filter(
    (player) => player.isReady,
  );
  if (activePlayers.length === 0) return;

  roomState.status = 'result';
  updateScoresForRound();
  io.emit('round:end', {
    winnerId: roomState.winnerId,
    theme: roomState.selectedTheme,
  });
  broadcastState();
}

function startMatch() {
  roomState.round = 1;
  roomState.status = 'waiting';
  for (const player of players.values()) {
    player.score = 0;
    player.isReady = false;
    player.isAlive = true;
    player.vote = null;
  }
  roomState.log = ['ゲームを開始しました。参加者が揃ったら開始できます。'];
  broadcastState();
}

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('player:join', ({ name }) => {
    if (players.size >= PLAYER_LIMIT) {
      socket.emit('error:full', '参加人数上限に達しました');
      return;
    }

    const trimmedName =
      String(name || '')
        .trim()
        .slice(0, 12) || `Player${players.size + 1}`;
    const hostNeeded = players.size === 0;
    const player = {
      id: socket.id,
      name: trimmedName,
      color: assignColor(players.size),
      score: 0,
      isReady: false,
      isAlive: true,
      vote: null,
      isHost: hostNeeded,
    };

    players.set(socket.id, player);
    socket.emit('player:me', player);
    broadcastState();
  });

  socket.on('player:ready', () => {
    const player = players.get(socket.id);
    if (!player) return;
    player.isReady = !player.isReady;
    roomState.log.push(
      `${player.name} が${player.isReady ? '準備完了' : '準備解除'}しました。`,
    );
    broadcastState();
  });

  socket.on('room:start', () => {
    const player = players.get(socket.id);
    if (!player || !player.isHost) return;
    startMatch();
  });

  socket.on('round:start', () => {
    const player = players.get(socket.id);
    if (!player || !player.isHost) return;
    startRound();
  });

  socket.on('round:finish', () => {
    const player = players.get(socket.id);
    if (!player || !player.isHost) return;
    endRound();
  });

  socket.on('player:vote', ({ targetId }) => {
    const player = players.get(socket.id);
    const target = players.get(targetId);
    if (!player || !target || roomState.status !== 'playing') return;

    player.vote = target.id;
    votes.set(player.id, target.id);
    io.emit('vote:cast', { voterId: socket.id, targetId: target.id });
    broadcastState();
  });

  socket.on('player:score', ({ delta }) => {
    const player = players.get(socket.id);
    if (!player) return;
    player.score = Math.max(0, Number(delta || 0) + player.score);
    roomState.log.push(`${player.name} が ${player.score} 点になりました。`);
    broadcastState();
  });

  socket.on('admin:reset', () => {
    const player = players.get(socket.id);
    if (!player || !player.isHost) return;
    roomState.status = 'waiting';
    roomState.round = 1;
    roomState.selectedTheme = '';
    roomState.winnerId = null;
    roomState.log = ['管理画面からリセットしました。'];
    for (const p of players.values()) {
      p.score = 0;
      p.isReady = false;
      p.isAlive = true;
      p.vote = null;
    }
    broadcastState();
  });

  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    if (!player) return;

    players.delete(socket.id);
    if (players.size === 0) {
      roomState.status = 'waiting';
      roomState.round = 1;
      roomState.selectedTheme = '';
      roomState.winnerId = null;
      roomState.log = ['全員退出しました。'];
      return;
    }

    const remaining = Array.from(players.values());
    if (player.isHost && remaining[0]) {
      remaining[0].isHost = true;
    }
    roomState.log.push(`${player.name} が退出しました。`);
    broadcastState();
  });
});

app.get('/health', (_, res) => {
  res.json({ ok: true, players: players.size, status: roomState.status });
});

app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'play.html'));
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
