import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LayoutDashboard, Building2, Calendar, Database, Download, Upload, Save, MapPin, Image as ImageIcon, Search, AlertCircle, Edit, CheckSquare, Square, Check, MessageCircle, X, Send, Filter, FileText, Clock, History, Key, Printer, Settings } from 'lucide-react';

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

// --- 系統更新日誌資料 ---
const CHANGELOG = [
  { date: '2026-03-13', version: 'v1.9.0', notes: ['學校總表支援自訂欄位寬度拖曳', '學校總表開啟全域垂直/水平卷軸', '學校總表新增進場與完工日期', '大幅擴充排程口袋名單視窗寬度'] },
  { date: '2026-03-13', version: 'v1.8.0', notes: ['優化 AI 提示詞架構，餵入各行政區詳細統計', '新增 115年度排程達標率與口袋名單看板', '拆分 A4 列印模組 [1] 與 [1-1]'] },
  { date: '2026-03-13', version: 'v1.7.1', notes: ['修復 Gemini API 權限錯誤，全面升級至最新 gemini-2.5-flash 模型'] },
  { date: '2026-03-13', version: 'v1.7.0', notes: ['新增 A4 自訂排版列印模組：支援 8 大區塊自由勾選組合匯出'] },
  { date: '2026-03-13', version: 'v1.6.0', notes: ['修復 Gemini API 模型權限問題', '新增全域 A4 視窗截圖/PDF 匯出功能 (2cm邊界)'] },
  { date: '2026-03-13', version: 'v1.5.0', notes: ['新增 Gemini API Key 本機安全儲存介面', '支援外部 Vercel 部署之 AI 連線功能'] },
  { date: '2026-03-13', version: 'v1.4.0', notes: ['新增即時日期顯示', '新增系統更新日誌區塊', '優化介面排版'] },
  { date: '2026-03-12', version: 'v1.3.0', notes: ['新增 A4 Word 匯出功能', '實作羅浮學區跨層級整併邏輯'] },
  { date: '2026-03-11', version: 'v1.2.0', notes: ['實作學校總表動態過濾卡片', '新增中央補助案不核定排除機制'] },
  { date: '2026-03-10', version: 'v1.1.0', notes: ['新增項次自動編碼 (區分主案與重複案)', '新增手動排除歸戶機制', '整合 AI 戰情特助 (Gemini API)'] },
  { date: '2026-03-09', version: 'v1.0.0', notes: ['匯入 159 筆局務會議初始資料', '建立戰情儀錶板與實際歸戶演算法'] },
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

// --- 擴展表頭自訂欄寬元件 (無套件依賴) ---
const ResizableTh = ({ children, minW = "100px", className = "" }) => (
    <th className="border border-gray-200 bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm print-bg-gray-100 p-0 align-top">
        <div 
            className={`p-3 resize-x overflow-hidden whitespace-nowrap font-bold hover:bg-gray-200 transition-colors ${className}`} 
            style={{ minWidth: minW, maxWidth: '600px' }}
        >
            {children}
        </div>
    </th>
);

// --- 由文本解析匯入之完整資料庫 (共159筆) ---
const INITIAL_DATA = [
  { id: '1', district: '中壢區', name: '中壢國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2390, startDate: '2024/12/27', endDate: '2026/03/31', agency: '都發局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '2', district: '中壢區', name: '林森國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 1890, startDate: '2026/04/01', endDate: '2026/07/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '3', district: '中壢區', name: '龍興國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '4', district: '中壢區', name: '興國國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '5', district: '中壢區', name: '興仁國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '6', district: '中壢區', name: '中央大學', level: '大學', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 3500, startDate: '2023/10/16', endDate: '2024/07/05', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '7', district: '中壢區', name: '中平國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 310, startDate: '2023/10/30', endDate: '2024/02/25', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '8', district: '中壢區', name: '中平國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '2025/07/10', endDate: '2025/12/10', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '9', district: '中壢區', name: '新街國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 249, startDate: '2023/04/17', endDate: '2023/06/02', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '10', district: '中壢區', name: '內壢高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 173.5, startDate: '2024/11/05', endDate: '2025/01/10', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '11', district: '中壢區', name: '新明國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 323.3, startDate: '2024/10/29', endDate: '2024/12/25', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '12', district: '中壢區', name: '過嶺國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 140, startDate: '2024/12/15', endDate: '2025/02/28', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '13', district: '中壢區', name: '內壢國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2623, startDate: '2025/01/21', endDate: '2026/02/05', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '14', district: '八德區', name: '大成國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '15', district: '八德區', name: '八德國中2期', level: '國中', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 2500, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '16', district: '八德區', name: '大勇國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 133, startDate: '2024/05/01', endDate: '2024/05/21', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '17', district: '八德區', name: '大忠國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 65, startDate: '2023/11/30', endDate: '2023/12/10', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '18', district: '八德區', name: '廣興國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 61, startDate: '2023/12/01', endDate: '2023/12/15', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '19', district: '八德區', name: '廣興國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 400, startDate: '2025/04/01', endDate: '2025/05/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '20', district: '八德區', name: '大成國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 420, startDate: '2023/08/15', endDate: '2023/10/31', agency: '教育局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '21', district: '八德區', name: '茄苳國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 643, startDate: '2024/05/04', endDate: '2024/08/10', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '22', district: '八德區', name: '八德國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 655, startDate: '2024/07/22', endDate: '2024/12/27', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '23', district: '八德區', name: '八德國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 655, startDate: '2024/07/22', endDate: '2024/12/27', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '24', district: '八德區', name: '大安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 833, startDate: '2024/09/17', endDate: '2025/02/28', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '25', district: '八德區', name: '瑞豐國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 833, startDate: '2024/09/17', endDate: '2025/02/28', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '26', district: '平鎮區', name: '北勢國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 970, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '27', district: '平鎮區', name: '忠貞國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '28', district: '平鎮區', name: '平南國中', level: '國中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 250, startDate: '2026/06/01', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '29', district: '平鎮區', name: '東安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 959, startDate: '2024/07/15', endDate: '2024/10/12', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '30', district: '平鎮區', name: '南勢國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 1050, startDate: '2024/01/15', endDate: '2024/05/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '31', district: '平鎮區', name: '山豐國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 50, startDate: '2023/12/01', endDate: '2024/04/21', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '32', district: '平鎮區', name: '山豐國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 150, startDate: '2024/09/15', endDate: '2024/10/07', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '33', district: '平鎮區', name: '新勢國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 250, startDate: '2024/08/16', endDate: '2024/09/23', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '34', district: '平鎮區', name: '祥安國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 100, startDate: '2024/07/25', endDate: '2024/08/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '35', district: '平鎮區', name: '復旦國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 284, startDate: '2024/08/02', endDate: '2024/08/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '36', district: '平鎮區', name: '文化國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 43, startDate: '2024/04/03', endDate: '2024/04/12', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '37', district: '平鎮區', name: '義興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 44, startDate: '2024/03/16', endDate: '2024/04/29', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '38', district: '平鎮區', name: '東安國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 959, startDate: '2024/07/05', endDate: '2024/09/07', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '39', district: '平鎮區', name: '平興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 875, startDate: '2024/07/01', endDate: '2024/09/20', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '40', district: '平鎮區', name: '平鎮高中', level: '高中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '2024/08/09', endDate: '2024/11/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '41', district: '平鎮區', name: '新榮國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 54, startDate: '2024/07/30', endDate: '2024/08/03', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '42', district: '平鎮區', name: '義民公幼', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 350, startDate: '2024/10/14', endDate: '2025/01/09', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '43', district: '平鎮區', name: '東勢國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2025/02/06', endDate: '2025/03/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '44', district: '平鎮區', name: '平鎮國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1000, startDate: '2024/08/16', endDate: '2025/06/01', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '45', district: '平鎮區', name: '育達高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 350, startDate: '2025/07/10', endDate: '2025/08/11', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '46', district: '平鎮區', name: '宋屋國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 650, startDate: '2025/09/12', endDate: '2025/12/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '47', district: '大園區', name: '大園國際高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 200, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '48', district: '大園區', name: '溪海國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '交通局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '49', district: '大園區', name: '大園國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1470, startDate: '2023/08/18', endDate: '2023/11/22', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '50', district: '大園區', name: '五權國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 197, startDate: '2023/10/25', endDate: '2023/12/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '51', district: '大園區', name: '大園國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 4.5, startDate: '2024/03/15', endDate: '2024/04/05', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '52', district: '觀音區', name: '觀音國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '53', district: '觀音區', name: '草漯國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 749, startDate: '2024/03/04', endDate: '2024/10/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '54', district: '觀音區', name: '育仁國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 106, startDate: '2023/11/10', endDate: '2024/03/12', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '55', district: '觀音區', name: '觀音國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 1758, startDate: '2022/07/16', endDate: '2022/12/27', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '56', district: '觀音區', name: '新坡國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/07/17', endDate: '2024/12/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '57', district: '龜山區', name: '福源國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '58', district: '龜山區', name: '大埔國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '59', district: '龜山區', name: '文欣國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '60', district: '龜山區', name: '文青國中小', level: '國中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '61', district: '龜山區', name: '大崗國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2770, startDate: '2024/03/04', endDate: '2024/10/21', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '62', district: '龜山區', name: '大崗國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 8000, startDate: '2024/10/14', endDate: '2025/11/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '63', district: '龜山區', name: '大湖國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1040, startDate: '2024/12/05', endDate: '2025/04/27', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '64', district: '龜山區', name: '大湖國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '', endDate: '2024/12/19', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '65', district: '龜山區', name: '楓樹國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 140, startDate: '2023/02/01', endDate: '2023/04/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '66', district: '龜山區', name: '楓樹國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 99, startDate: '2023/10/11', endDate: '2023/12/02', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '67', district: '龜山區', name: '光峰幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 75, startDate: '2023/01/30', endDate: '2023/03/29', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '68', district: '龜山區', name: '龜山幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 2, startDate: '2023/05/27', endDate: '2023/05/27', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '69', district: '龜山區', name: '新路國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 91, startDate: '2024/01/22', endDate: '2024/04/20', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '70', district: '龜山區', name: '龜山國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 731, startDate: '2024/08/05', endDate: '2024/12/20', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '71', district: '龜山區', name: '壽山高中', level: '高中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 732, startDate: '2024/08/05', endDate: '2024/12/20', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '72', district: '龜山區', name: '山頂國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 600, startDate: '2024/09/10', endDate: '2024/12/27', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '73', district: '龜山區', name: '南美國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 989, startDate: '2024/08/13', endDate: '2024/12/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '74', district: '龜山區', name: '樂善國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 989, startDate: '2024/08/13', endDate: '2024/12/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '75', district: '龜山區', name: '幸福國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 220, startDate: '2023/06/13', endDate: '2023/08/22', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '76', district: '龜山區', name: '自強國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/08/28', endDate: '2024/10/14', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '77', district: '龜山區', name: '自強國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 450, startDate: '2025/08/29', endDate: '2025/10/27', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '78', district: '龜山區', name: '龜山國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 280, startDate: '2023/11/20', endDate: '2024/08/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '79', district: '龜山區', name: '文華國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1300, startDate: '2025/08/25', endDate: '2026/01/05', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '80', district: '蘆竹區', name: '南崁高中', level: '高中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2050, startDate: '2026/03/26', endDate: '2027/01/15', agency: '航工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '81', district: '蘆竹區', name: '南崁國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2050, startDate: '2026/03/26', endDate: '2027/01/15', agency: '航工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '82', district: '蘆竹區', name: '外社國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 578, startDate: '2026/06/01', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '83', district: '蘆竹區', name: '新興國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '84', district: '蘆竹區', name: '錦興國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1400, startDate: '2024/07/22', endDate: '2024/12/10', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '85', district: '蘆竹區', name: '山腳國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 16, startDate: '2023/08/28', endDate: '2023/08/28', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '86', district: '蘆竹區', name: '山腳國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 130, startDate: '2024/02/01', endDate: '2024/04/15', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '87', district: '蘆竹區', name: '大竹國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 513, startDate: '2024/07/29', endDate: '2024/10/14', agency: '航空處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '88', district: '蘆竹區', name: '大竹國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 514, startDate: '2024/07/29', endDate: '2024/10/14', agency: '航空處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '89', district: '蘆竹區', name: '大竹國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/11/01', endDate: '2025/12/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '90', district: '蘆竹區', name: '蘆竹國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 150, startDate: '2024/06/15', endDate: '2024/07/12', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '91', district: '蘆竹區', name: '大華國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 150, startDate: '2024/06/12', endDate: '2024/07/05', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '92', district: '蘆竹區', name: '山腳國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2025/04/07', endDate: '2025/06/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '93', district: '大溪區', name: '中興國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 981, startDate: '2025/09/02', endDate: '2026/03/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '94', district: '大溪區', name: '大溪國中', level: '國中', status: '暫緩', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 327, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '95', district: '大溪區', name: '仁和國中', level: '國中', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1423, startDate: '2026/01/23', endDate: '2026/12/30', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '96', district: '大溪區', name: '仁善國小', level: '國小', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 500, startDate: '2025/05/13', endDate: '2026/04/21', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '97', district: '大溪區', name: '員樹林國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '98', district: '大溪區', name: '僑愛國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '99', district: '大溪區', name: '田心國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '100', district: '大溪區', name: '福安國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '101', district: '大溪區', name: '永福國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '102', district: '大溪區', name: '大溪國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1536, startDate: '2023/07/31', endDate: '2023/11/01', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '103', district: '大溪區', name: '南興國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 91, startDate: '2023/01/03', endDate: '2023/03/04', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '104', district: '大溪區', name: '內柵國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '2025/09/01', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '105', district: '大溪區', name: '瑞祥國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '2025/08/28', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '106', district: '新屋區', name: '埔頂國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 500, startDate: '2026/06/01', endDate: '2027/01/01', agency: '用地科', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '107', district: '新屋區', name: '大坡國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2023/11/28', endDate: '2024/05/09', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '108', district: '新屋區', name: '北湖國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2024/05/15', endDate: '2024/07/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '109', district: '新屋區', name: '永安國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 320, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '110', district: '新屋區', name: '永安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 470, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '111', district: '新屋區', name: '東明國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 920, startDate: '2024/07/15', endDate: '2025/06/04', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '112', district: '桃園區', name: '中山國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '113', district: '桃園區', name: '會稽國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '道路基金', budgetAmount: 280, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '114', district: '桃園區', name: '莊敬國小', level: '國小', status: '暫緩', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '115', district: '桃園區', name: '桃園高中', level: '高中', status: '施工中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 5900, startDate: '2025/10/30', endDate: '2026/11/23', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '116', district: '桃園區', name: '北門國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 450, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '117', district: '桃園區', name: '中埔國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '118', district: '桃園區', name: '青溪國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '119', district: '桃園區', name: '永順國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '120', district: '桃園區', name: '文昌國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 320, startDate: '2023/11/15', endDate: '2024/03/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '121', district: '桃園區', name: '南門國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 170, startDate: '2023/05/13', endDate: '2023/08/01', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '122', district: '桃園區', name: '桃園國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 200, startDate: '2024/07/15', endDate: '2024/08/28', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '123', district: '桃園區', name: '桃園國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 3570, startDate: '2024/12/27', endDate: '2025/09/01', agency: '都發局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '124', district: '桃園區', name: '大業國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 471, startDate: '2023/12/26', endDate: '2024/05/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '125', district: '桃園區', name: '大業國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 0, startDate: '2025/01/06', endDate: '2025/02/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '126', district: '桃園區', name: '東門國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 250, startDate: '2023/09/01', endDate: '2023/10/15', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '127', district: '桃園區', name: '建德國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 490, startDate: '2023/07/01', endDate: '2023/08/29', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '128', district: '桃園區', name: '福豐國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 490, startDate: '2023/07/01', endDate: '2023/08/29', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '129', district: '桃園區', name: '建德國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 600, startDate: '2025/07/30', endDate: '2025/10/22', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '130', district: '桃園區', name: '中興國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 457, startDate: '2024/07/31', endDate: '2024/12/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '131', district: '桃園區', name: '文山國小1期', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 457, startDate: '2024/07/31', endDate: '2024/12/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '132', district: '桃園區', name: '文山國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 400, startDate: '2025/01/06', endDate: '2025/04/07', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '133', district: '桃園區', name: '龍山國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 23, startDate: '2023/12/12', endDate: '2023/12/18', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '134', district: '桃園區', name: '龍山國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 300, startDate: '2025/01/24', endDate: '2025/03/11', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '135', district: '桃園區', name: '同安國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 600, startDate: '2025/07/08', endDate: '2025/09/22', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '136', district: '桃園區', name: '復興非營利幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/08/25', endDate: '2025/09/17', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '137', district: '桃園區', name: '青溪國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '2025/10/31', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '138', district: '桃園區', name: '桃園市立桃園幼兒園', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 100, startDate: '2025/10/31', endDate: '2025/11/29', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '139', district: '楊梅區', name: '瑞埔國小2期', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '140', district: '楊梅區', name: '治平高中', level: '高中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '141', district: '楊梅區', name: '楊梅國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '142', district: '楊梅區', name: '楊明國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '143', district: '楊梅區', name: '瑞埔國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2024/01/31', endDate: '2024/03/11', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '144', district: '楊梅區', name: '瑞梅國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 80, startDate: '2023/07/12', endDate: '2023/08/22', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '145', district: '楊梅區', name: '瑞梅國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 23, startDate: '2023/12/20', endDate: '2023/12/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '146', district: '楊梅區', name: '瑞塘國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 90, startDate: '2024/01/15', endDate: '2024/02/19', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '147', district: '龍潭區', name: '雙龍國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '148', district: '龍潭區', name: '龍星國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 145, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '149', district: '龍潭區', name: '龍潭國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '客家事務局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '150', district: '龍潭區', name: '龍潭高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 1500, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '151', district: '龍潭區', name: '三和國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '152', district: '龍潭區', name: '高原國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/03/01', endDate: '2024/04/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '153', district: '龍潭區', name: '諾瓦國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 62, startDate: '2023/11/01', endDate: '2023/11/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '154', district: '龍潭區', name: '龍潭國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2023/07/07', endDate: '2023/08/31', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '155', district: '復興區', name: '羅浮高中', level: '高中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '156', district: '復興區', name: '羅浮國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '157', district: '復興區', name: '羅浮國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '158', district: '復興區', name: '羅浮附幼', level: '幼兒園', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 125, startDate: '2024/05/10', endDate: '2024/08/23', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '159', district: '復興區', name: '霞雲國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 400, startDate: '2025/01/15', endDate: '2025/02/26', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [projects, setProjects] = useState(INITIAL_DATA);
  const [isDirty, setIsDirty] = useState(false);
  const [filterDist, setFilterDist] = useState('All');
  const [schoolDistrictFilter, setSchoolDistrictFilter] = useState('All');
  const [tableStatusFilter, setTableStatusFilter] = useState('All'); 
  const [selectedProject, setSelectedProject] = useState(null);
  const fileInputRef = useRef(null);
  
  // --- A4 自訂列印模組 State ---
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printSelection, setPrintSelection] = useState({
    b1: false, b1_1: false, b2: false, b3: false, b4: false, b5: false, b6: false, b7: false, b8: false
  });
  
  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ty_gemini_key') || '';
    return '';
  });
  
  const [currentDate, setCurrentDate] = useState('');
  useEffect(() => {
      const today = new Date();
      const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
      setCurrentDate(formattedDate);
  }, []);

  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: '長官您好！我是桃園市通學廊道的 AI 戰情特助。我已經讀取了「各行政區的最新統計數據」，您可以問我：「目前哪個行政區完工最多？」或「桃園區的預算執行進度如何？」' }]);
  const [aiInput, setAiInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
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
    const statusPriority = { '已完工': 4, '施工中': 3, '規劃中': 2, '暫緩': 1 };
    Object.values(groups).forEach(group => {
        actualTotal++;
        let highestStatus = group[0].status;
        group.forEach(p => { if (statusPriority[p.status] > statusPriority[highestStatus]) highestStatus = p.status; });
        if (highestStatus === '已完工') actualCompleted++;
        else if (highestStatus === '施工中') actualInProgress++;
        else if (highestStatus === '規劃中') actualPlanning++;
        else if (highestStatus === '暫緩') actualPaused++;
    });
    return { actualTotal, actualCompleted, actualInProgress, actualPlanning, actualPaused };
  }, [filteredByDistrictProjects]);

  const displayProjects = useMemo(() => {
    if (tableStatusFilter === 'All') return filteredByDistrictProjects;
    return filteredByDistrictProjects.filter(p => p.status === tableStatusFilter);
  }, [filteredByDistrictProjects, tableStatusFilter]);

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

  const handleUpdateProject = (id, field, value) => { setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p)); setIsDirty(true); };
  const handleToggleExclude = (id) => { setProjects(prev => prev.map(p => p.id === id ? { ...p, isExcluded: !p.isExcluded } : p)); setIsDirty(true); };
  const handleToggleNotApproved = (id) => { setProjects(prev => prev.map(p => p.id === id ? { ...p, isNotApproved: !p.isNotApproved } : p)); setIsDirty(true); };
  const handleFeatureToggle = (id, feature) => {
    setProjects(prev => prev.map(p => { if (p.id === id) return { ...p, features: { ...p.features, [feature]: !p.features[feature] } }; return p; }));
    setIsDirty(true);
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
          isExcluded: cols[12] === 'Y', isNotApproved: cols[13] === 'Y', features: { pole: false, shelter: false, light: false, pickup: false }
        });
      }
      if (newProjects.length > 0) {
        setProjects(newProjects); setIsDirty(true); alert(`成功匯入 ${newProjects.length} 筆資料`);
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportCSV = () => {
    const headers = ['ID', '行政區', '案名', '層級', '狀態', '預算來源(大項)', '預算來源(細項)', '經費(萬)', '開工日', '完工日', '執行機關', '排程月份', '排除歸戶', '不核定'];
    const rows = projects.map(p => [ p.id, p.district, p.name, p.level, p.status, p.budgetSource1, p.budgetSource2, p.budgetAmount, p.startDate, p.endDate, p.agency, p.scheduleMonth, p.isExcluded ? 'Y' : 'N', p.isNotApproved ? 'Y' : 'N' ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement("a"); link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "桃園通學廊道資料庫_匯出.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportWord = () => {
    const centralProjects = projects.filter(p => p.budgetSource1 === '中央補助' && !p.isNotApproved);
    const nlmaCases = centralProjects.filter(p => p.budgetSource2 === '國土署');
    const motcCases = centralProjects.filter(p => p.budgetSource2 === '公路局');
    const scheduleMonths = Array.from({length: 12}, (_, i) => i + 1);

    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>桃園市通學廊道戰情儀錶板報表</title>
        <style>
          @page WordSection1 { size: 595.3pt 841.9pt; margin: 2.0cm 2.0cm 2.0cm 2.0cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; mso-paper-source: 0; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif; font-size: 11pt; color: #333; line-height: 1.5; }
          h1 { color: #E83888; text-align: center; font-size: 20pt; margin-bottom: 20px; font-weight: bold; }
          h2 { color: #00B2E5; font-size: 14pt; border-bottom: 2px solid #00B2E5; padding-bottom: 5px; margin-top: 25px; page-break-after: avoid; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: middle; }
          th { background-color: #f2f2f2; font-weight: bold; color: #000; }
          .highlight { color: #d9534f; font-weight: bold; }
          ul { margin-top: 5px; } li { margin-bottom: 5px; }
          .text-center { text-align: center; } .text-right { text-align: right; }
        </style>
      </head><body><div class='WordSection1'>
    `;
    let content = `<h1>桃園市通學廊道專案進度報告</h1><p style="text-align: right; color: #666;">產出日期：${currentDate}</p>`;
    content += `<h2>一、戰情儀錶板核心數據</h2><table><tr><th>指標</th><th>帳面數值</th><th>實際歸戶數值 (扣除重複案/排除案)</th></tr>
        <tr><td>總錄案</td><td>${kpis.total} 所</td><td class="highlight">${kpis.actualTotal} 所</td></tr>
        <tr><td>已完工</td><td>${kpis.completed} 所</td><td>${kpis.actualCompleted} 所</td></tr>
        <tr><td>施工中</td><td>${kpis.inProgress} 所</td><td>${kpis.actualInProgress} 所</td></tr>
        <tr><td>規劃中</td><td>${kpis.planning} 所</td><td>${kpis.actualPlanning} 所</td></tr>
        <tr><td>總預算規模</td><td colspan="2" class="highlight">${kpis.totalBudget.toLocaleString()} 萬元</td></tr></table>`;
    content += `<h2>二、中央補助案概況 (已扣除不核定案件)</h2><ul>
        <li><strong>國土署：</strong>共計 ${nlmaCases.length} 案，總經費 ${nlmaCases.reduce((s,p)=>s+(Number(p.budgetAmount)||0),0).toLocaleString()} 萬元。</li>
        <li><strong>交通部公路局：</strong>共計 ${motcCases.length} 案，總經費 ${motcCases.reduce((s,p)=>s+(Number(p.budgetAmount)||0),0).toLocaleString()} 萬元。</li></ul>
      <table><tr><th width="15%">行政區</th><th width="35%">案名</th><th width="20%">補助單位</th><th width="15%">經費(萬)</th><th width="15%">狀態</th></tr>
        ${centralProjects.map(p => `<tr><td class="text-center">${p.district}</td><td>${p.name}</td><td class="text-center">${p.budgetSource2}</td><td class="text-right">${Number(p.budgetAmount).toLocaleString()}</td><td class="text-center">${p.status}</td></tr>`).join('')}</table>`;
    const validSchools = processedProjects.filter(p => !p.isExcluded);
    content += `<h2>三、學校總表 (實際納入計算清單)</h2><table><tr><th width="10%">項次</th><th width="15%">行政區</th><th width="35%">案名</th><th width="15%">狀態</th><th width="15%">經費(萬)</th></tr>
        ${validSchools.map(p => `<tr><td class="text-center">${p.itemNumber}</td><td class="text-center">${p.district}</td><td>${p.name}</td><td class="text-center">${p.status}</td><td class="text-right">${Number(p.budgetAmount).toLocaleString()}</td></tr>`).join('')}</table>`;
    const scheduledProjects = projects.filter(p => p.scheduleMonth);
    content += `<h2>四、115年度施工排程</h2><table><tr><th width="15%">月份</th><th>預計進場案件</th></tr>
        ${scheduleMonths.map(m => {
          const mProjs = scheduledProjects.filter(p => p.scheduleMonth === String(m));
          return `<tr><td class="text-center" style="font-weight:bold;">${m} 月</td><td>${mProjs.length > 0 ? mProjs.map(p => `[${p.district}] ${p.name}`).join('、 ') : '尚無排程'}</td></tr>`;
        }).join('')}</table>`;

    const footer = `</div></body></html>`;
    const blob = new Blob(['\ufeff', header + content + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `桃園市通學廊道報表_${currentDate}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const saveChanges = () => { setIsDirty(false); alert('變更已儲存 (測試版僅儲存於記憶體，請使用匯出備份)'); };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    const newMessages = [...aiMessages, { role: 'user', content: userMsg }];
    setAiMessages(newMessages); setAiInput(''); setIsAILoading(true);

    try {
        const activeKey = userApiKey;
        if (!activeKey) {
             setAiMessages([...newMessages, { role: 'ai', content: '⚠️ 尚未偵測到 API Key。請先前往左側選單的「系統：報表匯出與設定」頁面，輸入您的 Gemini API Key 才能喚醒我喔！' }]);
             setIsAILoading(false); return;
        }
        
        // 將行政區統計資料打包餵給 AI，擴充它的情境知識 (RAG 架構)
        const districtContext = kpis.districtCards.filter(d => d.name !== '全市總計').map(d => 
            `- ${d.name}: 實際歸戶 ${d.actualTotal} 所 (完工 ${d.actualCompleted}, 施工 ${d.actualInProgress}, 規劃 ${d.actualPlanning}, 暫緩 ${d.actualPaused}), 總經費 ${d.totalBudget.toLocaleString()} 萬`
        ).join('\n');

        const systemPrompt = `你是一位專業的「桃園市通學廊道AI戰情特助」。請以繁體中文、專業且具有法人幕僚風格的語氣回答。
【當前戰情室資料 Context】
- 總立案數：${kpis.total} 案
- 總預算金額：${kpis.totalBudget.toLocaleString()} 萬元
- 已完工：${kpis.completed} 案 (已完工金額: ${kpis.completedBudget.toLocaleString()} 萬元)
- 施工中：${kpis.inProgress} 案 (施工中金額: ${kpis.inProgressBudget.toLocaleString()} 萬元)
- 規劃中：${kpis.planning} 案
- 全市實際歸戶學校數：${kpis.actualTotal} 所

【各行政區實際歸戶進度與經費】
${districtContext}

請根據以上資料精準回答使用者的問題，若使用者詢問特定區域的進度或花費，請從上述「各行政區實際歸戶進度」中提取數據作答。若超出此資料範圍，請誠實說明系統尚未載入該數據。`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: userMsg }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message || "API 連線錯誤");
        setAiMessages([...newMessages, { role: 'ai', content: data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，系統目前忙碌中，請稍後再試。" }]);
    } catch (error) {
        setAiMessages([...newMessages, { role: 'ai', content: `🚨 連線發生異常。請檢查網路狀態，或確認 API Key 是否正確。\n(錯誤代碼: ${error.message})` }]);
    } finally { setIsAILoading(false); }
  };

  // --- 列印模組前置設定：打開彈窗並智慧預選 ---
  const openPrintConfig = () => {
      setPrintSelection({
          b1: activeTab === 'dashboard',
          b1_1: activeTab === 'dashboard',
          b2: activeTab === 'dashboard',
          b3: activeTab === 'dashboard',
          b4: activeTab === 'central',
          b5: activeTab === 'central',
          b6: activeTab === 'schools',
          b7: activeTab === 'schools',
          b8: activeTab === 'schedule',
      });
      setIsPrintModalOpen(true);
  };

  // ==========================================
  // 螢幕與列印共用的 JSX 區塊 (模組化拆解)
  // ==========================================
  
  // [1] 錄案與經費概況總覽 (上方 6 格)
  const Block1_Overview = () => (
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

  // [1-1] 實際學校數量統計 (下方 5 格)
  const Block1_1_ActualStats = () => (
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

  // [2] 預算來源分析圓餅圖
  const Block2_PieCharts = () => (
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

  // [3] 行政區進度與經費卡片
  const Block3_DistrictCards = () => (
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

  // [4] 中央補助案統計概況
  const Block4_CentralStats = () => {
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

  // [5] 中央補助案清單
  const Block5_CentralTable = () => {
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
                        <ResizableTh minW="200px">亮點指標</ResizableTh>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map(p => (
                        <tr key={p.id} className={`border-b transition-colors print-avoid-break ${p.isNotApproved ? 'bg-gray-50 opacity-60 print-hide' : 'hover:bg-blue-50'}`}>
                        <td className="p-3 border text-center screen-only" onClick={() => handleToggleNotApproved(p.id)}><div className="flex justify-center cursor-pointer">{p.isNotApproved ? <CheckSquare className="w-6 h-6 text-red-500 drop-shadow-md"/> : <Square className="w-6 h-6 text-gray-300"/>}</div></td>
                        <td className="p-3 border font-medium text-gray-700 text-center">{p.district}</td><td className={`p-3 border font-bold ${p.isNotApproved ? 'line-through text-gray-500' : 'text-blue-800'}`}>{p.name}</td><td className="p-3 border text-center">{p.budgetSource2}</td><td className={`p-3 border text-right font-mono font-bold ${p.isNotApproved ? 'text-gray-500' : 'text-pink-600'}`}>{p.budgetAmount.toLocaleString()}</td>
                        <td className="p-3 border text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === '已完工' ? 'bg-green-100 text-green-700 print-bg-green-100 print-text-green-700' : p.status === '施工中' ? 'bg-blue-100 text-blue-700 print-bg-blue-100 print-text-blue-700' : 'bg-gray-200 print-bg-gray-200'}`}>{p.status}</span></td>
                        <td className="p-3 border"><div className="flex space-x-3 opacity-90"><span className="text-xs">{p.features?.pole ? '☑' : '☐'} 電桿</span><span className="text-xs">{p.features?.shelter ? '☑' : '☐'} 候車亭</span><span className="text-xs">{p.features?.light ? '☑' : '☐'} 雙色溫</span><span className="text-xs">{p.features?.pickup ? '☑' : '☐'} 接送區</span></div></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
      );
  };

  // [6] 學校狀態統計卡片
  const Block6_SchoolStats = () => (
      <div className="mb-6 print-avoid-break">
        <h2 className="text-lg font-bold mb-3 border-l-4 pl-2" style={{ borderColor: COLORS.warmYellow }}>[6] 學校總表過濾統計 ({schoolDistrictFilter === 'All' ? '全市' : schoolDistrictFilter})</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print-grid-cols-5">
            <div onClick={() => setTableStatusFilter('All')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === 'All' ? 'bg-gray-800 text-white border-gray-900 print-bg-gray-800 print-text-white' : 'bg-gray-100 text-gray-600 border-transparent print-bg-gray-100'}`}><div className="text-xs opacity-80 font-medium mb-1">錄案總數</div><div className="text-2xl font-black">{tableStats.actualTotal}</div></div>
            <div onClick={() => setTableStatusFilter('已完工')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '已完工' ? 'bg-green-600 text-white border-green-700 print-bg-green-600 print-text-white' : 'bg-green-50 text-green-800 border-green-200 print-bg-green-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際完工</div><div className="text-2xl font-black">{tableStats.actualCompleted}</div></div>
            <div onClick={() => setTableStatusFilter('施工中')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '施工中' ? 'bg-blue-600 text-white border-blue-700 print-bg-blue-600 print-text-white' : 'bg-blue-50 text-blue-800 border-blue-200 print-bg-blue-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際施工</div><div className="text-2xl font-black">{tableStats.actualInProgress}</div></div>
            <div onClick={() => setTableStatusFilter('規劃中')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '規劃中' ? 'bg-yellow-500 text-white border-yellow-600 print-bg-yellow-500 print-text-white' : 'bg-yellow-50 text-yellow-800 border-yellow-200 print-bg-yellow-50'}`}><div className="text-xs opacity-90 font-bold mb-1">實際規劃</div><div className="text-2xl font-black">{tableStats.actualPlanning}</div></div>
            <div onClick={() => setTableStatusFilter('暫緩')} className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all border-2 ${tableStatusFilter === '暫緩' ? 'bg-gray-500 text-white border-gray-600 print-bg-gray-500 print-text-white' : 'bg-gray-100 text-gray-700 border-gray-300 print-bg-gray-100'}`}><div className="text-xs opacity-90 font-bold mb-1">實際暫緩</div><div className="text-2xl font-black">{tableStats.actualPaused}</div></div>
        </div>
      </div>
  );

  // [7] 學校總表清單 (支援雙向捲軸與欄位自適應縮放)
  const Block7_SchoolTable = () => (
      <div className="flex-1 flex flex-col min-h-0 mb-2">
        <h2 className="text-lg font-bold mb-3 border-l-4 pl-2 flex-shrink-0" style={{ borderColor: COLORS.warmYellow }}>[7] 學校總表清單明細 (顯示 {displayProjects.length} 筆)</h2>
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
                        <ResizableTh minW="120px" className="text-center text-blue-600">進場日期</ResizableTh>
                        <ResizableTh minW="120px" className="text-center text-green-600">完工日期</ResizableTh>
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
                            <td className="p-2 border-b font-medium text-blue-600 screen-only cursor-pointer hover:underline" onClick={() => setSelectedProject(p)}>{p.name} {isDuplicateName(p.name) && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded inline-block">重複案</span>}</td>
                            <td className="p-2 border-b font-medium text-blue-800 print-only hidden">{p.name} {isDuplicateName(p.name) && <span className="ml-1 text-[10px] text-red-600">(重複案)</span>}</td>
                            <td className="p-2 border-b text-center"><span className={p.status === '已完工' ? 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded print-bg-green-50' : p.status === '暫緩' ? 'text-gray-400' : ''}>{p.status}</span></td>
                            <td className="p-2 border-b text-center text-gray-600 font-mono tracking-tighter">{p.startDate || '-'}</td>
                            <td className="p-2 border-b text-center text-gray-600 font-mono tracking-tighter">{p.endDate || '-'}</td>
                            <td className="p-2 border-b text-center">{p.budgetSource1}</td>
                            <td className="p-2 border-b text-xs text-gray-500 text-center">{p.budgetSource2}</td>
                            <td className="p-2 border-b text-right font-mono font-bold text-gray-700">{p.budgetAmount.toLocaleString()}</td>
                            <td className="p-2 border-b text-xs text-gray-600 text-center">{p.agency}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
  );

  // [8] 115年排程看板與數據
  const Block8_Schedule = () => {
     const months = Array.from({length: 12}, (_, i) => i + 1);
     const scheduledProjects = projects.filter(p => p.scheduleMonth);
     const unscheduledProjects = projects.filter(p => !p.scheduleMonth && p.status !== '已完工' && p.status !== '暫緩' && !p.isExcluded);
     
     const targetCount = 120;
     const actualCompleted = kpis.actualCompleted;
     const progressPercent = Math.min(100, Math.round((actualCompleted / targetCount) * 100));

     return (
        <div className="mb-6 print-avoid-break">
            <h2 className="text-lg font-bold mb-3 border-l-4 pl-2" style={{ borderColor: COLORS.ecoGreen }}>[8] 115年度施工排程看板</h2>
            
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
                <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm print-border">
                    <div className="text-sm text-gray-500 font-bold mb-1">排程口袋名單 (待指派月份)</div>
                    <div className="flex items-end justify-between">
                        <div className="text-3xl font-black text-teal-600">{unscheduledProjects.length} <span className="text-lg text-gray-400 font-normal">案</span></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">系統將自動扣除已完工、暫緩或已排程之案件</p>
                </div>
            </div>

            <div className="flex overflow-x-auto p-4 space-x-4 border rounded bg-gray-50 print-table-wrapper print-flex-wrap">
                {months.map(month => {
                    const mProjects = scheduledProjects.filter(p => p.scheduleMonth === String(month));
                    return (
                        <div key={month} className="w-64 flex-shrink-0 bg-white border rounded-lg shadow-sm flex flex-col mb-4 print-w-1/4 print-m-2 print-avoid-break">
                            <div className="bg-teal-500 p-2 rounded-t-lg text-white font-bold text-center print-bg-teal-500 print-text-white">115年 {month}月</div>
                            <div className="p-2 flex-1 space-y-2 min-h-[150px] bg-white">
                                {mProjects.map(p => (
                                    <div key={p.id} className="p-2 border border-teal-100 rounded text-sm relative shadow-sm">
                                        <div className="font-bold text-teal-800">{p.name}</div><div className="text-xs text-gray-500">{p.district}</div>
                                    </div>
                                ))}
                                {mProjects.length === 0 && <div className="text-xs text-center text-gray-400 mt-4">尚無排程</div>}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
     );
  }

  // ==========================================
  // 分頁畫面 Render 函數
  // ==========================================

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      <Block1_Overview />
      <Block1_1_ActualStats />
      <Block2_PieCharts />
      <Block3_DistrictCards />
    </div>
  );

  const renderCentral = () => (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-fade-in h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b pb-4 flex-shrink-0">
            <div><h2 className="text-xl font-bold flex items-center" style={{ color: COLORS.techBlue }}><Building2 className="w-6 h-6 mr-2"/> 中央補助專案管理</h2><p className="text-sm text-gray-500 mt-1">勾選「不核定」將自動自上方統計與預算中扣除。</p></div>
            <select className="border-2 border-blue-200 p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-300" value={filterDist} onChange={e => setFilterDist(e.target.value)}><option value="All">所有行政區篩選</option>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select>
        </div>
        <Block4_CentralStats />
        <Block5_CentralTable />
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
        <Block6_SchoolStats />
        <Block7_SchoolTable />

        {selectedProject && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in screen-only">
                <div className="bg-white w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg flex items-center"><Building2 className="mr-2"/> 個案詳細資訊卡</h3><button onClick={() => setSelectedProject(null)} className="text-white hover:text-gray-200 transition-transform hover:scale-110"><X className="w-6 h-6" /></button></div>
                    <div className="p-6 overflow-y-auto flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs text-gray-500 mb-1">案名(學校)</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.name} onChange={e => handleUpdateProject(selectedProject.id, 'name', e.target.value)} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">Google定位</label><a href={`https://www.google.com/maps/search/?api=1&query=${selectedProject.district}${selectedProject.name}`} target="_blank" rel="noreferrer" className="flex items-center justify-center h-[42px] text-blue-500 border p-2 rounded hover:bg-blue-50 transition-colors font-bold"><MapPin className="w-4 h-4 mr-2"/> 開啟地圖搜尋</a></div>
                            <div><label className="block text-xs text-gray-500 mb-1">行政區</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.district} onChange={e => handleUpdateProject(selectedProject.id, 'district', e.target.value)}>{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1">層級</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.level} onChange={e => handleUpdateProject(selectedProject.id, 'level', e.target.value)}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                             <div><label className="block text-xs text-gray-500 mb-1">執行狀態</label><select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-bold text-blue-700" value={selectedProject.status} onChange={e => handleUpdateProject(selectedProject.id, 'status', e.target.value)}>{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <div><label className="block text-xs text-gray-500 mb-1">機關</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.agency} onChange={e => handleUpdateProject(selectedProject.id, 'agency', e.target.value)} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">進場日期</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" placeholder="YYYY/MM/DD" value={selectedProject.startDate} onChange={e => handleUpdateProject(selectedProject.id, 'startDate', e.target.value)} /></div>
                            <div><label className="block text-xs text-gray-500 mb-1">完工日期</label><input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" placeholder="YYYY/MM/DD" value={selectedProject.endDate} onChange={e => handleUpdateProject(selectedProject.id, 'endDate', e.target.value)} /></div>
                        </div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">預算來源</label>
                                <select className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-bold" value={selectedProject.budgetSource1} onChange={e => handleUpdateProject(selectedProject.id, 'budgetSource1', e.target.value)}><option value="">選擇來源</option><option value="市府預算">市府預算</option><option value="中央補助">中央補助</option></select>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.budgetSource2} onChange={e => handleUpdateProject(selectedProject.id, 'budgetSource2', e.target.value)}>
                                     <option value="">細項(公務/國土/公路等)</option>
                                    {selectedProject.budgetSource1 === '市府預算' ? (<><option value="公務預算">公務預算</option><option value="道路基金">道路基金</option><option value="其他基金">其他基金</option><option value="統籌分配">統籌分配</option></>) : (<><option value="國土署">國土署</option><option value="公路局">公路局</option></>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">總經費(萬元)</label>
                                <input type="number" className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-mono font-bold text-pink-600" value={selectedProject.budgetAmount} onChange={e => handleUpdateProject(selectedProject.id, 'budgetAmount', Number(e.target.value))} />
                                <div className="border-2 border-dashed border-pink-200 rounded-lg p-4 flex flex-col items-center justify-center text-pink-400 cursor-pointer hover:bg-pink-50 hover:border-pink-400 transition-colors"><ImageIcon className="w-6 h-6 mb-1"/><span className="text-xs font-bold">上傳現況照片</span></div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end"><button className="px-6 py-2 bg-pink-500 text-white font-bold rounded-lg shadow-md hover:bg-pink-600 hover:shadow-lg transition-all" onClick={() => setSelectedProject(null)}>完成儲存</button></div>
                </div>
            </div>
        )}
      </div>
  );

  const renderSchedule = () => {
     const months = Array.from({length: 12}, (_, i) => i + 1);
     const unscheduledProjects = projects.filter(p => !p.scheduleMonth && p.status !== '已完工' && p.status !== '暫緩' && !p.isExcluded);

     return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in">
            <Block8_Schedule />
            <div className="flex-1 overflow-hidden border rounded bg-gray-50 flex mt-4">
                <div className="w-1/3 min-w-[350px] max-w-[450px] bg-white border-r p-4 flex flex-col shadow-inner">
                    <h3 className="font-bold text-gray-600 mb-3 border-b pb-2 flex items-center justify-between flex-shrink-0">
                        <span>待排程清單</span>
                        <span className="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full">{unscheduledProjects.length} 案</span>
                    </h3>
                    <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                        {unscheduledProjects.map(p => (
                            <div key={p.id} className="p-3 border rounded-lg bg-gray-50 text-sm hover:shadow-md transition border-l-4 border-l-teal-400">
                                <div className="font-bold text-gray-800 text-base">{p.name} <span className="text-xs text-gray-500 font-normal bg-gray-200 px-1.5 py-0.5 rounded ml-1">{p.status}</span></div>
                                <div className="text-sm text-gray-500 flex justify-between mt-3 items-center">
                                    <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {p.district}</span>
                                    <select className="border border-teal-300 rounded bg-white p-1.5 text-teal-700 font-bold focus:ring-2 focus:ring-teal-500 outline-none shadow-sm cursor-pointer" value="" onChange={(e) => handleUpdateProject(p.id, 'scheduleMonth', e.target.value)}><option value="">指派進場月份 ▾</option>{months.map(m => <option key={m} value={m}>{m}月排程</option>)}</select>
                                </div>
                            </div>
                        ))}
                        {unscheduledProjects.length === 0 && <div className="text-center text-gray-400 py-10">所有案件皆已排程完畢</div>}
                    </div>
                </div>
                <div className="flex-1 bg-gray-100/50 flex flex-col items-center justify-center text-gray-400 text-sm">
                    <Calendar className="w-16 h-16 text-gray-300 mb-4" />
                    請在左側清單為案件指派月份，資料將自動更新至上方看板。
                </div>
            </div>
        </div>
     );
  }

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
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
                <div className="border border-blue-200 bg-blue-50 p-6 rounded-lg text-center hover:shadow-md transition"><Download className="w-12 h-12 text-blue-500 mx-auto mb-4"/><h3 className="font-bold text-blue-800 mb-2">1. 下載資料備份</h3><p className="text-xs text-blue-600 mb-4">將目前的資料庫匯出為 CSV 檔。</p><button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 w-full font-bold">匯出 CSV</button></div>
                <div className="border border-green-200 bg-green-50 p-6 rounded-lg text-center hover:shadow-md transition"><Upload className="w-12 h-12 text-green-500 mx-auto mb-4"/><h3 className="font-bold text-green-800 mb-2">2. 匯入更新系統</h3><p className="text-xs text-green-600 mb-4">上傳已編輯好的 CSV 覆蓋當前資料。</p><input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" /><button onClick={() => fileInputRef.current.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 w-full font-bold">選擇 CSV 匯入</button></div>
                <div className="border border-pink-200 bg-pink-50 p-6 rounded-lg text-center hover:shadow-md transition relative"><FileText className="w-12 h-12 text-pink-500 mx-auto mb-4"/><h3 className="font-bold text-pink-800 mb-2">3. 純文字報表</h3><p className="text-xs text-pink-600 mb-4">產生以文字為主的 Word 檔。</p><button onClick={exportWord} className="bg-pink-600 text-white px-4 py-2 rounded shadow hover:bg-pink-700 w-full font-bold flex items-center justify-center"><FileText className="w-4 h-4 mr-2"/> 匯出 Word (.doc)</button></div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm text-center border border-gray-200">
            <h2 className="text-lg font-bold mb-4">儲存暫存變更</h2>
            <button onClick={saveChanges} disabled={!isDirty} className={`px-8 py-3 rounded font-bold shadow-lg flex items-center justify-center mx-auto transition-all ${isDirty ? 'bg-pink-600 text-white hover:bg-pink-700 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}><Save className="w-5 h-5 mr-2" /> {isDirty ? '儲存變更' : '目前無變更'}</button>
        </div>
    </div>
  );

  return (
    <>
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 relative screen-only overflow-hidden">
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
            <div className="flex items-center space-x-4">
                {isDirty && <span className="flex items-center text-sm text-yellow-600 font-bold animate-pulse"><AlertCircle className="w-4 h-4 mr-1"/> 有未儲存的變更</span>}
                <button onClick={openPrintConfig} className="flex items-center bg-gray-800 text-white px-3 py-1.5 rounded-lg shadow hover:bg-gray-700 transition-colors text-sm font-bold shadow-gray-500/50">
                    <Printer className="w-4 h-4 mr-2"/> 匯出 A4 視覺報表
                </button>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200 shadow-inner">工</div>
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
            <div className="w-80 h-[450px] bg-white rounded-xl shadow-2xl border border-pink-100 mb-4 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center font-bold"><MessageCircle className="w-5 h-5 mr-2" /> AI 戰情特助</div>
                    <button onClick={() => setIsAIOpen(false)} className="hover:text-pink-200 transition-colors"><X className="w-5 h-5" /></button>
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
                    <button className={`ml-2 p-2 rounded-full ${aiInput.trim() && !isAILoading && userApiKey ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} transition-colors`} onClick={handleAiSubmit} disabled={!aiInput.trim() || isAILoading || !userApiKey}><Send className="w-4 h-4" /></button>
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
                         <label className="flex items-center space-x-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2"><input type="checkbox" className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500" checked={printSelection.b8} onChange={e=>setPrintSelection({...printSelection, b8: e.target.checked})} /><span>[8] 115年度施工排程看板與月份圖表</span></label>
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
    {/* 【列印專用版面區塊】 */}
    {/* ========================================== */}
    <div className="print-only text-black font-sans bg-white print-content-reset">
        <div className="text-center pb-4 mb-6 border-b-2 border-gray-800">
            <h1 className="text-3xl font-black tracking-widest text-gray-900 mb-2">桃園市通學廊道戰情報告</h1>
            <p className="text-sm text-gray-600 font-bold">資料統計日期：{currentDate}</p>
        </div>

        {printSelection.b1 && <Block1_Overview />}
        {printSelection.b1_1 && <Block1_1_ActualStats />}
        {printSelection.b2 && <Block2_PieCharts />}
        {printSelection.b3 && <Block3_DistrictCards />}
        {printSelection.b4 && <Block4_CentralStats />}
        {printSelection.b5 && <Block5_CentralTable />}
        {printSelection.b6 && <Block6_SchoolStats />}
        {printSelection.b7 && <Block7_SchoolTable />}
        {printSelection.b8 && <Block8_Schedule />}

        {!Object.values(printSelection).some(Boolean) && (
            <div className="text-center text-gray-400 py-20 border-2 border-dashed border-gray-200">
                您沒有勾選任何區塊，請返回網頁重新設定。
            </div>
        )}
        
        <div className="mt-8 pt-4 border-t text-right text-xs text-gray-400 font-mono">
            Generated by Taoyuan Corridor Dashboard System
        </div>
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
                margin: 2cm;       /* 要求：上下左右 2cm 邊界 */
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