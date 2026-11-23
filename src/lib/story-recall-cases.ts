const affiliations = {
  kuomintang: { party: '國民黨', order: 0 },
  democraticProgressiveParty: { party: '民進黨', order: 1 },
  independent: { party: '無黨籍', order: 2 },
  kuomintangCaucus: { party: '無黨籍', order: 2, context: '國民黨團、泛藍' },
  panGreenIndependent: { party: '無黨籍', order: 2, context: '泛綠' },
  formerTaiwanPeoplesParty: { party: '無黨籍', order: 2, context: '前民眾黨，藍白支持反罷' },
};

export const recallOutcomes = {
  firstUnfiled: {
    first: '未送件', second: '未進入', result: '未啟動', detailColumn: 'first',
  },
  firstShort: {
    first: '未達標', second: '未進入', result: '未補件', detailColumn: 'first',
  },
  secondUnfiled: {
    first: '通過', second: '未送件', result: '未成案', detailColumn: 'second',
  },
  secondIncomplete: {
    first: '通過', second: '未完成', result: '未成案', detailColumn: 'second',
  },
  secondRejected: {
    first: '通過', second: '未受理', result: '未成案', detailColumn: 'second',
  },
  secondShort: {
    first: '通過', second: '未達標', result: '不成立', detailColumn: 'second',
  },
  voted: {
    first: '通過', second: '通過', result: '投票否決', detailColumn: 'result',
  },
} as const;

interface RecallCaseDetails {
  name: string;
  office: string;
  affiliation: keyof typeof affiliations;
  note: string;
  sources: { title: string; href: string }[];
  local?: boolean;
}

function cases(outcome: keyof typeof recallOutcomes, entries: RecallCaseDetails[]) {
  return entries.map(({ affiliation, ...entry }) => ({
    ...entry,
    affiliation: affiliations[affiliation],
    outcome,
  }));
}

const firstUnfiled = cases('firstUnfiled', [
  {
    name: '陳玉珍', office: '金門縣立委', affiliation: 'kuomintang',
    note: '「珍礙金門」表示，舊制收件截止前仍差 73 份。另一團隊「珍重再見」後來依新制徵詢意願，也沒有正式送件。',
    sources: [
      { title: '珍礙金門聲明', href: 'https://www.mirrormedia.mg/story/20250219edi051' },
      { title: '後續行動', href: 'https://newtalk.tw/news/view/2025-03-23/961839' },
    ],
  },
  {
    name: '陳雪生', office: '連江縣立委', affiliation: 'kuomintang',
    note: '「馬祖剷雪大隊」自報收到 141 份，超過一階門檻 117 份。團隊考量提議人隱私，決定先調查二階連署意願。',
    sources: [
      { title: '馬祖剷雪大隊聲明', href: 'https://www.matsu.idv.tw/topicdetail.php?f=2&t=316293' },
      { title: '中央社報導', href: 'https://www.cna.com.tw/news/aipl/202503170248.aspx' },
    ],
  },
  {
    name: '王世堅', office: '臺北市第 2 選區立委', affiliation: 'democraticProgressiveParty',
    note: '國民黨青年部人士公開倡議。臺北市黨部主委以王世堅反對全面罷免國民黨立委為由出面要求停止。未找到公開募集提議書的紀錄。',
    sources: [
      { title: '黨部主委說法', href: 'https://www.taisounds.com/news/content/71/171809' },
      { title: '今周刊案件追蹤', href: 'https://www.businesstoday.com.tw/article/category/183027/post/202504160001/' },
    ],
  },
  {
    name: '陳宜', office: '基隆市第 2 選區議員', affiliation: 'democraticProgressiveParty',
    note: '民間團體曾募集提議書。據檢方說明，地方黨部評估鄭文婷、張之豪兩案較有可能成功，後續只送該兩案。陳宜案份數未公開。',
    sources: [
      { title: '發起報導', href: 'https://www.cna.com.tw/news/aloc/202502170302.aspx' },
      { title: '檢方說明', href: 'https://news.tvbs.com.tw/local/2929031' },
    ],
  },
  {
    name: '施偉政', office: '基隆市第 4 選區議員', affiliation: 'democraticProgressiveParty',
    note: '民間團體曾募集提議書。據檢方說明，地方黨部評估鄭文婷、張之豪兩案較有可能成功，後續只送該兩案。施偉政案份數未公開。',
    sources: [
      { title: '發起報導', href: 'https://www.cna.com.tw/news/aloc/202502170302.aspx' },
      { title: '檢方說明', href: 'https://news.tvbs.com.tw/local/2929031' },
    ],
  },
]);

const firstShort = cases('firstShort', [
  {
    name: '王美惠', office: '嘉義市立委', affiliation: 'democraticProgressiveParty',
    note: '送件後，提議名冊經查對低於法定門檻。',
    sources: [{ title: '一階審查結果', href: 'https://www.cna.com.tw/news/aipl/202504140244.aspx' }],
  },
  {
    name: '陳冠廷', office: '嘉義縣第 2 選區立委', affiliation: 'democraticProgressiveParty',
    note: '送件後，提議名冊經查對低於法定門檻。',
    sources: [{ title: '一階審查結果', href: 'https://www.cna.com.tw/news/aipl/202504140244.aspx' }],
  },
]);

const secondUnfiled = cases('secondUnfiled', [
  {
    name: '陳超明', office: '苗栗縣第 1 選區立委', affiliation: 'kuomintangCaucus',
    note: '罷團自報收 18,818 份，未達 20,586 份門檻。',
    sources: [
      { title: '罷團公布份數', href: 'https://www.cna.com.tw/news/aipl/202505120268.aspx' },
      { title: '立法院黨籍資料', href: 'https://www.ly.gov.tw/Pages/List.aspx?nodeid=46822' },
    ],
  },
  {
    name: '邱鎮軍', office: '苗栗縣第 2 選區立委', affiliation: 'kuomintang',
    note: '罷團自報收 20,918 份，未達 23,187 份門檻。',
    sources: [{ title: '罷團公布份數', href: 'https://health.ftvnews.com.tw/news/detail/2025512W0423' }],
  },
  {
    name: '謝衣鳯', office: '彰化縣第 3 選區立委', affiliation: 'kuomintang',
    note: '罷團自報收 19,131 份，未達 26,719 份門檻。',
    sources: [{ title: '罷團公布份數', href: 'https://www.cna.com.tw/news/aipl/202505130295.aspx' }],
  },
  {
    name: '陳瑩', office: '平地原住民立委', affiliation: 'democraticProgressiveParty',
    note: '中選會確認屆期未收到名冊。公開資料不足以確認原因。',
    sources: [{ title: '中選會收件說明', href: 'https://www.cna.com.tw/news/aipl/202505310174.aspx' }],
  },
  {
    name: '伍麗華', office: '山地原住民立委', affiliation: 'democraticProgressiveParty',
    note: '中選會確認屆期未收到名冊。公開資料不足以確認原因。',
    sources: [{ title: '中選會收件說明', href: 'https://www.cna.com.tw/news/aipl/202505310174.aspx' }],
  },
  {
    name: '徐筱菁', office: '苗栗縣第 1 選區議員', affiliation: 'democraticProgressiveParty',
    note: '領銜人與曾玟學、陳春暖兩案共同宣布停止，表示希望降低地方對立。',
    sources: [{ title: '領銜人共同聲明', href: 'https://www.cna.com.tw/news/aipl/202505190289.aspx' }],
  },
  {
    name: '曾玟學', office: '苗栗縣第 5 選區議員', affiliation: 'panGreenIndependent',
    note: '領銜人與徐筱菁、陳春暖兩案共同宣布停止，表示希望降低地方對立。',
    sources: [{ title: '領銜人共同聲明', href: 'https://www.cna.com.tw/news/aipl/202505190289.aspx' }],
  },
  {
    name: '陳春暖', office: '苗栗縣第 6 選區議員', affiliation: 'democraticProgressiveParty',
    note: '領銜人與徐筱菁、曾玟學兩案共同宣布停止，表示希望降低地方對立。',
    sources: [{ title: '領銜人共同聲明', href: 'https://www.cna.com.tw/news/aipl/202505190289.aspx' }],
  },
  {
    name: '鄭文婷', office: '基隆市第 3 選區議員', affiliation: 'democraticProgressiveParty',
    note: '領銜人因涉嫌不實提議遭法院裁定羈押禁見，選委會確認屆期未送。',
    sources: [{ title: '基隆選委會收件結果', href: 'https://www.cna.com.tw/news/aloc/202506030327.aspx' }],
  },
  {
    name: '張之豪', office: '基隆市第 5 選區議員', affiliation: 'democraticProgressiveParty',
    note: '領銜人因涉嫌不實提議遭法院裁定羈押禁見，選委會確認屆期未送。',
    sources: [{ title: '基隆選委會收件結果', href: 'https://www.cna.com.tw/news/aloc/202506030327.aspx' }],
  },
  {
    name: '蔡其昌', office: '臺中市第 1 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「拔菜行動」與何欣純案透過共同發言人表示，多名志工遭司法單位約談，決定停止推進。',
    sources: [
      { title: '罷團聲明', href: 'https://www.cna.com.tw/news/aipl/202506050201.aspx' },
      { title: '媒體報導', href: 'https://www.ftvnews.com.tw/news/detail/2025605W0438' },
    ],
  },
  {
    name: '何欣純', office: '臺中市第 7 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「不純下架」與蔡其昌案透過共同發言人表示，多名志工遭司法單位約談，決定停止推進。',
    sources: [
      { title: '罷團聲明', href: 'https://www.cna.com.tw/news/aipl/202506050201.aspx' },
      { title: '媒體報導', href: 'https://www.ftvnews.com.tw/news/detail/2025605W0438' },
    ],
  },
  {
    name: '蘇巧慧', office: '新北市第 5 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「去怋除穢」也推動吳琪銘案。罷團表示本案連署份數未達門檻。',
    sources: [{ title: '罷團說明', href: 'https://www.cna.com.tw/news/aipl/202506050319.aspx' }],
  },
  {
    name: '張宏陸', office: '新北市第 6 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「走投無陸」表示未達團隊自訂的安全門檻。法定門檻的達成情形未公開。',
    sources: [{ title: '罷團說明', href: 'https://www.cna.com.tw/news/aipl/202506080138.aspx' }],
  },
  {
    name: '吳琪銘', office: '新北市第 10 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「去怋除穢」也推動蘇巧慧案。罷團表示本案連署份數未達門檻。',
    sources: [{ title: '罷團說明', href: 'https://www.cna.com.tw/news/aipl/202506050319.aspx' }],
  },
  {
    name: '林俊憲', office: '臺南市第 5 選區立委', affiliation: 'democraticProgressiveParty',
    note: '國民黨臺南市黨部與王定宇案一併宣布，本案連署份數未達門檻。',
    sources: [{ title: '黨部說明', href: 'https://www.cna.com.tw/news/aipl/202506090233.aspx' }],
  },
  {
    name: '王定宇', office: '臺南市第 6 選區立委', affiliation: 'democraticProgressiveParty',
    note: '國民黨臺南市黨部與林俊憲案一併宣布，本案連署份數未達門檻。',
    sources: [{ title: '黨部說明', href: 'https://www.cna.com.tw/news/aipl/202506090233.aspx' }],
  },
  {
    name: '黃捷', office: '高雄市第 6 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「高雄雙罷劫」表示本案還差約 3,400 份。',
    sources: [{ title: '罷團公布份數', href: 'https://www.cna.com.tw/news/aipl/202506130276.aspx' }],
  },
  {
    name: '許智傑', office: '高雄市第 7 選區立委', affiliation: 'democraticProgressiveParty',
    note: '「高雄雙罷劫」表示本案還差約 5,700 份。',
    sources: [{ title: '罷團公布份數', href: 'https://www.cna.com.tw/news/aipl/202506130276.aspx' }],
  },
  {
    name: '陳乃瑜', office: '新北市第 9 選區議員', affiliation: 'democraticProgressiveParty',
    note: '罷團表示不願加深地方對立，團隊表決停止連署。',
    sources: [{ title: '罷團聲明', href: 'https://www.cna.com.tw/news/aipl/202505160078.aspx' }],
  },
  {
    name: '李坤城', office: '新北市第 3 選區立委', affiliation: 'democraticProgressiveParty',
    note: '領銜人表示造冊遇到問題，決定不送，未說明具體問題。',
    sources: [{ title: '領銜人說法', href: 'https://www.cna.com.tw/news/aipl/202506230274.aspx' }],
  },
  {
    name: '陳俊宇', office: '宜蘭縣立委', affiliation: 'democraticProgressiveParty',
    note: '罷團表示還差約 8,000 份。',
    sources: [{ title: '罷團公布份數', href: 'https://www.cna.com.tw/news/aipl/202506230062.aspx' }],
  },
]);

const secondIncomplete = cases('secondIncomplete', [
  {
    name: '吳沛憶', office: '臺北市第 5 選區立委', affiliation: 'democraticProgressiveParty',
    note: '領銜人帶 19,831 份到選委會，低於 23,392 份門檻。選委會未清點，官方紀錄列為屆期未提出。',
    sources: [{ title: '公視現場報導', href: 'https://news.pts.org.tw/article/755039' }],
  },
]);

const secondRejected = cases('secondRejected', [
  {
    name: '吳思瑤', office: '臺北市第 1 選區立委', affiliation: 'democraticProgressiveParty',
    note: '團隊自報帶 27,290 份到選委會。法定領銜人未到場，選委會拒收。',
    sources: [
      { title: '公視現場報導', href: 'https://news.pts.org.tw/article/755039' },
      { title: '法院新聞稿', href: 'https://www.judicial.gov.tw/tw/cp-1888-1337499-0c702-1.html' },
    ],
  },
]);

const secondShort = cases('secondShort', [
  {
    name: '徐欣瑩', office: '新竹縣第 1 選區立委', affiliation: 'kuomintang',
    note: '選委會清點名冊共 19,521 份，低於 21,527 份門檻。',
    sources: [{ title: '中選會公告', href: 'https://web.cec.gov.tw/api/file/f566dbc2-9d14-48fd-a068-e37df329f5de.pdf' }],
  },
  {
    name: '蔡銘軒', office: '南投縣第 2 選區議員', affiliation: 'democraticProgressiveParty',
    note: '補件後共 9,039 份有效連署，低於 9,259 份門檻。',
    sources: [
      { title: '中選會公告', href: 'https://web.cec.gov.tw/api/file/b96853a0-907b-4f2b-998c-a9e9c73c4584.pdf' },
      { title: '南投縣議會資料', href: 'https://www.ntcc.gov.tw/tw/rep/p02.aspx?district=2&period=20' },
    ],
  },
]);

const july26Legislators = [
  ['林沛祥', '基隆市'],
  ['王鴻薇', '臺北市第 3 選區'],
  ['李彥秀', '臺北市第 4 選區'],
  ['羅智強', '臺北市第 6 選區'],
  ['徐巧芯', '臺北市第 7 選區'],
  ['賴士葆', '臺北市第 8 選區'],
  ['洪孟楷', '新北市第 1 選區'],
  ['葉元之', '新北市第 7 選區'],
  ['張智倫', '新北市第 8 選區'],
  ['林德福', '新北市第 9 選區'],
  ['廖先翔', '新北市第 12 選區'],
  ['牛煦庭', '桃園市第 1 選區'],
  ['涂權吉', '桃園市第 2 選區'],
  ['魯明哲', '桃園市第 3 選區'],
  ['萬美玲', '桃園市第 4 選區'],
  ['呂玉玲', '桃園市第 5 選區'],
  ['邱若華', '桃園市第 6 選區'],
  ['鄭正鈐', '新竹市'],
  ['廖偉翔', '臺中市第 4 選區'],
  ['黃健豪', '臺中市第 5 選區'],
  ['羅廷瑋', '臺中市第 6 選區'],
  ['丁學忠', '雲林縣第 1 選區'],
  ['黃建賓', '臺東縣'],
  ['傅崐萁', '花蓮縣'],
];

const august23Legislators = [
  ['羅明才', '新北市第 11 選區'],
  ['林思銘', '新竹縣第 2 選區'],
  ['顏寬恒', '臺中市第 2 選區'],
  ['楊瓊瓔', '臺中市第 3 選區'],
  ['江啟臣', '臺中市第 8 選區'],
  ['馬文君', '南投縣第 1 選區'],
  ['游顥', '南投縣第 2 選區'],
];

const voted = cases('voted', [
  {
    name: '陳玉鈴', office: '南投縣第 4 選區議員', affiliation: 'democraticProgressiveParty',
    note: '7 月 13 日投票',
    sources: [
      { title: '中選會投票結果', href: 'https://web.cec.gov.tw/central/article/60536' },
      { title: '南投縣議會資料', href: 'https://www.ntcc.gov.tw/tw/rep/p02.aspx?district=4&period=20' },
    ],
  },
  ...july26Legislators.map(([name, district]): RecallCaseDetails => ({
    name, office: district + '立委', affiliation: 'kuomintang',
    note: '7 月 26 日投票',
    sources: [{ title: '開票結果', href: 'https://www.cna.com.tw/news/aipl/202507265011.aspx' }],
  })),
  {
    name: '高虹安', office: '新竹市長', affiliation: 'formerTaiwanPeoplesParty',
    note: '7 月 26 日投票',
    sources: [
      { title: '開票結果', href: 'https://www.cna.com.tw/news/aipl/202507265003.aspx' },
      { title: '退黨報導', href: 'https://www.cna.com.tw/news/aipl/202407260148.aspx' },
      { title: '藍白聲援報導', href: 'https://www.cna.com.tw/news/aipl/202507260206.aspx' },
    ],
  },
  ...august23Legislators.map(([name, district]): RecallCaseDetails => ({
    name, office: district + '立委', affiliation: 'kuomintang',
    note: '8 月 23 日投票',
    sources: [{ title: '中選會投票結果', href: 'https://web.cec.gov.tw/api/file/9de10f9e-0c01-4205-aec2-7e7bff545b1f.pdf' }],
  })),
]);

const localCases = cases('secondUnfiled', [
  {
    name: '蔡詩傑', office: '彰化縣二林鎮長', affiliation: 'independent', local: true,
    note: '火化場選址爭議引發罷免。罷團表示二階連署未達門檻。',
    sources: [
      { title: '中央社報導', href: 'https://www.cna.com.tw/news/aloc/202505060288.aspx' },
      { title: '內政部鎮長資料', href: 'https://www.moi.gov.tw/LocalOfficial_Content.aspx?TYP=KND0006&_PARENT_ID=MYR10712NF0021&_TYP=MYR&n=580' },
    ],
  },
  {
    name: '胡金至', office: '臺東縣海端鄉長', affiliation: 'kuomintang', local: true,
    note: '原住民保留地分配爭議引發罷免。經布農族民族議會調停，領銜人宣布停止。',
    sources: [
      { title: '調停紀錄', href: 'https://www.peopo.org/news/813367' },
      { title: '中選會收件說明', href: 'https://www.cna.com.tw/news/aipl/202508230205.aspx' },
      { title: '內政部鄉長資料', href: 'https://www.moi.gov.tw/LocalOfficial_Content.aspx?TYP=KND0006&_PARENT_ID=MYR11112VF0001&_TYP=MYR&n=580' },
    ],
  },
]);

export const recallCases = [
  ...firstUnfiled,
  ...firstShort,
  ...secondUnfiled,
  ...secondIncomplete,
  ...secondRejected,
  ...localCases,
  ...secondShort,
  ...voted,
].sort((first, next) => first.affiliation.order - next.affiliation.order);
