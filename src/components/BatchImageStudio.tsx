import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Sparkles,
  Download,
  FileArchive,
  BookOpen,
  Film,
  Trash2,
  CheckSquare,
  Square,
  Type,
  Stamp,
  Wand2,
  FileText,
  RotateCcw,
  Eye,
  X,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import {
  BatchTextStyle,
  SignatureConfig,
  LogoConfig,
  DEFAULT_TEXT_STYLE,
  DEFAULT_SIGNATURE,
  DEFAULT_LOGO,
  AnchorPosition,
  renderImageWithTypography,
  canvasToBlob,
  exportBatchAsZip,
  exportBatchAsPdf,
  loadImageElement,
} from '../engine/imageTypographyEngine';
import { VIETNAMESE_FONTS } from '../data/effectsCatalog';
import { generateAICaptionsForImages } from '../lib/aiGateway';

export interface BatchImageItem {
  id: string;
  file: File;
  url: string;
  name: string;
  caption: string;
}

const ANCHOR_OPTIONS: Array<{ value: AnchorPosition; label: string }> = [
  { value: 'top-left', label: '↖ Trên trái' },
  { value: 'top-center', label: '↑ Trên giữa' },
  { value: 'top-right', label: '↗ Trên phải' },
  { value: 'middle-left', label: '← Giữa trái' },
  { value: 'middle-center', label: '● Chính giữa' },
  { value: 'middle-right', label: '→ Giữa phải' },
  { value: 'bottom-left', label: '↙ Dưới trái' },
  { value: 'bottom-center', label: '↓ Dưới giữa' },
  { value: 'bottom-right', label: '↘ Dưới phải' },
];

export const BatchImageStudio: React.FC<{
  onSendToVideoStudio: (items: Array<{ name: string; blob: Blob; url: string; caption: string }>) => void;
}> = ({ onSendToVideoStudio }) => {
  const [images, setImages] = useState<BatchImageItem[]>([]);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());
  const [draftBatchText, setDraftBatchText] = useState<string>('');
  const [aiTopic, setAiTopic] = useState<string>('Kỷ niệm gia đình hạnh phúc');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const [style, setStyle] = useState<BatchTextStyle>(() => {
    try {
      const saved = localStorage.getItem('batch-image-text-style');
      return saved ? { ...DEFAULT_TEXT_STYLE, ...JSON.parse(saved) } : DEFAULT_TEXT_STYLE;
    } catch {
      return DEFAULT_TEXT_STYLE;
    }
  });

  const [signature, setSignature] = useState<SignatureConfig>(() => {
    try {
      const saved = localStorage.getItem('batch-image-text-signature');
      return saved ? { ...DEFAULT_SIGNATURE, ...JSON.parse(saved) } : DEFAULT_SIGNATURE;
    } catch {
      return DEFAULT_SIGNATURE;
    }
  });

  const [logo, setLogo] = useState<LogoConfig>(DEFAULT_LOGO);
  const [logoImgEl, setLogoImgEl] = useState<HTMLImageElement | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'text' | 'brand'>('text');
  const [exporting, setExporting] = useState<boolean>(false);
  const [zoomedCanvasUrl, setZoomedCanvasUrl] = useState<string | null>(null);

  const canvasMapRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageElCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    try {
      localStorage.setItem('batch-image-text-style', JSON.stringify(style));
    } catch {
      // ignore
    }
  }, [style]);

  useEffect(() => {
    try {
      localStorage.setItem('batch-image-text-signature', JSON.stringify(signature));
    } catch {
      // ignore
    }
  }, [signature]);

  // Re-render all preview canvases whenever images/style/logo/signature change
  useEffect(() => {
    images.forEach(async (item) => {
      const canvas = canvasMapRef.current.get(item.id);
      if (!canvas) return;
      let imgEl = imageElCacheRef.current.get(item.id);
      if (!imgEl) {
        try {
          imgEl = await loadImageElement(item.url);
          imageElCacheRef.current.set(item.id, imgEl);
        } catch {
          return;
        }
      }
      renderImageWithTypography(canvas, {
        image: imgEl,
        text: item.caption,
        style,
        signature,
        logo,
        logoImage: logoImgEl,
      });
    });
  }, [images, style, signature, logo, logoImgEl]);

  const handleUploadImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems: BatchImageItem[] = files.map((file, i) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      caption: '',
    }));
    setImages((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const handleSplitParagraphsToImages = () => {
    if (!draftBatchText.trim()) return;
    const parts = draftBatchText
      .split(/\r?\n\s*\r?\n|\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    setImages((prev) =>
      prev.map((item, idx) => ({
        ...item,
        caption: parts[idx] !== undefined ? parts[idx] : parts[0] || item.caption,
      }))
    );
  };

  const handleUploadTxtFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setDraftBatchText(text);
    e.target.value = '';
  };

  const handleGenerateAICaptions = async () => {
    if (images.length === 0) return;
    setAiLoading(true);
    try {
      const captions = await generateAICaptionsForImages(aiTopic, images.length);
      setDraftBatchText(captions.join('\n\n'));
      setImages((prev) =>
        prev.map((item, idx) => ({
          ...item,
          caption: captions[idx] || captions[0] || item.caption,
        }))
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const el = await loadImageElement(url);
    setLogoImgEl(el);
    setLogo((prev) => ({ ...prev, enabled: true, src: url }));
    e.target.value = '';
  };

  const getTargetImages = () => {
    if (pickedIds.size === 0) return images;
    return images.filter((img) => pickedIds.has(img.id));
  };

  const handleExportZip = async (ext: 'jpg' | 'png') => {
    const targets = getTargetImages();
    if (!targets.length) return;
    setExporting(true);
    try {
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const out: Array<{ name: string; blob: Blob }> = [];
      for (const item of targets) {
        const c = canvasMapRef.current.get(item.id);
        if (c) {
          const blob = await canvasToBlob(c, mime, 0.94);
          out.push({ name: item.name, blob });
        }
      }
      await exportBatchAsZip(out, ext);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    const targets = getTargetImages();
    if (!targets.length) return;
    setExporting(true);
    try {
      const canvases = targets
        .map((t) => canvasMapRef.current.get(t.id))
        .filter((c): c is HTMLCanvasElement => !!c);
      await exportBatchAsPdf(canvases);
    } finally {
      setExporting(false);
    }
  };

  const handleTransferToVideo = async () => {
    const targets = getTargetImages();
    if (!targets.length) return;
    setExporting(true);
    try {
      const rendered: Array<{ name: string; blob: Blob; url: string; caption: string }> = [];
      for (const item of targets) {
        const c = canvasMapRef.current.get(item.id);
        if (c) {
          const blob = await canvasToBlob(c, 'image/jpeg', 0.94);
          rendered.push({
            name: item.name,
            blob,
            url: URL.createObjectURL(blob),
            caption: item.caption,
          });
        }
      }
      onSendToVideoStudio(rendered);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0d152c] p-4 shadow-lg">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            STUDIO HÌNH ẢNH HÀNG LOẠT
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Ghép ảnh & chữ đồng nhất ({images.length} ảnh)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={images.length === 0 || exporting}
            onClick={() => handleExportZip('jpg')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-40"
          >
            <FileArchive className="w-4 h-4 text-amber-400" /> Tải gói .ZIP (JPG)
          </button>
          <button
            type="button"
            disabled={images.length === 0 || exporting}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-40"
          >
            <BookOpen className="w-4 h-4 text-sky-400" /> Xuất Ebook PDF
          </button>
          <button
            type="button"
            disabled={images.length === 0 || exporting}
            onClick={handleTransferToVideo}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-40"
          >
            <Film className="w-4 h-4" /> Chuyển sang Tạo Video ngay
          </button>
        </div>
      </div>

      {/* 3-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* CỘT 1: Quản lý Ảnh (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#0d152c] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white">1. Tải ảnh lên ({images.length})</h3>
            {images.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (pickedIds.size === images.length) setPickedIds(new Set());
                  else setPickedIds(new Set(images.map((i) => i.id)));
                }}
                className="text-xs font-semibold text-amber-400 hover:underline"
              >
                {pickedIds.size === images.length ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
            )}
          </div>

          <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-400/50 bg-slate-900/60 py-6 px-3 cursor-pointer hover:border-amber-400 transition text-center">
            <Upload className="w-7 h-7 text-amber-400 mb-1.5" />
            <span className="text-xs font-extrabold text-white">+ Thêm nhiều ảnh cùng lúc</span>
            <span className="text-[11px] text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, WebP</span>
            <input type="file" accept="image/*" multiple hidden onChange={handleUploadImages} />
          </label>

          <div className="flex-1 max-h-96 overflow-y-auto space-y-2 pr-1">
            {images.map((item, idx) => {
              const picked = pickedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 rounded-xl border p-2 transition ${
                    picked ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setPickedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                    className="text-amber-400"
                  >
                    {picked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-500" />}
                  </button>
                  <img src={item.url} alt={item.name} className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      #{idx + 1} · {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.caption || '(chưa có chữ)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((x) => x.id !== item.id))}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT 2: Nhập nội dung chữ - 3 Cách (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0d152c] p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white">2. Nhập nội dung chữ (3 cách thông minh)</h3>
            <label className="inline-flex items-center gap-1 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700">
              <FileText className="w-3.5 h-3.5 text-amber-400" /> Tải file .txt
              <input type="file" accept=".txt" hidden onChange={handleUploadTxtFile} />
            </label>
          </div>

          {/* AI Caption Generator via TuanPham Gateway */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-2">
            <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5" /> Trợ lý AI viết lời bình tự động cho cả bộ ảnh:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Nhập chủ đề (vd: Kỷ niệm gia đình, Du lịch Đà Lạt, Bán hàng mỹ phẩm)…"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={aiLoading || images.length === 0}
                onClick={handleGenerateAICaptions}
                className="shrink-0 rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-400 disabled:opacity-40"
              >
                {aiLoading ? 'Đang viết...' : '✨ AI Viết'}
              </button>
            </div>
          </div>

          {/* Ô Dán văn bản + TÁCH ĐOẠN */}
          <div className="space-y-2">
            <textarea
              rows={4}
              value={draftBatchText}
              onChange={(e) => setDraftBatchText(e.target.value)}
              placeholder="Dán văn bản vào đây: Mỗi dòng (hoặc mỗi đoạn cách 1 dòng trống) sẽ tự gắn vào 1 ảnh tương ứng..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSplitParagraphsToImages}
                className="flex-1 rounded-xl bg-amber-400 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 transition"
              >
                ⚡ TÁCH ĐOẠN & GẮN VÀO TỪNG ẢNH
              </button>
              <button
                type="button"
                onClick={() =>
                  setImages((prev) => prev.map((it) => ({ ...it, caption: draftBatchText.trim() })))
                }
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
              >
                Dùng chung 1 nội dung
              </button>
            </div>
          </div>

          {/* Chỉnh riêng từng ảnh */}
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            <div className="text-xs font-bold text-slate-400">Hoặc gõ chỉnh riêng từng ảnh:</div>
            {images.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-2">
                <span className="w-7 text-xs font-bold text-amber-400">#{idx + 1}</span>
                <input
                  type="text"
                  value={item.caption}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImages((prev) =>
                      prev.map((x) => (x.id === item.id ? { ...x, caption: val } : x))
                    );
                  }}
                  placeholder={`Nội dung chữ cho ảnh #${idx + 1}...`}
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CỘT 3: Style Chữ, Logo & Chữ ký (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-800 bg-[#0d152c] p-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setActiveRightTab('text')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold transition ${
                activeRightTab === 'text' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
              }`}
            >
              <Type className="w-3.5 h-3.5" /> Kiểu Chữ
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('brand')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-extrabold transition ${
                activeRightTab === 'brand' ? 'bg-amber-400 text-slate-950' : 'text-slate-300'
              }`}
            >
              <Stamp className="w-3.5 h-3.5" /> Logo & Chữ ký
            </button>
          </div>

          {activeRightTab === 'text' ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Phông chữ tiếng Việt (26+ font):</label>
                <select
                  value={style.fontFamily}
                  onChange={(e) => setStyle({ ...style, fontFamily: e.target.value })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {VIETNAMESE_FONTS.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Cỡ chữ: {style.fontSize}px
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={130}
                    value={style.fontSize}
                    onChange={(e) => setStyle({ ...style, fontSize: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Độ dày viền: {style.strokeWidth}px
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    value={style.strokeWidth}
                    onChange={(e) => setStyle({ ...style, strokeWidth: Number(e.target.value) })}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <span>Màu chữ</span>
                  <input
                    type="color"
                    value={style.color}
                    onChange={(e) => setStyle({ ...style, color: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <span>Màu viền</span>
                  <input
                    type="color"
                    value={style.strokeColor}
                    onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Vị trí điểm neo (9 góc):</label>
                <select
                  value={style.anchor}
                  onChange={(e) => setStyle({ ...style, anchor: e.target.value as AnchorPosition })}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {ANCHOR_OPTIONS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Khung hộp nền chữ:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ['none', 'Không nền'],
                    ['rounded', 'Hộp bo góc'],
                    ['bar', 'Dải băng ngang'],
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setStyle({ ...style, bgStyle: k as any })}
                      className={`rounded-lg py-1.5 font-bold border ${
                        style.bgStyle === k
                          ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={style.uppercase}
                    onChange={(e) => setStyle({ ...style, uppercase: e.target.checked })}
                    className="accent-amber-400"
                  />
                  <span>IN HOA TẤT CẢ</span>
                </label>
                <button
                  type="button"
                  onClick={() => setStyle(DEFAULT_TEXT_STYLE)}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Mặc định
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Logo */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-white flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={logo.enabled}
                      onChange={(e) => setLogo({ ...logo, enabled: e.target.checked })}
                      className="accent-amber-400"
                    />
                    Chèn Logo thương hiệu
                  </label>
                  <label className="cursor-pointer rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-slate-950">
                    Chọn ảnh Logo
                    <input type="file" accept="image/*" hidden onChange={handleUploadLogo} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Kích thước: {logo.widthPct}%</span>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      value={logo.widthPct}
                      onChange={(e) => setLogo({ ...logo, widthPct: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block">Bo góc: {logo.rounded}%</span>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      value={logo.rounded}
                      onChange={(e) => setLogo({ ...logo, rounded: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
                <label className="font-bold text-white flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={signature.enabled}
                    onChange={(e) => setSignature({ ...signature, enabled: e.target.checked })}
                    className="accent-amber-400"
                  />
                  Chữ ký bản quyền / Hotline góc ảnh
                </label>
                <input
                  type="text"
                  value={signature.text}
                  onChange={(e) => setSignature({ ...signature, text: e.target.value })}
                  placeholder="© Thương hiệu của bạn · 09xx xxx xxx"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Rendered Canvas Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-white">
            Xem trước & Tải từng ảnh ({images.length} ảnh đã ghép)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((item, idx) => (
              <div
                key={item.id}
                className="group relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg"
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasMapRef.current.set(item.id, el);
                    else canvasMapRef.current.delete(item.id);
                  }}
                  onClick={() => {
                    const c = canvasMapRef.current.get(item.id);
                    if (c) setZoomedCanvasUrl(c.toDataURL('image/jpeg', 0.94));
                  }}
                  className="w-full h-auto block cursor-zoom-in"
                />
                <div className="flex items-center justify-between bg-slate-950/90 px-3 py-2 text-xs">
                  <span className="font-bold text-amber-400">Ảnh #{idx + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const c = canvasMapRef.current.get(item.id);
                        if (c) setZoomedCanvasUrl(c.toDataURL('image/jpeg', 0.94));
                      }}
                      className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:bg-slate-800"
                      title="Phóng to"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const c = canvasMapRef.current.get(item.id);
                        if (!c) return;
                        const blob = await canvasToBlob(c, 'image/jpeg', 0.94);
                        const base = item.name.replace(/\.[^.]+$/, '');
                        saveAs(blob, `${base}_text.jpg`);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 font-extrabold text-slate-950 hover:bg-amber-300"
                    >
                      <Download className="w-3.5 h-3.5" /> Tải JPG
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomedCanvasUrl && (
        <div
          onClick={() => setZoomedCanvasUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={zoomedCanvasUrl} alt="Xem phóng to" className="max-h-[88vh] w-auto rounded-xl shadow-2xl" />
            <button
              onClick={() => setZoomedCanvasUrl(null)}
              className="absolute -top-3 -right-3 rounded-full bg-rose-600 p-1.5 text-white shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
