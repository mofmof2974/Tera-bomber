import { eventData } from '../question-list/question-list.ts';

// question-list.ts の問題データを管理画面/表示画面が扱う形式に変換する(public/_worker.jsと同じ変換)
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

const INITIAL_QUESTION = questions[0] || {
  id: 'demo',
  number: '00',
  type: 'text',
  count: 5,
  text: '文化祭へようこそ！ 管理画面から問題を選択してください。',
  duration: 60,
};

// Cloudflare PagesはDurable Objectをプロジェクト内で定義できないため、
// 独立したWorkerとしてデプロイし、Pages側からscript_name経由でバインドする
export default {
  async fetch() {
    return new Response('Tera Bomber game-state worker', { status: 200 });
  },
};

// 旧server.jsのゲーム進行ロジックをDurable Object化したもの。
// WebSocket接続を保持し、{event, data}形式のメッセージでsocket.io互換の挙動を再現する
export class GameState {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.sessions = new Set();
    this.timer = null;
    this.state = {
      question: INITIAL_QUESTION,
      // 管理画面でセットされ、次回タイマー開始時に反映される予定の問題
      pendingQuestion: INITIAL_QUESTION,
      duration: INITIAL_QUESTION.duration,
      remaining: INITIAL_QUESTION.duration,
      running: false,
      bombPosition: 0,
      direction: 1,
      accepted: [],
      rejected: [],
      answerTexts: ['', '', '', '', ''],
      status: 'ready',
      // プレイ画面に問題文を表示するかを管理画面から手動で制御する
      questionVisible: false,
    };
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.acceptSession(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  acceptSession(ws) {
    ws.accept();
    this.sessions.add(ws);
    this.send(ws, 'state', this.state);
    ws.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      this.handleMessage(payload.event, payload.data);
    });
    const cleanup = () => this.sessions.delete(ws);
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  send(ws, event, data) {
    try {
      ws.send(JSON.stringify({ event, data }));
    } catch {
      this.sessions.delete(ws);
    }
  }

  broadcast(event, data) {
    for (const ws of this.sessions) this.send(ws, event, data);
  }

  broadcastState() {
    this.broadcast('state', this.state);
  }

  stopTimer(status = 'ready') {
    clearInterval(this.timer);
    this.timer = null;
    this.state.running = false;
    this.state.status = status;
  }

  startTimer() {
    clearInterval(this.timer);
    this.state.running = true;
    this.state.status = 'running';
    this.state.remaining = Math.max(
      0,
      Number(this.state.remaining) || this.state.duration,
    );
    this.timer = setInterval(() => {
      this.state.remaining -= 1;
      if (this.state.remaining <= 0) {
        this.state.remaining = 0;
        this.stopTimer('over');
      }
      this.broadcastState();
    }, 1000);
  }

  handleMessage(event, data) {
    switch (event) {
      // セットしただけでは進行中のラウンドには反映せず、次回のタイマー開始時に適用する
      case 'admin:setQuestion': {
        const question = data || {};
        const count = Number(question.count) === 10 ? 10 : 5;
        const duration = Math.max(
          5,
          Math.min(600, Number(question.duration ?? question.timeLimit) || 60),
        );
        this.state.pendingQuestion = {
          ...question,
          count,
          answerCount: String(count),
          duration,
          timeLimit: String(duration),
        };
        if (this.state.status !== 'running') {
          this.state.duration = duration;
          this.state.remaining = duration;
        }
        this.broadcastState();
        break;
      }
      case 'admin:setDuration': {
        this.state.duration = Math.max(5, Math.min(600, Number(data) || 60));
        this.state.remaining = this.state.duration;
        this.broadcastState();
        break;
      }
      case 'admin:start': {
        if (this.state.status === 'cleared') {
          this.broadcastState();
          break;
        }
        if (this.state.status !== 'running' && this.state.pendingQuestion) {
          this.state.question = this.state.pendingQuestion;
          this.state.duration = this.state.pendingQuestion.duration;
          this.state.remaining = this.state.duration;
          this.state.accepted = [];
          this.state.rejected = [];
          this.state.bombPosition = 0;
          this.state.direction = 1;
          this.state.answerTexts = ['', '', '', '', ''];
          this.state.questionVisible = true;
        }
        this.startTimer();
        this.broadcastState();
        break;
      }
      case 'admin:reset': {
        this.stopTimer('ready');
        this.state.remaining = this.state.duration;
        this.state.bombPosition = 0;
        this.state.direction = 1;
        this.state.accepted = [];
        this.state.rejected = [];
        this.state.answerTexts = ['', '', '', '', ''];
        this.state.questionVisible = false;
        this.broadcastState();
        break;
      }
      case 'admin:setQuestionVisible': {
        this.state.questionVisible = Boolean(data);
        this.broadcastState();
        break;
      }
      // 問題文型: 回答者(5人)ごとの回答欄をリアルタイムにプレイ画面へ反映する
      case 'admin:setAnswerText': {
        const i = Number(data?.index);
        if (!Number.isInteger(i) || i < 0 || i >= 5) break;
        this.state.answerTexts[i] = String(data?.text ?? '');
        this.broadcastState();
        break;
      }
      case 'admin:answer': {
        const correct = Boolean(data?.correct);
        this.broadcast('sfx', correct ? 'good' : 'bad');
        if (correct) {
          if (this.state.accepted.length < this.state.question.count) {
            this.state.accepted.push(this.state.bombPosition);
          }
          // 正解にすると爆弾の位置を一つ進める
          this.state.bombPosition = Math.min(
            this.state.question.count - 1,
            this.state.bombPosition + 1,
          );
          if (this.state.accepted.length === this.state.question.count) {
            this.stopTimer('cleared');
          }
        }
        this.broadcastState();
        break;
      }
      case 'admin:manualPosition': {
        this.state.bombPosition = Math.max(
          0,
          Math.min(this.state.question.count - 1, Number(data)),
        );
        this.broadcastState();
        break;
      }
      // 小さな進む/戻すボタンで爆弾の位置を手動でシフトする
      case 'admin:shiftPosition': {
        const delta = Number(data?.direction) >= 0 ? 1 : -1;
        this.state.bombPosition = Math.max(
          0,
          Math.min(
            this.state.question.count - 1,
            this.state.bombPosition + delta,
          ),
        );
        this.broadcastState();
        break;
      }
      // 文字出題型: 各回答（インデックス指定）ごとに正解/不正解/未回答を切り替える
      case 'admin:markAnswer': {
        const i = Number(data?.index);
        if (!Number.isInteger(i) || i < 0 || i >= this.state.question.count) {
          this.broadcastState();
          break;
        }
        this.state.accepted = this.state.accepted.filter(
          (position) => position !== i,
        );
        this.state.rejected = this.state.rejected.filter(
          (position) => position !== i,
        );
        if (data?.status === 'correct') {
          this.broadcast('sfx', 'good');
          this.state.accepted.push(i);
          this.state.bombPosition = Math.min(
            this.state.question.count - 1,
            this.state.bombPosition + 1,
          );
        } else if (data?.status === 'wrong') {
          this.broadcast('sfx', 'bad');
          this.state.rejected.push(i);
        }
        if (this.state.accepted.length === this.state.question.count) {
          this.stopTimer('cleared');
        }
        this.broadcastState();
        break;
      }
      default:
        break;
    }
  }
}
