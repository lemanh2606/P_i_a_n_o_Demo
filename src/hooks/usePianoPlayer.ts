import { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { songFromMidi } from "../music/fromMidi";
import { sampler } from "../audio/audioEngine";

export function usePianoPlayer() {
  // `currentSong`: Mảng chứa dữ liệu các nốt nhạc của bài hát hiện tại (gồm tên nốt, thời gian phát, độ dài nốt).
  const [currentSong, setCurrentSong] = useState(songFromMidi);
  
  // `isLoaded`: Biến cờ (boolean) báo hiệu xem các file âm thanh mp3 của phím đàn đã được tải về máy xong chưa.
  const [isLoaded, setIsLoaded] = useState(false);
  
  // `activeNotes`: Mảng chứa các "số MIDI" của các phím đang được bấm (Ví dụ 60 là nốt C4). Dùng để làm sáng phím trên màn hình.
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  
  // `isDemoPlaying`: Biến cờ cho biết bài nhạc tự động có đang được phát hay không.
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  
  // `isPaused`: Biến cờ cho biết bài nhạc có đang bị tạm dừng (pause) hay không.
  const [isPaused, setIsPaused] = useState(false);
  
  // `currentTime`: Lưu thời gian hiện tại của bài nhạc đang phát (tính bằng giây).
  const [currentTime, setCurrentTime] = useState(0);
  
  // `duration`: Lưu tổng thời lượng của toàn bộ bài nhạc (tính bằng giây).
  const [duration, setDuration] = useState(0);

  // [Hook useEffect] Chạy 1 lần duy nhất khi ứng dụng vừa mở lên.
  // Đợi thư viện Tone.js tải xong file âm thanh (sampler) rồi mới bật cờ `isLoaded = true`.
  useEffect(() => {
    Tone.loaded().then(() => setIsLoaded(true));
  }, []);

  // [Hook useEffect] Cleanup function: Khi đóng ứng dụng, tự động dọn dẹp và tắt nhạc để giải phóng bộ nhớ.
  useEffect(() => {
    return () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
    };
  }, []);

  // [Hook useEffect] Tạo một bộ đếm giờ (Timer) để liên tục cập nhật thanh thời gian.
  useEffect(() => {
    let interval: number;
    // Nếu nhạc đang phát và không bị tạm dừng => cứ mỗi 100ms lại lấy thời gian hiện tại gán vào state `currentTime`.
    if (isDemoPlaying && !isPaused) {
      interval = window.setInterval(() => {
        setCurrentTime(Tone.Transport.seconds);
      }, 100);
    }
    // Cleanup: Xóa bộ đếm nếu nhạc dừng.
    return () => clearInterval(interval);
  }, [isDemoPlaying, isPaused]);

  // Hàm xử lý việc người dùng bấm tải file MIDI (.mid) từ máy tính lên.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Đọc file thành mảng byte thô (arrayBuffer)
      const arrayBuffer = await file.arrayBuffer();
      // Dùng thư viện `@tonejs/midi` để giải mã file midi thành dạng object dễ đọc
      const midi = new Midi(arrayBuffer);
      
      // Tạo một mảng rỗng để chứa toàn bộ nốt nhạc từ file
      let notes: {
        time: number;       // Thời điểm bắt đầu phát nốt
        dur: number;        // Trường độ (độ ngân) của nốt
        note: string;       // Tên nốt (ví dụ "C4")
        velocity?: number;  // Lực nhấn phím (to nhỏ)
        midiNumber?: number;// Mã số MIDI tương ứng (ví dụ 60)
      }[] = [];
      
      // Vòng lặp lấy từng nốt từ tất cả các track trong file MIDI
      for (const tr of midi.tracks) {
        notes.push(
          ...tr.notes.map((n) => ({
            time: n.time,
            dur: Math.max(0.02, n.duration), // Đảm bảo độ ngân tối thiểu
            note: n.name,
            velocity: Math.round(n.velocity * 1000) / 1000,
            midiNumber: n.midi,
          })),
        );
      }
      
      // Lọc bỏ đi các nốt quá trầm hoặc quá cao (ngoài dải phím C2-C6 của đàn)
      notes = notes.filter(
        (n) =>
          n.midiNumber !== undefined &&
          n.midiNumber >= 36 &&
          n.midiNumber <= 84,
      );
      // Sắp xếp lại danh sách các nốt theo trình tự thời gian tăng dần
      notes.sort((a, b) => a.time - b.time || a.note.localeCompare(b.note));

      if (notes.length === 0) {
        alert("Không tìm thấy nốt hợp lệ trong dải phím C2-C6.");
        return;
      }

      // Đưa bài hát mới vào hệ thống nhạc, reset tất cả tiến trình
      setCurrentSong(notes);
      Tone.Transport.cancel();
      Tone.Transport.stop();
      setIsDemoPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      setActiveNotes([]);
      setDuration(Math.max(...notes.map((n) => n.time + n.dur)) + 0.15);
    } catch (err) {
      console.error(err);
      alert("Lỗi tải file MIDI. Xin hãy thử lại.");
    }
  };

  // Hàm ấn nút Play: Phát bài hát tự động
  const playDemo = useCallback(async () => {
    // Yêu cầu trình duyệt cấp quyền phát ra âm thanh
    await Tone.start();

    // Nếu đang tạm dừng (Paused) thì nhấn Play chỉ đơn giản là Resume (tiếp tục chạy)
    if (isDemoPlaying && isPaused) {
      Tone.Transport.start();
      setIsPaused(false);
      return;
    }

    // Nếu là phát lại từ đầu: Hủy nhạc cũ, xoá hết các phím đang sáng, thời gian về số 0.
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setActiveNotes([]);
    setCurrentTime(0);

    // Tính điểm kết thúc bài nhạc
    const songEndTime = Math.max(...currentSong.map((e) => e.time + e.dur)) + 0.15;
    setDuration(songEndTime);

    // Lặp qua từng nốt nhạc trong bài và "lên lịch" (schedule) trước cho hệ thống máy
    for (const { time, dur, note, velocity } of currentSong) {
      const midi = Tone.Frequency(note).toMidi(); // Dịch tên nốt ra số (C4 -> 60)
      const vel = velocity ?? 0.9;

      // Hẹn giờ: Đến đúng giây thứ 'time' thì phát ra tiếng đàn và đánh dấu phím sáng lên
      Tone.Transport.schedule((t) => {
        sampler.triggerAttackRelease(note, dur, t, vel);
        setActiveNotes((prev) => [...prev, midi]); // Thêm vào danh sách phím sáng
      }, time);

      // Hẹn giờ: Đến lúc kết thúc độ ngân (time + dur) thì tắt bóng đèn sáng của phím đó đi
      Tone.Transport.schedule(() => {
        setActiveNotes((prev) => prev.filter(n => n !== midi));
      }, time + dur);
    }

    // Hẹn giờ cho thời điểm kết thúc bài: Dọn dẹp phím, báo cờ ngưng phát
    Tone.Transport.schedule(() => {
      setActiveNotes([]);
      setIsDemoPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      Tone.Transport.stop();
    }, songEndTime);

    // Phát Cờ báo hiệu bài nhạc bắt đầu đánh
    setIsDemoPlaying(true);
    setIsPaused(false);
    Tone.Transport.start(); // Đồng hồ đếm giờ bắt đầu chạy!
  }, [isDemoPlaying, isPaused, currentSong]);

  // Hàm ấn Tạm dừng (Pause) nhạc
  const pauseDemo = useCallback(() => {
    Tone.Transport.pause(); // Cục đếm thời gian tạm ngưng
    setIsPaused(true);
  }, []);

  // Hàm xử lý việc tua nhanh thời gian bằng cách kéo cục tròn trên thanh slider
  const seekDemo = useCallback((newTime: number) => {
    Tone.Transport.seconds = newTime; // Cập nhật hệ thống vào đúng số giây mới
    setCurrentTime(newTime);
    setActiveNotes([]); // Xóa đi các đèn sáng bị lỗi hiển thị kẹt lại khi bị nhảy thời gian
  }, []);

  // Hàm Đánh tay: Xử lý khi người dùng ấn vào 1 phím bằng chuột hoặc gõ bằng bàn phím máy tính 
  const playNote = async (midiNumber: number): Promise<void> => {
    // Nếu nhạc tự động đang đánh thì không cho đánh tay chen ngang (trừ khi pause)
    if (isDemoPlaying && !isPaused) return;
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();
    sampler.triggerAttack(note); // Gõ cái búa vào dây đàn
    setActiveNotes((prev) => [...prev, midiNumber]); // Làm bóng đèn phím bật sáng
  };

  // Hàm Ngưng Đánh tay: Nhấc tay thả chuột / thả phím máy tính ra
  const stopNote = (midiNumber: number): void => {
    if (isDemoPlaying && !isPaused) return;
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();
    try {
      sampler.triggerRelease(note); // Nhấc búa chặn dây đàn lại để tắt âm
    } catch (e) {
      console.warn("Ignore release error", e);
    }
    setActiveNotes((prev) => prev.filter((n) => n !== midiNumber)); // Tắt đèn phím
  };

  // Kết xuất ra cho các Component bên ngoài (như App, PianoToolbar) có thể sử dụng các biến/hàm
  return {
    isLoaded,
    isDemoPlaying,
    isPaused,
    currentTime,
    duration,
    activeNotes,
    handleFileUpload,
    playDemo,
    pauseDemo,
    seekDemo,
    playNote,
    stopNote,
  };
}
