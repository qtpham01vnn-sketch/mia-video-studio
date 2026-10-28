import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "http://localhost:20128/v1",
  apiKey: "tuanpham_gateway_2026", // Gateway Secret Key
  dangerouslyAllowBrowser: true,
});

export async function generateAICaptionsForImages(topic: string, count: number): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: "auto-smart",
      messages: [
        {
          role: "system",
          content: "Bạn là chuyên gia sáng tạo nội dung video ngắn và bộ ảnh truyền cảm hứng tiếng Việt. Hãy trả về đúng số câu caption ngắn gọn, giàu cảm xúc, mỗi câu trên 1 dòng, không đánh số thứ tự.",
        },
        {
          role: "user",
          content: `Hãy viết ${count} câu chú thích ảnh ngắn gọn (8-16 chữ mỗi câu) theo chủ đề: "${topic}". Mỗi câu trên 1 dòng.`,
        },
      ],
    });
    const text = completion.choices[0]?.message?.content || "";
    return text
      .split(/\r?\n/)
      .map((l) => l.replace(/^\d+[\.\)\-\s]+/, "").trim())
      .filter(Boolean);
  } catch (err) {
    console.warn("AI Gateway fallback:", err);
    return Array.from({ length: count }, (_, i) => `${topic} — Khoảnh khắc đáng nhớ #${i + 1}`);
  }
}

export async function generateAITeleprompterScript(topic: string, durationSec: number): Promise<string> {
  try {
    const words = Math.round((durationSec / 60) * 130);
    const completion = await openai.chat.completions.create({
      model: "auto-smart",
      messages: [
        {
          role: "system",
          content: "Bạn là biên kịch video TikTok/Reels/YouTube chuyên nghiệp. Chỉ trả về lời thoại tự nhiên để đọc trên máy nhắc chữ, ngắt câu rõ ràng, không kèm ghi chú đạo diễn.",
        },
        {
          role: "user",
          content: `Viết kịch bản lời thoại khoảng ${words} từ (tương đương ${durationSec} giây đọc) về chủ đề: "${topic}". Chia thành các câu ngắn dễ đọc.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.warn("AI Gateway fallback:", err);
    return `Xin chào các bạn! Hôm nay chúng ta cùng chia sẻ về chủ đề ${topic}.\nĐây là những khoảnh khắc tuyệt vời và ý nghĩa nhất.\nHãy cùng theo dõi đến cuối video và nhấn đăng ký kênh nhé!`;
  }
}
