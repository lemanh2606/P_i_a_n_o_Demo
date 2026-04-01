/**
 * Dữ liệu bản nhạc tự động.
 * - time: giây từ lúc bắt đầu (0 = nốt đầu tiên)
 * - dur: độ dài nốt (giây)
 * - note: tên nốt Tone.js (vd "C4", "F#4")
 * - velocity (tùy chọn): độ mạnh 0–1, truyền vào PolySynth.triggerAttackRelease
 */
export type SongNote = {
  time: number;
  dur: number;
  note: string;
  velocity?: number;
};

/**
 * Giai điệu ngắn (ví dụ: đoạn quen thuộc “Twinkle Twinkle” đơn giản hóa).
 * Bạn có thể thay bằng mảng nốt khác — giữ note trong dải C2–C6.
 */
export const demoSong: SongNote[] = [
 // Cứ quên anh vậy đi
 { time: 0, dur: 0.18, note: "E4" },
 { time: 0.32, dur: 0.18, note: "D4" },
 { time: 0.64, dur: 0.22, note: "C4" },
 { time: 1.0, dur: 0.3, note: "A3" },
 { time: 1.5, dur: 0.5, note: "C4" }, // giữ

 // nghỉ rõ
 { time: 2.4, dur: 0.18, note: "C4" },
 { time: 2.7, dur: 0.18, note: "C4" },
 { time: 3.0, dur: 0.2, note: "D4" },
 { time: 3.4, dur: 0.2, note: "D4" },
 { time: 3.8, dur: 0.3, note: "E4" },
 { time: 4.3, dur: 0.2, note: "D4" },
 { time: 4.7, dur: 0.2, note: "C4" },
 { time: 5.0, dur: 0.2, note: "B3" },
 { time: 5.3, dur: 0.2, note: "A3" },

 // nhấn câu
 { time: 5.8, dur: 0.5, note: "D4" },
 { time: 6.6, dur: 0.5, note: "G4" },

 // ===== ĐIỆP KHÚC =====
 { time: 8.0, dur: 0.25, note: "A4" },
 { time: 8.3, dur: 0.25, note: "G4" },
 { time: 8.6, dur: 0.3, note: "E4" },
 { time: 9.0, dur: 0.25, note: "D4" },
 { time: 9.4, dur: 0.25, note: "C4" },
 { time: 9.8, dur: 0.2, note: "A3" },
 { time: 10.2, dur: 0.5, note: "D4" },

 // Buông đôi tay (đúng feel hơn)
 { time: 11.2, dur: 0.15, note: "E4" },
 { time: 11.4, dur: 0.15, note: "E4" },
 { time: 11.6, dur: 0.15, note: "E4" },
 { time: 11.9, dur: 0.2, note: "E4" },
 { time: 12.3, dur: 0.5, note: "E4" },

 // nghỉ + trả câu
 { time: 13.2, dur: 0.3, note: "A4" },
 { time: 13.6, dur: 0.25, note: "G4" },
 { time: 14.0, dur: 0.3, note: "E4" },
 { time: 14.4, dur: 0.25, note: "D4" },
 { time: 14.8, dur: 0.25, note: "C4" },
 { time: 15.2, dur: 0.5, note: "D4" },
];