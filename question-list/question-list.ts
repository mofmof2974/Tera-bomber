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

function createTextQuestion(
  number: string,
  questionText: string,
  answerCount: NumberType,
): QuestionData {
  return {
    questionType: '問題文型',
    number,
    questionText: `${questionText} ${answerCount}個答えよ`,
    answerCount,
    timeLimit: answerCount === '10' ? '90' : '45',
  };
}

export const eventData: QuestionData[] = [
  //問題文型
  createTextQuestion('1', '一等星をもつ星座', '5'),
  createTextQuestion(
    '2',
    '「特定原材料」またはそれに準ずるものとして、アレルギー表示の対象となっている品目',
    '5',
  ),
  createTextQuestion('3', 'EUに加盟する国の首都', '5'),
  createTextQuestion('4', '小学校で習う のぎへん(禾）の漢字', '5'),
  createTextQuestion('5', '今年の夏の甲子園16強', '5'),
  createTextQuestion(
    '6',
    '昨年の紅白歌合戦に「白組」として出場したアーティスト21組※特別企画を除く',
    '5',
  ),
  createTextQuestion('7', '「〇〇省」という名前の日本の政府機関', '5'),
  createTextQuestion(
    '8',
    '日本の医療制度における「基本領域」(※Ex:「内科」）',
    '5',
  ),
  createTextQuestion('9', '大手16私鉄', '5'),
  createTextQuestion('10', 'スタジオジブリによる長編アニメ映画', '5'),
  createTextQuestion('11', '国民の祝日', '5'),
  createTextQuestion(
    '12',
    '五畿七道のうち「東海道」に属した令制国(Ex:越前国は「北陸道」)',
    '5',
  ),
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
    target: [
      '「？」や 月は東に 日は西に（与謝蕪村)',
      '古池や 「？」飛び込む 水の音（松尾芭蕉)',
      '「？」食へば 金が鳴るなり 法隆寺（正岡子規）',
      '「？」 そこのけそこのけ お馬が通る（小林一茶）',
      '閑さや 岩にしみ入る 「？」の声（松尾芭蕉)',
      '「？」や 闘志いだきて 丘に立つ(高浜虚子）',
      '分け入っても分け入っても「？」(種田山頭火)',
      '赤い「？」 白い「？」と 落ちにけり(河東碧梧桐)',
      '「？」を 取ってくれろと 泣く子かな(小林一茶)',
      '「？」や つるべ取られて もらひ水(加賀千代女）',
    ],
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
  {
    questionType: '文字出題型',
    number: '5',
    questionText: 'アルファベットの略語の正式名称　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      'GPS=グローバル・「？」・システム',
      'PDF=ポータブル・ドキュメント・「？」',
      'PKO=「？」・オペレーションズ',
      'LCC=ローコスト・「？」',
      'QOL=「？」・オブ・ライフ',
      'VAR=ビデオ・アシスタンス・「？」',
      'UV=ウルトラ・「？」',
      'GDP=グロス・「？」・プロダクト',
      'ICU=「？」・ケア・ユニット',
      'DTM=「？」・ミュージック',
    ],
  },
  {
    questionType: '文字出題型',
    number: '6',
    questionText: '小学校で習う難読漢字　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      '河馬',
      '海月',
      '月極',
      '無花果',
      '御手洗団子',
      '円規',
      '送球',
      '極光',
      '課てる',
      '周章てる',
    ],
  },
  {
    questionType: '文字出題型',
    number: '7',
    questionText: 'これらの植物の「科」　すべて答えよ',
    answerCount: '10',
    timeLimit: '90',
    target: [
      'サクラ',
      'チューリップ',
      'サツマイモ',
      'スイカ',
      'キャベツ',
      'トウガラシ',
      'コスモス',
      'オクラ',
      'マンゴー',
      'スイートピー',
    ],
  },
  {
    questionType: '文字出題型',
    number: '8',
    questionText: 'これらの単位の読み方　すべて答えよ',
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
    questionText: 'アプリの名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '5',
    questionText: 'ピクトグラムの名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '6',
    questionText: '日本の世界遺産の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '7',
    questionText: '21世紀の世界の政治家　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '8',
    questionText: '楽器の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '9',
    questionText: '世界史上の帝国の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
  {
    questionType: '画像出題型',
    number: '10',
    questionText: '自動車企業の名称　全て答えよ',
    answerCount: '10',
    timeLimit: '90',
  },
] as const satisfies QuestionData[];
