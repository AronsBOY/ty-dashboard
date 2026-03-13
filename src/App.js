import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LayoutDashboard, Building2, Calendar, Database, Download, Upload, Save, MapPin, Image as ImageIcon, Search, AlertCircle, Edit, CheckSquare, Square, Check, MessageCircle, X, Send, Filter, FileText, Clock, History } from 'lucide-react';

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
  { date: '2026-03-13', version: 'v1.4.0', notes: ['新增即時日期顯示', '新增系統更新日誌區塊', '優化介面排版'] },
  { date: '2026-03-12', version: 'v1.3.0', notes: ['新增 A4 Word 匯出功能', '實作羅浮學區跨層級整併邏輯'] },
  { date: '2026-03-11', version: 'v1.2.0', notes: ['實作學校總表動態過濾卡片', '新增中央補助案不核定排除機制'] },
  { date: '2026-03-10', version: 'v1.1.0', notes: ['新增項次自動編碼 (區分主案與衍生案)', '新增手動排除歸戶機制', '整合 AI 戰情特助 (Gemini API)'] },
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
  if (name.includes('羅浮')) return '羅浮學區'; // 將羅浮各級學校整併為同一學區
  return name.replace(/[1-3](期|\.0)/g, '').replace(/(\(.*\))/g, '').trim();
};

const isDuplicateName = (name) => {
    if (name.includes('羅浮') && !name.includes('高中')) return true; // 將羅浮高中視為主案，其餘為衍生案
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

// --- 由文本解析匯入之完整資料庫 (共159筆) ---
const INITIAL_DATA = [
  // 【中壢區】
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
  // 【八德區】
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
  // 【平鎮區】
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
  // 【大園區】
  { id: '47', district: '大園區', name: '大園國際高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 200, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '48', district: '大園區', name: '溪海國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '2026/06/01', endDate: '', agency: '交通局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '49', district: '大園區', name: '大園國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1470, startDate: '2023/08/18', endDate: '2023/11/22', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '50', district: '大園區', name: '五權國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 197, startDate: '2023/10/25', endDate: '2023/12/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '51', district: '大園區', name: '大園國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 4.5, startDate: '2024/03/15', endDate: '2024/04/05', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  // 【觀音區】
  { id: '52', district: '觀音區', name: '觀音國中', level: '國中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '53', district: '觀音區', name: '草漯國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 749, startDate: '2024/03/04', endDate: '2024/10/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '54', district: '觀音區', name: '育仁國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 106, startDate: '2023/11/10', endDate: '2024/03/12', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '55', district: '觀音區', name: '觀音國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 1758, startDate: '2022/07/16', endDate: '2022/12/27', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '56', district: '觀音區', name: '新坡國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/07/17', endDate: '2024/12/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  // 【龜山區】
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
  // 【蘆竹區】
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
  // 【大溪區】
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
  // 【新屋區】
  { id: '106', district: '新屋區', name: '埔頂國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 500, startDate: '2026/06/01', endDate: '2027/01/01', agency: '用地科', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '107', district: '新屋區', name: '大坡國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2023/11/28', endDate: '2024/05/09', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '108', district: '新屋區', name: '北湖國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 250, startDate: '2024/05/15', endDate: '2024/07/01', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '109', district: '新屋區', name: '永安國中', level: '國中', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 320, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '110', district: '新屋區', name: '永安國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 470, startDate: '2024/07/15', endDate: '2025/04/15', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '111', district: '新屋區', name: '東明國小', level: '國小', status: '已完工', budgetSource1: '中央補助', budgetSource2: '公路局', budgetAmount: 920, startDate: '2024/07/15', endDate: '2025/06/04', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  // 【桃園區】
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
  // 【楊梅區】
  { id: '139', district: '楊梅區', name: '瑞埔國小2期', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '140', district: '楊梅區', name: '治平高中', level: '高中', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '141', district: '楊梅區', name: '楊梅國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 300, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '142', district: '楊梅區', name: '楊明國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '143', district: '楊梅區', name: '瑞埔國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2024/01/31', endDate: '2024/03/11', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '144', district: '楊梅區', name: '瑞梅國小1期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 80, startDate: '2023/07/12', endDate: '2023/08/22', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '145', district: '楊梅區', name: '瑞梅國小2期', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 23, startDate: '2023/12/20', endDate: '2023/12/31', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '146', district: '楊梅區', name: '瑞塘國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 90, startDate: '2024/01/15', endDate: '2024/02/19', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  // 【龍潭區】
  { id: '147', district: '龍潭區', name: '雙龍國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 2000, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '148', district: '龍潭區', name: '龍星國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 145, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '149', district: '龍潭區', name: '龍潭國小', level: '國小', status: '規劃中', budgetSource1: '中央補助', budgetSource2: '國土署', budgetAmount: 1500, startDate: '', endDate: '', agency: '客家事務局', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '150', district: '龍潭區', name: '龍潭高中', level: '高中', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 1500, startDate: '2026/03/16', endDate: '2026/08/08', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '151', district: '龍潭區', name: '三和國小', level: '國小', status: '規劃中', budgetSource1: '市府預算', budgetSource2: '公務預算', budgetAmount: 0, startDate: '', endDate: '', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '152', district: '龍潭區', name: '高原國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 250, startDate: '2024/03/01', endDate: '2024/04/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '153', district: '龍潭區', name: '諾瓦國小', level: '國小', status: '已完工', budgetSource1: '市府預算', budgetSource2: '統籌分配', budgetAmount: 62, startDate: '2023/11/01', endDate: '2023/11/30', agency: '養工處', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  { id: '154', district: '龍潭區', name: '龍潭國中', level: '國中', status: '已完工', budgetSource1: '市府預算', budgetSource2: '其他基金', budgetAmount: 200, startDate: '2023/07/07', endDate: '2023/08/31', agency: '區公所', features: { pole: false, shelter: false, light: false, pickup: false }, scheduleMonth: '', isExcluded: false, isNotApproved: false },
  // 【復興區】
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
  const [tableStatusFilter, setTableStatusFilter] = useState('All'); // 新增: 狀態下鑽過濾器
  const [selectedProject, setSelectedProject] = useState(null);
  const fileInputRef = useRef(null);
  
  // 取得即時日期
  const [currentDate, setCurrentDate] = useState('');
  useEffect(() => {
      const today = new Date();
      const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
      setCurrentDate(formattedDate);
  }, []);

  // AI 助理相關 State
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([{ role: 'ai', content: '您好！我是桃園市通學廊道的AI戰情特助。我可以根據目前的儀錶板數據回答您的問題，例如：「目前完工比例是多少？」、「總經費花了多少？」' }]);
  const [aiInput, setAiInput] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const aiChatEndRef = useRef(null);

  // 自動捲動 AI 對話視窗
  useEffect(() => {
    if (aiChatEndRef.current) aiChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  // --- 計算：動態處理「項次」邏輯 ---
  const processedProjects = useMemo(() => {
    let currentIndex = 1;
    const groupMap = {};

    projects.forEach(p => {
        const base = getBaseName(p.name);
        if (!groupMap[base]) {
            groupMap[base] = { primaryIdx: currentIndex++, currentSubIdx: 0, totalInstances: 0 };
        }
        groupMap[base].totalInstances++;
    });

    return projects.map(p => {
        const base = getBaseName(p.name);
        const groupInfo = groupMap[base];
        groupInfo.currentSubIdx++;
        
        const itemNumber = groupInfo.totalInstances > 1 
            ? `${groupInfo.primaryIdx}-${groupInfo.currentSubIdx}` 
            : `${groupInfo.primaryIdx}`;

        return { ...p, itemNumber };
    });
  }, [projects]);


  // --- 計算：過濾後的表格資料與其專屬「實際狀態」統計 ---
  const filteredByDistrictProjects = useMemo(() => {
    return schoolDistrictFilter === 'All' 
        ? processedProjects 
        : processedProjects.filter(p => p.district === schoolDistrictFilter);
  }, [processedProjects, schoolDistrictFilter]);

  // 計算頂部卡片的實際統計數據 (排除已勾選為 isExcluded 的專案)
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
        
        group.forEach(p => {
            if (statusPriority[p.status] > statusPriority[highestStatus]) {
                highestStatus = p.status;
            }
        });

        if (highestStatus === '已完工') actualCompleted++;
        else if (highestStatus === '施工中') actualInProgress++;
        else if (highestStatus === '規劃中') actualPlanning++;
        else if (highestStatus === '暫緩') actualPaused++;
    });

    return { actualTotal, actualCompleted, actualInProgress, actualPlanning, actualPaused };
  }, [filteredByDistrictProjects]);

  // 根據使用者在上方卡片點擊的狀態進行過濾
  const displayProjects = useMemo(() => {
    if (tableStatusFilter === 'All') return filteredByDistrictProjects;
    return filteredByDistrictProjects.filter(p => p.status === tableStatusFilter);
  }, [filteredByDistrictProjects, tableStatusFilter]);

  // --- 計算指標 (KPIs) ---
  const kpis = useMemo(() => {
    let total = projects.length;
    let completed = 0, inProgress = 0, planning = 0, paused = 0, duplicatedCount = 0;
    
    let totalBudget = 0;
    let completedBudget = 0;
    let inProgressBudget = 0;

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
              if (statusPriority[p.status] > statusPriority[highestStatus]) {
                  highestStatus = p.status;
              }
          });

          dTotalBudget += groupBudget;

          if (highestStatus === '已完工') { actualCompleted++; dCompletedBudget += groupBudget; }
          else if (highestStatus === '施工中') { actualInProgress++; dInProgressBudget += groupBudget; }
          else if (highestStatus === '規劃中') { actualPlanning++; dPlanningBudget += groupBudget; }
          else if (highestStatus === '暫緩') { actualPaused++; dPausedBudget += groupBudget; }
      });

      return {
          name: dist,
          actualTotal, totalBudget: dTotalBudget,
          actualCompleted, completedBudget: dCompletedBudget,
          actualInProgress, inProgressBudget: dInProgressBudget,
          actualPlanning, planningBudget: dPlanningBudget,
          actualPaused, pausedBudget: dPausedBudget
      };
    });

    const cityTotalCard = districtStats.reduce((acc, curr) => ({
        name: '全市總計',
        actualTotal: acc.actualTotal + curr.actualTotal,
        totalBudget: acc.totalBudget + curr.totalBudget,
        actualCompleted: acc.actualCompleted + curr.actualCompleted,
        completedBudget: acc.completedBudget + curr.completedBudget,
        actualInProgress: acc.actualInProgress + curr.actualInProgress,
        inProgressBudget: acc.inProgressBudget + curr.inProgressBudget,
        actualPlanning: acc.actualPlanning + curr.actualPlanning,
        planningBudget: acc.planningBudget + curr.planningBudget,
        actualPaused: acc.actualPaused + curr.actualPaused,
        pausedBudget: acc.pausedBudget + curr.pausedBudget,
    }), {
        name: '全市總計', actualTotal: 0, totalBudget: 0, actualCompleted: 0, completedBudget: 0,
        actualInProgress: 0, inProgressBudget: 0, actualPlanning: 0, planningBudget: 0, actualPaused: 0, pausedBudget: 0
    });

    return {
      total, completed, inProgress, planning, paused, duplicatedCount,
      totalBudget, completedBudget, inProgressBudget,
      actualTotal: cityTotalCard.actualTotal,
      actualCompleted: cityTotalCard.actualCompleted,
      actualInProgress: cityTotalCard.actualInProgress,
      actualPlanning: cityTotalCard.actualPlanning,
      actualPaused: cityTotalCard.actualPaused,
      budgetSourceData,
      centralSourceData,
      districtCards: [...districtStats, cityTotalCard]
    };
  }, [projects]);


  // --- 資料操作處理 ---
  const handleUpdateProject = (id, field, value) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setIsDirty(true);
  };

  const handleToggleExclude = (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isExcluded: !p.isExcluded } : p));
    setIsDirty(true);
  };

  // 處理「不核定」
  const handleToggleNotApproved = (id) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isNotApproved: !p.isNotApproved } : p));
    setIsDirty(true);
  };

  const handleFeatureToggle = (id, feature) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, features: { ...p.features, [feature]: !p.features[feature] } };
      }
      return p;
    }));
    setIsDirty(true);
  };

  // --- 匯出功能：CSV 與 Word ---
  const exportCSV = () => {
    const headers = ['ID', '行政區', '案名', '層級', '狀態', '預算來源(大項)', '預算來源(細項)', '經費(萬)', '開工日', '完工日', '執行機關', '排程月份', '排除歸戶', '不核定'];
    const rows = projects.map(p => [
      p.id, p.district, p.name, p.level, p.status, p.budgetSource1, p.budgetSource2, p.budgetAmount, p.startDate, p.endDate, p.agency, p.scheduleMonth, p.isExcluded ? 'Y' : 'N', p.isNotApproved ? 'Y' : 'N'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "桃園通學廊道資料庫_匯出.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWord = () => {
    // 預先計算需要的資料
    const centralProjects = projects.filter(p => p.budgetSource1 === '中央補助' && !p.isNotApproved);
    const nlmaCases = centralProjects.filter(p => p.budgetSource2 === '國土署');
    const motcCases = centralProjects.filter(p => p.budgetSource2 === '公路局');
    const scheduleMonths = Array.from({length: 12}, (_, i) => i + 1);

    // 建立 HTML-to-Word 的結構 (使用 mso-word 特定標籤與 CSS 控制邊界)
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>桃園市通學廊道戰情儀錶板報表</title>
        <style>
          @page WordSection1 { 
              size: 595.3pt 841.9pt; /* A4 size */
              margin: 2.0cm 2.0cm 2.0cm 2.0cm; /* 上下左右2cm */
              mso-header-margin: 35.4pt; 
              mso-footer-margin: 35.4pt; 
              mso-paper-source: 0; 
          }
          div.WordSection1 { page: WordSection1; }
          body { font-family: 'Microsoft JhengHei', '微軟正黑體', sans-serif; font-size: 11pt; color: #333; line-height: 1.5; }
          h1 { color: #E83888; text-align: center; font-size: 20pt; margin-bottom: 20px; font-weight: bold; }
          h2 { color: #00B2E5; font-size: 14pt; border-bottom: 2px solid #00B2E5; padding-bottom: 5px; margin-top: 25px; page-break-after: avoid; font-weight: bold; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; vertical-align: middle; }
          th { background-color: #f2f2f2; font-weight: bold; color: #000; }
          .highlight { color: #d9534f; font-weight: bold; }
          ul { margin-top: 5px; }
          li { margin-bottom: 5px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <div class='WordSection1'>
    `;

    let content = `<h1>桃園市通學廊道專案進度報告</h1>`;
    content += `<p style="text-align: right; color: #666;">產出日期：${currentDate}</p>`;

    // 【1. 戰情儀錶板】
    content += `
      <h2>一、戰情儀錶板核心數據</h2>
      <table>
        <tr><th>指標</th><th>帳面數值</th><th>實際歸戶數值 (扣除衍生案/排除案)</th></tr>
        <tr><td>總錄案</td><td>${kpis.total} 所</td><td class="highlight">${kpis.actualTotal} 所</td></tr>
        <tr><td>已完工</td><td>${kpis.completed} 所</td><td>${kpis.actualCompleted} 所</td></tr>
        <tr><td>施工中</td><td>${kpis.inProgress} 所</td><td>${kpis.actualInProgress} 所</td></tr>
        <tr><td>規劃中</td><td>${kpis.planning} 所</td><td>${kpis.actualPlanning} 所</td></tr>
        <tr><td>總預算規模</td><td colspan="2" class="highlight">${kpis.totalBudget.toLocaleString()} 萬元</td></tr>
      </table>
    `;

    // 【2. 中央補助案】
    content += `
      <h2>二、中央補助案概況 (已扣除不核定案件)</h2>
      <ul>
        <li><strong>國土署：</strong>共計 ${nlmaCases.length} 案，總經費 ${nlmaCases.reduce((s,p)=>s+(Number(p.budgetAmount)||0),0).toLocaleString()} 萬元。</li>
        <li><strong>交通部公路局：</strong>共計 ${motcCases.length} 案，總經費 ${motcCases.reduce((s,p)=>s+(Number(p.budgetAmount)||0),0).toLocaleString()} 萬元。</li>
      </ul>
      <table>
        <tr><th width="15%">行政區</th><th width="35%">案名</th><th width="20%">補助單位</th><th width="15%">經費(萬)</th><th width="15%">狀態</th></tr>
        ${centralProjects.map(p => `
          <tr>
            <td class="text-center">${p.district}</td>
            <td>${p.name}</td>
            <td class="text-center">${p.budgetSource2}</td>
            <td class="text-right">${Number(p.budgetAmount).toLocaleString()}</td>
            <td class="text-center">${p.status}</td>
          </tr>
        `).join('')}
      </table>
    `;

    // 【3. 學校總表】(為節省版面，印出實際列入的學校清單)
    const validSchools = processedProjects.filter(p => !p.isExcluded);
    content += `
      <h2>三、學校總表 (實際納入計算清單)</h2>
      <table>
        <tr><th width="10%">項次</th><th width="15%">行政區</th><th width="35%">案名</th><th width="15%">狀態</th><th width="15%">經費(萬)</th></tr>
        ${validSchools.map(p => `
          <tr>
            <td class="text-center">${p.itemNumber}</td>
            <td class="text-center">${p.district}</td>
            <td>${p.name}</td>
            <td class="text-center">${p.status}</td>
            <td class="text-right">${Number(p.budgetAmount).toLocaleString()}</td>
          </tr>
        `).join('')}
      </table>
    `;

    // 【4. 115年度排程】
    const scheduledProjects = projects.filter(p => p.scheduleMonth);
    content += `
      <h2>四、115年度施工排程</h2>
      <table>
        <tr><th width="15%">月份</th><th>預計進場案件</th></tr>
        ${scheduleMonths.map(m => {
          const mProjs = scheduledProjects.filter(p => p.scheduleMonth === String(m));
          return `
            <tr>
              <td class="text-center" style="font-weight:bold;">${m} 月</td>
              <td>${mProjs.length > 0 ? mProjs.map(p => `[${p.district}] ${p.name}`).join('、 ') : '尚無排程'}</td>
            </tr>
          `;
        }).join('')}
      </table>
    `;

    const footer = `</div></body></html>`;
    const sourceHTML = header + content + footer;

    // 將字串轉為 Blob 讓瀏覽器下載
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `桃園市通學廊道報表_${currentDate}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          id: cols[0] || Date.now().toString() + i,
          district: cols[1],
          name: cols[2],
          level: cols[3] || determineLevel(cols[2]),
          status: cols[4] || '規劃中',
          budgetSource1: cols[5] || '',
          budgetSource2: cols[6] || '',
          budgetAmount: Number(cols[7]) || 0,
          startDate: cleanDate(cols[8]),
          endDate: cleanDate(cols[9]),
          agency: cols[10] || '',
          scheduleMonth: cols[11] || '',
          isExcluded: cols[12] === 'Y',
          isNotApproved: cols[13] === 'Y',
          features: { pole: false, shelter: false, light: false, pickup: false }
        });
      }
      if (newProjects.length > 0) {
        setProjects(newProjects);
        setIsDirty(true);
        alert(`成功匯入 ${newProjects.length} 筆資料`);
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const saveChanges = () => {
    setIsDirty(false);
    alert('變更已儲存 (測試版僅儲存於記憶體，請使用匯出備份)');
  };

  // --- AI 特助 API 呼叫 ---
  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    const newMessages = [...aiMessages, { role: 'user', content: userMsg }];
    setAiMessages(newMessages);
    setAiInput('');
    setIsAILoading(true);

    try {
        const apiKey = ""; // API Key 透過環境自動注入
        
        const systemPrompt = `你是一位專業的「桃園市通學廊道AI戰情特助」。請以繁體中文回答。
你的主要任務是根據我提供的儀錶板資料，精準回答使用者的問題。如果遇到與資料無關的閒聊，請禮貌引導回專案管理。
【當前戰情室資料 Context】
- 總立案數：${kpis.total} 案
- 總預算金額：${kpis.totalBudget.toLocaleString()} 萬元
- 已完工：${kpis.completed} 案 (已完工金額: ${kpis.completedBudget.toLocaleString()} 萬元)
- 施工中：${kpis.inProgress} 案 (施工中金額: ${kpis.inProgressBudget.toLocaleString()} 萬元)
- 規劃中：${kpis.planning} 案
- 實際歸戶學校數：${kpis.actualTotal} 所
請針對使用者的提問給出清晰、有邏輯的分析。`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userMsg }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });
        
        const data = await response.json();
        const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "抱歉，系統目前忙碌中，請稍後再試。";
        setAiMessages([...newMessages, { role: 'ai', content: aiResponseText }]);

    } catch (error) {
        setAiMessages([...newMessages, { role: 'ai', content: "連線發生異常，請檢查網路狀態或 API 設定。" }]);
    } finally {
        setIsAILoading(false);
    }
  };


  // --- 子組件渲染 ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderColor: COLORS.primary }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.primary }}>錄案與經費概況</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center border relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-full h-1 bg-gray-300"></div>
             <p className="text-sm text-gray-500">帳面錄案</p><p className="text-3xl font-bold">{kpis.total}</p>
             <p className="text-xs text-gray-400 mt-2">總經費 {kpis.totalBudget.toLocaleString()} 萬</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-100 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
             <p className="text-sm text-green-600">已完工</p><p className="text-3xl font-bold text-green-700">{kpis.completed}</p>
             <p className="text-xs text-green-600 mt-2">已投入 {kpis.completedBudget.toLocaleString()} 萬</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-100 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
             <p className="text-sm text-blue-600">施工中</p><p className="text-3xl font-bold text-blue-700">{kpis.inProgress}</p>
             <p className="text-xs text-blue-600 mt-2">執行中 {kpis.inProgressBudget.toLocaleString()} 萬</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-100 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
             <p className="text-sm text-yellow-600">規劃中</p><p className="text-3xl font-bold text-yellow-700">{kpis.planning}</p>
             <p className="text-xs mt-2 text-transparent select-none">-</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg text-center border border-gray-200">
             <p className="text-sm text-gray-600">暫緩</p><p className="text-3xl font-bold text-gray-700">{kpis.paused}</p>
             <p className="text-xs mt-2 text-transparent select-none">-</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center border border-red-100">
             <p className="text-sm text-red-600">視為重複案(含期數)</p><p className="text-3xl font-bold text-red-700">{kpis.duplicatedCount}</p>
             <p className="text-xs mt-2 text-transparent select-none">-</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-bold mb-3 text-gray-700 flex items-center">
                <Check className="w-5 h-5 mr-1 text-green-500"/> 實際歸戶學校進度 (排除期數衍生案與手動排除件)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 text-white p-3 rounded-lg text-center">
                <p className="text-xs text-gray-300">實際學校數</p><p className="text-2xl font-bold">{kpis.actualTotal}</p>
            </div>
            <div className="bg-green-600 text-white p-3 rounded-lg text-center">
                <p className="text-xs text-green-100">實際完工</p><p className="text-2xl font-bold">{kpis.actualCompleted}</p>
            </div>
            <div className="bg-blue-600 text-white p-3 rounded-lg text-center">
                <p className="text-xs text-blue-100">實際施工</p><p className="text-2xl font-bold">{kpis.actualInProgress}</p>
            </div>
            <div className="bg-yellow-500 text-white p-3 rounded-lg text-center">
                <p className="text-xs text-yellow-100">實際規劃</p><p className="text-2xl font-bold">{kpis.actualPlanning}</p>
            </div>
            <div className="bg-gray-500 text-white p-3 rounded-lg text-center">
                <p className="text-xs text-gray-100">實際暫緩</p><p className="text-2xl font-bold">{kpis.actualPaused}</p>
            </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">預算來源分析 (單位: 萬元)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kpis.budgetSourceData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, value, percent}) => `${name} ${value.toLocaleString()}萬 (${(percent * 100).toFixed(0)}%)`}>
                  {kpis.budgetSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString() + ' 萬', '經費']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-4">中央單位補助佔比 (單位: 萬元)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={kpis.centralSourceData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label={({name, value, percent}) => `${name} ${value.toLocaleString()}萬 (${(percent * 100).toFixed(0)}%)`}>
                  {kpis.centralSourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length + 2]} />)}
                </Pie>
                <Tooltip formatter={(value) => [value.toLocaleString() + ' 萬', '經費']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
         <h2 className="text-lg font-bold mb-4">行政區進度與經費卡片 (實際歸戶後)</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {kpis.districtCards.map(card => (
                <div key={card.name} className={`p-4 rounded-xl border shadow-sm transition-transform hover:-translate-y-1 ${card.name === '全市總計' ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-200'}`}>
                    <h3 className={`font-bold text-lg mb-3 pb-2 border-b ${card.name === '全市總計' ? 'text-pink-700 border-pink-200' : 'text-gray-800 border-gray-100'}`}>
                        {card.name}
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-semibold text-gray-700">錄案: {card.actualTotal} 所</span>
                            <span className="font-bold text-gray-800">{card.totalBudget.toLocaleString()} 萬</span>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-green-50 px-2 py-1 rounded">
                            <span className="text-green-700 font-medium">完工: {card.actualCompleted} 所</span>
                            <span className="text-green-800 font-semibold">{card.completedBudget.toLocaleString()} 萬</span>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-blue-50 px-2 py-1 rounded">
                            <span className="text-blue-700 font-medium">施工: {card.actualInProgress} 所</span>
                            <span className="text-blue-800 font-semibold">{card.inProgressBudget.toLocaleString()} 萬</span>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-yellow-50 px-2 py-1 rounded">
                            <span className="text-yellow-700 font-medium">規劃: {card.actualPlanning} 所</span>
                            <span className="text-yellow-800 font-semibold">{card.planningBudget.toLocaleString()} 萬</span>
                        </div>
                        <div className="flex justify-between items-center text-sm bg-gray-50 px-2 py-1 rounded">
                            <span className="text-gray-500 font-medium">暫緩: {card.actualPaused} 所</span>
                            <span className="text-gray-600 font-semibold">{card.pausedBudget.toLocaleString()} 萬</span>
                        </div>
                    </div>
                </div>
            ))}
         </div>
      </div>
    </div>
  );

  const renderCentral = () => {
    const centralProjects = projects.filter(p => p.budgetSource1 === '中央補助');
    const filtered = filterDist === 'All' ? centralProjects : centralProjects.filter(p => p.district === filterDist);

    // 計算頂部統計 (扣除已被勾選為不核定的專案)
    const nlmaCases = filtered.filter(p => p.budgetSource2 === '國土署' && !p.isNotApproved);
    const nlmaBudget = nlmaCases.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);

    const motcCases = filtered.filter(p => p.budgetSource2 === '公路局' && !p.isNotApproved);
    const motcBudget = motcCases.reduce((sum, p) => sum + (Number(p.budgetAmount) || 0), 0);

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-fade-in pb-20">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <div>
                <h2 className="text-xl font-bold flex items-center" style={{ color: COLORS.techBlue }}>
                    <Building2 className="w-6 h-6 mr-2"/> 中央補助專案管理
                </h2>
                <p className="text-sm text-gray-500 mt-1">勾選「不核定」將自動自上方統計與預算中扣除。</p>
            </div>
            <select className="border-2 border-blue-200 p-2 rounded-lg font-bold outline-none focus:ring-2 focus:ring-blue-300" value={filterDist} onChange={e => setFilterDist(e.target.value)}>
                <option value="All">所有行政區篩選</option>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
        </div>

        {/* --- 中央補助統計卡片 --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="text-blue-800 font-bold text-lg mb-1">國土署 (核定有效案件)</h3>
                    <p className="text-blue-600 text-sm">已排除不核定案件</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-blue-900">{nlmaCases.length} <span className="text-lg font-normal">案</span></p>
                    <p className="text-blue-700 font-mono font-bold mt-1">經費: {nlmaBudget.toLocaleString()} 萬元</p>
                </div>
            </div>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-xl shadow-sm flex justify-between items-center">
                <div>
                    <h3 className="text-emerald-800 font-bold text-lg mb-1">交通部/公路局 (核定有效案件)</h3>
                    <p className="text-emerald-600 text-sm">已排除不核定案件</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-black text-emerald-900">{motcCases.length} <span className="text-lg font-normal">案</span></p>
                    <p className="text-emerald-700 font-mono font-bold mt-1">經費: {motcBudget.toLocaleString()} 萬元</p>
                </div>
            </div>
        </div>
        
        <div className="overflow-x-auto border rounded-lg shadow-inner">
          <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
            <thead className="bg-gray-100 text-gray-700 uppercase">
              <tr>
                <th className="p-3 border text-center text-red-600 font-bold w-20">不核定<br/><span className="text-[10px] text-gray-500 font-normal">(打勾排除)</span></th>
                <th className="p-3 border">行政區</th>
                <th className="p-3 border">計畫/學校名稱</th>
                <th className="p-3 border">補助單位</th>
                <th className="p-3 border text-right">提案/核定經費(萬)</th>
                <th className="p-3 border">執行進度</th>
                <th className="p-3 border">四大亮點指標 (勾選)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b transition-colors ${p.isNotApproved ? 'bg-gray-100 opacity-60' : 'hover:bg-blue-50'}`}>
                  <td className="p-3 border text-center" onClick={() => handleToggleNotApproved(p.id)}>
                      <div className="flex justify-center cursor-pointer">
                          {p.isNotApproved ? <CheckSquare className="w-6 h-6 text-red-500 drop-shadow-md"/> : <Square className="w-6 h-6 text-gray-300 hover:text-red-300"/>}
                      </div>
                  </td>
                  <td className="p-3 border font-medium text-gray-700">{p.district}</td>
                  <td className={`p-3 border font-bold ${p.isNotApproved ? 'line-through text-gray-500' : 'text-blue-800'}`}>{p.name}</td>
                  <td className="p-3 border">{p.budgetSource2}</td>
                  <td className={`p-3 border text-right font-mono font-bold ${p.isNotApproved ? 'text-gray-500' : 'text-pink-600'}`}>{p.budgetAmount.toLocaleString()}</td>
                  <td className="p-3 border">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                        ${p.status === '已完工' ? 'bg-green-100 text-green-700' : p.status === '施工中' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200'}`}>
                        {p.status}
                    </span>
                  </td>
                  <td className="p-3 border">
                     <div className="flex space-x-3 opacity-90">
                        <label className="flex items-center space-x-1 cursor-pointer" onClick={() => handleFeatureToggle(p.id, 'pole')}>
                            {p.features?.pole ? <CheckSquare className="w-4 h-4 text-blue-600"/> : <Square className="w-4 h-4 text-gray-400"/>}
                            <span className="text-xs">電桿地下</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer" onClick={() => handleFeatureToggle(p.id, 'shelter')}>
                            {p.features?.shelter ? <CheckSquare className="w-4 h-4 text-blue-600"/> : <Square className="w-4 h-4 text-gray-400"/>}
                            <span className="text-xs">候車亭</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer" onClick={() => handleFeatureToggle(p.id, 'light')}>
                            {p.features?.light ? <CheckSquare className="w-4 h-4 text-blue-600"/> : <Square className="w-4 h-4 text-gray-400"/>}
                            <span className="text-xs">雙色溫路燈</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer" onClick={() => handleFeatureToggle(p.id, 'pickup')}>
                            {p.features?.pickup ? <CheckSquare className="w-4 h-4 text-blue-600"/> : <Square className="w-4 h-4 text-gray-400"/>}
                            <span className="text-xs">接送區</span>
                        </label>
                     </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="text-center p-8 text-gray-500 font-bold">此區目前無中央補助案件</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSchools = () => {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm animate-fade-in flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800">學校總表資料庫 (點擊名稱可編輯)</h2>
            <div className="flex items-center space-x-4">
                <select className="border-2 border-pink-200 p-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-pink-300 outline-none" value={schoolDistrictFilter} onChange={e => setSchoolDistrictFilter(e.target.value)}>
                    <option value="All">全市所有行政區</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="text-sm text-pink-700 bg-pink-50 px-3 py-1 rounded-full font-bold border border-pink-100">
                    顯示 {displayProjects.length} 筆資料
                </div>
            </div>
        </div>

        {/* --- 篩選結果的實際狀態統計卡片 (改為互動式下鑽按鈕) --- */}
        <div className="text-xs text-gray-500 mb-2 flex items-center">
            <Filter className="w-3 h-3 mr-1"/> 提示：點擊下方卡片，可直接篩選該狀態的學校清單
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 flex-shrink-0">
            <div onClick={() => setTableStatusFilter('All')} 
                 className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all transform hover:scale-105 border-2 ${tableStatusFilter === 'All' ? 'bg-gray-800 text-white border-gray-900 ring-2 ring-offset-2 ring-gray-300' : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'}`}>
                <div className="text-xs opacity-80 font-medium mb-1">實際錄案數 (顯示全部)</div>
                <div className="text-2xl font-black">{tableStats.actualTotal}</div>
            </div>
            
            <div onClick={() => setTableStatusFilter('已完工')} 
                 className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all transform hover:scale-105 border-2 ${tableStatusFilter === '已完工' ? 'bg-green-600 text-white border-green-700 ring-2 ring-offset-2 ring-green-300' : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100'}`}>
                <div className="text-xs opacity-90 font-bold mb-1">實際完工</div>
                <div className="text-2xl font-black">{tableStats.actualCompleted}</div>
            </div>
            
            <div onClick={() => setTableStatusFilter('施工中')} 
                 className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all transform hover:scale-105 border-2 ${tableStatusFilter === '施工中' ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-offset-2 ring-blue-300' : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'}`}>
                <div className="text-xs opacity-90 font-bold mb-1">實際施工</div>
                <div className="text-2xl font-black">{tableStats.actualInProgress}</div>
            </div>
            
            <div onClick={() => setTableStatusFilter('規劃中')} 
                 className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all transform hover:scale-105 border-2 ${tableStatusFilter === '規劃中' ? 'bg-yellow-500 text-white border-yellow-600 ring-2 ring-offset-2 ring-yellow-300' : 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100'}`}>
                <div className="text-xs opacity-90 font-bold mb-1">實際規劃</div>
                <div className="text-2xl font-black">{tableStats.actualPlanning}</div>
            </div>
            
            <div onClick={() => setTableStatusFilter('暫緩')} 
                 className={`p-3 rounded-lg text-center shadow-sm cursor-pointer transition-all transform hover:scale-105 border-2 ${tableStatusFilter === '暫緩' ? 'bg-gray-500 text-white border-gray-600 ring-2 ring-offset-2 ring-gray-300' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'}`}>
                <div className="text-xs opacity-90 font-bold mb-1">實際暫緩</div>
                <div className="text-2xl font-black">{tableStats.actualPaused}</div>
            </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto flex-1 border rounded shadow-inner bg-white">
            <table className="w-full text-sm text-left relative min-w-[1200px]">
                <thead className="bg-gray-100 text-gray-700 sticky top-0 z-10 shadow-sm uppercase text-xs">
                    <tr>
                        <th className="p-3 border-r w-16 text-center">項次</th>
                        <th className="p-3 border-r w-24 text-center">排除計算<br/><span className="text-[10px] text-gray-500 font-normal">(不歸戶)</span></th>
                        <th className="p-3 border-r">行政區</th>
                        <th className="p-3 border-r">層級</th>
                        <th className="p-3 border-r">案名(學校)</th>
                        <th className="p-3 border-r">狀態</th>
                        <th className="p-3 border-r">預算大項</th>
                        <th className="p-3 border-r">細項</th>
                        <th className="p-3 border-r text-right">經費(萬)</th>
                        <th className="p-3 border-r">機關</th>
                        <th className="p-3 text-center">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {displayProjects.map(p => (
                        <tr key={p.id} className={`hover:bg-pink-50 transition-colors ${p.isExcluded ? 'bg-gray-50 opacity-50' : ''}`}>
                            <td className="p-2 text-center font-mono font-bold text-gray-500 bg-gray-50">{p.itemNumber}</td>
                            <td className="p-2 text-center" onClick={() => handleToggleExclude(p.id)}>
                                <div className="flex items-center justify-center cursor-pointer" title="勾選後，將不列入上方的實際統計數">
                                    {p.isExcluded ? <CheckSquare className="w-5 h-5 text-red-500 drop-shadow-sm"/> : <Square className="w-5 h-5 text-gray-300 hover:text-red-300"/>}
                                </div>
                            </td>
                            <td className="p-2">{p.district}</td>
                            <td className="p-2 text-xs text-gray-500">{p.level}</td>
                            <td className="p-2 font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedProject(p)}>
                                {p.name} {isDuplicateName(p.name) && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded inline-block">衍生案</span>}
                            </td>
                            <td className="p-2">
                                <span className={p.status === '已完工' ? 'text-green-600 font-bold bg-green-50 px-2 py-1 rounded' : p.status === '暫緩' ? 'text-gray-400' : ''}>{p.status}</span>
                            </td>
                            <td className="p-2">{p.budgetSource1}</td>
                            <td className="p-2 text-xs text-gray-500">{p.budgetSource2}</td>
                            <td className="p-2 text-right font-mono font-bold text-gray-700">{p.budgetAmount.toLocaleString()}</td>
                            <td className="p-2 text-xs text-gray-600">{p.agency}</td>
                            <td className="p-2 text-center text-blue-500 cursor-pointer hover:text-blue-700" onClick={() => setSelectedProject(p)}>
                                <Edit className="w-4 h-4 mx-auto"/>
                            </td>
                        </tr>
                    ))}
                    {displayProjects.length === 0 && <tr><td colSpan="11" className="text-center p-12 text-gray-400 font-bold bg-gray-50">此篩選條件下無符合之專案資料</td></tr>}
                </tbody>
            </table>
        </div>

        {/* 編輯卡片 Modal */}
        {selectedProject && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                <div className="bg-white w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4 text-white flex justify-between items-center">
                        <h3 className="font-bold text-lg flex items-center"><Building2 className="mr-2"/> 個案詳細資訊卡</h3>
                        <button onClick={() => setSelectedProject(null)} className="text-white hover:text-gray-200 transition-transform hover:scale-110">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">案名(學校)</label>
                                <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.name} onChange={e => handleUpdateProject(selectedProject.id, 'name', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Google定位</label>
                                <a href={`https://www.google.com/maps/search/?api=1&query=${selectedProject.district}${selectedProject.name}`} target="_blank" rel="noreferrer" className="flex items-center justify-center h-[42px] text-blue-500 border p-2 rounded hover:bg-blue-50 transition-colors font-bold">
                                    <MapPin className="w-4 h-4 mr-2"/> 開啟地圖搜尋
                                </a>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">行政區</label>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.district} onChange={e => handleUpdateProject(selectedProject.id, 'district', e.target.value)}>
                                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">層級</label>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.level} onChange={e => handleUpdateProject(selectedProject.id, 'level', e.target.value)}>
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">執行狀態</label>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none font-bold text-blue-700" value={selectedProject.status} onChange={e => handleUpdateProject(selectedProject.id, 'status', e.target.value)}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">機關</label>
                                <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.agency} onChange={e => handleUpdateProject(selectedProject.id, 'agency', e.target.value)} />
                            </div>
                        </div>

                        <div className="border-t pt-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">預算來源</label>
                                <select className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-bold" value={selectedProject.budgetSource1} onChange={e => handleUpdateProject(selectedProject.id, 'budgetSource1', e.target.value)}>
                                    <option value="">選擇來源</option>
                                    <option value="市府預算">市府預算</option>
                                    <option value="中央補助">中央補助</option>
                                </select>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-pink-300 outline-none" value={selectedProject.budgetSource2} onChange={e => handleUpdateProject(selectedProject.id, 'budgetSource2', e.target.value)}>
                                     <option value="">細項(公務/國土/公路等)</option>
                                    {selectedProject.budgetSource1 === '市府預算' ? (
                                        <>
                                            <option value="公務預算">公務預算</option>
                                            <option value="道路基金">道路基金</option>
                                            <option value="其他基金">其他基金</option>
                                            <option value="統籌分配">統籌分配</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="國土署">國土署</option>
                                            <option value="公路局">公路局</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">總經費(萬元)</label>
                                <input type="number" className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-pink-300 outline-none font-mono font-bold text-pink-600" value={selectedProject.budgetAmount} onChange={e => handleUpdateProject(selectedProject.id, 'budgetAmount', Number(e.target.value))} />
                                <div className="border-2 border-dashed border-pink-200 rounded-lg p-4 flex flex-col items-center justify-center text-pink-400 cursor-pointer hover:bg-pink-50 hover:border-pink-400 transition-colors">
                                    <ImageIcon className="w-6 h-6 mb-1"/>
                                    <span className="text-xs font-bold">上傳現況照片</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border-t bg-gray-50 flex justify-end">
                        <button className="px-6 py-2 bg-pink-500 text-white font-bold rounded-lg shadow-md hover:bg-pink-600 hover:shadow-lg transition-all" onClick={() => setSelectedProject(null)}>完成儲存</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  };

  const renderSchedule = () => {
     const months = Array.from({length: 12}, (_, i) => i + 1);
     const scheduledProjects = projects.filter(p => p.scheduleMonth);
     const unscheduledProjects = projects.filter(p => !p.scheduleMonth && p.status !== '已完工' && p.status !== '暫緩');

     return (
        <div className="bg-white p-6 rounded-xl shadow-sm h-full flex flex-col animate-fade-in pb-20">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center"><Calendar className="mr-2"/> 115年度施工排程總表</h2>
            
            <div className="mb-4 bg-yellow-50 p-3 rounded border border-yellow-200 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 text-yellow-600 mr-2"/> 
                請在下方待排程清單中，為專案選擇預計進場月份。
            </div>

            <div className="flex-1 overflow-auto border rounded bg-gray-50 flex">
                <div className="w-64 bg-white border-r p-4 flex-shrink-0 overflow-y-auto shadow-inner">
                    <h3 className="font-bold text-gray-600 mb-3 border-b pb-2">待排程案件 ({unscheduledProjects.length})</h3>
                    <div className="space-y-2">
                        {unscheduledProjects.map(p => (
                            <div key={p.id} className="p-2 border rounded bg-gray-50 text-sm hover:shadow-md transition">
                                <div className="font-bold">{p.name}</div>
                                <div className="text-xs text-gray-500 flex justify-between mt-1 items-center">
                                    <span>{p.district}</span>
                                    <select className="border rounded bg-white p-1" value="" onChange={(e) => handleUpdateProject(p.id, 'scheduleMonth', e.target.value)}>
                                        <option value="">指派月份</option>
                                        {months.map(m => <option key={m} value={m}>{m}月</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex overflow-x-auto p-4 space-x-4">
                    {months.map(month => {
                        const mProjects = scheduledProjects.filter(p => p.scheduleMonth === String(month));
                        return (
                            <div key={month} className="w-64 flex-shrink-0 bg-white border rounded-lg shadow-sm flex flex-col">
                                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-2 rounded-t-lg text-white font-bold text-center">
                                    115年 {month}月
                                </div>
                                <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[300px] bg-gray-50/50">
                                    {mProjects.map(p => (
                                        <div key={p.id} className="p-2 border border-teal-100 rounded bg-white text-sm relative group shadow-sm">
                                            <div className="font-bold text-teal-800">{p.name}</div>
                                            <div className="text-xs text-gray-500">{p.district}</div>
                                            <button 
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                                                onClick={() => handleUpdateProject(p.id, 'scheduleMonth', '')}
                                                title="移出排程"
                                            >✕</button>
                                        </div>
                                    ))}
                                    {mProjects.length === 0 && <div className="text-xs text-center text-gray-400 mt-4">尚無排程</div>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
     );
  }

  const renderSettings = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
        
        {/* --- 系統更新日誌區塊 --- */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-400">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                <History className="mr-2 text-yellow-500"/> 系統更新日誌 (Changelog)
            </h2>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {CHANGELOG.map((log, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
                        <div className="flex items-center space-x-3 mb-1">
                            <span className="font-mono font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded text-xs">{log.version}</span>
                            <span className="text-sm text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> {log.date}</span>
                        </div>
                        <ul className="list-disc list-inside text-sm text-gray-700 ml-4 space-y-1">
                            {log.notes.map((note, i) => <li key={i}>{note}</li>)}
                        </ul>
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800"><Database className="mr-2"/> 報表匯出與系統更新</h2>
            <p className="text-sm text-gray-600 mb-6 line-relaxed">
                本系統為純前端架構 (可部署於 Vercel)，為確保資料不遺失，請養成定期匯出 CSV 的習慣。<br/>
                當有新資料或大量批次修改時，可修改 CSV 後重新匯入覆蓋。
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-blue-200 bg-blue-50 p-6 rounded-lg text-center hover:shadow-md transition">
                    <Download className="w-12 h-12 text-blue-500 mx-auto mb-4"/>
                    <h3 className="font-bold text-blue-800 mb-2">1. 下載資料備份</h3>
                    <p className="text-xs text-blue-600 mb-4">將目前的資料庫匯出為 CSV 檔。</p>
                    <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 w-full font-bold">匯出 CSV</button>
                </div>

                <div className="border border-green-200 bg-green-50 p-6 rounded-lg text-center hover:shadow-md transition">
                    <Upload className="w-12 h-12 text-green-500 mx-auto mb-4"/>
                    <h3 className="font-bold text-green-800 mb-2">2. 匯入更新系統</h3>
                    <p className="text-xs text-green-600 mb-4">上傳已編輯好的 CSV 覆蓋當前資料。</p>
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current.click()} className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 w-full font-bold">選擇 CSV 匯入</button>
                </div>

                <div className="border border-pink-200 bg-pink-50 p-6 rounded-lg text-center hover:shadow-md transition relative">
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse shadow-md">A4 報告</div>
                    <FileText className="w-12 h-12 text-pink-500 mx-auto mb-4"/>
                    <h3 className="font-bold text-pink-800 mb-2">3. 匯出會議報表</h3>
                    <p className="text-xs text-pink-600 mb-4">產生 A4 格式、2cm 邊界的 Word 檔。</p>
                    <button onClick={exportWord} className="bg-pink-600 text-white px-4 py-2 rounded shadow hover:bg-pink-700 w-full font-bold flex items-center justify-center">
                        <FileText className="w-4 h-4 mr-2"/> 匯出 Word (.doc)
                    </button>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm text-center border border-gray-200">
            <h2 className="text-lg font-bold mb-4">儲存暫存變更</h2>
            <p className="text-sm text-gray-500 mb-4">若您在介面上做了單筆修改，必須點擊儲存以消除未儲存提示 (重新整理網頁將流失暫存)。</p>
            <button 
                onClick={saveChanges} 
                disabled={!isDirty}
                className={`px-8 py-3 rounded font-bold shadow-lg flex items-center justify-center mx-auto transition-all ${isDirty ? 'bg-pink-600 text-white hover:bg-pink-700 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
                <Save className="w-5 h-5 mr-2" /> {isDirty ? '儲存變更' : '目前無變更'}
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 relative">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20 flex-shrink-0">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg shadow-pink-500/30">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <div className="w-2 h-2 bg-yellow-300 rounded-full ml-1"></div>
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-wider">桃園市</h1>
                    <p className="text-xs text-gray-400">通學廊道戰情儀錶板</p>
                </div>
            </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
            {[
                { id: 'dashboard', icon: LayoutDashboard, label: '戰情儀錶板' },
                { id: 'central', icon: Building2, label: '中央補助案' },
                { id: 'schools', icon: Search, label: '學校總表' },
                { id: 'schedule', icon: Calendar, label: '115年度排程' },
                { id: 'settings', icon: Database, label: '報表匯出與設定' },
            ].map(item => (
                <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors font-semibold ${activeTab === item.id ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.label}
                </button>
            ))}
        </nav>
        
        <div className="p-4 bg-gray-800 text-xs text-gray-400 text-center select-none flex flex-col items-center">
            <span>科技城市 ‧ 魅力桃園</span>
            {/* 側邊欄底部也顯示即時日期 */}
            <span className="mt-2 text-[10px] text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1"/> {currentDate}</span>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white h-16 shadow-sm flex items-center justify-between px-6 z-10 flex-shrink-0">
            <div className="flex items-center">
                <h2 className="text-xl font-bold text-gray-700 flex items-center">
                    {activeTab === 'dashboard' && '首頁 / 戰情儀錶板'}
                    {activeTab === 'central' && '專案管理 / 中央補助案'}
                    {activeTab === 'schools' && '資料庫 / 學校總表'}
                    {activeTab === 'schedule' && '排程 / 115年度施工'}
                    {activeTab === 'settings' && '系統 / 報表匯出與設定'}
                </h2>
                {/* 頂部即時日期標籤 */}
                <span className="ml-4 bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-xs font-bold border border-pink-100 flex items-center shadow-sm">
                    <Calendar className="w-3 h-3 mr-1"/> {currentDate}
                </span>
            </div>
            
            <div className="flex items-center space-x-4">
                {isDirty && <span className="flex items-center text-sm text-yellow-600 font-bold animate-pulse"><AlertCircle className="w-4 h-4 mr-1"/> 有未儲存的變更</span>}
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200 shadow-inner">
                    工
                </div>
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

      {/* --- AI 戰情特助 (Floating Widget) --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* AI 對話框 */}
        {isAIOpen && (
            <div className="w-80 h-96 bg-white rounded-xl shadow-2xl border border-pink-100 mb-4 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-3 text-white flex justify-between items-center shadow-md">
                    <div className="flex items-center font-bold">
                        <MessageCircle className="w-5 h-5 mr-2" /> AI 戰情特助
                    </div>
                    <button onClick={() => setIsAIOpen(false)} className="hover:text-pink-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 text-sm">
                    {aiMessages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-pink-500 text-white rounded-tr-none shadow-sm' : 'bg-white border border-gray-200 text-gray-700 rounded-tl-none shadow-sm'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isAILoading && (
                        <div className="flex items-start">
                            <div className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-gray-500 rounded-tl-none flex items-center space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={aiChatEndRef} />
                </div>
                
                <div className="p-3 bg-white border-t border-gray-100 flex items-center">
                    <input 
                        type="text" 
                        className="flex-1 border-0 bg-gray-100 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-pink-300 outline-none transition-all"
                        placeholder="請輸入問題..."
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAiSubmit()}
                        disabled={isAILoading}
                    />
                    <button 
                        className={`ml-2 p-2 rounded-full ${aiInput.trim() && !isAILoading ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} transition-colors`}
                        onClick={handleAiSubmit}
                        disabled={!aiInput.trim() || isAILoading}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* 懸浮按鈕 */}
        <button 
            onClick={() => setIsAIOpen(!isAIOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 ${isAIOpen ? 'bg-gray-800 text-white' : 'bg-gradient-to-tr from-pink-500 to-purple-500 text-white'}`}
        >
            {isAIOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        
        /* 隱藏滾動條但保留功能 (Chrome, Safari, Opera) */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
      `}} />
    </div>
  );
}