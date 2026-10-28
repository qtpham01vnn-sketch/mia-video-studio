import React, { useState, useMemo } from 'react';
import { Sparkles, Copy, Check, Search, X, Maximize2, Minimize2, Mic } from 'lucide-react';
import promptsData from '../data/promptsCatalog.json';

interface PromptItem {
  title: string;
  vi: string;
  en: string;
  sub?: string;
}

interface PromptCategory {
  id: string;
  name: string;
  emoji: string;
  prompts: PromptItem[];
}

interface PodcastSub {
  id: string;
  name: string;
  emoji: string;
}

const categories = (promptsData.categories as PromptCategory[]) || [];
const podcastSubs = (promptsData.podcastSubcategories as PodcastSub[]) || [];
const totalPromptsCount = categories.reduce((acc, c) => acc + c.prompts.length, 0);

export const PromptVaultBanner: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-[#17122b] via-[#1f1738] to-[#2a1d15] p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-0.5 text-xs font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> Quà tặng VIP đã mở khóa 100%
          </div>
          <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
            Kho {totalPromptsCount} Prompt tạo ảnh siêu đẹp, siêu nghệ thuật
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            {categories.length} phong cách nghệ thuật · {podcastSubs.length} ngành nghề Podcast · Chừa sẵn khoảng trống đặt chữ · Sao chép 1 chạm
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-110 transition"
        >
          <Sparkles className="w-4 h-4" /> Mở Kho {totalPromptsCount} Prompt VIP
        </button>
      </div>
    </div>
  );
};

export const PromptVaultModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || 'podcast-industry');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeCat = useMemo(
    () => categories.find((c) => c.id === selectedCatId) || categories[0],
    [selectedCatId]
  );

  const filteredPrompts = useMemo(() => {
    if (!activeCat) return [];
    let list = activeCat.prompts.map((p, idx) => ({ p, num: idx + 1 }));
    if (selectedCatId === 'podcast-industry' && selectedSubId) {
      list = list.filter((item) => item.p.sub === selectedSubId);
    }
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    if (!q) return list;
    if (/^\d+$/.test(q)) {
      return list.filter((item) => String(item.num) === q);
    }
    return list.filter(({ p }) => `${p.title} ${p.vi} ${p.en}`.toLowerCase().includes(q));
  }, [activeCat, selectedCatId, selectedSubId, searchQuery]);

  if (!open) return null;

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div
        className={`flex flex-col rounded-2xl border border-amber-400/40 bg-[#0d1226] text-slate-100 shadow-2xl overflow-hidden transition-all ${
          isFullscreen ? 'w-screen h-screen rounded-none' : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-gradient-to-r from-[#151c38] to-[#23192d] px-5 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              ● QUÀ TẶNG VIP · ĐÃ MỞ KHÓA TOÀN BỘ
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              KHO {totalPromptsCount} CÂU LỆNH TẠO ẢNH AI
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              {isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-rose-600 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo từ khóa hoặc số thứ tự (vd: 12, hoàng hôn, bác sĩ, áo dài)…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row gap-4 p-5 overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto pr-1">
            {categories.map((cat) => {
              const active = cat.id === selectedCatId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCatId(cat.id);
                    setSelectedSubId(null);
                  }}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm font-bold transition shrink-0 ${
                    active
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                      : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span className="truncate">
                    {cat.emoji} {cat.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${
                      active ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.prompts.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Prompts List */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Podcast industry sub-filter */}
            {selectedCatId === 'podcast-industry' && (
              <div className="mb-3 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubId(null)}
                  className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                    selectedSubId === null
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Tất cả 20 ngành ({activeCat?.prompts.length || 0})
                </button>
                {podcastSubs.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubId(sub.id)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      selectedSubId === sub.id
                        ? 'border-amber-400 bg-amber-400 text-slate-950 font-bold'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {sub.emoji} {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Prompt Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredPrompts.map(({ p, num }) => (
                <div
                  key={num}
                  className="rounded-xl border border-slate-800 bg-slate-900/75 p-4 hover:border-amber-400/50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-400/20 border border-amber-400/40 px-2 py-0.5 text-xs font-extrabold text-amber-300">
                          #{num}
                        </span>
                        <h4 className="font-bold text-white text-sm sm:text-base">{p.title}</h4>
                      </div>
                      <p className="mt-1 text-xs text-amber-200/90 font-medium">{p.vi}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(p.en, num)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                        copiedIdx === num
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      }`}
                    >
                      {copiedIdx === num ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Đã chép
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Chép Prompt
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 p-2.5 text-xs text-slate-300 font-mono leading-relaxed select-all">
                    {p.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
