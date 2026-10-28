export interface TransitionItem {
  id: string;
  label: string;
}

export interface MotionItem {
  id: string;
  label: string;
}

export interface OverlayItem {
  id: string;
  label: string;
  nature?: boolean;
}

export const TRANSITIONS: TransitionItem[] = [
  { id: 'none', label: '🚫 Không' },
  { id: 'fade', label: '🌫️ Mờ dần (Crossfade)' },
  { id: 'double-door', label: '🚪 Mở cửa đôi' },
  { id: 'curtain', label: '🎭 Mở rèm' },
  { id: 'slide-up', label: '⬆️ Trượt lên' },
  { id: 'slide-down', label: '⬇️ Trượt xuống' },
  { id: 'zoom-out', label: '🔍 Thu nhỏ lùi xa' },
  { id: 'iris', label: '⭕ Vòng tròn mở rộng' },
  { id: 'diamond', label: '💎 Hình thoi lan tỏa' },
  { id: 'card-flip', label: '🔄 Lật thẻ 3D' },
  { id: 'diagonal', label: '🪄 Quét chéo' },
  { id: 'checker', label: '⬛ Ô so le' },
  { id: 'flash', label: '📸 Lóa sáng' },
  { id: 'ripple', label: '🌊 Gợn sóng' },
  { id: 'film-roll', label: '📜 Cuộn phim' },
];

export const MOTIONS: MotionItem[] = [
  { id: 'static', label: '🚫 Không' },
  { id: 'kenburns', label: '🎥 Ken Burns (zoom chậm)' },
  { id: 'float', label: '🌊 Bồng bềnh' },
  { id: 'breathe', label: '💓 Nhịp thở êm dịu' },
  { id: 'zoom-in', label: '🔍 Zoom tiến vào tâm' },
  { id: 'zoom-out', label: '🔭 Zoom lùi toàn cảnh' },
  { id: 'pan-right', label: '➡️ Lia sang phải' },
  { id: 'pan-left', label: '⬅️ Lia sang trái' },
  { id: 'tilt-up', label: '⬆️ Quét lên trên' },
  { id: 'tilt-down', label: '⬇️ Quét xuống dưới' },
  { id: 'zoom-tr', label: '↗️ Zoom góc trên phải' },
  { id: 'zoom-tl', label: '↖️ Zoom góc trên trái' },
  { id: 'sway', label: '⚖️ Nghiêng bập bênh' },
  { id: 'shake', label: '📳 Lắc nhẹ' },
  { id: 'snap-zoom', label: '🎬 Phóng nhanh điểm nhấn' },
];

export const OVERLAYS: OverlayItem[] = [
  { id: 'none', label: '🚫 Không' },
  { id: 'leafdrops', label: '💧 Giọt nước đầu cành', nature: true },
  { id: 'sunrays', label: '☀️ Nắng xuyên tán lá', nature: true },
  { id: 'fireflies', label: '✨ Đom đóm', nature: true },
  { id: 'cherry', label: '🌸 Hoa anh đào', nature: true },
  { id: 'autumn', label: '🍂 Lá vàng mùa thu', nature: true },
  { id: 'bamboo', label: '🎋 Lá tre xào xạc', nature: true },
  { id: 'lotus', label: '🪷 Cánh sen', nature: true },
  { id: 'dandelion', label: '🌼 Hoa bồ công anh', nature: true },
  { id: 'butterflies', label: '🦋 Bướm dập dờn', nature: true },
  { id: 'birds', label: '🕊️ Chim bay', nature: true },
  { id: 'dragonflies', label: '🪰 Chuồn chuồn ớt', nature: true },
  { id: 'dew', label: '💧 Giọt sương mai', nature: true },
  { id: 'rain', label: '🌧️ Mưa nhẹ hạt', nature: true },
  { id: 'mist', label: '🌫️ Hơi nước / sương mờ', nature: true },
  { id: 'ripples', label: '🌊 Gợn sóng nước', nature: true },
  { id: 'stream', label: '🫧 Bọt nước suối', nature: true },
  { id: 'clouds', label: '☁️ Mây trôi', nature: true },
  { id: 'rainbow', label: '🌈 Cầu vồng', nature: true },
  { id: 'shooting', label: '🌠 Sao băng' },
  { id: 'galaxy', label: '🌌 Bụi thiên hà xanh' },
  { id: 'aurora', label: '🌌 Cực quang phương Bắc' },
  { id: 'moonbeam', label: '🌙 Ánh trăng & mây đêm' },
  { id: 'frost', label: '🧊 Tinh thể băng tuyết' },
  { id: 'desert', label: '🌵 Hoa sa mạc & bụi vàng' },
  { id: 'seashells', label: '🐚 Vỏ ốc & sao biển' },
  { id: 'pollen', label: '🌾 Phấn cỏ may', nature: true },
  { id: 'chestnut', label: '🌰 Lá dẻ & hạt vàng', nature: true },
];

export const VIETNAMESE_FONTS: string[] = [
  'Be Vietnam Pro',
  'Montserrat',
  'Lexend',
  'Plus Jakarta Sans',
  'Nunito',
  'Quicksand',
  'Comfortaa',
  'Baloo 2',
  'Lora',
  'Playfair Display',
  'Merriweather',
  'Cormorant Garamond',
  'Dancing Script',
  'Pacifico',
  'Lobster',
  'Charm',
  'Pattaya',
  'Patrick Hand',
  'Caveat',
  'Coiny',
  'Sriracha',
  'Oswald',
  'Chakra Petch',
  'Space Grotesk',
  'Outfit',
  'Raleway',
];

export const ASPECT_RATIOS: Record<string, { label: string; desc: string; w720: number; h720: number; w1080: number; h1080: number }> = {
  '9:16': { label: '9:16 Dọc', desc: 'TikTok · Reels · Shorts', w720: 720, h720: 1280, w1080: 1080, h1080: 1920 },
  '16:9': { label: '16:9 Ngang', desc: 'YouTube · TV · Máy tính', w720: 1280, h720: 720, w1080: 1920, h1080: 1080 },
  '1:1': { label: '1:1 Vuông', desc: 'Facebook · Instagram', w720: 720, h720: 720, w1080: 1080, h1080: 1080 },
  '4:5': { label: '4:5 Chân dung', desc: 'Bài đăng Feed tối ưu', w720: 720, h720: 900, w1080: 1080, h1080: 1350 },
};

export function mixRandomNonRepeating<T extends { id: string }>(items: T[], count: number, excludeIds: string[] = ['none', 'static']): string[] {
  const pool = items.map(x => x.id).filter(id => !excludeIds.includes(id));
  if (pool.length === 0) return Array(count).fill('none');
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const candidates = pool.length > 1 && i > 0 ? pool.filter(id => id !== result[i - 1]) : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    result.push(picked);
  }
  return result;
}
