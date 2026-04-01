import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as Tone from "tone";
import { Piano, MidiNumbers } from "react-piano";
import {
  buildKeyboardShortcutsForRange,
  formatKeyLabel,
} from "./keyboardShortcuts";
import { songFromMidi } from "./music/fromMidi";
import { Midi } from "@tonejs/midi";

// Định nghĩa dải nốt nhạc từ Do quãng 2 (C2) đến Do quãng 6 (C6)
// Giúp bàn phím rộng và âm thanh đa dạng hơn.
const firstNote: number = MidiNumbers.fromNote("c2");
const lastNote: number = MidiNumbers.fromNote("c6");

/** Một phím bàn phím cho mỗi nốt (đủ để hiển thị + gõ trên toàn dải) */
const keyboardShortcuts = buildKeyboardShortcutsForRange(firstNote, lastNote);

/**
 * 🎹 NÂNG CẤP: Dùng Sampler với mẫu tiếng Piano thật (Salamander Grand Piano)
 * giúp âm thanh chuyên nghiệp và giống piano xịn hơn rất nhiều.
 */
const sampler = new Tone.Sampler({
  urls: {
    A0: "A0.mp3",
    C1: "C1.mp3",
    "D#1": "Ds1.mp3",
    "F#1": "Fs1.mp3",
    A1: "A1.mp3",
    C2: "C2.mp3",
    "D#2": "Ds2.mp3",
    "F#2": "Fs2.mp3",
    A2: "A2.mp3",
    C3: "C3.mp3",
    "D#3": "Ds3.mp3",
    "F#3": "Fs3.mp3",
    A3: "A3.mp3",
    C4: "C4.mp3",
    "D#4": "Ds4.mp3",
    "F#4": "Fs4.mp3",
    A4: "A4.mp3",
    C5: "C5.mp3",
    "D#5": "Ds5.mp3",
    "F#5": "Fs5.mp3",
    A5: "A5.mp3",
    C6: "C6.mp3",
    "D#6": "Ds6.mp3",
    "F#6": "Fs6.mp3",
    A6: "A6.mp3",
    C7: "C7.mp3",
    "D#7": "Ds7.mp3",
    "F#7": "Fs7.mp3",
    A7: "A7.mp3",
    C8: "C8.mp3",
  },
  release: 1.2,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

/** Thêm hiệu ứng vang (Reverb) để âm thanh sâu và sang trọng hơn */
const reverb = new Tone.Reverb({
  decay: 2.5,
  wet: 0.3,
}).toDestination();
sampler.connect(reverb);

function renderNoteLabel({
  keyboardShortcut,
  midiNumber,
  isActive,
  isAccidental,
}: {
  keyboardShortcut: string | undefined;
  midiNumber: number;
  isActive: boolean;
  isAccidental: boolean;
}) {
  const { note } = MidiNumbers.getAttributes(midiNumber);
  const labelClass = [
    "ReactPiano__NoteLabel",
    "piano-key-label",
    isActive && "ReactPiano__NoteLabel--active",
    isAccidental
      ? "ReactPiano__NoteLabel--accidental"
      : "ReactPiano__NoteLabel--natural",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={labelClass}>
      <span className="piano-key-label__note">{note}</span>
      {keyboardShortcut ? (
        <span className="piano-key-label__kbd">
          {formatKeyLabel(keyboardShortcut)}
        </span>
      ) : null}
    </div>
  );
}

export default function App() {
  const [currentSong, setCurrentSong] = useState(songFromMidi);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      let notes: {
        time: number;
        dur: number;
        note: string;
        velocity?: number;
        midiNumber?: number;
      }[] = [];
      for (const tr of midi.tracks) {
        notes.push(
          ...tr.notes.map((n) => ({
            time: n.time,
            dur: Math.max(0.02, n.duration),
            note: n.name,
            velocity: Math.round(n.velocity * 1000) / 1000,
            midiNumber: n.midi,
          })),
        );
      }
      notes = notes.filter(
        (n) =>
          n.midiNumber !== undefined &&
          n.midiNumber >= 36 &&
          n.midiNumber <= 84,
      );
      notes.sort((a, b) => a.time - b.time || a.note.localeCompare(b.note));

      if (notes.length === 0) {
        alert("Không tìm thấy nốt hợp lệ trong dải phím C2-C6.");
        return;
      }

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

  // Trạng thái các nốt nhạc đã tải xong chưa
  const [isLoaded, setIsLoaded] = useState(false);
  // Lưu các nốt nhạc đang được bấm để hiển thị trên UI
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  // Trạng thái đang phát nhạc Demo
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  // Trạng thái đang tạm dừng (Pause)
  const [isPaused, setIsPaused] = useState(false);
  // Thời gian hiện tại của bài nhạc (giây)
  const [currentTime, setCurrentTime] = useState(0);
  // Tổng thời gian của bài nhạc (giây)
  const [duration, setDuration] = useState(0);

  // Tham chiếu đến phần tử chứa đàn để tính toán chiều rộng
  const pianoWrapRef = useRef<HTMLDivElement>(null);
  const [pianoWidth, setPianoWidth] = useState(1000);

  // Kiểm tra khi nào sampler tải xong
  useEffect(() => {
    Tone.loaded().then(() => {
      setIsLoaded(true);
    });
  }, []);

  useLayoutEffect(() => {
    const el = pianoWrapRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      setPianoWidth(Math.max(280, Math.floor(w)));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * 🔊 4. Bắt buộc phải "mở audio" ngay lập tức khi click
   */
  const ensureAudioStarted = async () => {
    if (Tone.context.state !== "running") {
      await Tone.start();
      console.log("Audio context started");
    }
  };

  useEffect(() => {
    window.addEventListener("click", ensureAudioStarted);
    return () => window.removeEventListener("click", ensureAudioStarted);
  }, []);

  useEffect(() => {
    return () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
    };
  }, []);

  /**
   * 🕒 Theo dõi thời gian thực khi đang phát nhạc để cập nhật thanh tiến trình
   */
  useEffect(() => {
    let interval: number;
    // Nếu đang phát và không tạm dừng thì cứ 100ms cập nhật thời gian 1 lần
    if (isDemoPlaying && !isPaused) {
      interval = setInterval(() => {
        setCurrentTime(Tone.Transport.seconds);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isDemoPlaying, isPaused]);

  /**
   * ▶️ Bắt đầu hoặc Tiếp tục phát nhạc Demo
   */
  const playDemo = useCallback(async () => {
    await Tone.start();

    // Nếu đang tạm dừng (Paused) thì nhấn Play sẽ là Resume (tiếp tục)
    if (isDemoPlaying && isPaused) {
      Tone.Transport.start();
      setIsPaused(false);
      return;
    }

    // Nếu chưa phát hoặc muốn phát lại từ đầu
    Tone.Transport.cancel(); // Huỷ các lịch hẹn cũ
    Tone.Transport.stop(); // Dừng âm thanh cũ
    Tone.Transport.position = 0; // Đưa về giây thứ 0
    setActiveNotes([]);
    setCurrentTime(0);

    // Tính tổng thời gian bài nhạc
    const songEndTime =
      Math.max(...currentSong.map((e) => e.time + e.dur)) + 0.15;
    setDuration(songEndTime);

    // Lên lịch (schedule) cho từng nốt nhạc trong danh sách
    for (const { time, dur, note, velocity } of currentSong) {
      const midi = Tone.Frequency(note).toMidi();
      const vel = velocity ?? 0.9;

      // Khi đến đúng thời điểm 'time', sẽ kích hoạt nốt nhạc
      Tone.Transport.schedule((t) => {
        sampler.triggerAttackRelease(note, dur, t, vel);
        // Thêm vào danh sách nốt đang 'bấm' để UI sáng lên
        setActiveNotes((prev) => [...prev, midi]);
      }, time);

      // Khi kết thúc nốt (time + dur), tắt nốt đó trên UI
      Tone.Transport.schedule(() => {
        setActiveNotes((prev) => {
          const i = prev.indexOf(midi);
          if (i === -1) return prev;
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        });
      }, time + dur);
    }

    // Khi bài nhạc kết thúc hoàn toàn
    Tone.Transport.schedule(() => {
      setActiveNotes([]);
      setIsDemoPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      Tone.Transport.stop();
    }, songEndTime);

    setIsDemoPlaying(true);
    setIsPaused(false);
    Tone.Transport.start(); // Bắt đầu chạy bộ đếm thời gian
  }, [isDemoPlaying, isPaused]);

  /**
   * ⏸️ Tạm dừng phát nhạc
   */
  const pauseDemo = useCallback(() => {
    Tone.Transport.pause();
    setIsPaused(true);
  }, []);

  /**
   * ▶ 5. Khi nhấn phím
   */
  /**
   *  Định dạng giây thành mm:ss để hiển thị đẹp hơn
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  /**
   * 🎹 Khi người dùng nhấn phím (bằng chuột hoặc bàn phím)
   */
  const playNote = async (midiNumber: number): Promise<void> => {
    // Chỉ chặn nhấn phím thủ công khi nhạc Demo đang phát (active)
    // Nếu đang tạm dừng (isPaused), vẫn có thể nhấn thoải mái.
    if (isDemoPlaying && !isPaused) return;

    // Chuyển số MIDI thành tên nốt (ví dụ 60 -> C4)
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();

    // Phát âm thanh ngay lập tức
    sampler.triggerAttack(note);

    // Thêm vào danh sách nốt đang 'bấm' để sáng phím
    setActiveNotes((prev) => [...prev, midiNumber]);
  };

  /**
   * 🎹 Khi người dùng thả phím
   */
  const stopNote = (midiNumber: number): void => {
    if (isDemoPlaying && !isPaused) return;
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();

    try {
      // Dừng phát âm thanh của nốt đó
      sampler.triggerRelease(note);
    } catch (e) {
      console.warn("Ignore release error", e);
    }

    // Xoá nốt khỏi danh sách đang bấm
    setActiveNotes((prev) => prev.filter((n) => n !== midiNumber));
  };

  return (
    <div className="piano-page">
      <div className="piano-header">
        <span className="piano-badge">STUDIO EDITION</span>
        <h1 className="piano-page__title">Virtual Piano Pro</h1>
        <p className="piano-page__hint">
          Trải nghiệm âm thanh Piano thực thụ ngay trên trình duyệt của bạn.
        </p>
      </div>

      <div className="piano-shell">
        {!isLoaded && (
          <div className="piano-loading-overlay">
            <div className="piano-loading-spinner"></div>
            <span>Đang tải âm thanh Piano...</span>
          </div>
        )}
        <div className="piano-shell__toolbar">
          {/* Hàng nút điều khiển */}
          <div className="piano-controls">
            <label
              className="piano-play-btn"
              title="Tải file MIDI"
              style={{ cursor: "pointer" }}
            >
              📂
              <input
                type="file"
                accept=".mid,.midi"
                style={{ display: "none" }}
                onChange={handleFileUpload}
                disabled={!isLoaded || (isDemoPlaying && !isPaused)}
              />
            </label>

            <button
              type="button"
              className="piano-play-btn"
              title={
                !isLoaded
                  ? "Đang tải..."
                  : isDemoPlaying
                    ? isPaused
                      ? "Tiếp tục"
                      : "Đang phát"
                    : "Phát Demo"
              }
              onClick={async () => {
                await ensureAudioStarted();
                playDemo();
              }}
              disabled={!isLoaded || (isDemoPlaying && !isPaused)}
            >
              {!isLoaded ? "⌛" : isDemoPlaying && !isPaused ? "♪" : "▶"}
            </button>

            {isDemoPlaying && !isPaused && (
              <button
                type="button"
                className="piano-play-btn piano-play-btn--pause"
                title="Tạm dừng"
                onClick={pauseDemo}
              >
                ⏸
              </button>
            )}
          </div>

          {/* Thanh tiến trình nằm ngang: thời gian | thanh bar */}
          {isDemoPlaying && (
            <div className="piano-progress">
              <span className="piano-progress__time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div
                className="piano-progress__bar-wrap"
                style={{ cursor: "pointer" }}
                onClick={(e) => {
                  if (!isDemoPlaying || duration === 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, x / rect.width));
                  const newTime = ratio * duration;
                  Tone.Transport.seconds = newTime;
                  setCurrentTime(newTime);
                  setActiveNotes([]); // Xóa nốt sáng để tránh dính phím
                }}
              >
                <div
                  className="piano-progress__bar-fill"
                  style={{
                    width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="piano-shell__lid" aria-hidden />
        <div ref={pianoWrapRef} className="piano-shell__keys">
          <Piano
            className={
              isDemoPlaying
                ? "piano-themed piano-themed--autoplay"
                : "piano-themed"
            }
            width={pianoWidth}
            keyWidthToHeight={0.22}
            noteRange={{ first: firstNote, last: lastNote }}
            playNote={async (midi) => {
              if (!isLoaded) return;
              await ensureAudioStarted();
              playNote(midi);
            }}
            stopNote={stopNote}
            activeNotes={activeNotes}
            keyboardShortcuts={keyboardShortcuts}
            renderNoteLabel={renderNoteLabel}
          />
        </div>
      </div>

      <p className="piano-page__footer">
        Gõ đúng ký tự hiển thị dưới mỗi phím đàn (gồm cả phím số bên phải nếu
        có).
      </p>
    </div>
  );
}
