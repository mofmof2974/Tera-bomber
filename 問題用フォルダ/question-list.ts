type NumberType = '5' | '10';
type SecondType = '30' | '45' | '60' | '90' | '120';
type QuestionType = '問題文型' | '画像出題型';
type GenreType =
  | '科学'
  | '文学'
  | '言語'
  | '日本史'
  | '世界史'
  | '地理'
  | '公民'
  | '青門'
  | '芸術'
  | 'スポーツ'
  | '芸能'
  | '生活'
  | 'アニメ';

export type QuestionData = {
  number: string;
  questionText: string;
  answerCount: NumberType;
  timeLimit: SecondType;
  questionType: QuestionType;
  genre: GenreType;
  imageUrl?: string;
};

export type QuestionDetail = QuestionData;

export const questionNames = ['01', '02', '03'] as const;

export const eventData: QuestionData[] = [
  {
    number: '01',
    questionText: '日本でいちばん高い山は？',
    answerCount: '5',
    timeLimit: '60',
    questionType: '問題文型',
    genre: '地理',
  },
  {
    number: '02',
    questionText: '水は何度で沸騰しますか？',
    answerCount: '10',
    timeLimit: '90',
    questionType: '問題文型',
    genre: '科学',
  },
  {
    number: '03',
    questionText: '「我思う、故に我あり」と言った人物は？',
    answerCount: '5',
    timeLimit: '45',
    questionType: '問題文型',
    genre: '文学',
  },
  {
    number: '04',
    questionText: 'この画像の動物の名前は？',
    answerCount: '5',
    timeLimit: '60',
    questionType: '画像出題型',
    genre: '生活',
    imageUrl: '/questions/images/sample-animal.png',
  },
] as const satisfies QuestionData[];
