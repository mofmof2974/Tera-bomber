import { eventData } from '../question-list/question-list.ts';

// question-list.ts の問題データを管理画面/表示画面が扱う形式に変換する
function toApiQuestion(question) {
  const type =
    question.questionType === '文字出題型'
      ? 'char'
      : question.questionType === '画像出題型'
        ? 'image'
        : 'text';
  const count = Number(question.answerCount) === 10 ? 10 : 5;
  const duration =
    type === 'text'
      ? count === 10
        ? 90
        : 45
      : Number(question.timeLimit) || 60;
  const result = {
    id: `${question.questionType}:${question.number}`,
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
  if (type === 'image') {
    result.images = Array.from(
      { length: 10 },
      (_, index) => `/photo-list/${question.number}/${index + 1}.jpg`,
    );
  }
  return result;
}

const questions = eventData.map(toApiQuestion);

// Cloudflare Pages Functions（advanced mode）のエントリーポイント。
// 静的アセットの配信、/api/questions、/ws（別デプロイのDurable Object Workerへのプロキシ）を担当する
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      const id = env.GAME_STATE.idFromName('main');
      const stub = env.GAME_STATE.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === '/api/questions') {
      return Response.json(questions);
    }

    if (url.pathname === '/admin') {
      return env.ASSETS.fetch(new URL('/index.html', request.url));
    }

    return env.ASSETS.fetch(request);
  },
};
