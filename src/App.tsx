import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Piano, MidiNumbers } from "react-piano";
import { buildKeyboardShortcutsForRange } from "./keyboardShortcuts";
import { ensureAudioStarted } from "./audio/audioEngine";
import { usePianoPlayer } from "./hooks/usePianoPlayer";
import { renderNoteLabel } from "./components/PianoKeyLabel";
import { PianoToolbar } from "./components/PianoToolbar";

const firstNote = MidiNumbers.fromNote("c2");
const lastNote = MidiNumbers.fromNote("c6");
const keyboardShortcuts = buildKeyboardShortcutsForRange(firstNote, lastNote);

export default function App() {
  const pianoWrapRef = useRef<HTMLDivElement>(null);
  const [pianoWidth, setPianoWidth] = useState(1000);

  const {
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
  } = usePianoPlayer();

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

  useEffect(() => {
    window.addEventListener("click", ensureAudioStarted);
    return () => window.removeEventListener("click", ensureAudioStarted);
  }, []);

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

        <PianoToolbar
          isLoaded={isLoaded}
          isDemoPlaying={isDemoPlaying}
          isPaused={isPaused}
          currentTime={currentTime}
          duration={duration}
          onFileUpload={handleFileUpload}
          onPlayDemo={playDemo}
          onPauseDemo={pauseDemo}
          onSeek={seekDemo}
        />

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
        Gõ đúng ký tự hiển thị dưới mỗi phím đàn (gồm cả phím số bên phải nếu có).
      </p>
    </div>
  );
}
