/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, ChangeEvent, useEffect } from 'react';
import { 
  Users, 
  Shuffle, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Settings2,
  Users2,
  ListOrdered,
  PlusCircle,
  Sparkles,
  Loader2,
  FileUp,
  FileDown,
  LogOut,
  ExternalLink,
  History,
  X,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type GroupMode = 'count' | 'size';

interface HistoryItem {
  id: string;
  timestamp: number;
  names: string[];
  groups: string[][];
  mode: GroupMode;
  count: number;
  operator: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<GroupMode>('count');
  const [count, setCount] = useState<number>(2);
  const [results, setResults] = useState<string[][] | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGrouping, setIsGrouping] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [currentOperator, setCurrentOperator] = useState<string>('');

  const availableOperators = ['系統管理員', '艾蜜莉 (Emily)', '奧利佛 (Oliver)', '蘇菲亞 (Sophia)', '雅各 (Jacob)'];

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('grouping_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem('grouping_history', JSON.stringify(history));
  }, [history]);

  // Clean names from input
  const names = useMemo(() => {
    return inputText
      .split(/[\n,，]/)
      .map(n => n.trim())
      .filter(n => n.length > 0);
  }, [inputText]);

  // Fisher-Yates Shuffle
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Extract surname for sorting
  const getSurname = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    // Basic heuristic: 
    // If it's a Chinese-like name (first character is likely surname)
    // If it's an English name (last word is likely surname)
    // We'll prioritize Chinese surname detection if the first char is CJK
    const isCJK = /[\u4e00-\u9fa5]/.test(trimmed[0]);
    if (isCJK) {
      return trimmed[0];
    }
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1];
  };

  const handleGroup = useCallback(() => {
    if (names.length === 0) return;

    setIsGrouping(true);
    setResults(null);

    // Simulate magic animation delay
    setTimeout(() => {
      const shuffled = shuffleArray(names);
      let newGroups: string[][] = [];

      if (mode === 'count') {
        const numGroups = Math.max(1, count);
        newGroups = Array.from({ length: numGroups }, () => []);
        shuffled.forEach((name, index) => {
          newGroups[index % numGroups].push(name);
        });
      } else {
        const size = Math.max(1, count);
        for (let i = 0; i < shuffled.length; i += size) {
          newGroups.push(shuffled.slice(i, i + size));
        }
      }

      // Sort each group by surname
      const sortedGroups = newGroups.map(group => 
        group.sort((a, b) => getSurname(a).localeCompare(getSurname(b), 'zh-Hant'))
      );

      setResults(sortedGroups);
      setIsGrouping(false);

      // Add to history
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        names: [...names],
        groups: sortedGroups,
        mode,
        count,
        operator: currentOperator
      };
      setHistory(prev => [newItem, ...prev].slice(0, 50)); // Keep last 50 items
    }, 1200);
  }, [names, mode, count]);

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeHistoryId === id) {
      setResults(null);
      setActiveHistoryId(null);
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setInputText(item.names.join('\n'));
    setMode(item.mode);
    setCount(item.count);
    setResults(item.groups);
    setActiveHistoryId(item.id);
    setIsHistoryOpen(false);
  };

  const handleCopy = () => {
    if (!results) return;
    const text = results
      .map((group, i) => `第 ${i + 1} 組：\n${group.map(n => `- ${n}`).join('\n')}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInputText('');
    setResults(null);
  };

  const handleImportExample = () => {
    const exampleNames = [
      '艾蜜莉 (Emily)',
      '奧利佛 (Oliver)',
      '蘇菲亞 (Sophia)',
      '雅各 (Jacob)',
      '伊莎貝拉 (Isabella)',
      '威廉 (William)',
      '夏洛特 (Charlotte)',
      '伊森 (Ethan)',
      '阿米莉亞 (Amelia)',
      '盧卡斯 (Lucas)',
      '米雅 (Mia)',
      '班傑明 (Benjamin)'
    ];
    setInputText(exampleNames.join('\n'));
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      // Handle both CSV and TXT (split by newlines and commas)
      const parsedNames = content
        .split(/[\n,，\r]+/)
        .map(n => n.trim())
        .filter(n => n.length > 0);
      
      setInputText(parsedNames.join('\n'));
    };
    reader.readAsText(file);
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/google/status');
        if (res.ok) {
          const { isAuthenticated } = await res.json();
          setIsGoogleAuthenticated(isAuthenticated);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      }
    };
    checkAuth();
  }, []);

  // Listen for OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        setIsGoogleAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleConnect = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) throw new Error("Failed to get auth URL");
      const { url } = await res.json();
      
      window.open(url, 'google_auth_popup', 'width=600,height=700');
    } catch (e) {
      console.error(e);
      alert("無法取得授權連結，請重試。");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await fetch('/api/auth/google/logout', { method: 'POST' });
      setIsGoogleAuthenticated(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportToGoogleSheetsDirect = async () => {
    if (!results) return;
    setIsExportingToSheets(true);
    try {
      const res = await fetch('/api/export/google-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `智慧分組結果_${new Date().toLocaleString()}`,
          data: results
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsGoogleAuthenticated(false);
          throw new Error("授權已過期，請重新連結。");
        }
        throw new Error("匯出失敗");
      }

      const { url } = await res.json();
      window.open(url, '_blank');
      setIsExportMenuOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "發生未知錯誤");
    } finally {
      setIsExportingToSheets(false);
    }
  };

  const handleExportCSV = () => {
    if (!results) return;
    
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel visibility
    csvContent += "組別,姓名\n";
    results.forEach((group, i) => {
      group.forEach(name => {
        csvContent += `第 ${i + 1} 組,"${name.replace(/"/g, '""')}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `分組結果_${new Date().getTime()}.csv`);
  };

  const handleExportTXT = () => {
    if (!results) return;
    const text = results
      .map((group, i) => `【第 ${i + 1} 組】\n${group.join('\n')}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    downloadFile(blob, `分組結果_${new Date().getTime()}.txt`);
  };

  const handleCopyForSheets = () => {
    if (!results) return;
    // TSV format for perfect copy-paste into Google Sheets
    let tsvContent = "組別\t姓名\n";
    results.forEach((group, i) => {
      group.forEach(name => {
        tsvContent += `第 ${i + 1} 組\t${name}\n`;
      });
    });
    
    navigator.clipboard.writeText(tsvContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setIsExportMenuOpen(false);
  };

  const handleExportHistoryCSV = () => {
    if (history.length === 0) return;
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "日期,操作者,組別,成員\n";
    history.forEach(item => {
      const date = new Date(item.timestamp).toLocaleString();
      item.groups.forEach((group, i) => {
        group.forEach(name => {
          csvContent += `"${date}","${item.operator}",第 ${i + 1} 組,"${name.replace(/"/g, '""')}"\n`;
        });
      });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `全部分組歷史_${new Date().getTime()}.csv`);
  };

  const handleExportHistoryJSON = () => {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    downloadFile(blob, `分組歷史備份_${new Date().getTime()}.json`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-gray-100 p-4 md:p-10 font-sans selection:bg-brand-accent selection:text-white">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-4 text-center md:text-left">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm"
            >
              <Users className="w-3.5 h-3.5 text-brand-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Smart Grouping Engine v2.0</span>
            </motion.div>
            <div className="space-y-1">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-500">
                分組遊戲
              </h1>
              
              {/* Identity Selector */}
              <div className="pt-4 flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${currentOperator ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">當前操作者：</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                  {availableOperators.map((op) => (
                    <button
                      key={op}
                      onClick={() => setCurrentOperator(op)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border relative group ${
                        currentOperator === op 
                        ? 'bg-brand-accent/20 border-brand-accent text-brand-accent shadow-lg shadow-brand-accent/5' 
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                      }`}
                    >
                      {op}
                      {currentOperator === op && (
                        <motion.div
                          layoutId="operator-active"
                          className="absolute inset-0 border border-brand-accent rounded-xl"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </button>
                  ))}
                  {!currentOperator && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] text-red-500/80 font-bold italic animate-pulse ml-2"
                    >
                      ← 請先選擇身分
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group self-center md:self-end"
          >
            <History className="w-5 h-5 text-brand-accent group-hover:rotate-[-45deg] transition-transform" />
            <span className="font-bold text-sm tracking-widest uppercase">歷史紀錄</span>
            {history.length > 0 && (
              <span className="bg-brand-accent text-white text-[10px] px-1.5 py-0.5 rounded-md">
                {history.length}
              </span>
            )}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* Input Section */}
          <section className="glass-card rounded-[2.5rem] p-7 md:p-10 space-y-8 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-accent/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <label htmlFor="names" className="flex items-center gap-2 font-semibold text-xs uppercase tracking-widest text-gray-400">
                <ListOrdered className="w-4 h-4 text-brand-accent" />
                名單輸入
              </label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleImportExample}
                  className="text-xs text-brand-accent hover:text-brand-violet transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 font-bold uppercase tracking-wider"
                >
                  <PlusCircle className="w-3 h-3" /> 載入範例
                </button>
                <div className="w-px h-3 bg-white/10" />
                <label className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer">
                  <FileUp className="w-3 h-3" /> 匯入名單
                  <input type="file" accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <div className="w-px h-3 bg-white/10" />
                <button 
                  onClick={handleClear}
                  className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/5"
                >
                  <Trash2 className="w-3 h-3" /> 清除內容
                </button>
              </div>
            </div>
            
            <textarea
              id="names"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="輸入姓名，每行一個..."
              className="w-full h-72 p-5 bg-black/20 border border-white/5 rounded-3xl focus:ring-1 focus:ring-brand-accent/50 focus:border-brand-accent/50 outline-none transition-all resize-none font-mono text-gray-300 text-sm input-glow"
            />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                <Settings2 className="w-4 h-4 text-brand-accent" /> 分組設定
              </div>
              
              <div className="flex bg-black/30 p-1.5 rounded-[1.25rem] border border-white/5">
                <button
                  onClick={() => setMode('count')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    mode === 'count' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  固定組數
                </button>
                <button
                  onClick={() => setMode('size')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all ${
                    mode === 'size' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  每組人數
                </button>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 text-2xl font-bold text-center focus:border-brand-accent outline-none transition-all input-glow"
                  />
                </div>
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest w-24">
                  {mode === 'count' ? 'Groups' : 'Per Group'}
                </div>
              </div>
            </div>

            <button
              onClick={handleGroup}
              disabled={names.length === 0 || !currentOperator}
              className={`w-full py-5 rounded-[1.5rem] flex items-center justify-center gap-3 text-white font-bold text-lg transition-all shadow-2xl relative overflow-hidden group active:scale-[0.98] ${
                names.length === 0 || !currentOperator
                  ? 'bg-gray-800/50 cursor-not-allowed opacity-50 grayscale' 
                  : 'bg-gradient-to-r from-brand-accent to-brand-violet hover:shadow-brand-accent/30'
              }`}
            >
              <Shuffle className={`w-6 h-6 transition-transform ${currentOperator ? 'group-hover:rotate-180' : ''} duration-500`} />
              {!currentOperator ? '請先選擇身分以開始' : 'Generate Magic'}
            </button>
          </section>

          {/* Results Section */}
          <section className="space-y-6 min-h-[600px]">
            <AnimatePresence mode="wait">
              {isGrouping ? (
                <motion.div
                  key="grouping"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="h-full flex flex-col items-center justify-center text-brand-accent glass-card rounded-[3rem] p-16 text-center space-y-8 overflow-hidden relative"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 opacity-10 pointer-events-none"
                  >
                    <Sparkles className="w-full h-full p-12" />
                  </motion.div>

                  <div className="relative">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-24 h-24 bg-brand-accent/20 rounded-full flex items-center justify-center relative z-10"
                    >
                      <Loader2 className="w-12 h-12 animate-spin-slow" />
                    </motion.div>
                    <motion.div
                      animate={{ 
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.5, 0.2]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-brand-accent/30 rounded-full blur-xl -z-0"
                    />
                  </div>

                  <div className="space-y-3 relative z-10">
                    <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-violet">
                      正在施展分組魔法...
                    </h3>
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-[0.2em]">
                      Sorting members by destiny
                    </p>
                  </div>
                </motion.div>
              ) : results ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between px-2">
                    <div>
                      <h2 className="font-bold text-2xl tracking-tight">結果展示</h2>
                      <p className="text-gray-500 text-sm">{names.length} 位成員 • {results.length} 個組別</p>
                    </div>
                    <div className="flex items-center gap-2 relative">
                      <div className="relative">
                        <button
                          onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/5 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/10 transition-all shadow-lg shadow-brand-accent/5"
                        >
                          <FileDown className="w-4 h-4" /> 導出/匯出
                        </button>

                        <AnimatePresence>
                          {isExportMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute right-0 mt-3 w-64 glass-card rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden"
                            >
                              <div className="p-2 space-y-1">
                                {isGoogleAuthenticated ? (
                                  <button
                                    onClick={handleExportToGoogleSheetsDirect}
                                    disabled={isExportingToSheets}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-emerald-400">
                                        {isExportingToSheets ? "正在建立試算表..." : "直接匯出至 Google 試算表"}
                                      </div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-tight">Create new Spreadsheet in your drive</div>
                                    </div>
                                    {isExportingToSheets ? (
                                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                                    ) : (
                                      <ExternalLink className="w-4 h-4 text-emerald-500 opacity-50 group-hover:opacity-100" />
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={handleGoogleConnect}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                                  >
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-bold text-brand-accent">連結 Google 帳號</div>
                                      <div className="text-[10px] text-gray-500 uppercase tracking-tight">Required for direct export</div>
                                    </div>
                                    <PlusCircle className="w-4 h-4 text-brand-accent opacity-50 group-hover:opacity-100" />
                                  </button>
                                )}

                                <div className="h-px bg-white/5 mx-2" />

                                <button
                                  onClick={handleCopyForSheets}
                                  className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                                >
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-gray-200">複製至 Google 試算表</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-tight">Best for Google Sheets (TSV)</div>
                                  </div>
                                  <Copy className="w-4 h-4 text-emerald-500 opacity-50 group-hover:opacity-100" />
                                </button>
                                
                                <div className="h-px bg-white/5 mx-2" />

                                <button
                                  onClick={handleExportCSV}
                                  className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                                >
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-gray-200">下載 CSV 文件</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-tight">Standard spreadseheets</div>
                                  </div>
                                  <FileDown className="w-4 h-4 text-brand-accent opacity-50 group-hover:opacity-100" />
                                </button>

                                <button
                                  onClick={handleExportTXT}
                                  className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center justify-between group"
                                >
                                  <div className="space-y-0.5">
                                    <div className="text-xs font-bold text-gray-200">下載純文字檔</div>
                                    <div className="text-[10px] text-gray-500 uppercase tracking-tight">Simple report (.txt)</div>
                                  </div>
                                  <ListOrdered className="w-4 h-4 text-gray-500 opacity-50 group-hover:opacity-100" />
                                </button>

                                {isGoogleAuthenticated && (
                                  <>
                                    <div className="h-px bg-white/5 mx-2" />
                                    <button
                                      onClick={handleGoogleLogout}
                                      className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl transition-colors flex items-center gap-3 group"
                                    >
                                      <LogOut className="w-3 h-3 text-red-500/50 group-hover:text-red-500" />
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-300">斷開 Google 連結</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                          copied 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                          : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : '快速複製'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {results.map((group, index) => (
                      <motion.div
                        key={`group-${index}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08, type: 'spring', stiffness: 100 }}
                        className="glass-card rounded-3xl p-6 relative overflow-hidden group hover:border-brand-accent/30 transition-colors"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Users2 className="w-16 h-16 text-brand-accent" />
                        </div>
                        <div className="flex items-center justify-between mb-5">
                          <div className="px-2.5 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-lg">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">組別 {index + 1}</span>
                          </div>
                          <span className="font-mono text-xs text-gray-500">{group.length} 人</span>
                        </div>
                        <ul className="space-y-2">
                          {group.map((name, nIndex) => (
                            <motion.li 
                              key={`${index}-${nIndex}`} 
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: (index * 0.1) + (nIndex * 0.05) }}
                              className="text-gray-300 font-medium flex items-center gap-3 text-sm"
                            >
                              <div className="w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                              {name}
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-gray-600 glass-card rounded-[3rem] border-2 border-dashed border-white/5 p-16 text-center space-y-6"
                >
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center">
                    <Users className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-gray-400">Ready for sorting?</h3>
                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto">
                      輸入名單後點擊「Generate Magic」按鈕來探索全新的分組體驗。
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>

        {/* Footer */}
        <footer className="pt-12 pb-8 text-center text-gray-600 border-t border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.5em] opacity-40">
            Powered by Gemini Intelligence • Modern Minimal Design
          </p>
        </footer>
      </div>

      {/* History Drawer Overlay */}
      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-bg border-l border-white/10 z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-brand-accent" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">歷史紀錄</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Sorting Archives</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {history.length > 0 && (
                <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex items-center gap-2">
                  <button
                    onClick={handleExportHistoryCSV}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase tracking-wider hover:bg-brand-accent/20 transition-all"
                  >
                    <FileDown className="w-3 h-3" /> 導出 CSV
                  </button>
                  <button
                    onClick={handleExportHistoryJSON}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
                  >
                    <FileUp className="w-3 h-3 rotate-180" /> 備份 JSON
                  </button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {history.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center opacity-20">
                      <History className="w-8 h-8" />
                    </div>
                    <p className="text-gray-500 font-medium">尚無歷史紀錄</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`glass-card rounded-2xl p-5 border cursor-pointer transition-all hover:border-brand-accent/50 group relative ${
                        activeHistoryId === item.id ? 'border-brand-accent bg-brand-accent/5' : 'border-white/5'
                      }`}
                      onClick={() => loadHistoryItem(item)}
                    >
                      <button 
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500/50" />
                      </button>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-gray-200">
                            {item.names.length} 人 • {item.groups.length} 組
                          </div>
                          <div className="text-[10px] text-brand-accent font-bold px-2 py-1 bg-brand-accent/10 rounded-lg">
                            BY {item.operator || '未知'}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {item.groups[0]?.slice(0, 3).map((name, i) => (
                            <span key={i} className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400">
                              {name}
                            </span>
                          ))}
                          {item.groups[0]?.length > 3 && (
                            <span className="text-[10px] text-gray-600">...</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20">
                <p className="text-[10px] text-gray-500 text-center uppercase tracking-[0.2em]">
                  Records stay local on your device
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
