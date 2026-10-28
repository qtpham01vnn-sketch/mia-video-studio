import React, { useState, useRef, useEffect } from 'react';
import { Scissors, SplitSquareHorizontal, History, Download, Trash2, X, Upload, Play, CheckCircle2 } from 'lucide-react';
import { saveAs } from 'file-saver';
import { DownloadHistoryItem, getDownloadHistory, deleteDownloadHistoryItem } from '../lib/draftStorage';

export const FastVideoSlicerModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [mode, setMode] = useState<'minutes' | 'parts' | 'custom'>('minutes');
  const [minutesPerPart, setMinutesPerPart] = useState<number>(5);
  const [totalParts, setTotalParts] = useState<number>(3);
  const [customMarkers, setCustomMarkers] = useState<string>('00:00 - 02:30\n02:30 - 05:00');
  const [skipIntroSec, setSkipIntroSec] = useState<number>(0);
  const [skipOutroSec, setSkipOutroSec] = useState<number>(0);
  const [slicing, setSlicing] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  if (!open) return null;

  const handleSelectVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const u = URL.createObjectURL(f);
    setVideoFile(f);
    setVideoUrl(u);
  };

  const computeSegments = (): Array<[number, number]> => {
    const start = Math.max(0, skipIntroSec);
    const end = Math.max(start + 1, duration - skipOutroSec);
    const usable = end - start;
    if (usable <= 0) return [];

    if (mode === 'minutes') {
      const step = Math.max(10, minutesPerPart * 60);
      const segs: Array<[number, number]> = [];
      for (let t = start; t < end; t += step) {
        segs.push([t, Math.min(end, t + step)]);
      }
      return segs;
    }
    if (mode === 'parts') {
      const count = Math.max(2, totalParts);
      const step = usable / count;
      return Array.from({ length: count }, (_, i) => [start + i * step, start + (i + 1) * step]);
    }
    // custom
    const lines = customMarkers.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parseSec = (s: string) => {
      const parts = s.trim().split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return Number(s) || 0;
    };
    const segs: Array<[number, number]> = [];
    for (const line of lines) {
      const [a, b] = line.split('-');
      if (a && b) {
        const sa = parseSec(a);
        const sb = parseSec(b);
        if (sb > sa) segs.push([sa, Math.min(duration, sb)]);
      }
    }
    return segs;
  };

  const segments = duration > 0 ? computeSegments() : [];

  const handleRunSlice = async () => {
    if (!videoFile || segments.length === 0) return;
    setSlicing(true);
    setProgress(0);
    try {
      const baseName = videoFile.name.replace(/\.[^.]+$/, '');
      for (let i = 0; i < segments.length; i++) {
        const [segStart, segEnd] = segments[i];
        const ratioStart = Math.max(0, Math.min(1, segStart / Math.max(1, duration)));
        const ratioEnd = Math.max(ratioStart, Math.min(1, segEnd / Math.max(1, duration)));
        const byteStart = Math.floor(videoFile.size * ratioStart);
        const byteEnd = Math.floor(videoFile.size * ratioEnd);
        const slicedBlob = videoFile.slice(byteStart, byteEnd, videoFile.type || 'video/mp4');
        saveAs(slicedBlob, `${baseName}_doan_${i + 1}_${Math.round(segStart)}s-${Math.round(segEnd)}s.mp4`);
        setProgress((i + 1) / segments.length);
        await new Promise((r) => setTimeout(r, 350));
      }
    } finally {
      setSlicing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0d1326] p-5 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-extrabold text-white">✂️ Cắt nhỏ video siêu nhanh (Không dựng lại)</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-300">
          Chia video Zoom, bài giảng, podcast 2–5 tiếng theo số phút, số đoạn hoặc mốc tự chọn. Cắt trực tiếp trên máy, giữ nguyên chất lượng gốc.
        </p>

        {!videoFile ? (
          <label className="mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-400/40 bg-slate-900/60 py-12 cursor-pointer hover:border-amber-400 transition">
            <Upload className="w-10 h-10 text-amber-400 mb-2" />
            <span className="font-bold text-sm text-white">Bấm để chọn video dài từ máy (MP4, MOV, WebM)</span>
            <span className="text-xs text-slate-400 mt-1">Xử lý 100% trên trình duyệt, không tải video lên mạng</span>
            <input type="file" accept="video/*" hidden onChange={handleSelectVideo} />
          </label>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl bg-black overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                className="max-h-56 mx-auto"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 px-3.5 py-2 rounded-lg border border-slate-800">
              <span className="font-semibold truncate">{videoFile.name}</span>
              <span className="text-amber-300 font-bold">
                Thời lượng: {Math.floor(duration / 60)}p {Math.round(duration % 60)}s
              </span>
            </div>

            {/* Thanh đỏ bỏ đoạn thừa đầu/cuối */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-rose-500/30 bg-rose-950/20 p-3">
              <div>
                <label className="text-xs font-bold text-rose-300 block mb-1">
                  🔴 Bỏ đoạn thừa đầu video (giây)
                </label>
                <input
                  type="number"
                  min={0}
                  value={skipIntroSec}
                  onChange={(e) => setSkipIntroSec(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-rose-300 block mb-1">
                  🔴 Bỏ đoạn thừa cuối video (giây)
                </label>
                <input
                  type="number"
                  min={0}
                  value={skipOutroSec}
                  onChange={(e) => setSkipOutroSec(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Cách chia đoạn */}
            <div className="grid grid-cols-3 gap-2">
              {[
                ['minutes', 'Theo số phút'],
                ['parts', 'Theo số đoạn'],
                ['custom', 'Theo mốc tự chọn'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMode(k as any)}
                  className={`rounded-xl py-2 text-xs font-bold border transition ${
                    mode === k
                      ? 'border-amber-400 bg-amber-400 text-slate-950'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === 'minutes' && (
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Số phút mỗi đoạn:</label>
                <input
                  type="number"
                  min={1}
                  value={minutesPerPart}
                  onChange={(e) => setMinutesPerPart(Math.max(1, Number(e.target.value)))}
                  className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
                />
              </div>
            )}

            {mode === 'parts' && (
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Chia đều thành bao nhiêu đoạn:</label>
                <input
                  type="number"
                  min={2}
                  value={totalParts}
                  onChange={(e) => setTotalParts(Math.max(2, Number(e.target.value)))}
                  className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm"
                />
              </div>
            )}

            {mode === 'custom' && (
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Nhập các mốc cắt (mỗi dòng 1 đoạn, vd: 00:00 - 03:00):
                </label>
                <textarea
                  rows={3}
                  value={customMarkers}
                  onChange={(e) => setCustomMarkers(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-xs font-mono"
                />
              </div>
            )}

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs">
              <div className="font-bold text-amber-300 mb-1.5">
                Sẽ xuất ra {segments.length} đoạn video:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {segments.map(([a, b], i) => (
                  <span key={i} className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200">
                    Đoạn #{i + 1}: {Math.floor(a / 60)}:{String(Math.round(a % 60)).padStart(2, '0')} →{' '}
                    {Math.floor(b / 60)}:{String(Math.round(b % 60)).padStart(2, '0')}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVideoFile(null)}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Chọn video khác
              </button>
              <button
                type="button"
                disabled={slicing || segments.length === 0}
                onClick={handleRunSlice}
                className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg hover:brightness-110 disabled:opacity-50"
              >
                {slicing ? `Đang cắt (${Math.round(progress * 100)}%)...` : `✂️ Cắt & Tải ${segments.length} đoạn ngay`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DownloadHistoryModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [items, setItems] = useState<DownloadHistoryItem[]>([]);

  const refresh = async () => {
    const list = await getDownloadHistory();
    setItems(list);
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-[#0d1326] p-5 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-extrabold text-white">Lịch sử tải về ({items.length})</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Chưa có video nào trong lịch sử tải về hôm nay.
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white truncate">{item.filename}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString('vi-VN')} · {item.durationSec.toFixed(1)}s ·{' '}
                    {(item.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => saveAs(item.blob, item.filename)}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-300"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải lại
                  </button>
                  <button
                    onClick={async () => {
                      await deleteDownloadHistoryItem(item.id);
                      refresh();
                    }}
                    className="rounded-lg border border-slate-700 p-1.5 text-rose-400 hover:bg-rose-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
