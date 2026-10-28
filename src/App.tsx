import React, { useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  Camera,
  Sparkles,
  BookOpen,
  GraduationCap,
  Scissors,
  Home,
  PhoneCall,
} from 'lucide-react';
import { BatchImageStudio } from './components/BatchImageStudio';
import { VideoEditorStudio } from './components/VideoEditorStudio';
import { TeleprompterStudio } from './components/TeleprompterStudio';
import { PromptVaultBanner, PromptVaultModal } from './components/PromptVaultModal';
import { GuideModalPage, CourseShowcasePage } from './components/GuideAndCoursePages';
import { FastVideoSlicerModal } from './components/VideoSlicerModals';

type ActiveView = 'hub' | 'video' | 'image' | 'record' | 'guide' | 'course';

export function App() {
  const [activeView, setActiveView] = useState<ActiveView>('hub');
  const [guideTab, setGuideTab] = useState<'video' | 'image' | 'record'>('video');
  const [promptVaultOpen, setPromptVaultOpen] = useState<boolean>(false);
  const [fastSlicerOpen, setFastSlicerOpen] = useState<boolean>(false);

  const [transferredItems, setTransferredItems] = useState<
    Array<{ name: string; blob: Blob; url: string; caption: string }>
  >([]);

  const handleSendToVideoStudio = (
    items: Array<{ name: string; blob: Blob; url: string; caption: string }>
  ) => {
    setTransferredItems(items);
    setActiveView('video');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060b19] text-slate-100">
      {/* Top Global Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080f24]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveView('hub')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              M
            </div>
            <div>
              <div className="font-black text-base tracking-tight text-white group-hover:text-amber-300 transition">
                MIA STUDIO
              </div>
              <div className="text-[10px] font-semibold text-amber-400/90">
                Ghép Ảnh, Chữ & Tạo Video Nhanh
              </div>
            </div>
          </button>

          <nav className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveView('hub')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeView === 'hub'
                  ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" /> Không gian sáng tạo
            </button>

            <button
              type="button"
              onClick={() => setActiveView('video')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                activeView === 'video'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                  : 'bg-slate-900/90 border border-amber-400/30 text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Tạo video
            </button>

            <button
              type="button"
              onClick={() => setActiveView('image')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                activeView === 'image'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md'
                  : 'bg-slate-900/90 border border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Ghép ảnh & chữ
            </button>

            <button
              type="button"
              onClick={() => setActiveView('record')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                activeView === 'record'
                  ? 'bg-sky-400 text-slate-950 shadow-md'
                  : 'bg-slate-900/90 border border-sky-400/30 text-sky-300 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Tự quay + Nhắc chữ
            </button>

            <button
              type="button"
              onClick={() => setPromptVaultOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-400/20"
            >
              <Sparkles className="w-3.5 h-3.5" /> 680 Prompt VIP
            </button>

            <button
              type="button"
              onClick={() => setActiveView('course')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeView === 'course'
                  ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" /> Giới thiệu
            </button>

            <button
              type="button"
              onClick={() => setActiveView('guide')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                activeView === 'guide'
                  ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Hướng dẫn
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 space-y-6">
        {activeView === 'hub' && (
          <div className="space-y-6">
            {/* HERO BANNER (Giống hệt ảnh chụp 3) */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#131f45] via-[#0d1633] to-[#080d20] px-6 py-12 text-center shadow-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,185,66,0.18),transparent_65%)]" />
              <div className="relative z-10 max-w-3xl mx-auto space-y-5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  <Sparkles className="w-3.5 h-3.5" /> KHÔNG GIAN SÁNG TẠO CỦA BẠN
                </div>

                <h1 className="text-3xl sm:text-5xl md:text-6xl font-black leading-[1.18] tracking-tight">
                  <span className="block bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow">
                    Biến ảnh và ý tưởng
                  </span>
                  <span className="block bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200 bg-clip-text text-transparent">
                    thành nội dung cuốn hút
                  </span>
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveView('video')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-7 py-3.5 text-sm sm:text-base font-black text-slate-950 shadow-xl shadow-amber-500/25 hover:brightness-110 transition"
                  >
                    <Film className="w-5 h-5" /> Tạo video
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveView('image')}
                    className="inline-flex items-center gap-2 rounded-2xl border-2 border-amber-400/80 bg-slate-950/80 px-7 py-3.5 text-sm sm:text-base font-extrabold text-amber-300 hover:bg-slate-900 transition"
                  >
                    <ImageIcon className="w-5 h-5" /> Ghép ảnh & chữ
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setActiveView('record')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 px-8 py-3 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-sky-500/20 hover:brightness-110 transition"
                  >
                    <Camera className="w-4 h-4" /> Tự quay + Nhắc chữ
                  </button>
                </div>
              </div>
            </div>

            {/* 2 STUDIO CARDS LỚN (Giống hệt ảnh chụp 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-3xl border border-slate-800 bg-[#0d1630] p-6 sm:p-8 flex flex-col justify-between gap-5 hover:border-amber-400/50 transition shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400">
                      <Film className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                        STUDIO VIDEO
                      </span>
                      <h2 className="text-2xl font-black text-white">Tạo video</h2>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Biến hàng trăm ảnh thành video album kỷ niệm trong vài phút; làm podcast giọng thật, video bán hàng,
                    kể chuyện theo tranh, kho 68 bản nhạc nền và hàng chục hiệu ứng chuyển cảnh, lớp phủ tự nhiên.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('video')}
                  className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 py-3.5 text-sm font-black text-slate-950 shadow-lg hover:brightness-110 flex items-center justify-center gap-2"
                >
                  <Film className="w-4 h-4" /> Mở trình tạo video
                </button>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-[#0d1630] p-6 sm:p-8 flex flex-col justify-between gap-5 hover:border-amber-400/50 transition shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                        STUDIO HÌNH ẢNH
                      </span>
                      <h2 className="text-2xl font-black text-white">Ghép ảnh & chữ</h2>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Tạo nhanh cả bộ ảnh đồng nhất với chữ nghệ thuật tiếng Việt, logo bo góc và chữ ký bản quyền;
                    tách đoạn văn bản tự động, xuất gói .ZIP, Ebook PDF hoặc chuyển thẳng sang làm video.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('image')}
                  className="w-full rounded-2xl border-2 border-amber-400/70 bg-slate-900 py-3.5 text-sm font-extrabold text-amber-300 hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" /> Mở công cụ ghép ảnh
                </button>
              </div>
            </div>

            {/* 2 TIỆN ÍCH BỔ TRỢ: CẮT NHỎ SIÊU NHANH & TỰ QUAY NHẮC CHỮ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
                <div className="rounded-xl bg-amber-400/15 p-3 text-amber-400 shrink-0">
                  <Scissors className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <span className="text-xs font-extrabold text-amber-400 uppercase">Cắt nhỏ siêu nhanh</span>
                  <h3 className="text-lg font-black text-white">Cắt video dài 2–5 tiếng không cần dựng lại</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Chia video Zoom, bài giảng hay video máy quay dài thành các đoạn ngắn theo phút, số đoạn hoặc mốc tự chọn.
                    Có đánh dấu bỏ đoạn thừa đầu/cuối.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFastSlicerOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    <Scissors className="w-3.5 h-3.5" /> Mở Cắt video siêu nhanh
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4">
                <div className="rounded-xl bg-sky-400/15 p-3 text-sky-400 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-2 flex-1">
                  <span className="text-xs font-extrabold text-sky-400 uppercase">Studio của chính bạn</span>
                  <h3 className="text-lg font-black text-white">Tự quay + Máy nhắc chữ thông minh</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Quay chính mình hoặc thu âm đọc theo kịch bản chạy chữ. Có chế độ mặt nạ 3D giấu mặt, viền khung nổi bật,
                    làm đẹp da và chèn thẳng vào trình tạo video.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('record')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-sky-300"
                  >
                    <Camera className="w-3.5 h-3.5" /> Mở Tự quay + Nhắc chữ
                  </button>
                </div>
              </div>
            </div>

            {/* KHO 680 PROMPT VIP BANNER */}
            <PromptVaultBanner onOpen={() => setPromptVaultOpen(true)} />
          </div>
        )}

        {activeView === 'video' && (
          <VideoEditorStudio
            initialTransferredImages={transferredItems}
            onOpenGuide={() => {
              setGuideTab('video');
              setActiveView('guide');
            }}
          />
        )}

        {activeView === 'image' && (
          <div className="space-y-6">
            <PromptVaultBanner onOpen={() => setPromptVaultOpen(true)} />
            <BatchImageStudio onSendToVideoStudio={handleSendToVideoStudio} />
          </div>
        )}

        {activeView === 'record' && (
          <TeleprompterStudio
            onInsertIntoVideo={(clip) => {
              handleSendToVideoStudio([clip]);
            }}
          />
        )}

        {activeView === 'guide' && (
          <GuideModalPage
            initialTab={guideTab}
            onBackToStudio={(mode) => {
              setActiveView(mode);
            }}
          />
        )}

        {activeView === 'course' && (
          <CourseShowcasePage
            onOpenTool={(mode) => {
              setActiveView(mode);
            }}
          />
        )}
      </main>

      {/* Global Modals */}
      <PromptVaultModal open={promptVaultOpen} onClose={() => setPromptVaultOpen(false)} />
      <FastVideoSlicerModal open={fastSlicerOpen} onClose={() => setFastSlicerOpen(false)} />
    </div>
  );
}

export default App;
