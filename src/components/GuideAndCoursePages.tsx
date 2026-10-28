import React, { useState } from 'react';
import { Film, Image, Camera, CheckCircle2, Sparkles, Scissors, ArrowLeft, Play } from 'lucide-react';

const GUIDE_TABS = [
  {
    key: 'video',
    tab: '🎬 Tạo video',
    title: 'Tạo video nhanh từ ảnh và clip',
    intro: 'Biến hàng trăm ảnh, clip thành video album, video bán hàng, podcast chỉ trong 4 bước.',
    steps: [
      {
        t: 'Bước 1: Tải ảnh và video',
        d: [
          'Bấm "+ Thêm ảnh" hoặc "+ Video ngắn/dài" để chọn nhiều file từ máy.',
          'Kéo thả hoặc bấm mũi tên trên Dòng thời gian để đổi thứ tự, chỉnh số giây mỗi ảnh.',
        ],
      },
      {
        t: 'Bước 2: Hiệu ứng & Lớp phủ',
        d: [
          'Chọn chuyển cảnh (Mở cửa đôi, Mở rèm, Lật thẻ 3D...) và chuyển động (Ken Burns, Bồng bềnh...).',
          'Bấm "🎲 Mix ngẫu nhiên" để mỗi cảnh một kiểu khác nhau không bị trùng.',
          'Chọn lớp phủ (Giọt nước đầu cành, Đom đóm, Hoa anh đào...) hoặc bấm "+ Thêm lớp phủ" để chồng nhiều hiệu ứng.',
        ],
      },
      {
        t: 'Bước 3: Nhạc nền (68 bài) và Giọng đọc',
        d: [
          'Chọn từ kho 68 bản nhạc nền phân loại theo cảm xúc hoặc tải file MP3 của bạn.',
          'Bấm "🎙️ Ghi âm giọng nói" để thu âm trực tiếp tại vị trí vạch đỏ đang xem trước.',
          'Kéo 2 tay cầm để cắt ngắn âm thanh, hoặc bấm "✂️ Tách tại đây" để cắt đôi tại vạch đỏ.',
        ],
      },
      {
        t: 'Bước 4: Xuất video MP4 siêu tốc',
        d: [
          'Chọn "🚀 Nhanh" hoặc "Thường (Có hiệu ứng)" để xuất file MP4 bằng phần cứng WebCodecs.',
          'Video dài 2–5 tiếng: dùng "✂️ Cắt nhỏ" để chia theo phút, số đoạn hoặc mốc thời gian.',
        ],
      },
    ],
    tips: [
      'Bản nháp tự động lưu trên máy 7 ngày — không mất khi lỡ đóng trang.',
      'Video Zoom dài nên cắt bằng "✂️ Cắt nhỏ" trên Chrome hoặc Edge.',
      'Bấm biểu tượng Toàn màn hình ở góc phải để không gian làm việc rộng rãi nhất.',
    ],
  },
  {
    key: 'image',
    tab: '🖼️ Ghép ảnh & chữ',
    title: 'Ghép ảnh và chữ hàng loạt',
    intro: 'Tạo cả bộ ảnh đồng nhất có chữ, logo và chữ ký; xuất ZIP hoặc Ebook PDF chỉ trong 1 chạm.',
    steps: [
      {
        t: 'Bước 1: Tải nhiều ảnh lên cùng lúc',
        d: [
          'Bấm "+ Thêm nhiều ảnh cùng lúc" ở Cột 1.',
          'Cần ảnh nền đẹp? Mở Kho 680 Prompt VIP để sao chép câu lệnh tạo ảnh AI.',
        ],
      },
      {
        t: 'Bước 2: Nhập chữ theo 3 cách thông minh',
        d: [
          'Dán văn bản nhiều dòng rồi bấm "⚡ TÁCH ĐOẠN & GẮN VÀO TỪNG ẢNH".',
          'Hoặc dùng Trợ lý AI tự viết lời bình theo chủ đề.',
          'Hoặc gõ chỉnh riêng từng ảnh ở danh sách bên dưới.',
        ],
      },
      {
        t: 'Bước 3: Chỉnh Font Việt, Logo & Chữ ký',
        d: [
          'Chọn hơn 26 phông chữ tiếng Việt nghệ thuật, màu sắc, viền chữ, hộp nền bo góc.',
          'Bật Logo thương hiệu (chỉnh % kích thước, độ bo góc tròn) và chữ ký bản quyền.',
        ],
      },
      {
        t: 'Bước 4: Tải về hoặc Chuyển sang Tạo Video',
        d: [
          'Tải từng ảnh JPG, tải gói .ZIP, hoặc xuất thành cuốn Ebook PDF.',
          'Bấm "Chuyển sang Tạo Video ngay" để đưa toàn bộ ảnh vừa ghép sang Dòng thời gian làm video!',
        ],
      },
    ],
    tips: [
      'Chọn "Hộp bo góc" hoặc tăng "Độ dày viền" giúp chữ luôn nổi bật trên mọi nền ảnh.',
      'Kiểu chữ và chữ ký được tự động ghi nhớ cho những lần mở app tiếp theo.',
    ],
  },
  {
    key: 'record',
    tab: '🎙️ Tự quay + Nhắc chữ',
    title: 'Tự quay video với máy nhắc chữ (Teleprompter)',
    intro: 'Quay chính mình hoặc thu âm đọc theo chữ chạy. Có mặt nạ 3D giấu mặt và làm đẹp tự nhiên.',
    steps: [
      {
        t: 'Bước 1: Chuẩn bị kịch bản',
        d: [
          'Dán kịch bản vào ô soạn thảo hoặc bấm "✨ Soạn kịch bản" để AI viết hộ.',
          'Bấm "Chạy thử chữ" để canh chỉnh Cỡ chữ và Tốc độ trôi vừa tầm mắt.',
        ],
      },
      {
        t: 'Bước 2: Chọn khung hình & Mặt nạ 3D',
        d: [
          'Chọn khung dọc 9:16 (TikTok/Reels) hoặc ngang 16:9 (YouTube).',
          'Nếu ngại lộ mặt: Chọn các mẫu Mặt nạ 3D dễ thương hoặc bật chế độ Làm đẹp da.',
        ],
      },
      {
        t: 'Bước 3: Quay & Chèn vào video',
        d: [
          'Bấm "Bắt đầu quay", hệ thống đếm ngược 3-2-1 rồi tự động cuộn chữ.',
          'Quay xong có thể tải về máy ngay hoặc bấm "Chèn vào trình tạo video" để ghép nhạc nền!',
        ],
      },
    ],
    tips: [
      'Đặt camera ngang tầm mắt để ánh nhìn tự nhiên như đang trò chuyện với khán giả.',
      'Để tốc độ chữ chạy chậm hơn tốc độ nói một chút sẽ giúp biểu cảm tự nhiên hơn.',
    ],
  },
];

export const GuideModalPage: React.FC<{
  initialTab?: string;
  onBackToStudio: (mode: 'video' | 'image' | 'record') => void;
}> = ({ initialTab = 'video', onBackToStudio }) => {
  const [activeKey, setActiveKey] = useState<string>(initialTab);
  const current = GUIDE_TABS.find((t) => t.key === activeKey) || GUIDE_TABS[0];

  return (
    <div className="mx-auto max-w-5xl py-6 px-4 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onBackToStudio(activeKey as any)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Quay về Công cụ sáng tạo
        </button>
        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
          📖 CẨM NANG HƯỚNG DẪN TỪ A–Z
        </span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight">
          <span className="block text-slate-200">Hướng dẫn sử dụng</span>
          <span className="block bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Từng bước chi tiết
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
          Chọn công cụ bạn muốn xem. Mỗi phần đều được thiết kế tối giản để hoàn thành sản phẩm trong vài phút.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GUIDE_TABS.map((item) => {
          const isSelected = item.key === current.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveKey(item.key)}
              className={`rounded-2xl border-2 py-4 px-5 text-base font-extrabold transition ${
                isSelected
                  ? 'border-amber-400 bg-gradient-to-r from-amber-400/20 to-yellow-500/10 text-amber-300 shadow-lg'
                  : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700'
              }`}
            >
              {item.tab}
            </button>
          );
        })}
      </div>

      {/* Guide Card */}
      <div className="rounded-3xl border border-slate-800 bg-[#0d152c] p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h2 className="text-2xl font-black text-white">{current.title}</h2>
            <p className="text-sm text-slate-300 mt-1">{current.intro}</p>
          </div>
          <button
            type="button"
            onClick={() => onBackToStudio(current.key as any)}
            className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg hover:brightness-110"
          >
            Mở công cụ này ngay →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {current.steps.map((st, i) => (
            <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-slate-950">
                  {i + 1}
                </span>
                <h3 className="font-extrabold text-base text-amber-300">{st.t}</h3>
              </div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200 list-disc pl-5">
                {st.d.map((line, lIdx) => (
                  <li key={lIdx} className="leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
          <h4 className="font-extrabold text-sm text-emerald-300 mb-2">💡 Mẹo hay giúp làm nhanh & đẹp hơn:</h4>
          <ul className="space-y-1 text-xs sm:text-sm text-slate-200 list-disc pl-5">
            {current.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const CourseShowcasePage: React.FC<{
  onOpenTool: (mode: 'video' | 'image' | 'record') => void;
}> = ({ onOpenTool }) => {
  const useCases = [
    { emoji: '👨‍👩‍👧‍👦', title: 'Gia đình & Kỷ niệm', desc: 'Đánh thức hàng ngàn bức ảnh ngủ quên trong điện thoại thành phim kỷ niệm ấm áp.' },
    { emoji: '✈️', title: 'Du lịch & Khám phá', desc: 'Gom ảnh chuyến đi thành thước phim sống động kèm nhạc nền du ca.' },
    { emoji: '💍', title: 'Ngày cưới & Tình yêu', desc: 'Album cưới chuyển động Ken Burns lãng mạn với cánh hoa anh đào rơi.' },
    { emoji: '🌸', title: 'Tết sum vầy', desc: 'Làm video chúc Tết ông bà, đại gia đình chỉ trong 3 phút.' },
    { emoji: '🎂', title: 'Sinh nhật con', desc: 'Lưu giữ hành trình lớn lên của bé qua từng năm tháng.' },
    { emoji: '🛍️', title: 'Video Bán hàng', desc: 'Ghép ảnh sản phẩm kèm giá bán & tính năng đăng Reels/TikTok Shop.' },
    { emoji: '🎙️', title: 'Podcast giọng thật', desc: 'Thu âm lời tâm sự, bài giảng lồng vào bộ ảnh nghệ thuật AI.' },
    { emoji: '🏆', title: 'Sự kiện & Đào tạo', desc: 'Cắt nhỏ video Zoom dài 2–5 tiếng và tổng hợp hình ảnh lớp học.' },
  ];

  return (
    <div className="mx-auto max-w-6xl py-8 px-4 space-y-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-gradient-to-br from-[#121c3d] via-[#0c1329] to-[#23152e] p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400/20 border border-amber-400/40 px-4 py-1 text-xs font-extrabold text-amber-300">
          ✦ 0 CREDIT · CHẠY NGAY TRÊN MÁY · 0Đ TIỀN CLOUD ✦
        </div>

        <h1 className="text-3xl sm:text-6xl font-black uppercase leading-tight">
          <span className="block text-white">Tạo Video Từ Ảnh</span>
          <span className="block bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
            Siêu Nhanh Trong 3 Phút
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-200 leading-relaxed">
          Đánh thức <b>12.840 khoảnh khắc</b> đang ngủ quên trong điện thoại thành những thước phim chạm tới trái tim.
          Giải phóng bộ nhớ máy mà không phải trả tiền mua thêm iCloud hay Google One hàng tháng!
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenTool('video')}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-7 py-4 text-sm sm:text-base font-black text-slate-950 shadow-xl hover:brightness-110 transition"
          >
            <Film className="w-5 h-5" /> Mở Trình Tạo Video Ngay
          </button>
          <button
            type="button"
            onClick={() => onOpenTool('image')}
            className="inline-flex items-center gap-2 rounded-2xl border-2 border-amber-400/60 bg-slate-900/80 px-6 py-4 text-sm sm:text-base font-extrabold text-amber-300 hover:bg-slate-800 transition"
          >
            <Image className="w-5 h-5" /> Ghép Ảnh & Chữ Hàng Loạt
          </button>
          <button
            type="button"
            onClick={() => onOpenTool('record')}
            className="inline-flex items-center gap-2 rounded-2xl border border-sky-400/50 bg-sky-500/20 px-6 py-4 text-sm sm:text-base font-extrabold text-sky-300 hover:bg-sky-500/30 transition"
          >
            <Camera className="w-5 h-5" /> Tự Quay + Máy Nhắc Chữ
          </button>
        </div>
      </div>

      {/* Use Cases Grid */}
      <div className="space-y-4">
        <div className="text-center">
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
            ỨNG DỤNG THỰC TẾ
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            8 Chủ đề video ai cũng cần làm ngay
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {useCases.map((uc, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-800 bg-[#0d152c] p-5 hover:border-amber-400/50 transition space-y-2"
            >
              <div className="text-3xl">{uc.emoji}</div>
              <h3 className="font-extrabold text-base text-white">{uc.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
