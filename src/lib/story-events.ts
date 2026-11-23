export interface StoryResource {
  kind: string;
  title: string;
  description: string;
  href: string;
}

export interface StoryEvent {
  id: string;
  category: 'events';
  eventDate: string;
  type: string;
  title: string;
  description: string;
  resources: StoryResource[];
}

export function storyEventPath(id: string) {
  return `/stories/events/${id}/`;
}

export const eventEntries: StoryEvent[] = [
  {
    id: '2025-recall-movement',
    category: 'events',
    eventDate: '2025-02-03',
    type: '歷史事件',
    title: '2025 年大罷免',
    description: '2025 年 2 月 3 日，各地罷免團體向中選會送交首批提案。7 月 26 日及 8 月 23 日兩波投票涉及 31 名立委與新竹市長，32 案均未通過。',
    resources: [
      {
        kind: '新聞專題',
        title: '中央社｜2025 罷免暨公投',
        description: '追蹤罷免案進度、投票日程與兩波開票結果。',
        href: 'https://www.cna.com.tw/topic/newstopic/4751.aspx',
      },
      {
        kind: '選務檔案',
        title: '中選會｜2025 年選舉大事紀',
        description: '查閱兩波罷免投票的案數及結果。',
        href: 'https://web.cec.gov.tw/api/file/7a815b45-72a5-4f5a-a2e3-d1d2f9e3f43e.pdf#page=57',
      },
      {
        kind: '當時報導',
        title: '中央社｜首批罷免提議書送件',
        description: '記錄 2 月 3 日各地團體送件與中選會收件情形。',
        href: 'https://www.cna.com.tw/news/aipl/202502030280.aspx',
      },
      {
        kind: '人物訪談',
        title: 'BLINK｜臺灣經歷了一場什麼樣的民主實驗？',
        description: '依時間記錄四位參與者和觀察者的經驗。',
        href: 'https://blink.tw/features/recall2025/',
      },
    ],
  },
  {
    id: 'bluebird-movement',
    category: 'events',
    eventDate: '2024-05-17',
    type: '歷史事件',
    title: '青鳥行動',
    description: '2024 年 5 月，民眾在立法院外集結，對國會職權修法及其審議程序提出抗議。公民團體其後發起多場集會，行動從立法院周邊延伸至各地。',
    resources: [
      {
        kind: '現場調查',
        title: '巷仔口社會學｜立院「青鳥」群像',
        description: '研究團隊整理現場問卷，比較參與者背景與民主價值。',
        href: 'https://twstreetcorner.org/2024/06/18/2024legislative-yuan-investigation/',
      },
      {
        kind: '現場報導',
        title: '公視｜青鳥行動的形成與集會',
        description: '回顧 5 月 17 日至 28 日立法院外的公民動員。',
        href: 'https://news.pts.org.tw/article/697508',
      },
      {
        kind: '團體紀錄',
        title: '台灣經濟民主連合｜2024 年工作報告',
        description: '從主辦團體的角度記錄 5 月四次集會。',
        href: 'https://www.edunion.org.tw/%E5%B9%B4%E5%BA%A6%E5%A0%B1%E5%91%8A%E8%88%87%E5%B7%A5%E4%BD%9C%E8%A8%88%E7%95%AB/%E5%8F%B0%E7%81%A3%E7%B6%93%E6%BF%9F%E6%B0%91%E4%B8%BB%E9%80%A3%E5%90%882024%E5%B9%B4%E5%B7%A5%E4%BD%9C%E5%A0%B1%E5%91%8A/',
      },
      {
        kind: '判決摘要',
        title: '憲法法庭｜113 年憲判字第 9 號',
        description: '查閱憲法法庭對國會職權修法相關規定的判決。',
        href: 'https://www.judicial.gov.tw/tw/cp-1887-1187874-5cd85-1.html',
      },
    ],
  },
  {
    id: 'democracy-at-4am',
    category: 'events',
    eventDate: '2014-03-18',
    type: '歷史事件',
    title: '太陽花學運',
    description: '2014 年 3 月 18 日，學生與公民團體為抗議《兩岸服務貿易協議》的審議程序，占領立法院議場。行動引發各地聲援，學生於 4 月 10 日退出議場。',
    resources: [
      {
        kind: '數位專題',
        title: '在凌晨4點的民主',
        description: '整理學運時間軸、現場照片、影片與當時的報導。',
        href: 'https://4am-tw.maylogger.com/tw/',
      },
      {
        kind: '現場影音',
        title: '國家文化記憶庫｜318 太陽花學運實錄',
        description: '臺史博典藏的立法院周邊現場紀錄。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=2223730&indexCode=Culture_Media',
      },
      {
        kind: '口述史',
        title: '臺北大學｜太陽花學運口述史計畫',
        description: '訪談學生與系友，整理從占領到退場的參與經驗。',
        href: 'https://sociology.ntpu.edu.tw/uploadFiles/file/20150622/20150622095511_94001.pdf',
      },
      {
        kind: '政府回應',
        title: '總統府｜2014 年 3 月 29 日記者會',
        description: '查閱時任總統馬英九對學運的記者會全文。',
        href: 'https://www.president.gov.tw/NEWS/18494',
      },
    ],
  },
  {
    id: 'wild-strawberry-movement',
    category: 'events',
    eventDate: '2008-11-06',
    type: '歷史事件',
    title: '野草莓學運',
    description: '2008 年 11 月，學生以靜坐抗議陳雲林訪臺期間的警方執法，並要求修正《集會遊行法》。',
    resources: [
      {
        kind: '文物典藏',
        title: '國家文化記憶庫｜野草莓學運旗幟',
        description: '查閱當年使用的旗幟與學運背景。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=685273&indexCode=Culture_Object',
      },
      {
        kind: '行動聲明',
        title: '野草莓運動｜學生行動聲明',
        description: '閱讀運動參與者當年公布的行動緣起及訴求。',
        href: 'https://action1106.blogspot.com/2008/11/1106_7181.html',
      },
      {
        kind: '現場影音',
        title: '公民行動影音紀錄資料庫｜野草莓學運',
        description: '收錄 2008 年 11 月 8 日發布的現場影像。',
        href: 'https://www.civilmedia.tw/archives/1498',
      },
      {
        kind: '團體紀錄',
        title: '台灣人權促進會｜學生靜坐民眾靜走',
        description: '記錄公民團體聲援及靜走活動安排。',
        href: 'https://www.tahr.org.tw/news/545/',
      },
    ],
  },
  {
    id: 'action-100-alliance',
    category: 'events',
    eventDate: '1991-09-21',
    type: '歷史事件',
    title: '一〇〇行動聯盟',
    description: '1991 年，一〇〇行動聯盟以「反閱兵、廢惡法」為訴求，要求廢除當時箝制言論自由的《刑法》第一百條。立法院於隔年修正該條文。',
    resources: [
      {
        kind: '線上展',
        title: '100 行動聯盟三十週年線上影像展',
        description: '以影像回顧聯盟的成立、反閱兵行動與後續修法。',
        href: 'https://www.100action.tw/',
      },
      {
        kind: '原始宣言',
        title: '一〇〇行動聯盟成立宣言',
        description: '台灣教授協會保存的 1991 年 9 月 21 日宣言。',
        href: 'https://taup.yam.org.tw/announce/9109/910921%E4%B8%80%E2%97%8B%E2%97%8B%E8%A1%8C%E5%8B%95%E8%81%AF%E7%9B%9F%E6%88%90%E7%AB%8B%E5%AE%A3%E8%A8%80.htm',
      },
      {
        kind: '原始文宣',
        title: '國家文化記憶庫｜反閱兵廢惡法貼紙',
        description: '收藏邱萬興為聯盟設計的宣傳貼紙。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=11000120405&indexCode=MOCCOLLECTIONS',
      },
      {
        kind: '紀錄片',
        title: 'TaiwanDocs｜《愛與非暴力》',
        description: '影片介紹涵蓋行動演練、現場靜坐與參與者訪談。',
        href: 'https://docs.tfai.org.tw/zh-hant/film/4737',
      },
    ],
  },
  {
    id: 'wild-lily-movement',
    category: 'events',
    eventDate: '1990-03-16',
    type: '歷史事件',
    title: '野百合學運',
    description: '1990 年 3 月 16 至 22 日，各校學生在中正紀念堂廣場靜坐，要求解散國民大會、廢除臨時條款、召開國是會議及提出改革時程。學生代表與時任總統李登輝會面後，經校際表決決定退場。',
    resources: [
      {
        kind: '線上展',
        title: '中研院《學動．運生》｜野百合學運',
        description: '回顧各校動員、四大訴求、絕食與退場，附當年的照片和文宣。',
        href: 'https://ios20.ascdc.tw/e2_wildlily/',
      },
      {
        kind: '原始文宣',
        title: '臺史博｜《市民廣場》第五號',
        description: '學生廣場文宣組於學運期間編印的刊物。',
        href: 'https://collections.nmth.gov.tw/CollectionContent.aspx?RNO=2016.030.0031&a=132',
      },
      {
        kind: '時間軸',
        title: '端傳媒｜台灣野百合學運三十年',
        description: '用年表和現場照片整理事件背景與民主改革的後續。',
        href: 'https://campaign.theinitium.com/20200316-taiwan-wild-lily-30/index.html',
      },
      {
        kind: '紀錄片',
        title: '台灣國際紀錄片影展｜《你怎麼不憤怒！野百合學運》',
        description: '綠色小組重剪當年現場影像，頁面有影片介紹與預告。',
        href: 'https://www.tidf.org.tw/zh-hant/films/20434',
      },
    ],
  },
  {
    id: 'may-19-green-action',
    category: 'events',
    eventDate: '1986-05-19',
    type: '歷史事件',
    title: '五一九綠色行動',
    description: '1986 年 5 月 19 日，鄭南榕等人在艋舺龍山寺發起反戒嚴行動，公開要求解除戒嚴。',
    resources: [
      {
        kind: '歷史專題',
        title: '臺史博《點集臺灣史》｜五一九綠色行動',
        description: '說明 1986 年龍山寺集會，以及隔年的反戒嚴訴求。',
        href: 'https://the.nmth.gov.tw/nmth/zh-TW/Special/SpecialItemDetail/4ea765d6-1a61-48e5-bd38-aed47d4c6c45?exhibitionId=76fd9bb3-9f89-4d38-9cdc-29551378c897',
      },
      {
        kind: '現場照片',
        title: '國家文化記憶庫｜艋舺龍山寺五一九綠色行動',
        description: '簡永彬拍攝的龍山寺現場照片。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=327425&indexCode=Culture_Object',
      },
      {
        kind: '參與者回憶',
        title: '江蓋世｜龍山寺風雲錄',
        description: '由行動發起人回憶籌備過程與集會當日的經歷。',
        href: 'https://www.peopo.org/news/81907',
      },
      {
        kind: '紀錄短片',
        title: '鄭南榕紀念館｜《叛逆。自由！》',
        description: '短片收錄黃昭凱拍攝的 1986 年龍山寺影像。',
        href: 'https://www.telltaiwan.org/8034',
      },
    ],
  },
  {
    id: 'formosa-incident',
    category: 'events',
    eventDate: '1979-12-10',
    type: '歷史事件',
    title: '美麗島事件',
    description: '1979 年 12 月 10 日，黨外人士在高雄舉辦國際人權日活動，集會爆發衝突。政府隨後逮捕多位黨外人士，並展開軍法審判。',
    resources: [
      {
        kind: '國家檔案',
        title: '檔案管理局｜美麗島事件',
        description: '介紹事件經過與軍法審判，並提供相關檔案。',
        href: 'https://art.archives.gov.tw/tw/art/1553.html',
      },
      {
        kind: '現場照片',
        title: '國家文化記憶庫｜美麗島事件照片',
        description: '收錄口述歷史影片使用的兩張當年照片。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=326067&indexCode=Culture_Object',
      },
      {
        kind: '線上展',
        title: '臺史博｜超越軍法的恐懼',
        description: '介紹 1980 年美麗島大審與戒嚴時期的軍法制度。',
        href: 'https://the.nmth.gov.tw/nmth/zh-TW/Special/SpecialItemDetail/fe79df87-2581-4006-8c73-a265a4caee3f?exhibitionId=76fd9bb3-9f89-4d38-9cdc-29551378c897',
      },
      {
        kind: '研究與口述',
        title: '國家人權博物館｜美麗島事件研究報告',
        description: '事件研究、代表性檔案選輯與當事人訪談。',
        href: 'https://www.nhrm.gov.tw/WebUPD/nhrm/ResearchReport/50%E3%80%8C%E4%B8%80%E4%B9%9D%E4%B8%83%E4%B9%9D%EF%A6%8E%E7%BE%8E%EF%A6%88%E5%B3%B6%EF%BC%88%E9%AB%98%E9%9B%84%EF%BC%89%E4%BA%8B%E4%BB%B6%E7%A0%94%E7%A9%B6%E2%94%80%E4%BA%8B%E5%AF%A6%E7%B6%93%E9%81%8E%E3%80%81%E6%96%87%E7%8D%BB%E5%8F%B2%EF%A6%BE%E8%AA%BF%E6%9F%A5%E3%80%81%E8%88%87%E5%8F%A3%E8%BF%B0%E8%A3%9C%E8%A8%AA%E3%80%8D.pdf',
      },
    ],
  },
  {
    id: 'taiwan1947',
    category: 'events',
    eventDate: '1947-02-28',
    type: '線上筆記',
    title: '二二八台灣史補課筆記（2026）',
    description: '這份線上筆記由 @gratitude.drops 整理，以 1947 年二二八事件為主題，延伸至白色恐怖和臺灣民主化，提供附有來源的編年、地圖與互動式學習內容。',
    resources: [
      {
        kind: '線上筆記',
        title: '二二八台灣史補課筆記（2026）原站',
        description: '查閱作者整理的編年史、事件地圖與互動內容。',
        href: 'https://taiwan1947.org/',
      },
      {
        kind: '數位檔案',
        title: '國史館｜二二八事件檔案資料庫',
        description: '查找原始公文、檔案目錄及數位影像。',
        href: 'https://228.drnh.gov.tw/',
      },
      {
        kind: '線上展',
        title: '二二八國家紀念館｜土地傷痕',
        description: '從事件遺址認識事件起因與各地經過。',
        href: 'https://www.228.org.tw/onlineexhibitscarland/1',
      },
      {
        kind: '口述記憶',
        title: '國家文化記憶庫｜高雄二二八口述記憶',
        description: '收錄蕭陳換與蕭玉雲回憶高雄鼓山的事件經過。',
        href: 'https://tcmb.culture.tw/zh-tw/detail?id=568628&indexCode=Culture_Media',
      },
    ],
  },
  {
    id: 'taiwan-parliament-petition',
    category: 'events',
    eventDate: '1921-01-30',
    type: '歷史事件',
    title: '臺灣議會設置請願運動',
    description: '1921 至 1934 年，林獻堂等人先後向日本帝國議會提出十五次請願，爭取設置民選的臺灣議會。',
    resources: [
      {
        kind: '線上展',
        title: '立法院議政博物館｜臺灣議會設置請願運動百年展',
        description: '提供展場介紹與線上導覽。',
        href: 'https://aam.ly.gov.tw/P000023_02.do/1890',
      },
      {
        kind: '原始文稿',
        title: '中研院｜臺灣議會設置請願書稿',
        description: '1925 年林獻堂等人所提請願的趣旨與要旨。',
        href: 'https://ascdc.digitalarchives.tw/collection_7284466.html',
      },
      {
        kind: '歷史專題',
        title: '立法院民主議政園區｜臺灣議會設置請願運動',
        description: '陳翠蓮撰文，交代十五次請願及其政治背景。',
        href: 'https://daap.ly.gov.tw/tw/daap/125-3993.html',
      },
      {
        kind: '報紙剪報',
        title: '中研院｜1921 年請願運動剪報',
        description: '當時報紙對第一回請願與林獻堂記者會的記載。',
        href: 'https://catalog.digitalarchives.tw/item/00/29/85/92.html',
      },
    ],
  },
];
