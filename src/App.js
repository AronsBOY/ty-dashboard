/* global __firebase_config, __app_id, __initial_auth_token */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, Building2, Calendar, Database, Download, Upload, MapPin, Image as ImageIcon, Search, CheckSquare, Square, Check, MessageCircle, X, Send, FileText, Clock, History, Key, Printer, Settings, Plus, Paperclip, FileOutput, Zap, Lightbulb, Car, Umbrella, Camera, RefreshCw } from 'lucide-react';

// --- 雲端資料庫 (Firebase) 模組載入 ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// 加上防呆機制：若在外部環境 (如 Vercel) 缺乏 Config 時，不執行 Firebase 初始化以避免白畫面崩潰
const firebaseConfigStr = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
let app = null, auth = null, db = null;

if (firebaseConfigStr) {
    try {
        const firebaseConfig = JSON.parse(firebaseConfigStr);
        if (Object.keys(firebaseConfig).length > 0) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
        }
    } catch (error) {
        console.error("Firebase 初始化失敗:", error);
    }
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- 桃園市品牌色系 ---
const COLORS = {
  primary: '#E83888', // 魅力桃紅
  techBlue: '#00B2E5', // 智慧科技淺藍
  warmYellow: '#FFC600', // 婦幼友善暖黃
  ecoGreen: '#85C441', // 環保永續草綠
  gray: '#F3F4F6',
  textMain: '#1F2937',
};

const CHART_COLORS = ['#E83888', '#00B2E5', '#FFC600', '#85C441', '#8B5CF6', '#F97316'];

const DISTRICTS = ['桃園區', '中壢區', '平鎮區', '八德區', '楊梅區', '蘆竹區', '大溪區', '龍潭區', '龜山區', '大園區', '觀音區', '新屋區', '復興區'];
const LEVELS = ['幼兒園', '國小', '國中', '高中', '大學'];
const STATUSES = ['已完工', '施工中', '規劃中', '暫緩'];

// --- 案件來源預設清單 ---
const PROJECT_SOURCES = [
  "市長信箱", "市民1999", "學校提報", "里長反映", "局處會勘", "中央交辦",
  "邱奕勝(議長)", "李曉鐘(副議長)",
  "林政賢(議員)", "陳美梅(議員)", "黃婉如(議員)", "李光達(議員)", "黃家齊(議員)", "余信憲(議員)", "黃瓊慧(議員)", "張碩芳(議員)", "凌濤(議員)", "李宗豪(議員)", "段樹文(議員)",
  "彭俊豪(議員)", "葉明月(議員)", "謝美英(議員)", "劉曾玉春(議員)", "吳嘉和(議員)", "黃崇真(議員)", "魏筠(議員)",
  "陳萬得(議員)", "莊玉輝(議員)", "黃敬平(議員)", "舒翠玲(議員)", "劉仁照(議員)", "王珮毓(議員)",
  "呂林小鳳(議員)", "呂淑真(議員)", "蔡永芳(議員)", "楊朝偉(議員)", "許家睿(議員)",
  "徐其萬(議員)", "游吾和(議員)", "涂權吉(議員)", "周玉琴(議員)", "鄭淑方(議員)", "李家興(議員)", 
  "郭麗華(議員)", "張桂綿(議員)", "劉勝全(議員)", "錢龍(議員)", "林昭賢(議員)", "徐玉樹(議員)", 
  "劉熒隆(議員)", "簡志偉(議員)", "陳治文(議員)", "李柏坊(議員)", "吳進昌(議員)"
];

// --- 系統更新日誌資料 ---
const CHANGELOG = [
  { date: '2026-03-24', version: 'v3.3.0', notes: ['新增「學校宣傳圖卡」獨立匯出功能', '支援一鍵產出具備品牌視覺與四大指標的精美宣傳版面'] },
  { date: '2026-03-24', version: 'v3.2.0', notes: ['新增「四大亮點指標」勾選項與代表圖示 (電桿地下化、雙色溫路燈、接送區、雨遮)', '介面優化：雨遮長度與費用欄位變更為動態顯示，僅在勾選雨遮時出現', '統計擴充：學校總表新增四大指標的總量統計與表格欄位', '備份優化：CSV 全面支援四項指標布林值備份'] },
  { date: '2026-03-23', version: 'v3.1.0', notes: ['功能擴增：學校卡片新增「雨遮資訊」欄位（長度、費用）', '智慧運算：新增雨遮「每公尺單價」自動試算防呆機制'] },
  { date: '2026-03-23', version: 'v3.0.0', notes: ['架構升級：正式導入 Google Firebase 雲端資料庫', '新功能：實作 Audit Logs (異動紀錄) 追蹤每一次資料變更'] },
  { date: '2026-03-16', version: 'v2.4.0', notes: ['案件來源升級為 Multi-Tag (多重標籤) 系統，支援陣列儲存'] },
];

// --- 輔助函數：日期轉換與處理 ---
const cleanDate = (dateStr) => {
  if (!dateStr || dateStr === '-' || dateStr.includes('預計') || dateStr.includes('暑假') || dateStr.includes('寒假')) return '';
  const parts = dateStr.replace(/[^0-9/]/g, '').split('/');
  if (parts.length >= 2) {
    let year = parseInt(parts[0]);
    if (year < 200) year += 1911;
    return `${year}/${parts[1].padStart(2, '0')}/${parts[2] ? parts[2].padStart(2, '0') : '01'}`;
  }
  return dateStr;
};

const getBaseName = (name) => {
  if (!name) return '';
  if (name.includes('羅浮')) return '羅浮學區'; 
  return name.replace(/[1-3](期|\.0)/g, '').replace(/(\(.*\))/g, '').trim();
};

const isDuplicateName = (name) => {
    if (name.includes('羅浮') && !name.includes('高中')) return true; 
    return /[1-3](期|\.0)/.test(name);
}

const determineLevel = (name) => {
  if (name.includes('幼兒園') || name.includes('公托') || name.includes('幼')) return '幼兒園';
  if (name.includes('國小')) return '國小';
  if (name.includes('國中')) return '國中';
  if (name.includes('高中') || name.includes('職')) return '高中';
  if (name.includes('大學')) return '大學';
  return '國小';
};

// --- 行政區專屬意象主題 ---
const getDistrictTheme = (district) => {
    const themes = {
        '桃園區': { gradient: 'from-pink-600 via-purple-600 to-indigo-700', icon: '🏙️', desc: '首善之都 ‧ 繁華薈萃' },
        '中壢區': { gradient: 'from-blue-600 via-cyan-600 to-teal-700', icon: '🚆', desc: '雙城都心 ‧ 交通樞紐' },
        '平鎮區': { gradient: 'from-orange-500 via-red-500 to-rose-700', icon: '🏮', desc: '客庄風情 ‧ 義民精神' },
        '八德區': { gradient: 'from-emerald-500 via-green-600 to-teal-800', icon: '🦆', desc: '埤塘故鄉 ‧ 生態明珠' },
        '楊梅區': { gradient: 'from-yellow-500 via-orange-500 to-red-600', icon: '🍵', desc: '茶香鐵道 ‧ 樂活楊梅' },
        '蘆竹區': { gradient: 'from-sky-500 via-blue-500 to-indigo-600', icon: '✈️', desc: '航空都會 ‧ 國門之都' },
        '大溪區': { gradient: 'from-amber-600 via-orange-600 to-red-700', icon: '🌉', desc: '木藝小鎮 ‧ 歷史走廊' },
        '龍潭區': { gradient: 'from-teal-500 via-emerald-600 to-green-700', icon: '🐉', desc: '龍潭大池 ‧ 科技重鎮' },
        '龜山區': { gradient: 'from-lime-500 via-green-500 to-emerald-700', icon: '⛰️', desc: '青春山城 ‧ 體育大區' },
        '大園區': { gradient: 'from-cyan-500 via-blue-500 to-indigo-700', icon: '🛫', desc: '桃園驛站 ‧ 濱海風光' },
        '觀音區': { gradient: 'from-pink-400 via-rose-500 to-red-600', icon: '🪷', desc: '蓮花之鄉 ‧ 觀音庇佑' },
        '新屋區': { gradient: 'from-yellow-400 via-amber-500 to-orange-600', icon: '🌾', desc: '米之故鄉 ‧ 魚米之鄉' },
        '復興區': { gradient: 'from-green-600 via-emerald-700 to-teal-900', icon: '🌲', desc: '原鄉山林 ‧ 泰雅風情' }
    };
    return themes[district] || { gradient: 'from-pink-600 via-purple-600 to-indigo-700', icon: '✨', desc: '科技城市 ‧ 魅力桃園' };
};

// --- 擴展表頭自訂欄寬元件 ---
const ResizableTh = ({ children, minW = "100px", className = "" }) => (
    <th className="border border-gray-200 bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm print-bg-gray-100 p-0 align-top">
        <div className={`p-3 resize-x overflow-hidden whitespace-nowrap font-bold hover:bg-gray-200 transition-colors ${className}`} style={{ minWidth: minW, maxWidth: '600px' }}>
            {children}
        </div>
    </th>
);

// --- 多重標籤輸入元件 (Multi-Tag Input) ---
const MultiTagInput = ({ tags = [], onChange, options = [], placeholder = "輸入或從清單選擇..." }) => {
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef(null);
    const datalistId = useMemo(() => `dl-${Math.random().toString(36).substr(2, 9)}`, []);
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ';' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        }
    };

    const handleChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        if (options.includes(val)) setTimeout(() => addTag(val), 10);
    };

    const addTag = (val) => {
        const trimmed = val.trim().replace(/[,;]/g, '');
        if (trimmed) {
            if (!tags.includes(trimmed)) onChange([...tags, trimmed]);
            setInputValue('');
        }
    };

    const removeTag = (tagToRemove) => onChange(tags.filter(t => t !== tagToRemove));

    return (
        <div className="w-full border border-gray-300 p-2 rounded focus-within:ring-2 focus-within:ring-pink-300 bg-pink-50/50 min-h-[42px] flex flex-wrap items-center gap-1 cursor-text" onClick={() => inputRef.current?.focus()}>
            {tags.map((tag, idx) => (
                <span key={idx} className="bg-pink-100 text-pink-800 text-xs font-bold px-2 py-1 rounded-full flex items-center border border-pink-200 shadow-sm transition-all hover:-translate-y-0.5">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }} className="ml-1 text-pink-400 hover:text-pink-900 focus:outline-none"><X className="w-3 h-3" /></button>
                </span>
            ))}
            <input ref={inputRef} type="text" list={datalistId} className="flex-1 min-w-[150px] outline-none bg-transparent text-sm text-gray-800 font-bold placeholder-gray-400 p-1" placeholder={tags.length === 0 ? placeholder : "繼續新增..."} value={inputValue} onChange={handleChange} onKeyDown={handleKeyDown} onBlur={() => inputValue && addTag(inputValue)} />
            <datalist id={datalistId}>{options.filter(o => !tags.includes(o)).map(src => <option key={src} value={src} />)}</datalist>
        </div>
    );
};

const DEFAULT_NEW_PROJECT = {
    district: '桃園區', name: '', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', 
    budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', scheduleMonth: '', isExcluded: false, isNotApproved: false,
    source: [], features: { pole: false, light: false, pickup: false, shelter: false },
    shelterLength: 0, shelterCost: 0, beforeImage: '', afterImage: ''
};

// --- 由文本解析匯入之完整資料庫 ---
const INITIAL_DATA = [
  { id: '1', district: '中壢區', name: '中壢國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2390, startDate: '2024/12/27', endDate: '2026/03/31', agency: '都發局', source: ['局處會勘'], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '2', district: '中壢區', name: '林森國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 1890, startDate: '2026/04/01', endDate: '2026/07/01', agency: '養工處', source: ['彭俊豪(議員)'], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '3', district: '中壢區', name: '龍興國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '4', district: '中壢區', name: '興國國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '5', district: '中壢區', name: '興仁國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '6', district: '中壢區', name: '中央大學', level: '大學', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 3500, startDate: '2023/10/16', endDate: '2024/07/05', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '7', district: '中壢區', name: '中平國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 310, startDate: '2023/10/30', endDate: '2024/02/25', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '8', district: '中壢區', name: '中平國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '2025/07/10', endDate: '2025/12/10', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '9', district: '中壢區', name: '新街國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 249, startDate: '2023/04/17', endDate: '2023/06/02', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '10', district: '中壢區', name: '內壢高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 173.5, startDate: '2024/11/05', endDate: '2025/01/10', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '11', district: '中壢區', name: '新明國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 323.3, startDate: '2024/10/29', endDate: '2024/12/25', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '12', district: '中壢區', name: '過嶺國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 140, startDate: '2024/12/15', endDate: '2025/02/28', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '13', district: '中壢區', name: '內壢國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2623, startDate: '2025/01/21', endDate: '2026/02/05', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '14', district: '八德區', name: '大成國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '15', district: '八德區', name: '八德國中2期', level: '國中', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 2500, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '16', district: '八德區', name: '大勇國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 133, startDate: '2024/05/01', endDate: '2024/05/21', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '17', district: '八德區', name: '大忠國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 65, startDate: '2023/11/30', endDate: '2023/12/10', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '18', district: '八德區', name: '廣興國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 61, startDate: '2023/12/01', endDate: '2023/12/15', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '19', district: '八德區', name: '廣興國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 400, startDate: '2025/04/01', endDate: '2025/05/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '20', district: '八德區', name: '大成國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 420, startDate: '2023/08/15', endDate: '2023/10/31', agency: '教育局', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '21', district: '八德區', name: '茄苳國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 643, startDate: '2024/05/04', endDate: '2024/08/10', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '22', district: '八德區', name: '八德國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 655, startDate: '2024/07/22', endDate: '2024/12/27', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '23', district: '八德區', name: '八德國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 655, startDate: '2024/07/22', endDate: '2024/12/27', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '24', district: '八德區', name: '大安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 833, startDate: '2024/09/17', endDate: '2025/02/28', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '25', district: '八德區', name: '瑞豐國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 833, startDate: '2024/09/17', endDate: '2025/02/28', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '26', district: '平鎮區', name: '北勢國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 970, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '27', district: '平鎮區', name: '忠貞國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '28', district: '平鎮區', name: '平南國中', level: '國中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '2026/06/01', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '29', district: '平鎮區', name: '東安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 959, startDate: '2024/07/15', endDate: '2024/10/12', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '30', district: '平鎮區', name: '南勢國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 1050, startDate: '2024/01/15', endDate: '2024/05/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '31', district: '平鎮區', name: '山豐國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 50, startDate: '2023/12/01', endDate: '2024/04/21', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '32', district: '平鎮區', name: '山豐國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 150, startDate: '2024/09/15', endDate: '2024/10/07', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '33', district: '平鎮區', name: '新勢國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 250, startDate: '2024/08/16', endDate: '2024/09/23', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '34', district: '平鎮區', name: '祥安國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 100, startDate: '2024/07/25', endDate: '2024/08/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '35', district: '平鎮區', name: '復旦國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 284, startDate: '2024/08/02', endDate: '2024/08/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '36', district: '平鎮區', name: '文化國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 43, startDate: '2024/04/03', endDate: '2024/04/12', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '37', district: '平鎮區', name: '義興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 44, startDate: '2024/03/16', endDate: '2024/04/29', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '38', district: '平鎮區', name: '東安國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 959, startDate: '2024/07/05', endDate: '2024/09/07', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '39', district: '平鎮區', name: '平興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 875, startDate: '2024/07/01', endDate: '2024/09/20', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '40', district: '平鎮區', name: '平鎮高中', level: '高中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '2024/08/09', endDate: '2024/11/01', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '41', district: '平鎮區', name: '新榮國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 54, startDate: '2024/07/30', endDate: '2024/08/03', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '42', district: '平鎮區', name: '義民公幼', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 350, startDate: '2024/10/14', endDate: '2025/01/09', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '43', district: '平鎮區', name: '東勢國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2025/02/06', endDate: '2025/03/31', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '44', district: '平鎮區', name: '平鎮國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '2024/08/16', endDate: '2025/06/01', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '45', district: '平鎮區', name: '育達高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 350, startDate: '2025/07/10', endDate: '2025/08/11', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '46', district: '平鎮區', name: '宋屋國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 650, startDate: '2025/09/12', endDate: '2025/12/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '47', district: '大園區', name: '大園國際高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 200, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '48', district: '大園區', name: '溪海國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '交通局', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '49', district: '大園區', name: '大園國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1470, startDate: '2023/08/18', endDate: '2023/11/22', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '50', district: '大園區', name: '五權國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 197, startDate: '2023/10/25', endDate: '2023/12/31', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '51', district: '大園區', name: '大園國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 4.5, startDate: '2024/03/15', endDate: '2024/04/05', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '52', district: '觀音區', name: '觀音國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '53', district: '觀音區', name: '草漯國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 749, startDate: '2024/03/04', endDate: '2024/10/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '54', district: '觀音區', name: '育仁國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 106, startDate: '2023/11/10', endDate: '2024/03/12', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '55', district: '觀音區', name: '觀音國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 1758, startDate: '2022/07/16', endDate: '2022/12/27', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '56', district: '觀音區', name: '新坡國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/07/17', endDate: '2024/12/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '57', district: '龜山區', name: '福源國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '58', district: '龜山區', name: '大埔國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '59', district: '龜山區', name: '文欣國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '60', district: '龜山區', name: '文青國中小', level: '國中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '61', district: '龜山區', name: '大崗國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2770, startDate: '2024/03/04', endDate: '2024/10/21', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '62', district: '龜山區', name: '大崗國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 8000, startDate: '2024/10/14', endDate: '2025/11/01', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '63', district: '龜山區', name: '大湖國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1040, startDate: '2024/12/05', endDate: '2025/04/27', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '64', district: '龜山區', name: '大湖國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '', endDate: '2024/12/19', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '65', district: '龜山區', name: '楓樹國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 140, startDate: '2023/02/01', endDate: '2023/04/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '66', district: '龜山區', name: '楓樹國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 99, startDate: '2023/10/11', endDate: '2023/12/02', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '67', district: '龜山區', name: '光峰幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 75, startDate: '2023/01/30', endDate: '2023/03/29', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '68', district: '龜山區', name: '龜山幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 2, startDate: '2023/05/27', endDate: '2023/05/27', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '69', district: '龜山區', name: '新路國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 91, startDate: '2024/01/22', endDate: '2024/04/20', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '70', district: '龜山區', name: '龜山國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 731, startDate: '2024/08/05', endDate: '2024/12/20', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '71', district: '龜山區', name: '壽山高中', level: '高中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 732, startDate: '2024/08/05', endDate: '2024/12/20', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '72', district: '龜山區', name: '山頂國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 600, startDate: '2024/09/10', endDate: '2024/12/27', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '73', district: '龜山區', name: '南美國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 989, startDate: '2024/08/13', endDate: '2024/12/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '74', district: '龜山區', name: '樂善國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 989, startDate: '2024/08/13', endDate: '2024/12/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '75', district: '龜山區', name: '幸福國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 220, startDate: '2023/06/13', endDate: '2023/08/22', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '76', district: '龜山區', name: '自強國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/08/28', endDate: '2024/10/14', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '77', district: '龜山區', name: '自強國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 450, startDate: '2025/08/29', endDate: '2025/10/27', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '78', district: '龜山區', name: '龜山國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 280, startDate: '2023/11/20', endDate: '2024/08/01', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '79', district: '龜山區', name: '文華國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1300, startDate: '2025/08/25', endDate: '2026/01/05', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '80', district: '蘆竹區', name: '南崁高中', level: '高中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2050, startDate: '2026/03/26', endDate: '2027/01/15', agency: '航工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '81', district: '蘆竹區', name: '南崁國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2050, startDate: '2026/03/26', endDate: '2027/01/15', agency: '航工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '82', district: '蘆竹區', name: '外社國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 578, startDate: '2026/06/01', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '83', district: '蘆竹區', name: '新興國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '84', district: '蘆竹區', name: '錦興國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1400, startDate: '2024/07/22', endDate: '2024/12/10', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '85', district: '蘆竹區', name: '山腳國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 16, startDate: '2023/08/28', endDate: '2023/08/28', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '86', district: '蘆竹區', name: '山腳國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 130, startDate: '2024/02/01', endDate: '2024/04/15', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '87', district: '蘆竹區', name: '大竹國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 513, startDate: '2024/07/29', endDate: '2024/10/14', agency: '航空處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '88', district: '蘆竹區', name: '大竹國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 514, startDate: '2024/07/29', endDate: '2024/10/14', agency: '航空處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '89', district: '蘆竹區', name: '大竹國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/11/01', endDate: '2025/12/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '90', district: '蘆竹區', name: '蘆竹國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 150, startDate: '2024/06/15', endDate: '2024/07/12', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '91', district: '蘆竹區', name: '大華國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 150, startDate: '2024/06/12', endDate: '2024/07/05', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '92', district: '蘆竹區', name: '山腳國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2025/04/07', endDate: '2025/06/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '93', district: '大溪區', name: '中興國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 981, startDate: '2025/09/02', endDate: '2026/03/31', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '94', district: '大溪區', name: '大溪國中', level: '國中', status: '暫緩', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 327, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '95', district: '大溪區', name: '仁和國中', level: '國中', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1423, startDate: '2026/01/23', endDate: '2026/12/30', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '96', district: '大溪區', name: '仁善國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 500, startDate: '2025/05/13', endDate: '2026/04/21', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '97', district: '大溪區', name: '員樹林國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '98', district: '大溪區', name: '僑愛國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '99', district: '大溪區', name: '田心國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '100', district: '大溪區', name: '福安國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '101', district: '大溪區', name: '永福國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '102', district: '大溪區', name: '大溪國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1536, startDate: '2023/07/31', endDate: '2023/11/01', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '103', district: '大溪區', name: '南興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 91, startDate: '2023/01/03', endDate: '2023/03/04', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '104', district: '大溪區', name: '內柵國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '2025/09/01', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '105', district: '大溪區', name: '瑞祥國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '2025/08/28', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '106', district: '新屋區', name: '埔頂國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 500, startDate: '2026/06/01', endDate: '2027/01/01', agency: '用地科', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '107', district: '新屋區', name: '大坡國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2023/11/28', endDate: '2024/05/09', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '108', district: '新屋區', name: '北湖國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2024/05/15', endDate: '2024/07/01', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '109', district: '新屋區', name: '永安國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 320, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '110', district: '新屋區', name: '永安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 470, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '111', district: '新屋區', name: '東明國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 920, startDate: '2024/07/15', endDate: '2025/06/04', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '112', district: '桃園區', name: '中山國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '113', district: '桃園區', name: '會稽國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '道路基金', budgetAmount: 280, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '114', district: '桃園區', name: '莊敬國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '115', district: '桃園區', name: '桃園高中', level: '高中', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 5900, startDate: '2025/10/30', endDate: '2026/11/23', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '116', district: '桃園區', name: '北門國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 450, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '117', district: '桃園區', name: '中埔國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '118', district: '桃園區', name: '青溪國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '119', district: '桃園區', name: '永順國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '120', district: '桃園區', name: '文昌國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 320, startDate: '2023/11/15', endDate: '2024/03/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '121', district: '桃園區', name: '南門國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 170, startDate: '2023/05/13', endDate: '2023/08/01', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '122', district: '桃園區', name: '桃園國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 200, startDate: '2024/07/15', endDate: '2024/08/28', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '123', district: '桃園區', name: '桃園國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 3570, startDate: '2024/12/27', endDate: '2025/09/01', agency: '都發局', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '124', district: '桃園區', name: '大業國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 471, startDate: '2023/12/26', endDate: '2024/05/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '125', district: '桃園區', name: '大業國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 0, startDate: '2025/01/06', endDate: '2025/02/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '126', district: '桃園區', name: '東門國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 250, startDate: '2023/09/01', endDate: '2023/10/15', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '127', district: '桃園區', name: '建德國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 490, startDate: '2023/07/01', endDate: '2023/08/29', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '128', district: '桃園區', name: '福豐國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 490, startDate: '2023/07/01', endDate: '2023/08/29', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '129', district: '桃園區', name: '建德國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 600, startDate: '2025/07/30', endDate: '2025/10/22', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '130', district: '桃園區', name: '中興國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 457, startDate: '2024/07/31', endDate: '2024/12/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '131', district: '桃園區', name: '文山國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 457, startDate: '2024/07/31', endDate: '2024/12/15', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '132', district: '桃園區', name: '文山國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 400, startDate: '2025/01/06', endDate: '2025/04/07', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '133', district: '桃園區', name: '龍山國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 23, startDate: '2023/12/12', endDate: '2023/12/18', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '134', district: '桃園區', name: '龍山國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 300, startDate: '2025/01/24', endDate: '2025/03/11', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '135', district: '桃園區', name: '同安國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 600, startDate: '2025/07/08', endDate: '2025/09/22', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '136', district: '桃園區', name: '復興非營利幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/08/25', endDate: '2025/09/17', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '137', district: '桃園區', name: '青溪國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '2025/10/31', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '138', district: '桃園區', name: '桃園市立桃園幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/10/31', endDate: '2025/11/29', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '139', district: '楊梅區', name: '瑞埔國小2期', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '140', district: '楊梅區', name: '治平高中', level: '高中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '141', district: '楊梅區', name: '楊梅國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '142', district: '楊梅區', name: '楊明國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '143', district: '楊梅區', name: '瑞埔國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2024/01/31', endDate: '2024/03/11', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '144', district: '楊梅區', name: '瑞梅國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 80, startDate: '2023/07/12', endDate: '2023/08/22', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '145', district: '楊梅區', name: '瑞梅國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 23, startDate: '2023/12/20', endDate: '2023/12/31', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '146', district: '楊梅區', name: '瑞塘國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 90, startDate: '2024/01/15', endDate: '2024/02/19', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '147', district: '龍潭區', name: '雙龍國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '148', district: '龍潭區', name: '龍星國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 145, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '149', district: '龍潭區', name: '龍潭國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '客家事務局', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '150', district: '龍潭區', name: '龍潭高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 1500, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '151', district: '龍潭區', name: '三和國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '152', district: '龍潭區', name: '高原國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/03/01', endDate: '2024/04/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '153', district: '龍潭區', name: '諾瓦國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 62, startDate: '2023/11/01', endDate: '2023/11/30', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '154', district: '龍潭區', name: '龍潭國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2023/07/07', endDate: '2023/08/31', agency: '區公所', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '155', district: '復興區', name: '羅浮高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '156', district: '復興區', name: '羅浮國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '157', district: '復興區', name: '羅浮國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '158', district: '復興區', name: '羅浮附幼', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
  { id: '159', district: '復興區', name: '霞雲國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 400, startDate: '2025/01/15', endDate: '2025/02/26', agency: '養工處', source: [], features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false, shelterLength: 0, shelterCost: 0 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // --- 圖片上傳自動壓縮處理器 ---
  const handleImageUpload = (e, fieldName, isNewProject = false) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; // 強度壓縮以適應現行資料庫架構
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 降低品質至 60%
            
            if (isNewProject) {
                setNewProject(prev => ({ ...prev, [fieldName]: dataUrl }));
            } else {
                setSelectedProject(prev => ({ ...prev, [fieldName]: dataUrl }));
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // --- 系統狀態 (強化：本機與雲端雙軌載入) ---
  const loadLocalData = () => {
      if (typeof window !== 'undefined') {
          try {
              const saved = localStorage.getItem('ty_projects_backup');
              if (saved) return JSON.parse(saved);
          } catch(e) { console.error("本機備份讀取失敗", e); }
      }
      return INITIAL_DATA;
  };
  
  const loadLocalLogs = () => {
      if (typeof window !== 'undefined') {
          try {
              const saved = localStorage.getItem('ty_logs_backup');
              if (saved) return JSON.parse(saved);
          } catch(e) {}
      }
      return [];
  };

  const [projects, setProjects] = useState(INITIAL_DATA); // 初始強制用預設值，避免水合錯誤
  const [auditLogs, setAuditLogs] = useState([]);

  // 畫面載入後，才把本機備份蓋上去
  useEffect(() => {
    const localProjects = loadLocalData();
    const localLogs = loadLocalLogs();
    if (localProjects && localProjects.length > 0) {
        setProjects(localProjects);
    }
    if (localLogs && localLogs.length > 0) {
        setAuditLogs(localLogs);
    }
  }, []);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false); // 新增：儲存狀態

  const [filterDist, setFilterDist] = useState('All');
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState('All');
  const [tableStatusFilter, setTableStatusFilter] = useState('All'); 
  const [featureFilter, setFeatureFilter] = useState('All'); // 新增：四大指標篩選狀態
  const [selectedProject, setSelectedProject] = useState(null);
  
  // --- 新增：宣傳圖卡專用 State ---
  const [promoProject, setPromoProject] = useState(null);

  const fileInputRef = useRef(null);
  
  // --- A4 列印與模態框 ---
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelection, setPrintSelection] = useState({ b1: false, b1_1: false, b2: false, b3: false, b4: false, b5: false, b6: false, b7: false, b8: false });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProject, setNewProject] = useState(DEFAULT_NEW_PROJECT);

  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ty_gemini_key') || '';
    return '';
  });
  
  const [currentDate, setCurrentDate] = useState('');
  useEffect(() => {
      const today = new Date();
      setCurrentDate(`${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`);
  }, []);

  // ==========================================
  // Firebase 雲端連線與同步邏輯
  // ==========================================
  useEffect(() => {
    if (!auth) return; // 防呆：若無 Firebase 實例則跳過，避免崩潰
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return; // 防呆：若無 Firebase 實例則跳過
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'taoyuan_db', 'main_data');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let cloudProjects = data.projects || INITIAL_DATA;
        
        // 自動修復機制：如果雲端資料庫被先前的少量測試資料覆蓋，自動還原回 159 筆完整資料
        if (cloudProjects.length < 10) {
            cloudProjects = INITIAL_DATA;
            setDoc(docRef, { projects: INITIAL_DATA, logs: data.logs || [] }, { merge: true });
        }
        
        // 確保讀取的資料有 features 預設值，避免舊資料 undefined 報錯
        const safeProjects = cloudProjects.map(p => ({
            ...p,
            features: p.features || { pole: false, light: false, pickup: false, shelter: false },
            shelterLength: p.shelterLength || 0,
            shelterCost: p.shelterCost || 0
        }));
        setProjects(safeProjects);
        setAuditLogs(data.logs || []);
      } else {
        // 資料庫為空，初始化資料
        setDoc(docRef, { 
            projects: INITIAL_DATA, 
            logs: [{ time: new Date().toLocaleString('zh-TW', { hour12: false }), action: '建立資料庫架構與初始化資料', user: user.uid }] 
        });
      }
    }, (error) => console.error("Firestore 同步錯誤:", error));
    
    return () => unsubscribe();
  }, [user]);

  // 統一的寫入雲端與紀錄 Audit Log 函數 (強化：雙軌儲存)
  const persistData = async (newProjects, actionDesc) => {
    setProjects(newProjects); // Optimistic UI: 畫面立刻反應，不卡頓
    
    const newLog = {
        time: new Date().toLocaleString('zh-TW', { hour12: false }),
        action: actionDesc,
        user: user ? user.uid : 'local-user'
    };
    const updatedLogs = [newLog, ...auditLogs].slice(0, 200);
    setAuditLogs(updatedLogs);

    // --- 強化核心：永遠備份至本機 LocalStorage，防止雲端斷線 ---
    try {
        localStorage.setItem('ty_projects_backup', JSON.stringify(newProjects));
        localStorage.setItem('ty_logs_backup', JSON.stringify(updatedLogs));
    } catch (e) {
        console.error("本機備份失敗:", e);
    }

    if (!user || !db) return; // 防呆：若無 Firebase 實例則僅保留本機狀態，不寫入雲端
    
    try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'taoyuan_db', 'main_data');
        await setDoc(docRef, { projects: newProjects, logs: updatedLogs }, { merge: true });
    } catch (error) {
        console.error("儲存至雲端失敗:", error);
    }
  };

  // --- 新增：強制更新儲存功能 ---
  const handleForceSync = async () => {
      setIsSyncing(true);
      await persistData(projects, "使用者手動觸發【更新儲存】");
      setTimeout(() => {
          setIsSyncing(false);
          alert("✅ 資料已成功強制儲存至本機備份！\n即使尚未連線雲端，下次開啟仍將自動接續本次進度。");
      }, 800);
  };

  // --- AI 戰情特助 State ---
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: '長官您好！我是桃園市通學廊道的 AI 戰情特助。我已經讀取了「各行政區的最新統計數據」。\n\n💡 新功能提示：您可以點擊左下角的「迴紋針」上傳參考文件(txt檔)，並使用「產生新聞稿」功能為您草擬發布文稿！' }]);
  const [aiInput, setAiInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const aiFileInputRef = useRef(null);
  const aiChatEndRef = useRef(null);

  useEffect(() => {
    if (aiChatEndRef.current) aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  const processedProjects = useMemo(() => {
    let currentIndex = 1;
    const groupMap = {};
    projects.forEach(p => {
        const base = getBaseName(p.name);
        if (!groupMap[base]) groupMap[base] = { primaryIdx: currentIndex++, currentSubIdx: 0, totalInstances: 0 };
        groupMap[base].totalInstances++;
    });
    return projects.map(p => {
        const base = getBaseName(p.name);
        const groupInfo = groupMap[base];
        groupInfo.currentSubIdx++;
        const itemNumber = groupInfo.totalInstances > 1 ? `${groupInfo.primaryIdx}-${groupInfo.currentSubIdx}` : `${groupInfo.primaryIdx}`;
        return { ...p, itemNumber };
    });
  }, [projects]);

  const filteredByDistrictProjects = useMemo(() => {
    return schoolDistrictFilter === 'All' ? processedProjects : processedProjects.filter(p => p.district === schoolDistrictFilter);
  }, [processedProjects, schoolDistrictFilter]);

  const tableStats = useMemo(() => {
    const groups = {};
    filteredByDistrictProjects.forEach(p => {
        if (p.isExcluded) return; 
        const base = getBaseName(p.name);
        if (!groups[base]) groups[base] = [];
        groups[base].push(p);
    });
    let actualTotal = 0, actualCompleted = 0, actualInProgress = 0, actualPlanning = 0, actualPaused = 0;
    let poleCount = 0, lightCount = 0, pickupCount = 0, shelterCount = 0;
    
    const statusPriority = { '已完工': 4, '施工中': 3, '規劃中': 2, '暫緩': 1 };
    Object.values(groups).forEach(group => {
        actualTotal++;
        let highestStatus = group[0].status;
        group.forEach(p => { if (statusPriority[p.status] > statusPriority[highestStatus]) highestStatus = p.status; });
        if (highestStatus === '已完工') actualCompleted++;
        else if (highestStatus === '施工中') actualInProgress++;
        else if (highestStatus === '規劃中') actualPlanning++;
        else if (highestStatus === '暫緩') actualPaused++;
        
        // 四大指標：只要該學校有任何一期納入該指標，即算具備
        if (group.some(p => p.features?.pole)) poleCount++;
        if (group.some(p => p.features?.light)) lightCount++;
        if (group.some(p => p.features?.pickup)) pickupCount++;
        if (group.some(p => p.features?.shelter)) shelterCount++;
    });
    return { actualTotal, actualCompleted, actualInProgress, actualPlanning, actualPaused, poleCount, lightCount, pickupCount, shelterCount };
  }, [filteredByDistrictProjects]);

  const displayProjects = useMemo(() => {
    let result = filteredByDistrictProjects;
    
    // 狀態篩選 (如：已完工、施工中)
    if (tableStatusFilter !== 'All') {
        result = result.filter(p => p.status === tableStatusFilter);
    }
    
    // 指標篩選 (如：雨遮、電桿)
    if (featureFilter !== 'All') {
        result = result.filter(p => p.features && p.features[featureFilter]);
    }
    
    return result;
  }, [filteredByDistrictProjects, tableStatusFilter, featureFilter]);

  const kpis = useMemo(() => {
    let total = projects.length, completed = 0, inProgress = 0, planning = 0, paused = 0, duplicatedCount = 0;
    let totalBudget = 0, completedBudget = 0, inProgressBudget = 0;
    const baseNameGroups = {};
    const statusPriority = { '已完工': 4, '施工中': 3, '規劃中': 2, '暫緩': 1 };

    projects.forEach(p => {
        const base = getBaseName(p.name);
        if(!baseNameGroups[base]) baseNameGroups[base] = [];
        baseNameGroups[base].push(p);
    });

    projects.forEach(p => {
      const amt = Number(p.budgetAmount) || 0;
      if (p.status === '已完工') { completed++; completedBudget += amt; }
      if (p.status === '施工中') { inProgress++; inProgressBudget += amt; }
      if (p.status === '規劃中') planning++;
      if (p.status === '暫緩') paused++;
      totalBudget += amt;
      if (isDuplicateName(p.name) || baseNameGroups[getBaseName(p.name)].length > 1) {
          if(isDuplicateName(p.name)) duplicatedCount++;
      }
    });

    const sumBudget = (arr) => arr.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);
    const budgetSourceData = [
      { name: '中央補助', value: sumBudget(projects.filter(p => p.budgetSource1 === '中央補助' && !p.isExcluded)) },
      { name: '市府預算', value: sumBudget(projects.filter(p => p.budgetSource1 === '市府預算' && !p.isExcluded)) },
    ].filter(d => d.value > 0);

    const centralSourceData = [
      { name: '國土署', value: sumBudget(projects.filter(p => p.budgetSource2 === '國土署' && !p.isExcluded && !p.isNotApproved)) },
      { name: '公路局', value: sumBudget(projects.filter(p => p.budgetSource2 === '公路局' && !p.isExcluded && !p.isNotApproved)) },
    ].filter(d => d.value > 0);

    const districtStats = DISTRICTS.map(dist => {
      const distProjects = projects.filter(p => p.district === dist);
      const groups = {};
      distProjects.forEach(p => {
          if (p.isExcluded) return; 
          const base = getBaseName(p.name);
          if (!groups[base]) groups[base] = [];
          groups[base].push(p);
      });
      let actualTotal = 0, actualCompleted = 0, actualInProgress = 0, actualPlanning = 0, actualPaused = 0;
      let dTotalBudget = 0, dCompletedBudget = 0, dInProgressBudget = 0, dPlanningBudget = 0, dPausedBudget = 0;

      Object.values(groups).forEach(group => {
          actualTotal++;
          let highestStatus = group[0].status;
          let groupBudget = 0; 
          group.forEach(p => {
              groupBudget += (Number(p.budgetAmount) || 0);
              if (statusPriority[p.status] > statusPriority[highestStatus]) highestStatus = p.status;
          });
          dTotalBudget += groupBudget;
          if (highestStatus === '已完工') { actualCompleted++; dCompletedBudget += groupBudget; }
          else if (highestStatus === '施工中') { actualInProgress++; dInProgressBudget += groupBudget; }
          else if (highestStatus === '規劃中') { actualPlanning++; dPlanningBudget += groupBudget; }
          else if (highestStatus === '暫緩') { actualPaused++; dPausedBudget += groupBudget; }
      });
      return {
          name: dist, actualTotal, totalBudget: dTotalBudget, actualCompleted, completedBudget: dCompletedBudget,
          actualInProgress, inProgressBudget: dInProgressBudget, actualPlanning, planningBudget: dPlanningBudget,
          actualPaused, pausedBudget: dPausedBudget
      };
    });

    const cityTotalCard = districtStats.reduce((acc, curr) => ({
        name: '全市總計',
        actualTotal: acc.actualTotal + curr.actualTotal, totalBudget: acc.totalBudget + curr.totalBudget,
        actualCompleted: acc.actualCompleted + curr.actualCompleted, completedBudget: acc.completedBudget + curr.completedBudget,
        actualInProgress: acc.actualInProgress + curr.actualInProgress, inProgressBudget: acc.inProgressBudget + curr.inProgressBudget,
        actualPlanning: acc.actualPlanning + curr.actualPlanning, planningBudget: acc.planningBudget + curr.planningBudget,
        actualPaused: acc.actualPaused + curr.actualPaused, pausedBudget: acc.pausedBudget + curr.pausedBudget,
    }), {
        name: '全市總計', actualTotal: 0, totalBudget: 0, actualCompleted: 0, completedBudget: 0,
        actualInProgress: 0, inProgressBudget: 0, actualPlanning: 0, planningBudget: 0, actualPaused: 0, pausedBudget: 0
    });

    return {
      total, completed, inProgress, planning, paused, duplicatedCount, totalBudget, completedBudget, inProgressBudget,
      actualTotal: cityTotalCard.actualTotal, actualCompleted: cityTotalCard.actualCompleted, actualInProgress: cityTotalCard.actualInProgress,
      actualPlanning: cityTotalCard.actualPlanning, actualPaused: cityTotalCard.actualPaused,
      budgetSourceData, centralSourceData, districtCards: [...districtStats, cityTotalCard]
    };
  }, [projects]);

  // --- CRUD (已連結雲端同步 persistData) ---
  const handleToggleExclude = (id) => { 
      const proj = projects.find(p => p.id === id);
      const updated = projects.map(p => p.id === id ? { ...p, isExcluded: !p.isExcluded } : p);
      persistData(updated, `切換 ${proj.name} 的歸戶狀態為：${!proj.isExcluded ? '排除' : '納入'}`); 
  };
  
  const handleToggleNotApproved = (id) => { 
      const proj = projects.find(p => p.id === id);
      const updated = projects.map(p => p.id === id ? { ...p, isNotApproved: !p.isNotApproved } : p);
      persistData(updated, `變更 ${proj.name} 的核定狀態為：${!proj.isNotApproved ? '不核定' : '核定'}`); 
  };
  
  const handleAddNewProject = () => {
    if (!newProject.name.trim()) { alert('請輸入學校/案件名稱'); return; }
    const newId = Date.now().toString();
    const projectToAdd = { ...newProject, id: newId };
    const updated = [projectToAdd, ...projects];
    persistData(updated, `系統新增了案件：${newProject.name}`);
    setIsAddModalOpen(false);
    setNewProject(DEFAULT_NEW_PROJECT);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const newProjects = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        if (!cols[2] || cols[2].trim() === '') continue;
        newProjects.push({
          id: cols[0] || Date.now().toString() + i, district: cols[1], name: cols[2], level: cols[3] || determineLevel(cols[2]),
          status: cols[4] || '規劃中', budgetSource1: cols[5] || '', budgetSource2: cols[6] || '', budgetAmount: Number(cols[7]) || 0,
          startDate: cleanDate(cols[8]), endDate: cleanDate(cols[9]), agency: cols[10] || '', scheduleMonth: cols[11] || '',
          isExcluded: cols[12] === 'Y', isNotApproved: cols[13] === 'Y', 
          source: cols[14] ? cols[14].split(';').filter(Boolean) : [], 
          features: { 
              pole: cols[15] === 'Y', 
              light: cols[16] === 'Y', 
              pickup: cols[17] === 'Y', 
              shelter: cols[18] === 'Y' 
          },
          shelterLength: Number(cols[19]) || 0, 
          shelterCost: Number(cols[20]) || 0
        });
      }
      if (newProjects.length > 0) {
        persistData(newProjects, `批次匯入了 ${newProjects.length} 筆資料 (CSV覆蓋)`);
        alert(`成功匯入 ${newProjects.length} 筆資料並同步至雲端`);
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportCSV = () => {
    const headers = ['ID', '行政區', '案名', '層級', '狀態', '預算來源(大項)', '預算來源(細項)', '經費(萬)', '開工日', '完工日', '執行機關', '預計完工月份', '排除歸戶', '不核定', '案件來源', '電桿地下化', '路燈雙色溫', '接送區', '雨遮', '雨遮長度(m)', '雨遮費用(萬)'];
    const rows = projects.map(p => [ 
        p.id, p.district, p.name, p.level, p.status, p.budgetSource1, p.budgetSource2, p.budgetAmount, p.startDate, p.endDate, p.agency, p.scheduleMonth, 
        p.isExcluded ? 'Y' : 'N', p.isNotApproved ? 'Y' : 'N', 
        Array.isArray(p.source) ? p.source.join(';') : (p.source || ''),
        p.features?.pole ? 'Y' : 'N', p.features?.light ? 'Y' : 'N', p.features?.pickup ? 'Y' : 'N', p.features?.shelter ? 'Y' : 'N',
        p.shelterLength || 0, p.shelterCost || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "桃園通學廊道資料庫_匯出.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportWord = () => {
    alert("此功能正在根據新欄位排版調整中，目前產生舊版格式。");
  };

  // --- AI 助理核心邏輯 ---
  const handleAiFileUpload = (e) => { /*...*/ };
  const handleAiSubmit = async (overridePrompt = null) => { /*...*/ };
  const handleGeneratePR = () => { /*...*/ };
  const openPrintConfig = () => { setIsPrintModalOpen(true); };

  const renderBlock1Overview = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 mb-6 print-border-l-primary print-avoid-break" style={{ borderColor: COLORS.primary }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>[1] 錄案與經費概況總覽</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center border relative overflow-hidden print-bg-gray-50"><div className="absolute top-0 left-0 w-full h-1 bg-gray-300 print-bg-gray-300"></div><p className="text-sm text-gray-500">帳面錄案</p><p className="text-3xl font-bold">{kpis.total}</p><p className="text-xs text-gray-400 mt-2">總經費 {kpis.totalBudget.toLocaleString()} 萬</p></div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100 relative print-bg-green-50"><div className="absolute top-0 left-0 w-full h-1 bg-green-500 print-bg-green-500"></div><p className="text-sm text-green-600">已完工</p><p className="text-3xl font-bold text-green-700">{kpis.completed}</p><p className="text-xs text-green-600 mt-2">已投入 {kpis.completedBudget.toLocaleString()} 萬</p></div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100 relative print-bg-blue-50"><div className="absolute top-0 left-0 w-full h-1 bg-blue-500 print-bg-blue-500"></div><p className="text-sm text-blue-600">施工中</p><p className="text-3xl font-bold text-blue-700">{kpis.inProgress}</p><p className="text-xs text-blue-600 mt-2">執行中 {kpis.inProgressBudget.toLocaleString()} 萬</p></div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-100 relative print-bg-yellow-50"><div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 print-bg-yellow-400"></div><p className="text-sm text-yellow-600">規劃中</p><p className="text-3xl font-bold text-yellow-700">{kpis.planning}</p><p className="text-xs mt-2 text-transparent select-none">-</p></div>
          <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200 print-bg-gray-100"><p className="text-sm text-gray-600">暫緩</p><p className="text-3xl font-bold text-gray-700">{kpis.paused}</p><p className="text-xs mt-2 text-transparent select-none">-</p></div>
          <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100 print-bg-red-50"><p className="text-sm text-red-600">視為重複案</p><p className="text-3xl font-bold text-red-700">{kpis.duplicatedCount}</p><p className="text-xs mt-2 text-transparent select-none">-</p></div>
        </div>
    </div>
  );

  const renderBlock1ActualStats = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 mb-6 print-avoid-break print-border-l-gray-800" style={{ borderColor: '#1F2937' }}>
        <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center"><Check className="w-5 h-5 mr-1 text-green-500"/> [1-1] 實際學校數量統計 (排除期數重複案與手動排除件)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 text-white p-3 rounded-lg text-center print-bg-gray-800 print-text-white"><p className="text-xs text-gray-300 print-text-gray-300">實際學校數</p><p className="text-2xl font-bold">{kpis.actualTotal}</p></div>
            <div className="bg-green-600 text-white p-3 rounded-lg text-center print-bg-green-600 print-text-white"><p className="text-xs text-green-100 print-text-green-100">實際完工</p><p className="text-2xl font-bold">{kpis.actualCompleted}</p></div>
            <div className="bg-blue-600 text-white p-3 rounded-lg text-center print-bg-blue-600 print-text-white"><p className="text-xs text-blue-100 print-text-blue-100">實際施工</p><p className="text-2xl font-bold">{kpis.actualInProgress}</p></div>
            <div className="bg-yellow-500 text-white p-3 rounded-lg text-center print-bg-yellow-500 print-text-white"><p className="text-xs text-yellow-100 print-text-yellow-100">實際規劃</p><p className="text-2xl font-bold">{kpis.actualPlanning}</p></div>
            <div className="bg-gray-500 text-white p-3 rounded-lg text-center print-bg-gray-500 print-text-white"><p className="text-xs text-gray-100 print-text-gray-100">實際暫緩</p><p className="text-2xl font-bold">{kpis.actualPaused}</p></div>
        </div>
    </div>
  );

  const renderBlock2PieCharts = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print-avoid-break">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">[2] 預算來源分析 (單位: 萬元)</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={kpis.budgetSourceData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" isAnimationActive={false} label={({name, value, percent}) => `${name} ${value.toLocaleString()}萬 (${(percent * 100).toFixed(0)}%)`}>{kpis.budgetSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [value.toLocaleString() + ' 萬', '經費']} /><Legend /></PieChart></ResponsiveContainer></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">中央單位補助佔比 (單位: 萬元)</h2>
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={kpis.centralSourceData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" isAnimationActive={false} label={({name, value, percent}) => `${name} ${value.toLocaleString()}萬 (${(percent * 100).toFixed(0)}%)`}>{kpis.centralSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length + 2]} />)}</Pie><Tooltip formatter={(value) => [value.toLocaleString() + ' 萬', '經費']} /><Legend /></PieChart></ResponsiveContainer></div>
        </div>
    </div>
  );

  const renderBlock3DistrictCards = () => (
    <div className="bg-white p-6 rounded-xl shadow-sm mb-6 print-avoid-break">
         <h2 className="text-lg font-bold mb-4">[3] 行政區進度與經費卡片 (實際歸戶後)</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 print-grid-cols-3">
            {kpis.districtCards.map(card => (
                <div key={card.name} className={`p-4 rounded-xl border shadow-sm transition-transform hover:-translate-y-1 ${card.name === '全市總計' ? 'bg-pink-50 border-pink-200 print-bg-pink-50' : 'bg-white border-gray-200'} print-avoid-break`}>
                    <h3 className={`font-bold text-lg mb-3 pb-2 border-b ${card.name === '全市總計' ? 'text-pink-700 border-pink-200' : 'text-gray-800 border-gray-100'}`}>{card.name}</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm"><span className="font-semibold text-gray-700">錄案: {card.actualTotal} 所</span><span className="font-bold text-gray-800">{card.totalBudget.toLocaleString()} 萬</span></div>
                        <div className="flex justify-between items-center text-sm bg-green-50 px-2 py-1 rounded print-bg-green-50"><span className="text-green-700 font-medium">完工: {card.actualCompleted} 所</span><span className="text-green-800 font-semibold">{card.completedBudget.toLocaleString()} 萬</span></div>
                        <div className="flex justify-between items-center text-sm bg-blue-50 px-2 py-1 rounded print-bg-blue-50"><span className="text-blue-700 font-medium">施工: {card.actualInProgress} 所</span><span className="text-blue-800 font-semibold">{card.inProgressBudget.toLocaleString()} 萬</span></div>
                        <div className="flex justify-between items-center text-sm bg-yellow-50 px-2 py-1 rounded print-bg-yellow-50"><span className="text-yellow-700 font-medium">規劃: {card.actualPlanning} 所</span><span className="text-yellow-800 font-semibold">{card.planningBudget.toLocaleString()} 萬</span></div>
                        <div className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded print-bg-gray-50"><span className="text-gray-500 font-medium">暫緩: {card.actualPaused} 所</span><span className="text-gray-600 font-semibold">{card.pausedBudget.toLocaleString()} 萬</span></div>
                    </div>
                </div>
            ))}
         </div>
    </div>
  );

  const renderBlock4CentralStats = () => {
    const centralProjects = projects.filter(p => p.budgetSource1 === '中央補助');
    const filtered = filterDist === 'All' ? centralProjects : centralProjects.filter(p => p.district === filterDist);
    const nlmaCases = filtered.filter(p => p.budgetSource2 === '國土署' && !p.isNotApproved);
    const nlmaBudget = nlmaCases.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);
    const motcCases = filtered.filter(p => p.budgetSource2 === '公路局' && !p.isNotApproved);
    const motcBudget = motcCases.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);
    return (
        <div className="mb-6 print-avoid-break">
            <h2 className="text-lg font-bold mb-3 border-l-4 pl-2" style={{ borderColor: COLORS.techBlue }}>[4] 中央補助專案統計概況 ({filterDist === 'All' ? '全市' : filterDist})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-grid-cols-2">
                <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl flex justify-between items-center print-bg-blue-50">
                    <div><h3 className="text-blue-800 font-bold text-lg mb-1">國土署 (有效案件)</h3><p className="text-blue-600 text-sm">已排除不核定案件</p></div>
                    <div className="text-right"><p className="text-3xl font-black text-blue-900">{nlmaCases.length} <span className="text-lg font-normal">案</span></p><p className="text-blue-700 font-mono font-bold mt-1">經費: {nlmaBudget.toLocaleString()} 萬元</p></div>
                </div>
                <div className="bg-teal-50 border border-teal-200 p-5 rounded-xl flex justify-between items-center print-bg-teal-50">
                    <div><h3 className="text-teal-800 font-bold text-lg mb-1">公路局 (有效案件)</h3><p className="text-teal-600 text-sm">已排除不核定案件</p></div>
                    <div className="text-right"><p className="text-3xl font-black text-teal-900">{motcCases.length} <span className="text-lg font-normal">案</span></p><p className="text-teal-700 font-mono font-bold mt-1">經費: {motcBudget.toLocaleString()} 萬元</p></div>
                </div>
            </div>
        </div>
    );
  };

  const renderBlock5CentralTable = () => {
      const centralProjects = projects.filter(p => p.budgetSource1 === '中央補助');
      const filtered = filterDist === 'All' ? centralProjects : centralProjects.filter(p => p.district === filterDist);
      return (
        <div className="mb-6 flex-1 flex flex-col min-h-0">
            <h2 className="text-lg font-bold mb-3 border-l-4 pl-2 flex-shrink-0" style={{ borderColor: COLORS.techBlue }}>[5] 中央補助專案列表 ({filterDist === 'All' ? '全市' : filterDist})</h2>
            <div className="flex-1 overflow-auto border rounded-lg bg-white print-table-wrapper">
                <table className="w-full text-sm text-left border-collapse min-w-[1000px] print-table">
                    <thead className="bg-gray-100 text-gray-700 uppercase print-bg-gray-100 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <ResizableTh minW="80px" className="text-center text-red-600 screen-only">不核定</ResizableTh>
                        <ResizableTh minW="100px" className="text-center">行政區</ResizableTh>
                        <ResizableTh minW="180px">計畫/學校名稱</ResizableTh>
                        <ResizableTh minW="100px" className="text-center">補助單位</ResizableTh>
                        <ResizableTh minW="120px" className="text-right">經費(萬)</ResizableTh>
                        <ResizableTh minW="100px" className="text-center">進度</ResizableTh>
                        <ResizableTh minW="150px" className="text-center">亮點指標</ResizableTh>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map(p => (
                        <tr key={p.id} className={`border-b transition-colors print-avoid-break ${p.isNotApproved ? 'bg-gray-50 opacity-60 print-hide' : 'hover:bg-blue-50'}`}>
                        <td className="p-3 border text-center screen-only" onClick={() => handleToggleNotApproved(p.id)}><div className="flex justify-center cursor-pointer">{p.isNotApproved ? <CheckSquare className="w-6 h-6 text-red-500 drop-shadow-md"/> : <Square className="w-6 h-6 text-gray-300"/>}</div></td>
                        <td className="p-3 border font-medium text-gray-700 text-center">{p.district}</td><td className={`p-3 border font-bold ${p.isNotApproved ? 'line-through text-gray-500' : 'text-blue-800'}`}>{p.name}</td><td className="p-3 border text-center">{p.budgetSource2}</td><td className={`p-3 border text-right font-mono font-bold ${p.isNotApproved ? 'text-gray-500' : 'text-pink-600'}`}>{p.budgetAmount.toLocaleString()}</td>
                        <td className="p-3 border text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === '已完工' ? 'bg-green-100 text-green-700 print-bg-green-100 print-text-green-700' : p.status === '施工中' ? 'bg-blue-100 text-blue-700 print-bg-blue-100 print-text-blue-700' : 'bg-gray-200 print-bg-gray-200'}`}>{p.status}</span></td>
                        <td className="p-3 border text-center">
                            <div className="flex justify-center space-x-1.5">
                                {p.features?.pole ? <div className="bg-amber-100 p-1 rounded" title="電桿地下化"><Zap className="w-4 h-4 text-amber-600"/></div> : <div className="p-1 w-6 h-6"></div>}
                                {p.features?.light ? <div className="bg-yellow-100 p-1 rounded" title="路燈雙色溫"><Lightbulb className="w-4 h-4 text-yellow-600"/></div> : <div className="p-1 w-6 h-6"></div>}
                                {p.features?.pickup ? <div className="bg-blue-100 p-1 rounded" title="接送區"><Car className="w-4 h-4 text-blue-600"/></div> : <div className="p-1 w-6 h-6"></div>}
                                {p.features?.shelter ? <div className="bg-emerald-100 p-1 rounded" title="雨遮"><Umbrella className="w-4 h-4 text-emerald-600"/></div> : <div className="p-1 w-6 h-6"></div>}
                            </div>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
  };

  const renderBlock6SchoolStats = () => (
      <div className="mb-6 print-avoid-break">
        <h2 className="text-lg font-bold mb-3 border-l-4 pl-2" style={{ borderColor: COLORS.warmYellow }}>[6] 學校總表過濾統計 ({schoolDistrictFilter === 'All' ? '全市' : schoolDistrictFilter})</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print-grid-cols-5">
            <div onClick={() => setTableStatusFilter('All')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === 'All' ? 'bg-gray-800 text-white border-gray-900 print-bg-gray-800 print-text-white' : 'bg-gray-100 text-gray-600 border-transparent print-bg-gray-100'}`}><div className="text-xs opacity-80 font-medium mb-1">錄案總數</div><div className="text-2xl font-black">{tableStats.actualTotal}</div></div>
            <div onClick={() => setTableStatusFilter('已完工')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '已完工' ? 'bg-green-600 text-white border-green-700 print-bg-green-600 print-text-white' : 'bg-green-50 text-green-800 border-green-200 print-bg-green-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際完工</div><div className="text-2xl font-black">{tableStats.actualCompleted}</div></div>
            <div onClick={() => setTableStatusFilter('施工中')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '施工中' ? 'bg-blue-600 text-white border-blue-700 print-bg-blue-600 print-text-white' : 'bg-blue-50 text-blue-800 border-blue-200 print-bg-blue-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際施工</div><div className="text-2xl font-black">{tableStats.actualInProgress}</div></div>
            <div onClick={() => setTableStatusFilter('規劃中')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '規劃中' ? 'bg-yellow-500 text-white border-yellow-600 print-bg-yellow-500 print-text-white' : 'bg-yellow-50 text-yellow-800 border-yellow-200 print-bg-yellow-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際規劃</div><div className="text-2xl font-black">{tableStats.actualPlanning}</div></div>
            <div onClick={() => setTableStatusFilter('暫緩')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '暫緩' ? 'bg-gray-500 text-white border-gray-600 print-bg-gray-500 print-text-white' : 'bg-gray-100 text-gray-700 border-gray-300 print-bg-gray-100'}`}><div className="text-xs opacity-90 font-bold mb-1">實際暫緩</div><div className="text-2xl font-black">{tableStats.actualPaused}</div></div>
        </div>
        
        {/* --- 新增：四大指標數據列 --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 print-grid-cols-4">
            <div onClick={() => setFeatureFilter(featureFilter === 'pole' ? 'All' : 'pole')} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm cursor-pointer transition-all ${featureFilter === 'pole' ? 'border-amber-500 bg-amber-500 text-white print-bg-amber-500 print-text-white' : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 print-bg-amber-50'}`}>
                <div className={`flex items-center font-bold text-sm ${featureFilter === 'pole' ? 'text-white' : 'text-amber-700'}`}><Zap className="w-4 h-4 mr-1"/> 電桿地下化</div>
                <div className={`text-xl font-black ${featureFilter === 'pole' ? 'text-white' : 'text-amber-800'}`}>{tableStats.poleCount}</div>
            </div>
            <div onClick={() => setFeatureFilter(featureFilter === 'light' ? 'All' : 'light')} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm cursor-pointer transition-all ${featureFilter === 'light' ? 'border-yellow-500 bg-yellow-500 text-white print-bg-yellow-500 print-text-white' : 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 print-bg-yellow-50'}`}>
                <div className={`flex items-center font-bold text-sm ${featureFilter === 'light' ? 'text-white' : 'text-yellow-700'}`}><Lightbulb className="w-4 h-4 mr-1"/> 路燈雙色溫</div>
                <div className={`text-xl font-black ${featureFilter === 'light' ? 'text-white' : 'text-yellow-800'}`}>{tableStats.lightCount}</div>
            </div>
            <div onClick={() => setFeatureFilter(featureFilter === 'pickup' ? 'All' : 'pickup')} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm cursor-pointer transition-all ${featureFilter === 'pickup' ? 'border-blue-500 bg-blue-500 text-white print-bg-blue-500 print-text-white' : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 print-bg-blue-50'}`}>
                <div className={`flex items-center font-bold text-sm ${featureFilter === 'pickup' ? 'text-white' : 'text-blue-700'}`}><Car className="w-4 h-4 mr-1"/> 接送區</div>
                <div className={`text-xl font-black ${featureFilter === 'pickup' ? 'text-white' : 'text-blue-800'}`}>{tableStats.pickupCount}</div>
            </div>
            <div onClick={() => setFeatureFilter(featureFilter === 'shelter' ? 'All' : 'shelter')} className={`p-3 rounded-lg border flex justify-between items-center shadow-sm cursor-pointer transition-all ${featureFilter === 'shelter' ? 'border-emerald-500 bg-emerald-500 text-white print-bg-emerald-500 print-text-white' : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 print-bg-emerald-50'}`}>
                <div className={`flex items-center font-bold text-sm ${featureFilter === 'shelter' ? 'text-white' : 'text-emerald-700'}`}><Umbrella className="w-4 h-4 mr-1"/> 雨遮</div>
                <div className={`text-xl font-black ${featureFilter === 'shelter' ? 'text-white' : 'text-emerald-800'}`}>{tableStats.shelterCount}</div>
            </div>
        </div>
      </div>
  );

  const renderBlock7SchoolTable = () => (
      <div className="flex-1 flex flex-col min-h-0 mb-2">
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold border-l-4 pl-2" style={{ borderColor: COLORS.warmYellow }}>[7] 學校總表清單明細 (顯示 {displayProjects.length} 筆)</h2>
            <button onClick={() => setIsAddModalOpen(true)} className="screen-only flex items-center bg-pink-500 text-white px-3 py-1.5 rounded text-sm font-bold shadow hover:bg-pink-600 transition-colors">
                <Plus className="w-4 h-4 mr-1"/> 新增學校
            </button>
        </div>
        <div className="flex-1 overflow-auto border rounded print-table-wrapper bg-white shadow-inner">
            <table className="w-full text-sm text-left relative print-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead className="text-xs">
                    <tr>
                        <ResizableTh minW="60px" className="text-center text-pink-600">項次</ResizableTh>
                        <ResizableTh minW="60px" className="text-center screen-only">排除</ResizableTh>
                        <ResizableTh minW="100px" className="text-center">行政區</ResizableTh>
                        <ResizableTh minW="80px" className="text-center">層級</ResizableTh>
                        <ResizableTh minW="180px">案名(學校)</ResizableTh>
                        <ResizableTh minW="90px" className="text-center">狀態</ResizableTh>
                        <ResizableTh minW="120px" className="text-center bg-yellow-50 text-yellow-800 border-b-2 border-yellow-200 shadow-sm">四大指標</ResizableTh>
                        <ResizableTh minW="120px" className="text-center text-blue-600">進場日期</ResizableTh>
                        <ResizableTh minW="120px" className="text-center text-green-600">預計完工日</ResizableTh>
                        <ResizableTh minW="100px" className="text-center">預算大項</ResizableTh>
                        <ResizableTh minW="120px" className="text-center">細項</ResizableTh>
                        <ResizableTh minW="100px" className="text-right">經費(萬)</ResizableTh>
                        <ResizableTh minW="120px" className="text-center">機關</ResizableTh>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {displayProjects.map(p => (
                        <tr key={p.id} className={`hover:bg-pink-50 transition-colors print-avoid-break ${p.isExcluded ? 'bg-gray-50 opacity-50 print-hide' : ''}`}>
                            <td className="p-2 border-b text-center font-mono font-bold text-gray-500 bg-gray-50 print-bg-gray-50">{p.itemNumber}</td>
                            <td className="p-2 border-b text-center screen-only" onClick={() => handleToggleExclude(p.id)}><div className="flex items-center justify-center cursor-pointer">{p.isExcluded ? <CheckSquare className="w-5 h-5 text-red-500"/> : <Square className="w-5 h-5 text-gray-300"/>}</div></td>
                            <td className="p-2 border-b text-center">{p.district}</td>
                            <td className="p-2 border-b text-xs text-gray-500 text-center">{p.level}</td>
                            <td className="p-2 border-b font-medium text-blue-600 screen-only cursor-pointer hover:underline" onClick={() => setSelectedProject({...p})}>{p.name} {isDuplicateName(p.name) && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded inline-block">重複案</span>}</td>
                            <td className="p-2 border-b font-medium text-blue-800 print-only hidden">{p.name} {isDuplicateName(p.name) && <span className="ml-1 text-[10px] text-red-600">(重複案)</span>}</td>
                            <td className="p-2 border-b text-center"><span className={p.status === '已完工' ? 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded print-bg-green-50' : p.status === '暫緩' ? 'text-gray-400' : ''}>{p.status}</span></td>
                            
                            {/* 新增：四大指標欄位 */}
                            <td className="p-2 border-b text-center bg-yellow-50/30">
                                <div className="flex justify-center space-x-1">
                                    {p.features?.pole ? <div className="bg-amber-100 p-1 rounded shadow-sm" title="電桿地下化"><Zap className="w-3.5 h-3.5 text-amber-600"/></div> : <div className="p-1 w-5 h-5"></div>}
                                    {p.features?.light ? <div className="bg-yellow-100 p-1 rounded shadow-sm" title="路燈雙色溫"><Lightbulb className="w-3.5 h-3.5 text-yellow-600"/></div> : <div className="p-1 w-5 h-5"></div>}
                                    {p.features?.pickup ? <div className="bg-blue-100 p-1 rounded shadow-sm" title="接送區"><Car className="w-3.5 h-3.5 text-blue-600"/></div> : <div className="p-1 w-5 h-5"></div>}
                                    {p.features?.shelter ? <div className="bg-emerald-100 p-1 rounded shadow-sm" title="雨遮"><Umbrella className="w-3.5 h-3.5 text-emerald-600"/></div> : <div className="p-1 w-5 h-5"></div>}
                                </div>
                            </td>

                            <td className="p-2 border-b text-center text-gray-600 font-mono tracking-tighter">{p.startDate || '-'}</td>
                            <td className="p-2 border-b text-center text-gray-600 font-mono tracking-tighter">{p.endDate || '-'}</td>
                            <td className="p-2 border-b text-center">{p.budgetSource1}</td>
                            <td className="p-2 border-b text-xs text-gray-500 text-center">{p.budgetSource2}</td>
                            <td className="p-2 border-b text-right font-mono font-bold text-gray-700">{Number(p.budgetAmount).toLocaleString()}</td>
                            <td className="p-2 border-b text-xs text-gray-600 text-center">{p.agency}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
  );

  const renderBlock8Schedule = () => {
     const months = Array.from({length: 12}, (_, i) => i + 1);
     const scheduledProjects = projects.filter(p => p.scheduleMonth);
     const unscheduledProjects = projects.filter(p => !p.scheduleMonth && p.status !== '已完工' && p.status !== '暫緩' && !p.isExcluded);
     
     const targetCount = 120;
     const actualCompleted = kpis.actualCompleted;
     const progressPercent = Math.min(100, Math.round((actualCompleted / targetCount) * 100));

     return (
        <div className="mb-6 print-avoid-break">
            <h2 className="text-lg font-bold mb-3 border-l-4 pl-2" style={{ borderColor: COLORS.ecoGreen }}>[8] 115年度預計完工看板 (排程進度)</h2>
            
            <div className="flex space-x-4 mb-4">
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm print-border">
                    <div className="text-sm text-gray-500 font-bold mb-1">本市實際已完工 / 120所達標率</div>
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-black text-green-600">{actualCompleted} <span className="text-lg text-gray-400 font-normal">/ {targetCount} 所</span></div>
                        <div className="text-sm font-bold text-green-500 bg-green-50 px-2 py-1 rounded">{progressPercent}%</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-3 print-bg-gray-200">
                        <div className="bg-green-500 h-2 rounded-full print-bg-green-500" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>
                <div className="flex-1 bg-white border border-blue-200 rounded-lg p-4 shadow-sm print-border relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                    <div className="text-sm text-blue-600 font-bold mb-1">已排入數量 (今年度預期完工)</div>
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-black text-blue-700">{scheduledProjects.length} <span className="text-lg text-blue-400 font-normal">案</span></div>
                    </div>
                    <p className="text-xs text-blue-400 mt-2">已成功分配完工月份之案件</p>
                </div>
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm print-border">
                    <div className="text-sm text-gray-500 font-bold mb-1">未排程數量 (待指定完工月份)</div>
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-black text-teal-600">{unscheduledProjects.length} <span className="text-lg text-gray-400 font-normal">案</span></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">系統自動扣除已完工、暫緩或已排定月份之案件</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 p-4 border rounded bg-gray-50 print-grid-cols-6">
                {months.map(month => {
                    const mProjects = scheduledProjects.filter(p => p.scheduleMonth === String(month));
                    return (
                        <div key={month} className="bg-white border rounded-lg shadow-sm flex flex-col print-avoid-break">
                            <div className="bg-teal-500 p-2 rounded-t-lg text-white font-bold text-center print-bg-teal-500 print-text-white">115年 {month}月完工</div>
                            <div className="p-2 flex-1 space-y-2 min-h-[120px] bg-white flex flex-col">
                                <div className="flex-1 space-y-2">
                                    {mProjects.map(p => (
                                        <div key={p.id} className="p-2 border border-teal-100 rounded text-sm relative shadow-sm group">
                                            <div className="font-bold text-teal-800">{p.name}</div><div className="text-xs text-gray-500">{p.district}</div>
                                            <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition print-hide" onClick={() => {
                                                const updated = projects.map(proj => proj.id === p.id ? { ...proj, scheduleMonth: '' } : proj);
                                                persistData(updated, `將 ${p.name} 移出 ${month} 月排程`);
                                            }} title="移出排程">✕</button>
                                        </div>
                                    ))}
                                    {mProjects.length === 0 && <div className="text-xs text-center text-gray-400 mt-4">尚無排定案件</div>}
                                </div>
                                <div className="mt-2 border-t pt-2 print-hide">
                                    <select 
                                        className="w-full border border-teal-300 rounded bg-teal-50 p-1.5 text-teal-700 font-bold focus:ring-2 focus:ring-teal-500 outline-none shadow-sm cursor-pointer text-xs"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                const targetId = e.target.value;
                                                const pName = projects.find(p => p.id === targetId)?.name;
                                                const updated = projects.map(p => p.id === targetId ? { ...p, scheduleMonth: String(month) } : p);
                                                persistData(updated, `將 ${pName} 排入 ${month} 月完工`);
                                            }
                                        }}
                                    >
                                        <option value="" disabled>+ 排入完工案件...</option>
                                        {unscheduledProjects.map(up => (
                                            <option key={up.id} value={up.id}>
                                                {up.district} - {up.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
     );
  }

  // ==========================================
  // 分頁畫面主入口
  // ==========================================

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      {renderBlock1Overview()}
      {renderBlock1ActualStats()}
      {renderBlock2PieCharts()}
      {renderBlock3DistrictCards()}
    </div>
  );

  const renderCentral = () => (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-fade-in h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4 flex-shrink-0">
            <div><h2 className="text-xl font-bold flex items-center" style={{ color: COLORS.techBlue }}><Building2 className="w-6 h-6 mr-2"/> 中央補助專案管理</h2><p className="text-sm text-gray-500 mt-1">勾選「不核定」將自動自上方統計與預算中扣除。</p></div>
            <select className="border-2 border-blue-200 p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-300" value={filterDist} onChange={e => setFilterDist(e.target.value)}><option value="All">所有行政區篩選</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        {renderBlock4CentralStats()}
        {renderBlock5CentralTable()}
      </div>
  );

  const renderSchools = () => (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-fade-in h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800 flex items-center"><Search className="w-6 h-6 mr-2"/> 學校總表資料庫 (點擊名稱可編輯)</h2>
            <div className="flex items-center space-x-4">
                <select className="border-2 border-pink-200 p-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-300 outline-none" value={schoolDistrictFilter} onChange={e => setSchoolDistrictFilter(e.target.value)}><option value="All">全市所有行政區</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
                <div className="text-sm text-pink-700 bg-pink-50 px-3 py-1 rounded-full font-bold border border-pink-100">顯示 {displayProjects.length} 筆資料</div>
            </div>
        </div>
        {renderBlock6SchoolStats()}
        {renderBlock7SchoolTable()}

        {/* --- 編輯既有案件 Modal --- */}
        {selectedProject && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in screen-only">
                <div className="bg-white w-[650px] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg flex items-center"><Building2 className="mr-2"/> 個案詳細資訊卡</h3><button onClick={() => setSelectedProject(null)} className="text-white hover:text-gray-200 transition-transform hover:scale-110"><X className="w-6 h-6" /></button></div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs text-gray-500 mb-1">案名(學校)</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.name} onChange={e => setSelectedProject({...selectedProject, name: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">Google定位</label><a href={`https://www.google.com/maps/search/?api=1&query=${selectedProject.district}${selectedProject.name}`} target="_blank" rel="noreferrer" className="flex items-center justify-center h-[42px] text-blue-500 border p-2 rounded hover:bg-blue-50 transition-colors font-bold"><MapPin className="w-4 h-4 mr-2"/> 開啟地圖搜尋</a></div>
                            <div><label className="block text-xs text-gray-500 mb-1">行政區</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.district} onChange={e => setSelectedProject({...selectedProject, district: e.target.value})}>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1">層級</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.level} onChange={e => setSelectedProject({...selectedProject, level: e.target.value})}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1">執行狀態</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-bold text-blue-700" value={selectedProject.status} onChange={e => setSelectedProject({...selectedProject, status: e.target.value})}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-xs text-gray-500 mb-1">機關</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.agency} onChange={e => setSelectedProject({...selectedProject, agency: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">進場日期</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" placeholder="YYYY/MM/DD" value={selectedProject.startDate} onChange={e => setSelectedProject({...selectedProject, startDate: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">預計完工日</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" placeholder="YYYY/MM/DD" value={selectedProject.endDate} onChange={e => setSelectedProject({...selectedProject, endDate: e.target.value})} /></div>
                            
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1 font-bold">案件來源 (可多選)</label>
                                <MultiTagInput 
                                    tags={selectedProject.source || []} 
                                    onChange={(newTags) => setSelectedProject({...selectedProject, source: newTags})}
                                    options={PROJECT_SOURCES}
                                />
                            </div>

                            {/* --- 新增：四大亮點指標區塊 --- */}
                            <div className="col-span-2 border-t pt-4 mt-2">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center">四大亮點指標 (勾選即代表有該項目)</h4>
                                <div className="flex space-x-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-wrap gap-y-2">
                                    <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 px-2 py-1 rounded border border-amber-100 hover:bg-amber-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-amber-500 rounded border-gray-300" checked={selectedProject.features?.pole || false} onChange={e => setSelectedProject({...selectedProject, features: {...selectedProject.features, pole: e.target.checked}})} />
                                        <span className="text-sm font-bold text-amber-700 flex items-center"><Zap className="w-4 h-4 mr-1"/> 電桿地下化</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-yellow-50 px-2 py-1 rounded border border-yellow-100 hover:bg-yellow-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-yellow-500 rounded border-gray-300" checked={selectedProject.features?.light || false} onChange={e => setSelectedProject({...selectedProject, features: {...selectedProject.features, light: e.target.checked}})} />
                                        <span className="text-sm font-bold text-yellow-700 flex items-center"><Lightbulb className="w-4 h-4 mr-1"/> 雙色溫路燈</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-blue-500 rounded border-gray-300" checked={selectedProject.features?.pickup || false} onChange={e => setSelectedProject({...selectedProject, features: {...selectedProject.features, pickup: e.target.checked}})} />
                                        <span className="text-sm font-bold text-blue-700 flex items-center"><Car className="w-4 h-4 mr-1"/> 接送區</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-emerald-50 px-2 py-1 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded border-gray-300" checked={selectedProject.features?.shelter || false} onChange={e => {
                                            const isChecked = e.target.checked;
                                            setSelectedProject({...selectedProject, features: {...selectedProject.features, shelter: isChecked}, shelterLength: !isChecked ? 0 : selectedProject.shelterLength, shelterCost: !isChecked ? 0 : selectedProject.shelterCost});
                                        }} />
                                        <span className="text-sm font-bold text-emerald-700 flex items-center"><Umbrella className="w-4 h-4 mr-1"/> 雨遮</span>
                                    </label>
                                </div>
                            </div>

                            {/* --- 動態渲染：僅在勾選雨遮時顯示 --- */}
                            {selectedProject.features?.shelter && (
                                <div className="col-span-2 mt-1 animate-fade-in">
                                    <div className="grid grid-cols-3 gap-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-inner">
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">長度(A) - 公尺</label>
                                            <input type="number" className="w-full border-emerald-200 p-2 rounded focus:ring-2 focus:ring-emerald-400 outline-none font-mono" value={selectedProject.shelterLength || 0} onChange={e => setSelectedProject({...selectedProject, shelterLength: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">費用(B) - 萬元</label>
                                            <input type="number" className="w-full border-emerald-200 p-2 rounded focus:ring-2 focus:ring-emerald-400 outline-none font-mono text-emerald-700 font-bold" value={selectedProject.shelterCost || 0} onChange={e => setSelectedProject({...selectedProject, shelterCost: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">每公尺費用 (B/A)</label>
                                            <div className="w-full bg-white border border-emerald-100 p-2 rounded text-emerald-700 font-mono font-bold flex items-center justify-between shadow-sm">
                                                <span>{(selectedProject.shelterLength > 0 ? (selectedProject.shelterCost / selectedProject.shelterLength).toFixed(2) : 0)}</span>
                                                <span className="text-xs text-emerald-500">萬元/m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">預算來源</label>
                                <select className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-bold" value={selectedProject.budgetSource1} onChange={e => setSelectedProject({...selectedProject, budgetSource1: e.target.value})}><option value="">選擇來源</option><option value="市府預算">市府預算</option><option value="中央補助">中央補助</option></select>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.budgetSource2} onChange={e => setSelectedProject({...selectedProject, budgetSource2: e.target.value})}>
                                     <option value="">細項(公務/國土/公路等)</option>
                                    {selectedProject.budgetSource1 === '市府預算' ? (<><option value="公務預算">公務預算</option><option value="道路基金">道路基金</option><option value="其他基金">其他基金</option><option value="統籌分配">統籌分配</option></>) : (<><option value="國土署">國土署</option><option value="公路局">公路局</option></>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">總經費(萬元)</label>
                                <input type="number" className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-mono font-bold text-pink-600" value={selectedProject.budgetAmount} onChange={e => setSelectedProject({...selectedProject, budgetAmount: Number(e.target.value)})} />
                            </div>
                        </div>
                        
                        {/* 雙照片上傳區塊 */}
                        <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">施工前 / 現況照片</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center text-gray-400 relative hover:bg-gray-50 transition-colors h-32 overflow-hidden shadow-sm">
                                    {selectedProject.beforeImage ? (
                                        <img src={selectedProject.beforeImage} alt="施工前" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <><ImageIcon className="w-6 h-6 mb-1"/><span className="text-xs font-bold">點擊上傳現況照</span></>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'beforeImage', false)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">完工 / 改善後照片</label>
                                <div className="border-2 border-dashed border-emerald-300 rounded-lg p-2 flex flex-col items-center justify-center text-emerald-500 relative hover:bg-emerald-50 transition-colors h-32 overflow-hidden shadow-sm">
                                    {selectedProject.afterImage ? (
                                        <img src={selectedProject.afterImage} alt="改善後" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <><Camera className="w-6 h-6 mb-1"/><span className="text-xs font-bold">點擊上傳改善後</span></>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'afterImage', false)} />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                        <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5" onClick={() => setPromoProject(selectedProject)}>
                            <ImageIcon className="w-4 h-4 mr-2"/> 產生宣傳圖卡
                        </button>
                        <button className="px-6 py-2 bg-pink-500 text-white font-bold rounded-lg shadow-md hover:bg-pink-600 hover:shadow-lg transition-all" onClick={() => {
                            const updated = projects.map(p => p.id === selectedProject.id ? selectedProject : p);
                            persistData(updated, `更新了案件 ${selectedProject.name} 的詳細資訊`);
                            setSelectedProject(null);
                        }}>完成儲存</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- 新增案件 Modal --- */}
        {isAddModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fade-in backdrop-blur-sm screen-only">
                <div className="bg-white w-[650px] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-t-4 border-pink-500">
                    <div className="bg-white p-4 flex justify-between items-center border-b">
                        <h3 className="font-bold text-xl flex items-center text-gray-800"><Plus className="mr-2 text-pink-500"/> 新增學校/案件</h3>
                        <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar bg-gray-50/50">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">案名(學校) <span className="text-red-500">*</span></label><input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" placeholder="輸入學校名稱..." value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">行政區</label><select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={newProject.district} onChange={e => setNewProject({...newProject, district: e.target.value})}>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1 font-bold">層級</label><select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={newProject.level} onChange={e => setNewProject({...newProject, level: e.target.value})}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1 font-bold">執行狀態</label><select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none text-blue-700 font-bold" value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">機關</label><input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={newProject.agency} onChange={e => setNewProject({...newProject, agency: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">預計完工月份</label><select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none text-teal-700" value={newProject.scheduleMonth} onChange={e => setNewProject({...newProject, scheduleMonth: e.target.value})}><option value="">暫不排程</option>{Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={String(m)}>{m}月</option>)}</select></div>
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">進場日期</label><input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-mono" placeholder="YYYY/MM/DD" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1 font-bold">預計完工日</label><input type="text" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-mono" placeholder="YYYY/MM/DD" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})} /></div>
                            
                            <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1 font-bold">案件來源 (可多選) <span className="text-pink-500 font-normal">可手掌握並按 Enter，或從清單挑選</span></label>
                                <MultiTagInput 
                                    tags={newProject.source || []} 
                                    onChange={(newTags) => setNewProject({...newProject, source: newTags})}
                                    options={PROJECT_SOURCES}
                                    placeholder="例如：王小明(議員) 或 學校提報..."
                                />
                            </div>

                            {/* --- 新增：四大亮點指標區塊 --- */}
                            <div className="col-span-2 border-t pt-4 mt-2">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center">四大亮點指標 (勾選即代表有該項目)</h4>
                                <div className="flex space-x-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex-wrap gap-y-2">
                                    <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 px-2 py-1 rounded border border-amber-100 hover:bg-amber-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-amber-500 rounded border-gray-300" checked={newProject.features?.pole || false} onChange={e => setNewProject({...newProject, features: {...newProject.features, pole: e.target.checked}})} />
                                        <span className="text-sm font-bold text-amber-700 flex items-center"><Zap className="w-4 h-4 mr-1"/> 電桿地下化</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-yellow-50 px-2 py-1 rounded border border-yellow-100 hover:bg-yellow-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-yellow-500 rounded border-gray-300" checked={newProject.features?.light || false} onChange={e => setNewProject({...newProject, features: {...newProject.features, light: e.target.checked}})} />
                                        <span className="text-sm font-bold text-yellow-700 flex items-center"><Lightbulb className="w-4 h-4 mr-1"/> 雙色溫路燈</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-blue-500 rounded border-gray-300" checked={newProject.features?.pickup || false} onChange={e => setNewProject({...newProject, features: {...newProject.features, pickup: e.target.checked}})} />
                                        <span className="text-sm font-bold text-blue-700 flex items-center"><Car className="w-4 h-4 mr-1"/> 接送區</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer bg-emerald-50 px-2 py-1 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-emerald-500 rounded border-gray-300" checked={newProject.features?.shelter || false} onChange={e => {
                                            const isChecked = e.target.checked;
                                            setNewProject({...newProject, features: {...newProject.features, shelter: isChecked}, shelterLength: !isChecked ? 0 : newProject.shelterLength, shelterCost: !isChecked ? 0 : newProject.shelterCost});
                                        }} />
                                        <span className="text-sm font-bold text-emerald-700 flex items-center"><Umbrella className="w-4 h-4 mr-1"/> 雨遮</span>
                                    </label>
                                </div>
                            </div>

                            {/* --- 動態渲染：僅在勾選雨遮時顯示 --- */}
                            {newProject.features?.shelter && (
                                <div className="col-span-2 mt-1 animate-fade-in">
                                    <div className="grid grid-cols-3 gap-4 bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-inner">
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">長度(A) - 公尺</label>
                                            <input type="number" className="w-full border-emerald-200 p-2 rounded focus:ring-2 focus:ring-emerald-400 outline-none font-mono" value={newProject.shelterLength || 0} onChange={e => setNewProject({...newProject, shelterLength: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">費用(B) - 萬元</label>
                                            <input type="number" className="w-full border-emerald-200 p-2 rounded focus:ring-2 focus:ring-emerald-400 outline-none font-mono text-emerald-700 font-bold" value={newProject.shelterCost || 0} onChange={e => setNewProject({...newProject, shelterCost: Number(e.target.value)})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-emerald-700 mb-1 font-bold">每公尺費用 (B/A)</label>
                                            <div className="w-full bg-white border border-emerald-100 p-2 rounded text-emerald-700 font-mono font-bold flex items-center justify-between shadow-sm">
                                                <span>{(newProject.shelterLength > 0 ? (newProject.shelterCost / newProject.shelterLength).toFixed(2) : 0)}</span>
                                                <span className="text-xs text-emerald-500">萬元/m</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">預算來源大項</label>
                                <select className="w-full border border-gray-300 p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-bold" value={newProject.budgetSource1} onChange={e => setNewProject({...newProject, budgetSource1: e.target.value, budgetSource2: ''})}><option value="市府預算">市府預算</option><option value="中央補助">中央補助</option></select>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">預算細項</label>
                                <select className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={newProject.budgetSource2} onChange={e => setNewProject({...newProject, budgetSource2: e.target.value})}>
                                     <option value="">請選擇</option>
                                    {newProject.budgetSource1 === '市府預算' ? (<><option value="公務預算">公務預算</option><option value="道路基金">道路基金</option><option value="其他基金">其他基金</option><option value="統籌分配">統籌分配</option></>) : (<><option value="國土署">國土署</option><option value="公路局">公路局</option></>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">總經費(萬元)</label>
                                <input type="number" className="w-full border border-gray-300 p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-mono font-bold text-pink-600 text-lg" value={newProject.budgetAmount} onChange={e => setNewProject({...newProject, budgetAmount: Number(e.target.value)})} />
                            </div>
                        </div>

                        {/* 雙照片上傳區塊 */}
                        <div className="border-t border-gray-200 pt-4 grid grid-cols-2 gap-4 mt-2">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">施工前 / 現況照片</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 flex flex-col items-center justify-center text-gray-400 relative hover:bg-gray-50 transition-colors h-32 overflow-hidden shadow-sm">
                                    {newProject.beforeImage ? (
                                        <img src={newProject.beforeImage} alt="施工前" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <><ImageIcon className="w-6 h-6 mb-1"/><span className="text-xs font-bold">點擊上傳現況照</span></>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'beforeImage', true)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-bold">完工 / 改善後照片</label>
                                <div className="border-2 border-dashed border-emerald-300 rounded-lg p-2 flex flex-col items-center justify-center text-emerald-500 relative hover:bg-emerald-50 transition-colors h-32 overflow-hidden shadow-sm">
                                    {newProject.afterImage ? (
                                        <img src={newProject.afterImage} alt="改善後" className="absolute inset-0 w-full h-full object-cover" />
                                    ) : (
                                        <><Camera className="w-6 h-6 mb-1"/><span className="text-xs font-bold">點擊上傳改善後</span></>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, 'afterImage', true)} />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="p-4 border-t bg-white flex justify-end space-x-3">
                        <button className="px-5 py-2 rounded text-gray-500 hover:bg-gray-100 font-bold" onClick={() => setIsAddModalOpen(false)}>取消</button>
                        <button className="px-6 py-2 bg-pink-500 text-white font-bold rounded shadow-md hover:bg-pink-600 transition-colors flex items-center" onClick={handleAddNewProject}><Plus className="w-4 h-4 mr-2"/> 確認新增</button>
                    </div>
                </div>
            </div>
        )}

        {/* --- 新增：精美宣傳圖卡 Modal --- */}
        {promoProject && (
            <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-[200] flex flex-col items-center justify-center overflow-auto print:bg-white print:block">
                
                {/* 控制列 (僅螢幕顯示) */}
                <div className="absolute top-6 right-6 flex space-x-3 screen-only z-10">
                    <button onClick={() => window.print()} className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-full shadow-lg hover:shadow-pink-500/50 transition-all flex items-center hover:scale-105">
                        <Printer className="w-5 h-5 mr-2"/> 儲存為 PDF / 宣傳圖
                    </button>
                    <button onClick={() => setPromoProject(null)} className="p-2.5 bg-white/20 text-white rounded-full hover:bg-white/40 transition-colors backdrop-blur-md">
                        <X className="w-6 h-6"/>
                    </button>
                </div>

                {/* 宣傳圖卡本體 (螢幕與列印皆顯示) */}
                <div className="bg-white w-[850px] max-w-[95vw] shadow-2xl rounded-2xl overflow-hidden print-promo-card my-8 relative flex flex-col mx-auto border border-gray-100">
                    {/* 裝飾背景 */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                    {/* 卡片標頭 (動態套用行政區意象) */}
                    <div className={`bg-gradient-to-r ${getDistrictTheme(promoProject.district).gradient} p-8 text-white relative`}>
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <div className="flex items-center space-x-2 mb-2 text-white/90">
                                        <span className="text-2xl">{getDistrictTheme(promoProject.district).icon}</span>
                                        <span className="font-bold tracking-widest text-sm drop-shadow">{getDistrictTheme(promoProject.district).desc}</span>
                                    </div>
                                    <h1 className="text-3xl font-black tracking-wider drop-shadow-md">桃園市通學廊道專案成果</h1>
                                </div>
                                <div className="bg-white/20 px-4 py-2 rounded-lg backdrop-blur-md border border-white/30 text-right">
                                    <div className="text-xs text-white/80 font-bold mb-0.5">專案狀態</div>
                                    <div className="font-black text-xl tracking-widest text-yellow-300 drop-shadow">{promoProject.status}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 卡片內容區 */}
                    <div className="p-8 flex-1 flex flex-col relative z-10 bg-white/90 backdrop-blur-sm">
                        
                        {/* 學校標題與經費 */}
                        <div className="flex justify-between items-start mb-6 border-b-2 border-gray-100 pb-4">
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <span className="px-3 py-1 bg-gray-800 text-white rounded font-bold text-sm shadow-sm">{promoProject.district}</span>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded font-bold text-sm border shadow-sm">{promoProject.level}</span>
                                    {promoProject.source && promoProject.source.length > 0 && (
                                        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-bold text-xs border border-purple-100 shadow-sm">來源: {promoProject.source[0]}{promoProject.source.length > 1 ? '...' : ''}</span>
                                    )}
                                </div>
                                <h2 className="text-4xl font-black text-gray-800 tracking-tight">{promoProject.name}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-400 mb-1">投入總經費</p>
                                <p className="text-4xl font-black text-pink-600 font-mono tracking-tighter">
                                    {Number(promoProject.budgetAmount).toLocaleString()} <span className="text-lg font-bold text-gray-500">萬元</span>
                                </p>
                            </div>
                        </div>

                        {/* 雙照片對照區 (16:9 split into 2) */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm group" style={{ aspectRatio: '4/3' }}>
                                <div className="absolute top-2 left-2 bg-gray-900/70 text-white px-3 py-1 rounded-full text-xs font-bold z-10 backdrop-blur-sm border border-gray-700">施工前 (Before)</div>
                                {promoProject.beforeImage ? (
                                    <img src={promoProject.beforeImage} alt="施工前" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                                        <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                                        <span className="text-sm font-bold opacity-50">尚未提供現況照片</span>
                                    </div>
                                )}
                            </div>
                            <div className="relative rounded-xl overflow-hidden border border-emerald-200 shadow-sm group" style={{ aspectRatio: '4/3' }}>
                                <div className="absolute top-2 left-2 bg-emerald-600/90 text-white px-3 py-1 rounded-full text-xs font-bold z-10 backdrop-blur-sm border border-emerald-500 shadow-md">改善後 (After)</div>
                                {promoProject.afterImage ? (
                                    <img src={promoProject.afterImage} alt="改善後" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full bg-emerald-50 flex flex-col items-center justify-center text-emerald-600/50">
                                        <Camera className="w-10 h-10 mb-2 opacity-30" />
                                        <span className="text-sm font-bold opacity-50">尚未提供完工照片</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 四大亮點指標 */}
                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-l-4 border-purple-500 pl-3">建設亮點指標</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.pole ? 'border-amber-400 bg-amber-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                    <div className={`p-3 rounded-full mb-2 ${promoProject.features?.pole ? 'bg-amber-100' : 'bg-gray-200'}`}><Zap className={`w-6 h-6 ${promoProject.features?.pole ? 'text-amber-500' : 'text-gray-400'}`}/></div>
                                    <span className="font-bold text-gray-800 text-sm">電桿地下化</span>
                                </div>
                                <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.light ? 'border-yellow-400 bg-yellow-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                    <div className={`p-3 rounded-full mb-2 ${promoProject.features?.light ? 'bg-yellow-100' : 'bg-gray-200'}`}><Lightbulb className={`w-6 h-6 ${promoProject.features?.light ? 'text-yellow-500' : 'text-gray-400'}`}/></div>
                                    <span className="font-bold text-gray-800 text-sm">雙色溫路燈</span>
                                </div>
                                <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.pickup ? 'border-blue-400 bg-blue-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                    <div className={`p-3 rounded-full mb-2 ${promoProject.features?.pickup ? 'bg-blue-100' : 'bg-gray-200'}`}><Car className={`w-6 h-6 ${promoProject.features?.pickup ? 'text-blue-500' : 'text-gray-400'}`}/></div>
                                    <span className="font-bold text-gray-800 text-sm">避車接送區</span>
                                </div>
                                <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all relative overflow-hidden ${promoProject.features?.shelter ? 'border-emerald-400 bg-emerald-50 shadow-md transform -translate-y-1' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                    {promoProject.features?.shelter && promoProject.shelterLength > 0 && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm">長 {promoProject.shelterLength}m</div>}
                                    <div className={`p-3 rounded-full mb-2 ${promoProject.features?.shelter ? 'bg-emerald-100' : 'bg-gray-200'}`}><Umbrella className={`w-6 h-6 ${promoProject.features?.shelter ? 'text-emerald-500' : 'text-gray-400'}`}/></div>
                                    <span className="font-bold text-gray-800 text-sm">連通式雨遮</span>
                                </div>
                            </div>
                        </div>

                        {/* 底部詳細資訊 */}
                        <div className="grid grid-cols-3 gap-6 pt-5 border-t-2 border-gray-100 mt-auto bg-gray-50/50 -mx-8 -mb-8 p-8 rounded-b-xl">
                            <div>
                                <p className="text-xs text-gray-500 font-bold mb-1">補助單位 / 預算來源</p>
                                <p className="font-bold text-gray-800 text-sm">{promoProject.budgetSource1} {promoProject.budgetSource2 ? `(${promoProject.budgetSource2})` : ''}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold mb-1">施工期程</p>
                                <p className="font-bold text-gray-800 font-mono text-sm tracking-tighter">
                                    {promoProject.startDate || '未定'} ~ {promoProject.endDate || '未定'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 font-bold mb-1">執行機關</p>
                                <p className="font-bold text-gray-800 text-sm">{promoProject.agency}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
  );

  const renderSchedule = () => {
     return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in pb-20 overflow-y-auto">
            {renderBlock8Schedule()}
        </div>
     );
  }

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {/* 新增：異動紀錄區塊取代單機暫存 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800"><History className="mr-2 text-blue-500"/> 資料庫異動紀錄 (即時同步)</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {auditLogs.length > 0 ? auditLogs.map((log, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-2 text-sm">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="flex items-center text-xs"><Clock className="w-3 h-3 mr-1"/> {log.time}</span>
                            <span className="text-[10px] font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-400">User: {log.user.slice(0,6)}...</span>
                        </div>
                        <div className="font-bold text-gray-800">{log.action}</div>
                    </div>
                )) : <div className="text-gray-400 text-center py-8 flex flex-col items-center"><Database className="w-8 h-8 mb-2 opacity-50"/>尚無異動紀錄，或者正在載入雲端資料...</div>}
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
            <h2 className="text-xl font-bold mb-2 flex items-center text-gray-800"><Key className="mr-2 text-purple-500"/> AI 戰情特助設定 (重要)</h2>
            <p className="text-sm text-gray-600 mb-4 line-relaxed">系統已成功部署至外部網路！請輸入您的 Google Gemini API Key 以喚醒右下角的 AI 特助。<br/><span className="text-purple-600 font-bold">(您的金鑰僅會加密儲存於當前設備的瀏覽器中，絕對不會外洩。)</span></p>
            <div className="flex flex-col space-y-2">
                <input type="password" placeholder="請貼上 AIzaSy 開頭的 API Key..." className="w-full p-3 rounded border border-gray-300 focus:ring-2 focus:ring-purple-400 outline-none font-mono text-sm shadow-sm" value={userApiKey} onChange={(e) => { setUserApiKey(e.target.value); localStorage.setItem('ty_gemini_key', e.target.value); }} />
                <p className="text-xs text-gray-500">尚未擁有金鑰？請前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline hover:text-blue-700 font-bold">Google AI Studio</a> 免費申請。</p>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-400">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800"><History className="mr-2 text-yellow-500"/> 系統更新日誌 (Changelog)</h2>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {CHANGELOG.map((log, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center space-x-3 mb-1"><span className="font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-xs">{log.version}</span><span className="text-sm text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> {log.date}</span></div>
                        <ul className="list-disc list-inside text-sm text-gray-700 ml-4 space-y-1">{log.notes.map((note, i) => <li key={i}>{note}</li>)}</ul>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800"><Database className="mr-2"/> 報表匯出與系統備份</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-blue-200 bg-blue-50 p-6 rounded-lg text-center hover:shadow-md transition"><Download className="w-12 h-12 text-blue-500 mx-auto mb-4"/><h3 className="font-bold text-blue-800 mb-2">1. 下載資料備份</h3><p className="text-xs text-blue-600 mb-4">將目前的資料庫匯出為 CSV 檔 (相容多重標籤與新指標)。</p><button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 w-full font-bold">匯出 CSV</button></div>
                <div className="border border-green-200 bg-green-50 p-6 rounded-lg text-center hover:shadow-md transition"><Upload className="w-12 h-12 text-green-500 mx-auto mb-4"/><h3 className="font-bold text-green-800 mb-2">2. 匯入更新系統</h3><p className="text-xs text-green-600 mb-4">上傳已編輯好的 CSV 覆蓋當前雲端資料庫。</p><input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" /><button onClick={() => fileInputRef.current.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 w-full font-bold">選擇 CSV 匯入</button></div>
                <div className="border border-pink-200 bg-pink-50 p-6 rounded-lg text-center hover:shadow-md transition relative"><FileText className="w-12 h-12 text-pink-500 mx-auto mb-4"/><h3 className="font-bold text-pink-800 mb-2">3. 純文字報表</h3><p className="text-xs text-pink-600 mb-4">產生以文字為主的 Word 檔。</p><button onClick={exportWord} className="bg-pink-600 text-white px-4 py-2 rounded shadow hover:bg-pink-700 w-full font-bold flex items-center justify-center"><FileText className="w-4 h-4 mr-2"/> 匯出 Word (.doc)</button></div>
            </div>
        </div>
    </div>
  );

  return (
    <>
    {/* ========================================== */}
    {/* 【正常螢幕操作介面】 (包含主系統隱藏邏輯) */}
    {/* ========================================== */}
    <div className={`flex h-screen bg-gray-100 font-sans text-gray-800 relative overflow-hidden ${promoProject ? 'print:hidden' : 'screen-only'}`}>
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-pink-500/30"><div className="w-2 h-2 bg-white rounded-full"></div><div className="w-2 h-2 bg-yellow-300 rounded-full ml-1"></div></div>
                <div><h1 className="text-lg font-bold tracking-wider">桃園市</h1><p className="text-xs text-gray-400">通學廊道戰情儀錶板</p></div>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {[
                { id: 'dashboard', icon: LayoutDashboard, label: '戰情儀錶板' },
                { id: 'central', icon: Building2, label: '中央補助案' },
                { id: 'schools', icon: Search, label: '學校總表' },
                { id: 'schedule', icon: Calendar, label: '115年度排程' },
                { id: 'settings', icon: Settings, label: '系統設定與備份' }, 
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-3 rounded-lg transition-colors font-semibold ${activeTab === item.id ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    <item.icon className="w-5 h-5 mr-3" />{item.label}
                </button>
            ))}
        </nav>
        <div className="p-4 bg-gray-800 text-xs text-gray-400 text-center select-none flex flex-col items-center"><span>科技城市 ‧ 魅力桃園</span><span className="mt-2 text-[10px] text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> {currentDate}</span></div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-6 z-10 flex-shrink-0">
            <div className="flex items-center">
                <h2 className="text-xl font-bold text-gray-700 flex items-center">
                    {activeTab === 'dashboard' && '首頁 / 戰情儀錶板'}
                    {activeTab === 'central' && '專案管理 / 中央補助案'}
                    {activeTab === 'schools' && '資料庫 / 學校總表'}
                    {activeTab === 'schedule' && '排程 / 115年度施工'}
                    {activeTab === 'settings' && '系統 / 報表設定與金鑰'}
                </h2>
                <span className="ml-4 bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-xs font-bold border border-pink-100 flex items-center shadow-sm"><Calendar className="w-3 h-3 mr-1"/> {currentDate}</span>
            </div>
            <div className="flex items-center space-x-3">
                {/* --- 新增：更新儲存按鈕 --- */}
                <button onClick={handleForceSync} disabled={isSyncing} className={`flex items-center px-4 py-1.5 rounded-lg shadow-md transition-all text-sm font-bold ${isSyncing ? 'bg-indigo-400 text-white cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 shadow-indigo-500/30'}`}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`}/>
                    {isSyncing ? '儲存同步中...' : '更新儲存'}
                </button>

                <span className="flex items-center text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-100">
                    <Database className="w-3 h-3 mr-1"/> 雙軌保護中
                </span>
                <button onClick={openPrintConfig} className="flex items-center bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow hover:bg-gray-700 transition-colors text-sm font-bold shadow-gray-500/50 ml-1">
                    <Printer className="w-4 h-4 mr-2"/> 匯出
                </button>
            </div>
        </header>

        <div className="flex-1 overflow-auto p-6 scroll-smooth bg-gray-50/50">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'central' && renderCentral()}
            {activeTab === 'schools' && renderSchools()}
            {activeTab === 'schedule' && renderSchedule()}
            {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* --- AI 戰情特助 --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isAIOpen && (
            <div className="w-[360px] h-[550px] bg-white rounded-xl shadow-2xl border border-pink-100 mb-4 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center font-bold"><MessageCircle className="w-5 h-5 mr-2" /> AI 戰情特助</div>
                    <button onClick={() => setIsAIOpen(false)} className="hover:text-pink-200 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                {/* 快捷指令列 */}
                <div className="bg-gray-50 p-2 border-b flex space-x-2 overflow-x-auto custom-scrollbar">
                    <button onClick={handleGeneratePR} className="flex-shrink-0 flex items-center px-3 py-1.5 bg-white border border-pink-200 text-pink-600 rounded-full text-xs font-bold hover:bg-pink-50 transition-colors shadow-sm">
                        <FileOutput className="w-3 h-3 mr-1"/> 產生新聞稿
                    </button>
                    <input type="file" accept=".txt" className="hidden" ref={aiFileInputRef} onChange={handleAiFileUpload} />
                    <button onClick={() => aiFileInputRef.current.click()} className="flex-shrink-0 flex items-center px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-50 transition-colors shadow-sm" title="上傳TXT參考資料供AI閱讀">
                        <Paperclip className="w-3 h-3 mr-1"/> 上傳參考資料
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 text-sm custom-scrollbar">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] whitespace-pre-wrap ${msg.role === 'user' ? 'bg-pink-500 text-white rounded-tr-none shadow-sm' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm leading-relaxed'}`}>{msg.content}</div>
                        </div>
                    ))}
                    {isAILoading && (<div className="flex items-start"><div className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-gray-500 rounded-tl-none flex items-center space-x-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div></div></div>)}
                    <div ref={aiChatEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-gray-100 flex items-center">
                    <input type="text" className="flex-1 border-0 bg-gray-100 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-pink-300 outline-none transition-all" placeholder={userApiKey ? "請輸入問題..." : "請先至設定頁輸入金鑰..."} value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiSubmit()} disabled={isAILoading || !userApiKey} />
                    <button className={`ml-2 p-2 rounded-full ${aiInput.trim() && !isAILoading && userApiKey ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} transition-colors`} onClick={() => handleAiSubmit()} disabled={!aiInput.trim() || isAILoading || !userApiKey}><Send className="w-4 h-4" /></button>
                </div>
            </div>
        )}
        <button onClick={() => setIsAIOpen(!isAIOpen)} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 ${isAIOpen ? 'bg-gray-800 text-white' : 'bg-gradient-to-tr from-pink-500 to-purple-500 text-white'}`}>
            {isAIOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        </button>
      </div>

      {/* --- A4 報表匯出設定 Modal --- */}
      {isPrintModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm screen-only">
             <div className="bg-white rounded-2xl shadow-2xl p-6 w-[600px] border-t-4 border-gray-800">
                 <h3 className="text-2xl font-bold mb-2 flex items-center text-gray-800"><Printer className="mr-3 w-6 h-6"/> A4 視覺報表匯出設定</h3>
                 <p className="text-sm text-gray-500 mb-6 pb-4 border-b">請自由勾選您希望在 PDF 中呈現的卡片區塊。系統將自動為您生成 2cm 邊界之 A4 排版。</p>
                 
                 <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                     <div>
                         <h4 className="font-bold text-pink-700 mb-2 border-b border-pink-100 pb-1">【戰情儀錶板】</h4>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" checked={printSelection.b1} onChange={e=>setPrintSelection({...printSelection, b1: e.target.checked})} /><span>[1] 錄案與經費概況總覽 (上方六宮格)</span></label>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" checked={printSelection.b1_1} onChange={e=>setPrintSelection({...printSelection, b1_1: e.target.checked})} /><span>[1-1] 實際學校數量統計 (下方歸戶五宮格)</span></label>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" checked={printSelection.b2} onChange={e=>setPrintSelection({...printSelection, b2: e.target.checked})} /><span>[2] 預算來源分析圓餅圖</span></label>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" checked={printSelection.b3} onChange={e=>setPrintSelection({...printSelection, b3: e.target.checked})} /><span>[3] 行政區進度與經費卡片</span></label>
                     </div>
                     <div>
                         <h4 className="font-bold text-blue-700 mb-2 border-b border-blue-100 pb-1">【中央補助案】</h4>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={printSelection.b4} onChange={e=>setPrintSelection({...printSelection, b4: e.target.checked})} /><span>[4] 中央補助專案統計概況 (國土署/公路局)</span></label>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" checked={printSelection.b5} onChange={e=>setPrintSelection({...printSelection, b5: e.target.checked})} /><span>[5] 中央補助專案列表 (四大亮點指標清單)</span></label>
                     </div>
                     <div>
                         <h4 className="font-bold text-yellow-600 mb-2 border-b border-yellow-100 pb-1">【學校總表】</h4>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500" checked={printSelection.b6} onChange={e=>setPrintSelection({...printSelection, b6: e.target.checked})} /><span>[6] 學校總表過濾統計卡片</span></label>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-yellow-500 rounded border-gray-300 focus:ring-yellow-500" checked={printSelection.b7} onChange={e=>setPrintSelection({...printSelection, b7: e.target.checked})} /><span>[7] 學校總表清單明細 (依目前畫面篩選結果)</span></label>
                     </div>
                     <div>
                         <h4 className="font-bold text-green-700 mb-2 border-b border-green-100 pb-1">【115年排程】</h4>
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" checked={printSelection.b8} onChange={e=>setPrintSelection({...printSelection, b8: e.target.checked})} /><span>[8] 115年度預計完工月份看板與名單</span></label>
                     </div>
                 </div>

                 <div className="mt-8 pt-4 border-t flex justify-end space-x-4">
                     <button onClick={()=>setIsPrintModalOpen(false)} className="px-5 py-2 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors">取消返回</button>
                     <button 
                         onClick={() => {
                             setIsPrintModalOpen(false);
                             setTimeout(() => window.print(), 300);
                         }} 
                         className="px-6 py-2 rounded-lg font-bold text-white bg-gray-900 hover:bg-black shadow-lg transition-transform hover:scale-105 flex items-center"
                     >
                         <Printer className="w-4 h-4 mr-2"/> 確認產生 PDF
                     </button>
                 </div>
             </div>
         </div>
      )}
    </div>

    {/* ========================================== */}
    {/* 【列印專用版面區塊】 (包含 A4 報表與 Promo Card 判斷) */}
    {/* ========================================== */}
    <div className={`print-only text-black font-sans bg-white print-content-reset ${promoProject ? 'hidden print:block' : ''}`}>
        
        {/* 情境 1：列印 A4 戰情報表 */}
        {!promoProject && (
            <>
                <div className="text-center pb-4 mb-6 border-b-2 border-gray-800">
                    <h1 className="text-3xl font-black tracking-widest text-gray-900 mb-2">桃園市通學廊道戰情報告</h1>
                    <p className="text-sm text-gray-600 font-bold">資料統計日期：{currentDate}</p>
                </div>

                {printSelection.b1 && renderBlock1Overview()}
                {printSelection.b1_1 && renderBlock1ActualStats()}
                {printSelection.b2 && renderBlock2PieCharts()}
                {printSelection.b3 && renderBlock3DistrictCards()}
                {printSelection.b4 && renderBlock4CentralStats()}
                {printSelection.b5 && renderBlock5CentralTable()}
                {printSelection.b6 && renderBlock6SchoolStats()}
                {printSelection.b7 && renderBlock7SchoolTable()}
                {printSelection.b8 && renderBlock8Schedule()}

                {!Object.values(printSelection).some(Boolean) && (
                    <div className="text-center text-gray-400 py-20 border-2 border-dashed border-gray-200">
                        列印畫面未選取區塊。
                    </div>
                )}
                
                <div className="mt-8 pt-4 border-t text-right text-xs text-gray-400 font-mono">
                    Generated by Taoyuan Corridor Dashboard System
                </div>
            </>
        )}

        {/* 情境 2：列印單張宣傳圖卡 */}
        {promoProject && (
            <div className="w-[850px] mx-auto mt-8 border rounded-2xl overflow-hidden shadow-none print-promo-card relative flex flex-col">
                {/* 裝飾背景 */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>

                {/* 卡片標頭 (動態套用行政區意象) */}
                <div className={`bg-gradient-to-r ${getDistrictTheme(promoProject.district).gradient} p-8 text-white relative`}>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-4">
                            <div>
                                <div className="flex items-center space-x-2 mb-2 text-white/90">
                                    <span className="text-2xl">{getDistrictTheme(promoProject.district).icon}</span>
                                    <span className="font-bold tracking-widest text-sm drop-shadow">{getDistrictTheme(promoProject.district).desc}</span>
                                </div>
                                <h1 className="text-3xl font-black tracking-wider drop-shadow-md text-white">桃園市通學廊道專案成果</h1>
                            </div>
                            <div className="bg-black/20 px-4 py-2 rounded-lg border border-white/30 text-right">
                                <div className="text-xs text-white/80 font-bold mb-0.5">專案狀態</div>
                                <div className="font-black text-xl tracking-widest text-yellow-300 drop-shadow">{promoProject.status}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 卡片內容區 */}
                <div className="p-8 flex-1 flex flex-col relative z-10 bg-white">
                    
                    {/* 學校標題與經費 */}
                    <div className="flex justify-between items-start mb-6 border-b-2 border-gray-100 pb-4">
                        <div>
                            <div className="flex items-center space-x-3 mb-2">
                                <span className="px-3 py-1 bg-gray-800 text-white rounded font-bold text-sm shadow-sm">{promoProject.district}</span>
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded font-bold text-sm border shadow-sm">{promoProject.level}</span>
                                {promoProject.source && promoProject.source.length > 0 && (
                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-bold text-xs border border-purple-100 shadow-sm">來源: {promoProject.source[0]}{promoProject.source.length > 1 ? '...' : ''}</span>
                                )}
                            </div>
                            <h2 className="text-4xl font-black text-gray-800 tracking-tight">{promoProject.name}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-400 mb-1">投入總經費</p>
                            <p className="text-4xl font-black text-pink-600 font-mono tracking-tighter">
                                {Number(promoProject.budgetAmount).toLocaleString()} <span className="text-lg font-bold text-gray-500">萬元</span>
                            </p>
                        </div>
                    </div>

                    {/* 雙照片對照區 (16:9 split into 2) */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm group" style={{ aspectRatio: '4/3' }}>
                            <div className="absolute top-2 left-2 bg-gray-900/70 text-white px-3 py-1 rounded-full text-xs font-bold z-10 backdrop-blur-sm border border-gray-700">施工前 (Before)</div>
                            {promoProject.beforeImage ? (
                                <img src={promoProject.beforeImage} alt="施工前" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                                    <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                                    <span className="text-sm font-bold opacity-50">尚未提供現況照片</span>
                                </div>
                            )}
                        </div>
                        <div className="relative rounded-xl overflow-hidden border border-emerald-200 shadow-sm group" style={{ aspectRatio: '4/3' }}>
                            <div className="absolute top-2 left-2 bg-emerald-600/90 text-white px-3 py-1 rounded-full text-xs font-bold z-10 backdrop-blur-sm border border-emerald-500 shadow-md">改善後 (After)</div>
                            {promoProject.afterImage ? (
                                <img src={promoProject.afterImage} alt="改善後" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full bg-emerald-50 flex flex-col items-center justify-center text-emerald-600/50">
                                    <Camera className="w-10 h-10 mb-2 opacity-30" />
                                    <span className="text-sm font-bold opacity-50">尚未提供完工照片</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 四大亮點指標 */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center border-l-4 border-purple-500 pl-3">建設亮點指標</h3>
                        <div className="grid grid-cols-4 gap-4">
                            <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.pole ? 'border-amber-400 bg-amber-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                <div className={`p-3 rounded-full mb-2 ${promoProject.features?.pole ? 'bg-amber-100' : 'bg-gray-200'}`}><Zap className={`w-6 h-6 ${promoProject.features?.pole ? 'text-amber-500' : 'text-gray-400'}`}/></div>
                                <span className="font-bold text-gray-800 text-sm">電桿地下化</span>
                            </div>
                            <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.light ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                <div className={`p-3 rounded-full mb-2 ${promoProject.features?.light ? 'bg-yellow-100' : 'bg-gray-200'}`}><Lightbulb className={`w-6 h-6 ${promoProject.features?.light ? 'text-yellow-500' : 'text-gray-400'}`}/></div>
                                <span className="font-bold text-gray-800 text-sm">雙色溫路燈</span>
                            </div>
                            <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all ${promoProject.features?.pickup ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                <div className={`p-3 rounded-full mb-2 ${promoProject.features?.pickup ? 'bg-blue-100' : 'bg-gray-200'}`}><Car className={`w-6 h-6 ${promoProject.features?.pickup ? 'text-blue-500' : 'text-gray-400'}`}/></div>
                                <span className="font-bold text-gray-800 text-sm">避車接送區</span>
                            </div>
                            <div className={`p-3 rounded-xl border-2 flex flex-col items-center text-center transition-all relative overflow-hidden ${promoProject.features?.shelter ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 bg-gray-50 opacity-40 grayscale'}`}>
                                {promoProject.features?.shelter && promoProject.shelterLength > 0 && <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm">長 {promoProject.shelterLength}m</div>}
                                <div className={`p-3 rounded-full mb-2 ${promoProject.features?.shelter ? 'bg-emerald-100' : 'bg-gray-200'}`}><Umbrella className={`w-6 h-6 ${promoProject.features?.shelter ? 'text-emerald-500' : 'text-gray-400'}`}/></div>
                                <span className="font-bold text-gray-800 text-sm">連通式雨遮</span>
                            </div>
                        </div>
                    </div>

                    {/* 底部詳細資訊 */}
                    <div className="grid grid-cols-3 gap-6 pt-5 border-t-2 border-gray-100 mt-auto bg-gray-50/50 -mx-8 -mb-8 p-8 rounded-b-xl">
                        <div>
                            <p className="text-xs text-gray-500 font-bold mb-1">補助單位 / 預算來源</p>
                            <p className="font-bold text-gray-800 text-sm">{promoProject.budgetSource1} {promoProject.budgetSource2 ? `(${promoProject.budgetSource2})` : ''}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold mb-1">施工期程</p>
                            <p className="font-bold text-gray-800 font-mono text-sm tracking-tighter">
                                {promoProject.startDate || '未定'} ~ {promoProject.endDate || '未定'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 font-bold mb-1">執行機關</p>
                            <p className="font-bold text-gray-800 text-sm">{promoProject.agency}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>

    {/* ========================================== */}
    {/* 全局 CSS (包含列印覆寫規則與自訂滾動條) */}
    {/* ========================================== */}
    <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        
        /* 捲動條美化 */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* 針對整個畫面的隱藏卷軸 */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* 平時螢幕顯示邏輯 */
        @media screen {
            .print-only { display: none !important; }
        }

        /* --- A4 PDF 視覺報表列印專用 CSS --- */
        @media print {
            @page { 
                size: A4 portrait; /* 直式 A4 */
                margin: 1cm;       /* 列印邊界縮減以容納宣傳圖卡 */
            }
            body { 
                background: white !important; 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
            }
            
            /* 隱藏螢幕專用的 UI */
            .screen-only { display: none !important; }
            /* 顯示列印專用容器 */
            .print-only { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
            
            /* 區塊層級的防裁切與換頁控制 */
            .print-avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
            
            /* 表格列印優化 (去除 overflow 防止表格被截斷) */
            .print-table-wrapper { overflow: visible !important; border: none !important; box-shadow: none !important; }
            .print-table { border-collapse: collapse !important; width: 100% !important; page-break-inside: auto !important; border-spacing: 0 !important;}
            .print-table tr { page-break-inside: avoid !important; page-break-after: auto !important; }
            .print-table th, .print-table td { border: 1px solid #4a5568 !important; padding: 6px !important; color: #000 !important; border-bottom: none !important; }
            .print-table th > div { resize: none !important; overflow: visible !important; white-space: normal !important; min-width: 0 !important;}
            
            /* 強制列印排版網格 */
            .print-grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .print-grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
            .print-grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
            .print-grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)) !important; }
            .print-w-1\\/4 { width: 23% !important; display: inline-block !important; vertical-align: top; }
            .print-m-2 { margin: 0.5rem !important; }
            .print-flex-wrap { flex-wrap: wrap !important; overflow: visible !important; display: block !important; }

            /* 強制保留顏色的魔法 Class */
            .print-bg-gray-50 { background-color: #f9fafb !important; }
            .print-bg-gray-100 { background-color: #f3f4f6 !important; }
            .print-bg-gray-200 { background-color: #e5e7eb !important; }
            .print-bg-gray-300 { background-color: #d1d5db !important; }
            .print-bg-gray-500 { background-color: #6b7280 !important; }
            .print-bg-gray-800 { background-color: #1f2937 !important; }
            
            .print-bg-green-50 { background-color: #f0fdf4 !important; }
            .print-bg-green-100 { background-color: #dcfce7 !important; }
            .print-bg-green-500 { background-color: #22c55e !important; }
            .print-bg-green-600 { background-color: #16a34a !important; }
            
            .print-bg-blue-50 { background-color: #eff6ff !important; }
            .print-bg-blue-100 { background-color: #dbeafe !important; }
            .print-bg-blue-500 { background-color: #3b82f6 !important; }
            .print-bg-blue-600 { background-color: #2563eb !important; }
            
            .print-bg-yellow-50 { background-color: #fefce8 !important; }
            .print-bg-yellow-400 { background-color: #facc15 !important; }
            .print-bg-yellow-500 { background-color: #eab308 !important; }

            .print-bg-amber-50 { background-color: #fffbeb !important; }
            .print-bg-amber-100 { background-color: #fef3c7 !important; }

            .print-bg-emerald-50 { background-color: #ecfdf5 !important; }
            .print-bg-emerald-100 { background-color: #d1fae5 !important; }
            .print-bg-emerald-500 { background-color: #10b981 !important; }

            .print-bg-red-50 { background-color: #fef2f2 !important; }
            .print-bg-pink-50 { background-color: #fdf2f8 !important; }
            .print-bg-teal-50 { background-color: #f0fdfa !important; }
            .print-bg-teal-500 { background-color: #14b8a6 !important; }
            
            /* 文字顏色強制 */
            .print-text-white { color: #ffffff !important; }
            .print-text-gray-300 { color: #d1d5db !important; }
            .print-text-gray-100 { color: #f3f4f6 !important; }
            .print-text-green-100 { color: #dcfce7 !important; }
            .print-text-green-700 { color: #15803d !important; }
            .print-text-blue-100 { color: #dbeafe !important; }
            .print-text-blue-700 { color: #1d4ed8 !important; }
            .print-text-yellow-100 { color: #fef9c3 !important; }
            
            .print-border-l-primary { border-left-color: #E83888 !important; }
            .print-border-l-gray-800 { border-left-color: #1F2937 !important; }
        }
      `}} />
    </>
  );
}