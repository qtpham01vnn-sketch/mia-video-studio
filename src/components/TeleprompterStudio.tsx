import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Mic,
  Play,
  Square,
  Download,
  Film,
  Sparkles,
  Wand2,
  Shield,
  Sliders,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { generateAITeleprompterScript } from '../lib/aiGateway';

const MASK_OPTIONS = [
  { id: 'none', label: '😊 Mặt thật (Không che)' },
  { id: 'fox', label: '🦊 Cáo thông thái 3D' },
  { id: 'lion', label: '🦁 Sư tử vàng 3D' },
  { id: 'robot', label: '🤖 Robot AI tương lai' },
  { id: 'cat', label: '🐱 Mèo thần tài 3D' },
  { id: 'panda', label: '🐼 Gấu trúc dễ thương' },
  { id: 'owl', label: '🦉 Cú mèo học giả' },
  { id: 'unicorn', label: '🦄 Kỳ lân phép thuật' },
  { id: 'astronaut', label: '👨‍🚀 Phi hành gia vũ trụ' },
  { id: 'crown', label: '👑 Vương miện hoàng gia' },
];

const BORDER_STYLES = [
  { id: 'gold', label: '✨ Viền Vàng Hoàng Kim', css: 'border-4 border-amber-400 shadow-[0_0_25px_rgba(245,185,66,0.4)]' },
  { id: 'cyan', label: '💎 Viền Xanh Neon Cyber', css: 'border-4 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,0.4)]' },
  { id: 'rose', label: '🌸 Viền Hồng Đào', css: 'border-4 border-rose-400 shadow-[0_0_25px_rgba(251,113,133,0.4)]' },
  { id: 'emerald', label: '🌿 Viền Ngọc Lục Bảo', css: 'border-4 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)]' },
  { id: 'none', label: '🚫 Không viền', css: 'border border-slate-800' },
];

export const TeleprompterStudio: React.FC<{
  onInsertIntoVideo: (clip: { name: string; blob: Blob; url: string; caption: string }) => void;
}> = ({ onInsertIntoVideo }) => {
  const [title, setTitle] = useState<string>('Chia sẻ kiến thức hôm nay');
  const [script, setScript] = useState<string>(() => {
    return (
      localStorage.getItem('mia_teleprompter_script') ||
      `Xin chào tất cả các bạn!\nHôm nay mình rất vui được chia sẻ với các bạn một chủ đề vô cùng thú vị.\nHãy nhìn thẳng vào ống kính, mỉm cười thật tự nhiên và đọc theo từng dòng chữ đang trôi nhẹ trên màn hình nhé.\nMọi thứ đều được xử lý trực tiếp trên thiết bị của bạn, an toàn và sắc nét!`
    );
  });

  const [aiTopic, setAiTopic] = useState<string>('Mẹo giữ gìn sức khỏe và năng lượng tích cực mỗi sáng');
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);

  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [maskId, setMaskId] = useState<string>('none');
  const [borderId, setBorderId] = useState<string>('gold');
  const [beautyFilter, setBeautyFilter] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(28);
  const [scrollSpeed, setScrollSpeed] = useState<number>(35); // px per second

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [recording, setRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>('');

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('mia_teleprompter_script', script);
    } catch {
      // ignore
    }
  }, [script]);

  useEffect(() => {
    if (!isScrolling) return;
    const interval = setInterval(() => {
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop += scrollSpeed / 20;
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isScrolling, scrollSpeed]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleToggleCamera = async () => {
    if (cameraActive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: aspectRatio === '16:9' ? 1280 : 720,
          height: aspectRatio === '16:9' ? 720 : 1280,
        },
        audio: true,
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }
    } catch {
      alert('Không mở được Camera/Micro. Vui lòng cấp quyền truy cập Camera và Micro trên trình duyệt.');
    }
  };

  const handleStartRecordWithCountdown = async () => {
    if (!cameraActive) {
      await handleToggleCamera();
    }
    if (!streamRef.current) return;

    setCountdown(3);
    for (let c = 3; c >= 1; c--) {
      setCountdown(c);
      await new Promise((r) => setTimeout(r, 900));
    }
    setCountdown(0);

    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    setIsScrolling(true);

    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'video/webm' });
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      setIsScrolling(false);
    };
    recorderRef.current = mr;
    mr.start(300);
    setRecording(true);
  };

  const handleStopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    setIsScrolling(false);
  };

  const handleGenerateScript = async () => {
    setAiGenerating(true);
    try {
      const generated = await generateAITeleprompterScript(aiTopic, 60);
      if (generated) setScript(generated);
    } finally {
      setAiGenerating(false);
    }
  };

  const activeBorder = BORDER_STYLES.find((b) => b.id === borderId)?.css || '';
  const activeMaskEmoji = MASK_OPTIONS.find((m) => m.id === maskId)?.label.split(' ')[0] || '';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-[#0d152c] p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
              STUDIO CỦA CHÍNH BẠN
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Tự quay video với máy nhắc chữ (Teleprompter)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCamera}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                cameraActive
                  ? 'bg-slate-800 text-rose-400 border border-rose-500/40'
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
              }`}
            >
              <Camera className="w-4 h-4" /> {cameraActive ? 'Tắt Camera' : 'Bật Camera & Micro'}
            </button>

            {!recording ? (
              <button
                type="button"
                onClick={handleStartRecordWithCountdown}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-110"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Bắt đầu quay (3-2-1)
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white animate-pulse"
              >
                <Square className="w-4 h-4 fill-white" /> Dừng quay
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Kịch bản & Cài đặt (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-amber-400 block mb-1">Tiêu đề video (tên file):</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-sm text-white"
              />
            </div>

            {/* AI Script Writer */}
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 space-y-2">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" /> Nhờ AI viết kịch bản đọc mẫu (60 giây):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Nhập chủ đề muốn chia sẻ..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={handleGenerateScript}
                  className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-400"
                >
                  {aiGenerating ? 'Đang viết...' : '✨ Soạn kịch bản'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Kịch bản của bạn:</label>
                <button
                  type="button"
                  onClick={() => setIsScrolling(!isScrolling)}
                  className="text-xs font-bold text-amber-400 hover:underline"
                >
                  {isScrolling ? '⏸ Tạm dừng chạy chữ' : '▶ Chạy thử chữ'}
                </button>
              </div>
              <textarea
                rows={7}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Dán kịch bản của bạn vào đây. Phụ đề và máy nhắc chữ sẽ chạy đúng theo nội dung này..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs sm:text-sm text-white leading-relaxed focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Khung hình:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['9:16', '16:9'] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => setAspectRatio(ar)}
                      className={`rounded-lg py-1.5 font-bold border ${
                        aspectRatio === ar
                          ? 'border-amber-400 bg-amber-400 text-slate-950'
                          : 'border-slate-700 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Chế độ giấu mặt / Mặt nạ 3D:</span>
                <select
                  value={maskId}
                  onChange={(e) => setMaskId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white"
                >
                  {MASK_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Cỡ chữ chạy: {fontSize}px</span>
                <input
                  type="range"
                  min={18}
                  max={48}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Tốc độ chữ: {scrollSpeed}</span>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-full accent-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={beautyFilter}
                  onChange={(e) => setBeautyFilter(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>✨ Làm đẹp da & Sáng mịn tự nhiên</span>
              </label>

              <select
                value={borderId}
                onChange={(e) => setBorderId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-white"
              >
                {BORDER_STYLES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* RIGHT: Camera + Teleprompter Overlay (7 cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div
              className={`relative w-full ${
                aspectRatio === '9:16' ? 'max-w-[360px] aspect-[9/16]' : 'max-w-2xl aspect-video'
              } rounded-2xl overflow-hidden bg-slate-950 ${activeBorder} flex items-center justify-center`}
            >
              <video
                ref={videoPreviewRef}
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${
                  beautyFilter ? 'brightness-105 contrast-105 saturate-110' : ''
                }`}
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
                  <Camera className="w-12 h-12 text-sky-400 mb-2 opacity-80" />
                  <p className="text-sm font-bold text-white">Camera đang tắt</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Bấm “Bật Camera & Micro” hoặc dùng ngay chế độ đọc chữ nháp bên dưới
                  </p>
                </div>
              )}

              {/* 3D Mask Emoji Avatar Overlay */}
              {maskId !== 'none' && (
                <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl drop-shadow-2xl select-none animate-bounce">
                  {activeMaskEmoji}
                </div>
              )}

              {/* Countdown 3-2-1 */}
              {countdown > 0 && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
                  <span className="text-7xl font-black text-amber-400 animate-ping">{countdown}</span>
                </div>
              )}

              {/* Teleprompter Scrolling Overlay */}
              <div
                ref={scrollerRef}
                className="absolute inset-x-3 top-4 bottom-16 overflow-y-auto rounded-xl bg-black/45 backdrop-blur-[2px] p-4 text-center scroll-smooth"
              >
                <div
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.45 }}
                  className="font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-pre-line pb-40"
                >
                  {script}
                </div>
              </div>

              {/* Bottom Teleprompter Quick Controls */}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/90 to-transparent px-4 py-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsScrolling(!isScrolling)}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1 font-extrabold text-slate-950"
                >
                  {isScrolling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isScrolling ? 'Tạm dừng chữ' : 'Cuộn chữ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/80 px-2.5 py-1 text-slate-200"
                >
                  <RotateCcw className="w-3 h-3" /> Về đầu kịch bản
                </button>
              </div>
            </div>

            {/* Recorded video actions */}
            {recordedBlob && recordedUrl && (
              <div className="mt-4 w-full max-w-xl rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                <div className="text-xs font-extrabold text-emerald-300">
                  ✓ Đã quay xong! Xem lại hoặc ghép vào trình tạo video:
                </div>
                <video src={recordedUrl} controls className="max-h-52 mx-auto rounded-lg" />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => saveAs(recordedBlob, `${title || 'tu-quay'}.webm`)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải về máy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onInsertIntoVideo({
                        name: `${title || 'tu-quay'}.webm`,
                        blob: recordedBlob,
                        url: recordedUrl,
                        caption: title,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
                  >
                    <Film className="w-3.5 h-3.5" /> Chèn vào trình tạo video
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
