type NumberType = '5' | '10';
type SecondType = '30' | '45' | '60' | '90' | '120';
type QuestionType = '問題文型' | '文字出題型' | '画像出題型';

export type QuestionData = {
  questionType: QuestionType;
  number: string;
  questionText: string;
  answerCount: NumberType;
  timeLimit: SecondType;
  target?: string[];
};

export type QuestionDetail = QuestionData;

export const questionNames = ['1', '2', '3'] as const;

export const eventData: QuestionData[] = [
  //問題文型
  {
    questionType: '問題文型',
    number: '1',
    questionText: '一等星をもつ星座　５個答えよ',
    answerCount: '5',
    timeLimit: '45',
  },
  {
    questionType: '問題文型',
    number: '2',
    questionText:
      '「特定原材料」またはそれに準ずるものとして、アレルギー表示の対象となっている品目　５個答えよ',
    answerCount: '5',
    timeLimit: '45',
  },
  {
    questionType: '問題文型',
    number: '3',
    questionText: 'EUに加盟する国の首都　10個答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '問題文型',
    number: '4',
    questionText: '小学校で習う のぎへん(禾）の漢字　10個答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '問題文型',
    number: '5',
    questionText: '今年の夏の甲子園16強　10個答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '問題文型',
    number: '6',
    questionText:
      '昨年の紅白歌合戦に「白組」として出場したアーティスト21組※特別企画を除く　10個答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '問題文型',
    number: '7',
    questionText: '「〇〇省」という名前の日本の政府機関　10個答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  //文字出題型
  {
    questionType: '文字出題型',
    number: '1',
    questionText: 'アルファベットの単位の読み方　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      'm(長さ)',
      'W(仕事率)',
      'K(温度)',
      'Ω(抵抗)',
      'dB（音の大きさ)',
      'Hz(周波数)',
      'Pa（圧力）',
      'Bq(放射能）',
      'cd(光度)',
      'lb（重量)',
    ],
  },
  {
    questionType: '文字出題型',
    number: '2',
    questionText: '過去2年に発売されたゲームタイトル　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      'ぽこあ「？」',
      '「？」レイダース',
      '「？」ミラクルスターズ',
      '「？」のエアライダー',
      '「？」知恵のかりもの',
      '「？」わくわく生活スーパー',
      '「？」ジャンボリー',
      '「？」バナンザ',
      '「？」レクイエム',
      '「？」万紫千紅',
    ],
  },
  {
    questionType: '文字出題型',
    number: '3',
    questionText: '有名な俳句　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [],
  },
  {
    questionType: '文字出題型',
    number: '4',
    questionText: '漢字三文字の小説　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      '『？？門』（芥川龍之介）',
      '『？？寺』（三島由紀夫）',
      '『？？舟』(森鴎外）',
      '『？？記』（中島敦）',
      '『？？魚』（井伏鱒二）',
      '『？？郎』（夏目漱石)',
      '『蟹？？』（小林多喜二）',
      '『？？論』（坂口安吾）',
      '『？？室』(泉鏡花)',
      '『黒？？』(江戸川乱歩)',
    ],
  },
  //画像出題型
  {
    questionType: '画像出題型',
    number: '1',
    questionText: 'イタリアにある芸術作品の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '2',
    questionText: '全国のご当地キャラの所属都道府県　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '3',
    questionText: '洋菓子の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '4',
    questionText: 'ピクトグラムの名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '5',
    questionText: 'アプリの名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
] as const satisfies QuestionData[];
