import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Undo2,
  Redo2,
  Plus,
  Scissors,
  SplitSquareHorizontal,
  History,
  BookOpen,
  Maximize2,
  Minimize2,
  Mic,
  Square,
  Music,
  Upload,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Volume2,
  Check,
  Search,
  Shuffle,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import musicCatalogData from '../data/musicCatalog.json';
import {
  TRANSITIONS,
  MOTIONS,
  OVERLAYS,
  ASPECT_RATIOS,
  VIETNAMESE_FONTS,
  mixRandomNonRepeating,
} from '../data/effectsCatalog';
import {
  VideoScene,
  AudioClipTrack,
  VideoStudioSettings,
  VideoComposerEngine,
  exportVideoWithWebCodecs,
} from '../engine/videoCanvasEngine';
import { loadImageElement } from '../engine/imageTypographyEngine';
import {
  saveVideoDraft,
  loadVideoDraft,
  clearVideoDraft,
  VideoDraftRecord,
  addDownloadHistory,
} from '../lib/draftStorage';
import { FastVideoSlicerModal, DownloadHistoryModal } from './VideoSlicerModals';

interface MusicTrackItem {
  id: string;
  name: string;
  cat: string;
  url: string;
}

const MUSIC_CATEGORIES = (musicCatalogData.categories as Array<[string, string]>) || [];
const MUSIC_TRACKS = (musicCatalogData.tracks as MusicTrackItem[]) || [];

export const VideoEditorStudio: React.FC<{
  initialTransferredImages?: Array<{ name: string; blob: Blob; url: string; caption: string }>;
  onOpenGuide: () => void;
}> = ({ initialTransferredImages, onOpenGuide }) => {
  const [videoTitle, setVideoTitle] = useState<string>(() => {
    const now = new Date();
    return `Video ${now.getDate()}-${now.getMonth() + 1}`;
  });

  const [scenes, setScenes] = useState<VideoScene[]>([]);
  const [undoStack, setUndoStack] = useState<VideoScene[][]>([]);
  const [redoStack, setRedoStack] = useState<VideoScene[][]>([]);

  const [aspectRatio, setAspectRatio] = useState<string>('9:16');
  const [resolution, setResolution] = useState<number>(1080);
  const [defaultTransition, setDefaultTransition] = useState<string>('fade');
  const [defaultMotion, setDefaultMotion] = useState<string>('kenburns');
  const [defaultOverlay, setDefaultOverlay] = useState<string>('leafdrops');

  const [captionFont, setCaptionFont] = useState<string>('Be Vietnam Pro');
  const [captionColor, setCaptionColor] = useState<string>('#ffffff');
  const [captionBox, setCaptionBox] = useState<boolean>(true);
  const [watermarkText, setWatermarkText] = useState<string>('');

  // Audio tracks & BGM
  const [selectedBgm, setSelectedBgm] = useState<MusicTrackItem | null>(null);
  const [bgmCat, setBgmCat] = useState<string>('all');
  const [bgmSearch, setBgmSearch] = useState<string>('');
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const [audioClips, setAudioClips] = useState<AudioClipTrack[]>([]);
  const [selectedAudioClipId, setSelectedAudioClipId] = useState<string | null>(null);

  // Voice recording state
  const [recState, setRecState] = useState<'idle' | 'recording'>('idle');
  const [recSeconds, setRecSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<number | null>(null);

  // Playback & Preview state
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [timelineCollapsed, setTimelineCollapsed] = useState<boolean>(false);
  const [featuresExpanded, setFeaturesExpanded] = useState<boolean>(true);
  const [exportMode, setExportMode] = useState<'fast' | 'normal' | 'realtime'>('normal');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const cancelExportRef = useRef<boolean>(false);

  // Modals & Draft
  const [slicerOpen, setSlicerOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [pendingDraft, setPendingDraft] = useState<VideoDraftRecord | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VideoComposerEngine | null>(null);
  const rafRef = useRef<number>(0);

  // Compute canvas dimensions
  const dimensions = useMemo(() => {
    const cfg = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS['9:16'];
    return resolution === 1080
      ? { width: cfg.w1080, height: cfg.h1080 }
      : { width: cfg.w720, height: cfg.h720 };
  }, [aspectRatio, resolution]);

  const studioSettings: VideoStudioSettings = useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio,
      resolution,
      defaultTransition,
      defaultMotion,
      defaultOverlay,
      transitionDur: 0.7,
      captionStyle: {
        fontFamily: captionFont,
        fontSizePct: 6,
        color: captionColor,
        bgColor: 'rgba(0,0,0,0.6)',
        showBox: captionBox,
        position: 'bottom',
      },
      watermark: {
        enabled: !!watermarkText.trim(),
        kind: 'text',
        text: watermarkText,
        color: '#ffffff',
        position: 'top-right',
      },
      subtitles: [],
    }),
    [
      dimensions,
      aspectRatio,
      resolution,
      defaultTransition,
      defaultMotion,
      defaultOverlay,
      captionFont,
      captionColor,
      captionBox,
      watermarkText,
    ]
  );

  const totalDuration = useMemo(
    () => scenes.reduce((acc, s) => acc + Math.max(0.5, s.duration || 5), 0),
    [scenes]
  );

  // Load initial transferred images if any
  useEffect(() => {
    if (initialTransferredImages && initialTransferredImages.length > 0) {
      Promise.all(
        initialTransferredImages.map(async (item) => {
          const imgEl = await loadImageElement(item.url);
          const sc: VideoScene = {
            id: crypto.randomUUID(),
            name: item.name,
            kind: 'image',
            url: item.url,
            blob: item.blob,
            imageEl: imgEl,
            duration: 5,
            caption: item.caption || '',
            transition: 'double-door',
            motion: 'float',
            overlay: 'leafdrops',
            extraOverlays: [],
          };
          return sc;
        })
      ).then((loaded) => {
        setScenes(loaded);
      });
    }
  }, [initialTransferredImages]);

  // Check for existing 7-day draft on mount
  useEffect(() => {
    loadVideoDraft().then((draft) => {
      if (draft && draft.scenes && draft.scenes.length > 0 && scenes.length === 0) {
        setPendingDraft(draft);
      }
    });
  }, []);

  // Auto-save draft whenever scenes change
  useEffect(() => {
    if (scenes.length === 0) return;
    const timer = setTimeout(async () => {
      await saveVideoDraft({
        id: 'current_draft',
        title: videoTitle,
        updatedAt: Date.now(),
        sceneCount: scenes.length,
        aspectRatio,
        resolution,
        transition: defaultTransition,
        motion: defaultMotion,
        overlay: defaultOverlay,
        bgmId: selectedBgm?.id || '',
        bgmVolume: 0.8,
        scenes: scenes.map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
          blob: s.blob,
          duration: s.duration,
          caption: s.caption,
          transition: s.transition,
          motion: s.motion,
          overlay: s.overlay,
          extraOverlays: s.extraOverlays,
        })),
      });
      const now = new Date();
      setLastSavedTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
    }, 1200);
    return () => clearTimeout(timer);
  }, [scenes, videoTitle, aspectRatio, resolution, defaultTransition, defaultMotion, defaultOverlay, selectedBgm]);

  // Draw frame on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new VideoComposerEngine(canvasRef.current, scenes, studioSettings);
    } else {
      engineRef.current.update(scenes, studioSettings);
    }
    engineRef.current.drawFrameAt(currentTime);
  }, [scenes, studioSettings, currentTime]);

  // Playback loop + BGM sync
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      if (previewAudioRef.current && !previewingTrackId) {
        previewAudioRef.current.pause();
      }
      return;
    }
    if (selectedBgm && !previewingTrackId) {
      if (!previewAudioRef.current) previewAudioRef.current = new Audio();
      if (previewAudioRef.current.src !== selectedBgm.url) {
        previewAudioRef.current.src = selectedBgm.url;
      }
      previewAudioRef.current.currentTime = currentTime % (previewAudioRef.current.duration || 120);
      previewAudioRef.current.play().catch(() => {});
    }
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = ((now - lastTs) / 1000) * playbackSpeed;
      lastTs = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, playbackSpeed, totalDuration, selectedBgm, previewingTrackId]);

  // Cleanup audio and timers on unmount
  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const pushUndo = (nextScenes: VideoScene[]) => {
    setUndoStack((prev) => [...prev.slice(-19), scenes]);
    setRedoStack([]);
    setScenes(nextScenes);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, scenes]);
    setUndoStack((u) => u.slice(0, -1));
    setScenes(prev);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, scenes]);
    setRedoStack((r) => r.slice(0, -1));
    setScenes(next);
  };

  const handleRestoreDraft = async () => {
    if (!pendingDraft) return;
    setVideoTitle(pendingDraft.title || videoTitle);
    setAspectRatio(pendingDraft.aspectRatio || '9:16');
    setResolution(pendingDraft.resolution || 1080);
    const restored: VideoScene[] = [];
    for (const s of pendingDraft.scenes) {
      if (s.blob) {
        const url = URL.createObjectURL(s.blob);
        const imgEl = s.kind === 'image' ? await loadImageElement(url) : undefined;
        restored.push({
          ...s,
          url,
          imageEl: imgEl,
        });
      }
    }
    if (restored.length > 0) setScenes(restored);
    setPendingDraft(null);
  };

  const handleAddMediaFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added: VideoScene[] = [];
    const transPool = mixRandomNonRepeating(TRANSITIONS, files.length);
    const motionPool = mixRandomNonRepeating(MOTIONS, files.length);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const url = URL.createObjectURL(f);
      const isVid = f.type.startsWith('video/');
      if (isVid) {
        const videoEl = document.createElement('video');
        videoEl.src = url;
        videoEl.muted = true;
        videoEl.playsInline = true;
        await new Promise<void>((res) => {
          videoEl.onloadedmetadata = () => res();
          videoEl.onerror = () => res();
        });
        added.push({
          id: crypto.randomUUID(),
          name: f.name,
          kind: 'video',
          url,
          blob: f,
          videoEl,
          duration: Math.min(30, Math.max(2, Math.round(videoEl.duration || 5))),
          caption: '',
          transition: transPool[i],
          motion: 'static',
          overlay: 'none',
          extraOverlays: [],
        });
      } else {
        const imageEl = await loadImageElement(url);
        added.push({
          id: crypto.randomUUID(),
          name: f.name,
          kind: 'image',
          url,
          blob: f,
          imageEl,
          duration: 5,
          caption: '',
          transition: transPool[i],
          motion: motionPool[i],
          overlay: 'leafdrops',
          extraOverlays: [],
        });
      }
    }
    pushUndo([...scenes, ...added]);
    e.target.value = '';
  };

  const handleMixRandomAll = () => {
    if (!scenes.length) return;
    const trans = mixRandomNonRepeating(TRANSITIONS, scenes.length);
    const motions = mixRandomNonRepeating(MOTIONS, scenes.length);
    const ovs = mixRandomNonRepeating(OVERLAYS, scenes.length);
    pushUndo(
      scenes.map((s, idx) => ({
        ...s,
        transition: trans[idx],
        motion: motions[idx],
        overlay: ovs[idx],
      }))
    );
  };

  // Voice recording directly onto timeline at playhead
  const handleToggleVoiceRecord = async () => {
    if (recState === 'recording') {
      mediaRecorderRef.current?.stop();
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      setRecState('idle');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recChunksRef.current = [];
      const insertAt = currentTime;
      const startedAt = Date.now();

      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) recChunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const dur = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(recChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const newClip: AudioClipTrack = {
          id: crypto.randomUUID(),
          name: `Ghi âm giọng nói (${dur}s)`,
          kind: 'voice',
          url,
          blob,
          startInTimeline: insertAt,
          trimStart: 0,
          duration: dur,
          maxDuration: dur,
          volume: 1,
        };
        setAudioClips((prev) => [...prev, newClip]);
        setSelectedAudioClipId(newClip.id);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mr;
      mr.start(200);
      setRecSeconds(0);
      setRecState('recording');
      recTimerRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert('Chưa cấp quyền Micro. Hãy cho phép trình duyệt dùng Micro rồi thử lại.');
    }
  };

  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const url = URL.createObjectURL(f);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        const dur = Math.max(1, Math.round(audio.duration || 15));
        const clip: AudioClipTrack = {
          id: crypto.randomUUID(),
          name: f.name,
          kind: 'file',
          url,
          blob: f,
          startInTimeline: currentTime,
          trimStart: 0,
          duration: dur,
          maxDuration: dur,
          volume: 1,
        };
        setAudioClips((prev) => [...prev, clip]);
        setSelectedAudioClipId(clip.id);
      };
    });
    e.target.value = '';
  };

  // Split selected audio clip at red playhead
  const handleSplitAudioAtCursor = () => {
    if (!selectedAudioClipId) return;
    const target = audioClips.find((c) => c.id === selectedAudioClipId);
    if (!target) return;
    if (currentTime <= target.startInTimeline || currentTime >= target.startInTimeline + target.duration) {
      alert('Hãy di chuyển vạch đỏ vào giữa khối âm thanh đang chọn để tách đôi!');
      return;
    }
    const firstDur = Number((currentTime - target.startInTimeline).toFixed(1));
    const secondDur = Number((target.duration - firstDur).toFixed(1));
    const part1: AudioClipTrack = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} (Phần 1)`,
      duration: firstDur,
    };
    const part2: AudioClipTrack = {
      ...target,
      id: crypto.randomUUID(),
      name: `${target.name} (Phần 2)`,
      startInTimeline: currentTime,
      trimStart: target.trimStart + firstDur,
      duration: secondDur,
    };
    setAudioClips((prev) => prev.flatMap((c) => (c.id === target.id ? [part1, part2] : [c])));
    setSelectedAudioClipId(part2.id);
  };

  const filteredMusic = useMemo(() => {
    return MUSIC_TRACKS.filter((t) => {
      if (bgmCat !== 'all' && t.cat !== bgmCat) return false;
      if (bgmSearch.trim() && !t.name.toLowerCase().includes(bgmSearch.trim().toLowerCase())) return false;
      return true;
    });
  }, [bgmCat, bgmSearch]);

  const togglePreviewMusic = (track: MusicTrackItem) => {
    if (previewingTrackId === track.id) {
      previewAudioRef.current?.pause();
      setPreviewingTrackId(null);
      return;
    }
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio();
    }
    previewAudioRef.current.src = track.url;
    previewAudioRef.current.play().catch(() => {});
    setPreviewingTrackId(track.id);
  };

  const handleExportMP4 = async () => {
    if (!canvasRef.current || scenes.length === 0) return;
    setPlaying(false);
    setIsExporting(true);
    setExportProgress(0);
    cancelExportRef.current = false;

    try {
      const effectiveSettings: VideoStudioSettings =
        exportMode === 'fast'
          ? {
              ...studioSettings,
              defaultTransition: 'none',
              defaultMotion: 'static',
              defaultOverlay: 'none',
            }
          : studioSettings;

      const { blob, ext } = await exportVideoWithWebCodecs({
        canvas: canvasRef.current,
        scenes,
        settings: effectiveSettings,
        fps: 30,
        onProgress: (p) => setExportProgress(p),
        shouldCancel: () => cancelExportRef.current,
      });

      const filename = `${videoTitle.trim() || 'video-mia'}.${ext}`;
      await addDownloadHistory({
        id: crypto.randomUUID(),
        filename,
        createdAt: Date.now(),
        durationSec: totalDuration,
        sizeBytes: blob.size,
        blob,
      });
      saveAs(blob, filename);
    } catch (err: any) {
      if (err?.message !== 'CANCELLED') {
        alert('Xuất video gặp sự cố bộ nhớ. Hãy thử chọn độ phân giải 720p hoặc tách nhỏ video.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-[#0b1124] text-slate-100 shadow-2xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none overflow-y-auto' : ''
      }`}
    >
      {/* TOP BAR (Giống 100% ảnh chụp) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-gradient-to-r from-[#0e1630] via-[#131d3d] to-[#0e1630] px-4 py-3">
        <div className="flex items-center gap-2 mr-2">
          <VideoIcon className="w-5 h-5 text-amber-400" />
          <span className="font-extrabold text-base text-white">Biên tập video</span>
          {lastSavedTime && (
            <span className="text-xs text-emerald-400 font-medium">✓ Đã tự lưu nháp {lastSavedTime}</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-40"
        >
          <Undo2 className="w-3.5 h-3.5" /> Hoàn tác
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-40"
          title="Làm lại"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (scenes.length === 0 || confirm('Tạo video mới và xóa danh sách cảnh hiện tại?')) {
              setScenes([]);
              clearVideoDraft();
            }
          }}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
        >
          <Plus className="w-3.5 h-3.5" /> Tạo video mới
        </button>

        <button
          type="button"
          onClick={() => setSlicerOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-900 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-slate-800"
        >
          <Scissors className="w-3.5 h-3.5" /> Cắt nhỏ
        </button>

        <button
          type="button"
          onClick={() => setSlicerOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
        >
          <SplitSquareHorizontal className="w-3.5 h-3.5" /> Tách video
        </button>

        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-100 hover:bg-slate-800"
        >
          <History className="w-3.5 h-3.5" /> Lịch sử tải về
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
          >
            📖 Hướng dẫn
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* BANNER KHÔI PHỤC NHÁP 7 NGÀY (Giống ảnh chụp 5) */}
      {pendingDraft && (
        <div className="m-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/50 bg-amber-400/10 p-3.5">
          <div>
            <div className="font-extrabold text-sm text-white">
              Có video đang làm dở: “{pendingDraft.title}”
            </div>
            <div className="text-xs text-slate-300">
              Lưu lúc {new Date(pendingDraft.updatedAt).toLocaleTimeString('vi-VN')} ·{' '}
              {pendingDraft.sceneCount} cảnh · tự xóa sau 7 ngày. Chọn một nút để tiếp tục tự lưu:
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="rounded-full bg-[#132042] border border-amber-400 px-4 py-1.5 text-xs font-extrabold text-white hover:bg-amber-400 hover:text-slate-950 transition"
            >
              Khôi phục
            </button>
            <button
              type="button"
              onClick={() => {
                clearVideoDraft();
                setPendingDraft(null);
              }}
              className="rounded-full border border-slate-600 bg-slate-900 px-4 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800"
            >
              Làm video mới
            </button>
          </div>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="p-4 space-y-5">
        {/* PREVIEW CANVAS AREA */}
        <div className="rounded-2xl border border-slate-800 bg-[#050914] p-3 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center w-full max-h-[420px] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="max-h-[400px] w-auto rounded-xl border border-slate-800 shadow-2xl bg-black"
            />
          </div>

          {/* Scrubber timeline bar */}
          {totalDuration > 0 && (
            <div className="w-full max-w-3xl mt-3 flex items-center gap-3">
              <span className="text-[11px] font-mono text-rose-400 font-bold">🔴 Vạch đỏ</span>
              <input
                type="range"
                min={0}
                max={totalDuration}
                step={0.1}
                value={currentTime}
                onChange={(e) => setCurrentTime(Number(e.target.value))}
                className="flex-1 accent-rose-500 cursor-pointer"
              />
            </div>
          )}

          {/* Player Control Bar */}
          <div className="mt-3 w-full flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-3.5 py-2">
            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={() => setPlaying(!playing)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1c2b52] border border-sky-400/40 px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-[#253869] disabled:opacity-40"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Tạm dừng' : 'Xem trước'}
            </button>

            <span className="text-xs font-mono text-slate-300">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>

            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
                <option key={sp} value={sp}>
                  Tốc độ {sp}x
                </option>
              ))}
            </select>

            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Tên file video..."
              className="flex-1 min-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
            />

            <span className="text-xs font-bold text-amber-400">{scenes.length} cảnh</span>
          </div>
        </div>

        {/* BƯỚC 1: TẢI ẢNH / VIDEO NGẮN */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-400 text-xs font-extrabold text-amber-400">
              1
            </span>
            <span className="font-extrabold text-sm text-white">Bước 1: Tải ảnh / video ngắn</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:border-amber-400 transition">
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" /> + Thêm ảnh
              <input type="file" accept="image/*" multiple hidden onChange={handleAddMediaFiles} />
            </label>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:border-amber-400 transition">
              <VideoIcon className="w-3.5 h-3.5 text-sky-400" /> + Video dài
              <input type="file" accept="video/*" multiple hidden onChange={handleAddMediaFiles} />
            </label>
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-bold text-white hover:border-amber-400 transition">
              <Plus className="w-3.5 h-3.5 text-emerald-400" /> + Video ngắn
              <input type="file" accept="video/*" multiple hidden onChange={handleAddMediaFiles} />
            </label>
          </div>
        </div>

        {/* WORKSPACE 2 CỘT: DÒNG ÂM THANH + DÒNG THỜI GIAN CẢNH (TRÁI) & HIỆU ỨNG + KHO NHẠC 68 BÀI (PHẢI) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* CỘT TRÁI (7 cols): Dòng âm thanh + Ghi âm giọng nói + Dòng thời gian từng cảnh */}
          <div className="lg:col-span-7 space-y-4">
            {/* KHỐI ÂM THANH & GHI ÂM GIỌNG NÓI (Giống hệt ảnh chụp 1) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Kéo khối để đổi vị trí hoặc chuyển dòng · kéo 2 tay cầm ở mép (cả nhạc nền) để cắt ngắn · bấm chọn khối rồi{' '}
                <b className="text-amber-300">“Tách tại đây”</b> để cắt đôi tại vạch đỏ.
              </p>

              {/* Danh sách khối âm thanh đang có trên timeline */}
              {(selectedBgm || audioClips.length > 0) && (
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  {selectedBgm && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 text-xs">
                      <span className="font-bold text-emerald-300 truncate">
                        🎵 Nhạc nền: {selectedBgm.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedBgm(null)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {audioClips.map((clip) => {
                    const isSelected = clip.id === selectedAudioClipId;
                    return (
                      <div
                        key={clip.id}
                        onClick={() => setSelectedAudioClipId(clip.id)}
                        className={`rounded-lg border p-2.5 text-xs cursor-pointer transition ${
                          isSelected
                            ? 'border-amber-400 bg-amber-400/15'
                            : 'border-slate-800 bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {clip.kind === 'voice' ? '🎙️ ' : '🔊 '}
                            {clip.name} (Bắt đầu: {clip.startInTimeline.toFixed(1)}s · Dài:{' '}
                            {clip.duration.toFixed(1)}s)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleSplitAudioAtCursor();
                              }}
                              className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300"
                            >
                              ✂️ Tách tại đây
                            </button>
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setAudioClips((prev) => prev.filter((x) => x.id !== clip.id));
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* 2 tay cầm kéo vị trí & cắt ngắn */}
                        <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                          <div>
                            <span>Vị trí bắt đầu: {clip.startInTimeline.toFixed(1)}s</span>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(10, totalDuration)}
                              step={0.5}
                              value={clip.startInTimeline}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAudioClips((prev) =>
                                  prev.map((x) => (x.id === clip.id ? { ...x, startInTimeline: val } : x))
                                );
                              }}
                              className="w-full accent-amber-400"
                            />
                          </div>
                          <div>
                            <span>Kéo tay cầm cắt độ dài: {clip.duration.toFixed(1)}s</span>
                            <input
                              type="range"
                              min={0.5}
                              max={Math.max(1, clip.maxDuration)}
                              step={0.5}
                              value={clip.duration}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAudioClips((prev) =>
                                  prev.map((x) => (x.id === clip.id ? { ...x, duration: val } : x))
                                );
                              }}
                              className="w-full accent-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 cursor-pointer hover:border-amber-400 transition">
                    <Plus className="w-4 h-4" /> Thêm file âm thanh
                    <input type="file" accept="audio/*" multiple hidden onChange={handleUploadAudioFile} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setFeaturesExpanded(true)}
                    className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-xs font-bold text-slate-200 hover:border-amber-400 transition"
                  >
                    <Plus className="w-4 h-4" /> Thêm nhạc nền (68 bài)
                  </button>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-2.5 flex flex-col justify-between">
                  <button
                    type="button"
                    onClick={handleToggleVoiceRecord}
                    className={`w-full rounded-xl py-2.5 text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition ${
                      recState === 'recording'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-gradient-to-r from-[#0e1f47] to-[#19306b] border border-amber-400/50 text-white hover:brightness-110'
                    }`}
                  >
                    {recState === 'recording' ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-white" /> Dừng ghi âm ({recSeconds}s)
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-amber-400" /> Ghi âm giọng nói
                      </>
                    )}
                  </button>
                  <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
                    Giọng nói được ghi trên máy bạn, chèn vào video tại vị trí đang xem trước ({formatTime(currentTime)}).
                  </p>
                </div>
              </div>
            </div>

            {/* DÒNG THỜI GIAN TỪNG CẢNH (Giống hệt ảnh chụp 1) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white">Dòng thời gian</h3>
                <button
                  type="button"
                  onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white"
                >
                  {scenes.length} cảnh · {totalDuration.toFixed(1)}s{' '}
                  {timelineCollapsed ? (
                    <>
                      Mở rộng <ChevronDown className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Thu gọn <ChevronUp className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {!timelineCollapsed && (
                <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
                  {scenes.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center text-xs text-slate-400">
                      Chưa có cảnh nào. Hãy bấm <b>“+ Thêm ảnh”</b> ở Bước 1 để bắt đầu!
                    </div>
                  ) : (
                    scenes.map((scene, idx) => (
                      <div
                        key={scene.id}
                        className="rounded-2xl border border-slate-800 bg-[#101935] p-3.5 space-y-3 shadow-sm hover:border-slate-700 transition"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-3 text-xs font-extrabold text-slate-400">
                            ⋮⋮ #{idx + 1}
                          </span>
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-700">
                            {scene.kind === 'image' && (
                              <img src={scene.url} alt={scene.name} className="w-full h-full object-cover" />
                            )}
                            <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-950/85 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                              {scene.duration}s
                            </span>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-serif font-bold text-slate-400">T</span>
                              <input
                                type="text"
                                value={scene.caption}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setScenes((prev) =>
                                    prev.map((s) => (s.id === scene.id ? { ...s, caption: val } : s))
                                  );
                                }}
                                placeholder={`Chữ chú thích / tiêu đề (${scene.name})`}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-3">
                              <input
                                type="range"
                                min={1}
                                max={20}
                                step={0.5}
                                value={scene.duration}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setScenes((prev) =>
                                    prev.map((s) => (s.id === scene.id ? { ...s, duration: val } : s))
                                  );
                                }}
                                className="flex-1 accent-amber-400"
                              />
                              <input
                                type="number"
                                min={1}
                                max={60}
                                step={0.5}
                                value={scene.duration}
                                onChange={(e) => {
                                  const val = Math.max(0.5, Number(e.target.value));
                                  setScenes((prev) =>
                                    prev.map((s) => (s.id === scene.id ? { ...s, duration: val } : s))
                                  );
                                }}
                                className="w-14 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-center text-xs font-bold text-white"
                              />
                              <span className="text-xs text-slate-400">giây</span>
                            </div>
                          </div>
                        </div>

                        {/* Hàng chọn hiệu ứng riêng từng cảnh: Chuyển cảnh, Chuyển động, Lớp phủ, + Thêm lớp phủ */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                          <select
                            value={scene.transition || defaultTransition}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScenes((prev) =>
                                prev.map((s) => (s.id === scene.id ? { ...s, transition: val } : s))
                              );
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                            title="Hiệu ứng chuyển cảnh"
                          >
                            {TRANSITIONS.map((tr) => (
                              <option key={tr.id} value={tr.id}>
                                {tr.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={scene.motion || defaultMotion}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScenes((prev) =>
                                prev.map((s) => (s.id === scene.id ? { ...s, motion: val } : s))
                              );
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                            title="Hiệu ứng chuyển động"
                          >
                            {MOTIONS.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={scene.overlay || defaultOverlay}
                            onChange={(e) => {
                              const val = e.target.value;
                              setScenes((prev) =>
                                prev.map((s) => (s.id === scene.id ? { ...s, overlay: val } : s))
                              );
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200"
                            title="Lớp phủ chính"
                          >
                            {OVERLAYS.map((ov) => (
                              <option key={ov.id} value={ov.id}>
                                {ov.label}
                              </option>
                            ))}
                          </select>

                          {/* + Thêm lớp phủ chồng lên */}
                          <select
                            value=""
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) return;
                              setScenes((prev) =>
                                prev.map((s) =>
                                  s.id === scene.id
                                    ? {
                                        ...s,
                                        extraOverlays: [...(s.extraOverlays || []), val],
                                      }
                                    : s
                                )
                              );
                            }}
                            className="rounded-lg border border-dashed border-amber-400/50 bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-amber-300"
                          >
                            <option value="">➕ Thêm lớp phủ ({scene.extraOverlays?.length || 0})</option>
                            {OVERLAYS.filter((o) => o.id !== 'none').map((ov) => (
                              <option key={ov.id} value={ov.id}>
                                + {ov.label}
                              </option>
                            ))}
                          </select>

                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                const next = [...scenes];
                                [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                pushUndo(next);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                              title="Chuyển lên"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === scenes.length - 1}
                              onClick={() => {
                                const next = [...scenes];
                                [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                                pushUndo(next);
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-30"
                              title="Chuyển xuống"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => pushUndo(scenes.filter((s) => s.id !== scene.id))}
                              className="rounded p-1 text-rose-400 hover:bg-rose-950"
                              title="Xóa cảnh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Hiển thị các extraOverlays đã thêm */}
                        {scene.extraOverlays && scene.extraOverlays.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {scene.extraOverlays.map((ovId, oIdx) => {
                              const label = OVERLAYS.find((o) => o.id === ovId)?.label || ovId;
                              return (
                                <span
                                  key={oIdx}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-400/40 px-2.5 py-0.5 text-[11px] text-amber-200"
                                >
                                  {label}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setScenes((prev) =>
                                        prev.map((s) =>
                                          s.id === scene.id
                                            ? {
                                                ...s,
                                                extraOverlays: s.extraOverlays?.filter((_, i) => i !== oIdx),
                                              }
                                            : s
                                        )
                                      )
                                    }
                                    className="hover:text-rose-400"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CỘT PHẢI (5 cols): Bước 2 Hiệu ứng chung & Bước 3 Kho 68 bản nhạc nền */}
          <div className="lg:col-span-5 space-y-4">
            {/* BƯỚC 2: KHUNG HÌNH & HIỆU ỨNG CHUNG */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Bước 2: Khung hình & Hiệu ứng
                </h3>
                <button
                  type="button"
                  onClick={handleMixRandomAll}
                  disabled={scenes.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300 disabled:opacity-40"
                >
                  <Shuffle className="w-3.5 h-3.5" /> 🎲 Mix ngẫu nhiên
                </button>
              </div>

              {/* Aspect ratio + Resolution */}
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(ASPECT_RATIOS).map(([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAspectRatio(key)}
                    className={`rounded-xl py-2 px-1 text-center border transition ${
                      aspectRatio === key
                        ? 'border-amber-400 bg-amber-400 text-slate-950 font-extrabold'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{key}</div>
                    <div className="text-[10px] opacity-80 truncate">{info.desc}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[720, 1080].map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={`rounded-xl py-2 text-xs font-bold border transition ${
                      resolution === res
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {res}p ({res === 1080 ? 'Full HD Rõ nét' : 'Nhẹ & Xuất nhanh'})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Phông phụ đề:</span>
                  <select
                    value={captionFont}
                    onChange={(e) => setCaptionFont(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                  >
                    {VIETNAMESE_FONTS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Watermark / Chữ ký góc:</span>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Nhập tên kênh / SĐT..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>
            </div>

            {/* BƯỚC 3: THÊM NHẠC NỀN (Kho 68 bài giống hệt ảnh chụp 1) */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-400" /> ✓ Bước 3: Thêm nhạc nền ({MUSIC_TRACKS.length} bài)
                </h3>
                {selectedBgm && (
                  <span className="text-xs font-bold text-emerald-400 truncate max-w-[160px]">
                    Đang chọn: {selectedBgm.name}
                  </span>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBgmCat('all')}
                  className={`rounded-full px-3 py-1 text-xs font-bold border transition ${
                    bgmCat === 'all'
                      ? 'border-amber-400 bg-[#132042] text-white'
                      : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Tất cả ({MUSIC_TRACKS.length})
                </button>
                {MUSIC_CATEGORIES.map(([catId, catLabel]) => {
                  const count = MUSIC_TRACKS.filter((t) => t.cat === catId).length;
                  return (
                    <button
                      key={catId}
                      type="button"
                      onClick={() => setBgmCat(catId)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                        bgmCat === catId
                          ? 'border-amber-400 bg-[#132042] text-amber-300 font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {catLabel} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search music */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bgmSearch}
                  onChange={(e) => setBgmSearch(e.target.value)}
                  placeholder="🔍 Tìm bản nhạc..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white"
                />
              </div>

              {/* Music list */}
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950">
                {filteredMusic.map((track) => {
                  const isPlaying = previewingTrackId === track.id;
                  const isChosen = selectedBgm?.id === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 text-xs transition ${
                        isChosen ? 'bg-amber-400/15' : 'hover:bg-slate-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePreviewMusic(track)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-amber-400">
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </span>
                        <span className="font-semibold text-slate-100 truncate">{track.name}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBgm(isChosen ? null : track)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          isChosen
                            ? 'bg-emerald-500 text-slate-950'
                            : 'border border-slate-700 bg-slate-800 text-slate-200 hover:border-amber-400'
                        }`}
                      >
                        {isChosen ? '✓ Đã chọn' : 'Chọn'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BƯỚC 4: CÁCH XUẤT & NÚT XUẤT VIDEO MP4 (Giống hệt ảnh chụp 4 & 5) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-300">Cách xuất</span>
            <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950 p-1">
              {[
                ['fast', '🚀 Nhanh'],
                ['normal', 'Thường'],
                ['realtime', 'Thời gian thực'],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setExportMode(k as any)}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
                    exportMode === k
                      ? 'bg-[#17264d] border border-amber-400/50 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {isExporting ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span>Đang dựng & xuất video MP4... ({Math.round(exportProgress * 100)}%)</span>
                <button
                  type="button"
                  onClick={() => {
                    cancelExportRef.current = true;
                  }}
                  className="text-rose-400 hover:underline"
                >
                  Hủy xuất
                </button>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all"
                  style={{ width: `${Math.round(exportProgress * 100)}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={scenes.length === 0}
              onClick={handleExportMP4}
              className="w-full rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 py-3.5 text-sm font-black text-slate-950 shadow-xl hover:brightness-110 disabled:opacity-40 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" /> Xuất video MP4 ({resolution}p · {scenes.length} cảnh)
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <FastVideoSlicerModal open={slicerOpen} onClose={() => setSlicerOpen(false)} />
      <DownloadHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
};
