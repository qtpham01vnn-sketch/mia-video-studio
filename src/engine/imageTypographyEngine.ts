import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export type AnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface RichTextSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  highlight?: string;
}

export interface BatchTextStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  shadow: boolean;
  shadowBlur: number;
  align: 'left' | 'center' | 'right';
  anchor: AnchorPosition;
  offsetX: number;
  offsetY: number;
  maxWidthPct: number;
  bgStyle: 'none' | 'rounded' | 'bar';
  bgColor: string;
  bgPadding: number;
  lineHeight: number;
  uppercase: boolean;
}

export interface SignatureConfig {
  enabled: boolean;
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  anchor: AnchorPosition;
  offsetX: number;
  offsetY: number;
  shadow: boolean;
  opacity: number;
}

export interface LogoConfig {
  enabled: boolean;
  src: string;
  widthPct: number;
  anchor: AnchorPosition;
  offsetX: number;
  offsetY: number;
  opacity: number;
  rounded: number;
}

export const DEFAULT_TEXT_STYLE: BatchTextStyle = {
  fontFamily: 'Be Vietnam Pro',
  fontWeight: 700,
  fontSize: 64,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 3,
  shadow: true,
  shadowBlur: 12,
  align: 'center',
  anchor: 'bottom-center',
  offsetX: 0,
  offsetY: -6,
  maxWidthPct: 86,
  bgStyle: 'none',
  bgColor: 'rgba(0,0,0,0.55)',
  bgPadding: 16,
  lineHeight: 1.25,
  uppercase: false,
};

export const DEFAULT_SIGNATURE: SignatureConfig = {
  enabled: false,
  text: '© Mia Studio · Tạo Video Nhanh',
  fontFamily: 'Be Vietnam Pro',
  fontWeight: 600,
  fontSize: 24,
  color: '#ffffff',
  anchor: 'bottom-right',
  offsetX: -2,
  offsetY: -2,
  shadow: true,
  opacity: 0.9,
};

export const DEFAULT_LOGO: LogoConfig = {
  enabled: false,
  src: '',
  widthPct: 14,
  anchor: 'top-right',
  offsetX: -2,
  offsetY: 2,
  opacity: 0.95,
  rounded: 0,
};

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width <= maxWidth) {
              chunk += ch;
            } else {
              if (chunk) lines.push(chunk);
              chunk = ch;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export function computeAnchorXY(
  anchor: AnchorPosition,
  canvasW: number,
  canvasH: number,
  boxW: number,
  boxH: number,
  padding: number,
  offsetXPct: number,
  offsetYPct: number
): { x: number; y: number } {
  const [vPos, hPos] = anchor.split('-');
  let x = 0;
  let y = 0;
  if (hPos === 'left') x = padding;
  else if (hPos === 'center') x = (canvasW - boxW) / 2;
  else x = canvasW - boxW - padding;

  if (vPos === 'top') y = padding;
  else if (vPos === 'middle') y = (canvasH - boxH) / 2;
  else y = canvasH - boxH - padding;

  x += (offsetXPct / 100) * canvasW;
  y += (offsetYPct / 100) * canvasH;
  return { x, y };
}

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function renderImageWithTypography(
  canvas: HTMLCanvasElement,
  params: {
    image: HTMLImageElement;
    text: string;
    style: BatchTextStyle;
    signature?: SignatureConfig;
    logo?: LogoConfig;
    logoImage?: HTMLImageElement | null;
    richSegments?: RichTextSegment[];
  }
) {
  const { image, text, style, signature, logo, logoImage } = params;
  const w = image.naturalWidth || image.width || 1080;
  const h = image.naturalHeight || image.height || 1080;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(image, 0, 0, w, h);

  const scale = h / 1080;

  // 1. Main Text
  if (text && text.trim().length > 0) {
    const fontSizePx = Math.max(10, style.fontSize * scale);
    const strokePx = style.strokeWidth * scale;
    const padPx = style.bgPadding * scale;
    const shadowBlurPx = style.shadowBlur * scale;

    ctx.font = `${style.fontWeight} ${fontSizePx}px "${style.fontFamily}", system-ui, sans-serif`;
    ctx.textBaseline = 'top';

    const maxTextWidth = (w * style.maxWidthPct) / 100;
    const lineHeightPx = fontSizePx * style.lineHeight;
    const displayStr = style.uppercase ? text.toUpperCase() : text;
    const lines = wrapTextLines(ctx, displayStr, maxTextWidth);
    const lineWidths = lines.map((l) => ctx.measureText(l).width);

    const blockH = lines.length * lineHeightPx;
    const blockW = Math.min(maxTextWidth, Math.max(...lineWidths, 0));

    const { x: baseX, y: baseY } = computeAnchorXY(
      style.anchor,
      w,
      h,
      blockW,
      blockH,
      padPx,
      style.offsetX,
      style.offsetY
    );

    // Background box
    if (style.bgStyle !== 'none') {
      const bx = baseX - padPx;
      const by = baseY - padPx;
      const bw = blockW + padPx * 2;
      const bh = blockH + padPx * 2;
      ctx.fillStyle = style.bgColor;
      if (style.bgStyle === 'rounded') {
        drawRoundedRect(ctx, bx, by, bw, bh, Math.min(24 * scale, bh / 2));
        ctx.fill();
      } else {
        ctx.fillRect(0, by, w, bh);
      }
    }

    // Shadow
    if (style.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.75)';
      ctx.shadowBlur = shadowBlurPx;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    for (let i = 0; i < lines.length; i++) {
      const lineStr = lines[i];
      const lw = lineWidths[i];
      let lx = baseX;
      if (style.align === 'center') lx = baseX + (blockW - lw) / 2;
      else if (style.align === 'right') lx = baseX + (blockW - lw);
      const ly = baseY + i * lineHeightPx;

      if (strokePx > 0) {
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = strokePx * 2;
        ctx.strokeText(lineStr, lx, ly);
      }
      ctx.fillStyle = style.color;
      ctx.fillText(lineStr, lx, ly);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // 2. Logo Watermark
  if (logo?.enabled && logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
    const lw = (w * logo.widthPct) / 100;
    const aspect = logoImage.naturalHeight / logoImage.naturalWidth;
    const lh = lw * aspect;
    const margin = 16 * scale;
    const pos = computeAnchorXY(logo.anchor, w, h, lw, lh, margin, logo.offsetX, logo.offsetY);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, logo.opacity));
    const roundedPct = Math.max(0, Math.min(50, logo.rounded || 0));
    if (roundedPct > 0) {
      const r = (Math.min(lw, lh) * roundedPct) / 100;
      drawRoundedRect(ctx, pos.x, pos.y, lw, lh, r);
      ctx.clip();
    }
    ctx.drawImage(logoImage, pos.x, pos.y, lw, lh);
    ctx.restore();
  }

  // 3. Signature
  if (signature?.enabled && signature.text.trim()) {
    const sigFontSize = Math.max(8, signature.fontSize * scale);
    ctx.save();
    ctx.font = `${signature.fontWeight} ${sigFontSize}px "${signature.fontFamily}", system-ui, sans-serif`;
    ctx.textBaseline = 'top';
    const sw = ctx.measureText(signature.text).width;
    const sh = sigFontSize * 1.25;
    const margin = 16 * scale;
    const pos = computeAnchorXY(
      signature.anchor,
      w,
      h,
      sw,
      sh,
      margin,
      signature.offsetX,
      signature.offsetY
    );
    ctx.globalAlpha = Math.max(0, Math.min(1, signature.opacity));
    if (signature.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 6 * scale;
      ctx.shadowOffsetY = 1 * scale;
    }
    ctx.fillStyle = signature.color;
    ctx.fillText(signature.text, pos.x, pos.y);
    ctx.restore();
  }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.94
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      quality
    );
  });
}

export async function exportBatchAsZip(
  items: Array<{ name: string; blob: Blob }>,
  ext: 'jpg' | 'png'
): Promise<void> {
  const zip = new JSZip();
  items.forEach((item, idx) => {
    const baseName = item.name.replace(/\.[^.]+$/, '') || `anh-${idx + 1}`;
    zip.file(`${String(idx + 1).padStart(2, '0')}_${baseName}.${ext}`, item.blob);
  });
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `bo-anh-chu-${Date.now()}.zip`);
}

export async function exportBatchAsPdf(canvases: HTMLCanvasElement[]): Promise<void> {
  if (canvases.length === 0) return;
  let pdf: jsPDF | null = null;
  for (const c of canvases) {
    const dataUrl = c.toDataURL('image/jpeg', 0.92);
    const w = c.width;
    const h = c.height;
    const orientation = w >= h ? 'landscape' : 'portrait';
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], compress: true });
    } else {
      pdf.addPage([w, h], orientation);
    }
    pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
  }
  if (pdf) {
    const blob = pdf.output('blob');
    saveAs(blob, `ebook-anh-chu-${Date.now()}.pdf`);
  }
}
