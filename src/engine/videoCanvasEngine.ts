import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export interface VideoScene {
  id: string;
  name: string;
  kind: 'image' | 'video';
  url: string;
  blob?: Blob;
  imageEl?: HTMLImageElement;
  videoEl?: HTMLVideoElement;
  duration: number;
  caption: string;
  transition?: string;
  motion?: string;
  overlay?: string;
  extraOverlays?: string[];
  muted?: boolean;
}

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface AudioClipTrack {
  id: string;
  name: string;
  kind: 'bgm' | 'voice' | 'file';
  url: string;
  blob?: Blob;
  startInTimeline: number;
  trimStart: number;
  duration: number;
  maxDuration: number;
  volume: number;
}

export interface VideoStudioSettings {
  width: number;
  height: number;
  aspectRatio: string;
  resolution: number;
  defaultTransition: string;
  defaultMotion: string;
  defaultOverlay: string;
  transitionDur: number;
  captionStyle: {
    fontFamily: string;
    fontSizePct: number;
    color: string;
    bgColor: string;
    showBox: boolean;
    position: 'bottom' | 'middle' | 'top';
  };
  watermark: {
    enabled: boolean;
    kind: 'text' | 'image';
    text: string;
    color: string;
    logoImg?: HTMLImageElement | null;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
  subtitles: SubtitleCue[];
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
}

function computeMotionTransform(motion: string, progress: number): { scale: number; dx: number; dy: number; rot: number } {
  const p = Math.max(0, Math.min(1, progress));
  switch (motion) {
    case 'kenburns':
      return { scale: 1.04 + 0.12 * p, dx: 0.02 - 0.04 * p, dy: 0.015 - 0.03 * p, rot: 0 };
    case 'zoom-in':
      return { scale: 1 + 0.16 * p, dx: 0, dy: 0, rot: 0 };
    case 'zoom-out':
      return { scale: 1.16 - 0.16 * p, dx: 0, dy: 0, rot: 0 };
    case 'pan-left':
      return { scale: 1.12, dx: 0.05 - 0.1 * p, dy: 0, rot: 0 };
    case 'pan-right':
      return { scale: 1.12, dx: -0.05 + 0.1 * p, dy: 0, rot: 0 };
    case 'tilt-up':
      return { scale: 1.12, dx: 0, dy: 0.05 - 0.1 * p, rot: 0 };
    case 'tilt-down':
      return { scale: 1.12, dx: 0, dy: -0.05 + 0.1 * p, rot: 0 };
    case 'zoom-tr':
      return { scale: 1.02 + 0.14 * p, dx: -0.04 * p, dy: 0.04 * p, rot: 0 };
    case 'zoom-tl':
      return { scale: 1.02 + 0.14 * p, dx: 0.04 * p, dy: 0.04 * p, rot: 0 };
    case 'breathe':
      return { scale: 1.06 + 0.04 * Math.sin(p * Math.PI * 4), dx: 0, dy: 0, rot: 0 };
    case 'float':
      return {
        scale: 1.08,
        dx: 0.025 * Math.sin(p * Math.PI * 2),
        dy: 0.02 * Math.cos(p * Math.PI * 2),
        rot: 0,
      };
    case 'sway':
      return { scale: 1.06, dx: 0.015 * Math.sin(p * Math.PI * 3), dy: 0, rot: 0.018 * Math.sin(p * Math.PI * 2) };
    case 'shake':
      return {
        scale: 1.06,
        dx: 0.008 * Math.sin(p * 35),
        dy: 0.008 * Math.cos(p * 42),
        rot: 0,
      };
    case 'snap-zoom': {
      const snap = p < 0.2 ? 1 + (p / 0.2) * 0.18 : 1.18 - ((p - 0.2) / 0.8) * 0.06;
      return { scale: snap, dx: 0, dy: 0, rot: 0 };
    }
    default:
      return { scale: 1, dx: 0, dy: 0, rot: 0 };
  }
}

function drawSingleSceneMedia(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  localTime: number,
  w: number,
  h: number,
  defaultMotion: string
) {
  const source: HTMLImageElement | HTMLVideoElement | undefined =
    scene.kind === 'video' ? scene.videoEl : scene.imageEl;

  ctx.save();
  ctx.fillStyle = '#070b16';
  ctx.fillRect(0, 0, w, h);

  if (!source) {
    ctx.restore();
    return;
  }

  const srcW = scene.kind === 'video' ? (scene.videoEl?.videoWidth || w) : (scene.imageEl?.naturalWidth || w);
  const srcH = scene.kind === 'video' ? (scene.videoEl?.videoHeight || h) : (scene.imageEl?.naturalHeight || h);

  if (srcW <= 0 || srcH <= 0) {
    ctx.restore();
    return;
  }

  const progress = scene.duration > 0 ? localTime / scene.duration : 0;
  const motionType = scene.motion || defaultMotion || 'kenburns';
  const { scale, dx, dy, rot } = computeMotionTransform(motionType, progress);

  // 1. Blurred ambient background
  const coverScale = Math.max(w / srcW, h / srcH) * 1.1;
  const bgW = srcW * coverScale;
  const bgH = srcH * coverScale;
  ctx.save();
  ctx.filter = 'blur(24px) brightness(0.55)';
  ctx.drawImage(source, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
  ctx.restore();

  // 2. Main image with Ken Burns / Motion transform
  const containScale = Math.max(w / srcW, h / srcH);
  const drawW = srcW * containScale;
  const drawH = srcH * containScale;

  ctx.translate(w / 2 + dx * w, h / 2 + dy * h);
  if (rot !== 0) ctx.rotate(rot);
  ctx.scale(scale, scale);
  ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function renderTransitionBetween(
  ctx: CanvasRenderingContext2D,
  transition: string,
  progress: number, // 0 -> 1
  w: number,
  h: number,
  drawPrev: () => void,
  drawCurr: () => void
) {
  const p = Math.max(0, Math.min(1, progress));
  const ease = p * p * (3 - 2 * p);

  switch (transition) {
    case 'fade': {
      drawPrev();
      ctx.save();
      ctx.globalAlpha = ease;
      drawCurr();
      ctx.restore();
      break;
    }
    case 'double-door': {
      drawCurr();
      // Left and right doors of previous scene opening outward
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, (w / 2) * (1 - ease), h);
      ctx.rect(w - (w / 2) * (1 - ease), 0, (w / 2) * (1 - ease), h);
      ctx.clip();
      drawPrev();
      ctx.restore();
      break;
    }
    case 'curtain': {
      drawPrev();
      ctx.save();
      ctx.beginPath();
      const half = (w / 2) * ease;
      ctx.rect(w / 2 - half, 0, half * 2, h);
      ctx.clip();
      drawCurr();
      ctx.restore();
      break;
    }
    case 'slide-up': {
      drawPrev();
      ctx.save();
      ctx.translate(0, h * (1 - ease));
      drawCurr();
      ctx.restore();
      break;
    }
    case 'slide-down': {
      drawPrev();
      ctx.save();
      ctx.translate(0, -h * (1 - ease));
      drawCurr();
      ctx.restore();
      break;
    }
    case 'zoom-out': {
      drawCurr();
      ctx.save();
      ctx.globalAlpha = 1 - ease;
      ctx.translate(w / 2, h / 2);
      ctx.scale(1 - ease * 0.4, 1 - ease * 0.4);
      ctx.translate(-w / 2, -h / 2);
      drawPrev();
      ctx.restore();
      break;
    }
    case 'iris': {
      drawPrev();
      ctx.save();
      const maxR = Math.hypot(w / 2, h / 2);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxR * ease, 0, Math.PI * 2);
      ctx.clip();
      drawCurr();
      ctx.restore();
      break;
    }
    case 'diamond': {
      drawPrev();
      ctx.save();
      const span = (w + h) * ease;
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2 - span);
      ctx.lineTo(w / 2 + span, h / 2);
      ctx.lineTo(w / 2, h / 2 + span);
      ctx.lineTo(w / 2 - span, h / 2);
      ctx.closePath();
      ctx.clip();
      drawCurr();
      ctx.restore();
      break;
    }
    case 'card-flip': {
      if (ease < 0.5) {
        ctx.save();
        ctx.translate(w / 2, 0);
        ctx.scale(1 - ease * 2, 1);
        ctx.translate(-w / 2, 0);
        drawPrev();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(w / 2, 0);
        ctx.scale((ease - 0.5) * 2, 1);
        ctx.translate(-w / 2, 0);
        drawCurr();
        ctx.restore();
      }
      break;
    }
    case 'diagonal': {
      drawPrev();
      ctx.save();
      ctx.beginPath();
      const d = (w + h) * ease * 1.4;
      ctx.moveTo(0, 0);
      ctx.lineTo(d, 0);
      ctx.lineTo(0, d);
      ctx.closePath();
      ctx.clip();
      drawCurr();
      ctx.restore();
      break;
    }
    case 'checker': {
      drawPrev();
      ctx.save();
      ctx.beginPath();
      const cols = 6;
      const rows = 6;
      const cw = w / cols;
      const ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const delay = ((r + c) / (rows + cols)) * 0.4;
          const localP = Math.max(0, Math.min(1, (ease - delay) / 0.6));
          ctx.rect(c * cw, r * ch, cw * localP, ch * localP);
        }
      }
      ctx.clip();
      drawCurr();
      ctx.restore();
      break;
    }
    case 'flash': {
      if (ease < 0.5) drawPrev();
      else drawCurr();
      const flashAlpha = 1 - Math.abs(ease - 0.5) * 2;
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.85})`;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      break;
    }
    default: {
      drawPrev();
      ctx.save();
      ctx.globalAlpha = ease;
      drawCurr();
      ctx.restore();
      break;
    }
  }
}

export function renderOverlayEffect(
  ctx: CanvasRenderingContext2D,
  overlayId: string,
  time: number,
  w: number,
  h: number
) {
  if (!overlayId || overlayId === 'none') return;
  const scale = h / 1080;
  ctx.save();

  switch (overlayId) {
    case 'sunrays': {
      const grad = ctx.createRadialGradient(w * 0.15, h * 0.1, 10, w * 0.15, h * 0.1, Math.max(w, h) * 0.9);
      grad.addColorStop(0, 'rgba(255, 240, 180, 0.35)');
      grad.addColorStop(0.5, 'rgba(255, 210, 120, 0.12)');
      grad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'rainbow': {
      const rGrad = ctx.createRadialGradient(w * 0.5, h * 1.1, h * 0.4, w * 0.5, h * 1.1, h * 0.75);
      rGrad.addColorStop(0, 'rgba(255,0,0,0)');
      rGrad.addColorStop(0.2, 'rgba(255,80,80,0.14)');
      rGrad.addColorStop(0.4, 'rgba(255,220,80,0.14)');
      rGrad.addColorStop(0.6, 'rgba(80,255,120,0.14)');
      rGrad.addColorStop(0.8, 'rgba(80,160,255,0.14)');
      rGrad.addColorStop(1, 'rgba(180,80,255,0)');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'rain': {
      ctx.strokeStyle = 'rgba(200, 225, 255, 0.45)';
      ctx.lineWidth = 1.5 * scale;
      for (let i = 0; i < 65; i++) {
        const rx = ((pseudoRandom(i) * w + time * 120) % w);
        const ry = ((pseudoRandom(i + 50) * h + time * 950) % h);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 6 * scale, ry + 28 * scale);
        ctx.stroke();
      }
      break;
    }
    case 'leafdrops':
    case 'dew':
    case 'stream': {
      for (let i = 0; i < 28; i++) {
        const x = pseudoRandom(i * 3) * w;
        const speed = 40 + pseudoRandom(i * 7) * 60;
        const y = (pseudoRandom(i * 11) * h + time * speed) % h;
        const r = (4 + pseudoRandom(i * 13) * 8) * scale;
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
        g.addColorStop(0.5, 'rgba(170, 230, 255, 0.45)');
        g.addColorStop(1, 'rgba(120, 200, 255, 0.05)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cherry':
    case 'autumn':
    case 'bamboo':
    case 'lotus':
    case 'chestnut': {
      const colors: Record<string, string> = {
        cherry: 'rgba(255, 183, 197, 0.82)',
        autumn: 'rgba(235, 130, 45, 0.82)',
        bamboo: 'rgba(110, 195, 95, 0.78)',
        lotus: 'rgba(255, 150, 190, 0.82)',
        chestnut: 'rgba(215, 155, 60, 0.8)',
      };
      ctx.fillStyle = colors[overlayId] || 'rgba(255,190,200,0.8)';
      for (let i = 0; i < 26; i++) {
        const px = (pseudoRandom(i) * w + Math.sin(time * 1.2 + i) * 45 * scale + time * 25) % w;
        const py = (pseudoRandom(i + 100) * h + time * (45 + pseudoRandom(i * 2) * 40)) % h;
        const sz = (7 + pseudoRandom(i * 5) * 9) * scale;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(time * 1.5 + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, sz, sz * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    default: {
      // Glowing fireflies / bokeh / stars / frost / galaxy particles
      for (let i = 0; i < 32; i++) {
        const x = (pseudoRandom(i * 5) * w + Math.sin(time * 0.7 + i) * 35 * scale + w) % w;
        const y = (pseudoRandom(i * 9) * h + Math.cos(time * 0.5 + i) * 35 * scale + h) % h;
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(time * 2.2 + i));
        const r = (6 + pseudoRandom(i * 17) * 14) * scale;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        const isWarm = overlayId === 'fireflies' || overlayId === 'desert' || overlayId === 'pollen';
        grad.addColorStop(0, isWarm ? `rgba(255, 245, 150, ${0.85 * pulse})` : `rgba(200, 240, 255, ${0.8 * pulse})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  ctx.restore();
}

function drawCaptionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  style: VideoStudioSettings['captionStyle']
) {
  if (!text || !text.trim()) return;
  const scale = h / 1080;
  const fontSize = Math.max(18, (style.fontSizePct || 6) * 8 * scale);

  ctx.save();
  ctx.font = `700 ${fontSize}px "${style.fontFamily || 'Be Vietnam Pro'}", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Wrap text into lines
  const maxWidth = w * 0.86;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) cur = test;
    else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);

  const lineHeight = fontSize * 1.3;
  const totalH = lines.length * lineHeight;
  const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width), 80);

  let centerY = h * 0.86;
  if (style.position === 'top') centerY = h * 0.14;
  else if (style.position === 'middle') centerY = h * 0.5;

  const startY = centerY - totalH / 2 + lineHeight / 2;

  if (style.showBox) {
    const padX = 24 * scale;
    const padY = 14 * scale;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    const bx = w / 2 - maxLineW / 2 - padX;
    const by = centerY - totalH / 2 - padY;
    const bw = maxLineW + padX * 2;
    const bh = totalH + padY * 2;
    const r = Math.min(18 * scale, bh / 2);
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, r);
    ctx.fill();
  }

  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 4 * scale;

  lines.forEach((line, idx) => {
    const ly = startY + idx * lineHeight;
    ctx.strokeText(line, w / 2, ly);
    ctx.fillStyle = style.color || '#ffffff';
    ctx.fillText(line, w / 2, ly);
  });

  ctx.restore();
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  watermark: VideoStudioSettings['watermark'],
  w: number,
  h: number
) {
  if (!watermark.enabled) return;
  const scale = h / 1080;
  const pad = 28 * scale;

  ctx.save();
  ctx.globalAlpha = 0.9;

  if (watermark.kind === 'image' && watermark.logoImg && watermark.logoImg.complete && watermark.logoImg.naturalWidth > 0) {
    const lw = w * 0.12;
    const lh = lw * (watermark.logoImg.naturalHeight / watermark.logoImg.naturalWidth);
    const x = watermark.position.includes('right') ? w - lw - pad : pad;
    const y = watermark.position.includes('bottom') ? h - lh - pad : pad;
    ctx.drawImage(watermark.logoImg, x, y, lw, lh);
  } else if (watermark.text.trim()) {
    const fs = Math.max(14, 24 * scale);
    ctx.font = `700 ${fs}px "Be Vietnam Pro", sans-serif`;
    const tw = ctx.measureText(watermark.text).width;
    const x = watermark.position.includes('right') ? w - tw - pad : pad;
    const y = watermark.position.includes('bottom') ? h - fs - pad : pad + fs;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6 * scale;
    ctx.fillStyle = watermark.color || '#ffffff';
    ctx.fillText(watermark.text, x, y);
  }

  ctx.restore();
}

export class VideoComposerEngine {
  private canvas: HTMLCanvasElement;
  private scenes: VideoScene[];
  private settings: VideoStudioSettings;

  constructor(canvas: HTMLCanvasElement, scenes: VideoScene[], settings: VideoStudioSettings) {
    this.canvas = canvas;
    this.scenes = scenes;
    this.settings = settings;
    this.canvas.width = settings.width;
    this.canvas.height = settings.height;
  }

  public get totalDuration(): number {
    return this.scenes.reduce((acc, s) => acc + Math.max(0.5, s.duration || 4), 0);
  }

  public update(scenes: VideoScene[], settings: VideoStudioSettings) {
    this.scenes = scenes;
    this.settings = settings;
    if (this.canvas.width !== settings.width || this.canvas.height !== settings.height) {
      this.canvas.width = settings.width;
      this.canvas.height = settings.height;
    }
  }

  public locateScene(timeSec: number): { index: number; localTime: number } {
    let elapsed = 0;
    for (let i = 0; i < this.scenes.length; i++) {
      const dur = Math.max(0.5, this.scenes[i].duration || 4);
      if (timeSec < elapsed + dur || i === this.scenes.length - 1) {
        return { index: i, localTime: Math.max(0, timeSec - elapsed) };
      }
      elapsed += dur;
    }
    return { index: 0, localTime: 0 };
  }

  public drawFrameAt(timeSec: number): number {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return 0;
    const { width: w, height: h, defaultMotion, defaultOverlay, transitionDur } = this.settings;

    if (this.scenes.length === 0) {
      ctx.fillStyle = '#070b18';
      ctx.fillRect(0, 0, w, h);
      return 0;
    }

    const { index, localTime } = this.locateScene(timeSec);
    const scene = this.scenes[index];
    const transitionType = scene.transition ?? this.settings.defaultTransition;

    const drawCurr = () => drawSingleSceneMedia(ctx, scene, localTime, w, h, defaultMotion);

    if (index > 0 && transitionType && transitionType !== 'none' && localTime < transitionDur) {
      const prevScene = this.scenes[index - 1];
      const prevLocal = Math.max(0.5, prevScene.duration) - transitionDur + localTime;
      const drawPrev = () => drawSingleSceneMedia(ctx, prevScene, prevLocal, w, h, defaultMotion);
      renderTransitionBetween(ctx, transitionType, localTime / transitionDur, w, h, drawPrev, drawCurr);
    } else {
      drawCurr();
    }

    // Overlays
    const primaryOverlay = scene.overlay ?? defaultOverlay;
    renderOverlayEffect(ctx, primaryOverlay, timeSec, w, h);
    if (scene.extraOverlays?.length) {
      scene.extraOverlays.forEach((ov) => renderOverlayEffect(ctx, ov, timeSec, w, h));
    }

    // Watermark
    drawWatermark(ctx, this.settings.watermark, w, h);

    // Subtitle cue or Scene caption
    const activeSub = this.settings.subtitles?.find((cue) => timeSec >= cue.start && timeSec <= cue.end);
    const textToDraw = activeSub ? activeSub.text : scene.caption;
    if (textToDraw && textToDraw.trim()) {
      drawCaptionText(ctx, textToDraw, w, h, this.settings.captionStyle);
    }

    return index;
  }
}

export async function exportVideoWithWebCodecs(params: {
  canvas: HTMLCanvasElement;
  scenes: VideoScene[];
  settings: VideoStudioSettings;
  fps?: number;
  onProgress?: (pct: number) => void;
  shouldCancel?: () => boolean;
}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const { canvas, scenes, settings, fps = 30, onProgress, shouldCancel } = params;
  const engine = new VideoComposerEngine(canvas, scenes, settings);
  const totalDuration = Math.max(1, engine.totalDuration);
  const totalFrames = Math.ceil(totalDuration * fps);

  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (hasWebCodecs) {
    try {
      const width = settings.width % 2 === 0 ? settings.width : settings.width - 1;
      const height = settings.height % 2 === 0 ? settings.height : settings.height - 1;
      canvas.width = width;
      canvas.height = height;

      const target = new ArrayBufferTarget();
      const muxer = new Muxer({
        target,
        video: {
          codec: 'avc',
          width,
          height,
        },
        fastStart: 'in-memory',
      });

      const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (err) => console.error('VideoEncoder error:', err),
      });

      const codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42E01E'];
      let configured = false;
      for (const codec of codecs) {
        const cfg: VideoEncoderConfig = {
          codec,
          width,
          height,
          bitrate: settings.resolution === 1080 ? 5_000_000 : 2_800_000,
          framerate: fps,
        };
        const support = await VideoEncoder.isConfigSupported(cfg);
        if (support.supported) {
          encoder.configure(cfg);
          configured = true;
          break;
        }
      }

      if (configured) {
        for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
          if (shouldCancel?.()) {
            encoder.close();
            throw new Error('CANCELLED');
          }
          const t = frameIdx / fps;
          engine.drawFrameAt(t);

          const vf = new VideoFrame(canvas, {
            timestamp: Math.round(t * 1_000_000),
            duration: Math.round((1 / fps) * 1_000_000),
          });
          encoder.encode(vf, { keyFrame: frameIdx % (fps * 2) === 0 });
          vf.close();

          if (frameIdx % 5 === 0) {
            onProgress?.(frameIdx / totalFrames);
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        await encoder.flush();
        encoder.close();
        muxer.finalize();
        onProgress?.(1);
        return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4' };
      }
    } catch (err: any) {
      if (err?.message === 'CANCELLED') throw err;
      console.warn('WebCodecs fallback to MediaRecorder:', err);
    }
  }

  // Fallback: MediaRecorder real-time capture
  const stream = canvas.captureStream(fps);
  const mimeCandidates = [
    ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'mp4'],
    ['video/mp4', 'mp4'],
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm', 'webm'],
  ] as const;

  let chosenMime = 'video/webm';
  let chosenExt: 'mp4' | 'webm' = 'webm';
  for (const [m, ext] of mimeCandidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      chosenMime = m;
      chosenExt = ext;
      break;
    }
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: chosenMime,
    videoBitsPerSecond: 4_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopPromise = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start(300);
  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (shouldCancel?.()) {
      recorder.stop();
      throw new Error('CANCELLED');
    }
    engine.drawFrameAt(frameIdx / fps);
    onProgress?.(frameIdx / totalFrames);
    await new Promise((r) => setTimeout(r, 1000 / fps));
  }
  recorder.stop();
  await stopPromise;
  stream.getTracks().forEach((tr) => tr.stop());
  onProgress?.(1);

  return { blob: new Blob(chunks, { type: chosenMime }), ext: chosenExt };
}
