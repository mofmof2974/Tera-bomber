type NumberType = '5' | '10';
type SecondType = '30' | '45' | '60' | '90' | '120';
type QuestionType = '問題文型' | '文字出題型';

export type QuestionData = {
  number: string;
  questionText: string;
  answerCount: NumberType;
  timeLimit: SecondType;
  questionType: QuestionType;
  target?: string[];
};

export type QuestionDetail = QuestionData;

export const questionNames = ['1', '2', '3'] as const;

export const eventData: QuestionData[] = [
  {
    number: '1',
    questionText: '一等星をもつ星座　５つ答えよ',
    answerCount: '5',
    timeLimit: '45',
    questionType: '問題文型',
  },
  {
    number: '2',
    questionText: 'W杯に10回以上出場経験のある国　５つ答えよ',
    answerCount: '5',
    timeLimit: '45',
    questionType: '問題文型',
  },
  {
    number: '3',
    questionText: '日本に500店舗以上出店する飲食チェーン店　５つ答えよ',
    answerCount: '10',
    timeLimit: '90',
    questionType: '問題文型',
  },
  {
    number: '4',
    questionText: 'ポケモンの英語名　すべて日本語で答えよ',
    answerCount: '10',
    timeLimit: '90',
    questionType: '文字出題型',
  },
  {
    number: '5',
    questionText: 'スポーツを表す熟語　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    questionType: '文字出題型',
    target: ['蹴玉', '籠玉', '庭球', '排球', '避球', '羽球', '鎧球', '撞球', '氷球', '投球十柱球'],
  },
] as const satisfies QuestionData[];
