import { ensureAudioStarted } from "../audio/audioEngine";

interface PianoToolbarProps {
  isLoaded: boolean;
  isDemoPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPlayDemo: () => void;
  onPauseDemo: () => void;
  onSeek: (newTime: number) => void;
}

export function PianoToolbar({
  isLoaded,
  isDemoPlaying,
  isPaused,
  currentTime,
  duration,
  onFileUpload,
  onPlayDemo,
  onPauseDemo,
  onSeek,
}: PianoToolbarProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
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
            onChange={onFileUpload}
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
            onPlayDemo();
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
            onClick={onPauseDemo}
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
              onSeek(newTime);
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
  );
}
