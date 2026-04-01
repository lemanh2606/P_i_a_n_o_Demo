import { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";
import { songFromMidi } from "../music/fromMidi";
import { sampler } from "../audio/audioEngine";

export function usePianoPlayer() {
  const [currentSong, setCurrentSong] = useState(songFromMidi);
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Cập nhật isLoaded khi sampler đã tải xong
  useEffect(() => {
    Tone.loaded().then(() => setIsLoaded(true));
  }, []);

  // Cleanup: dừng nhạc khi component unmount
  useEffect(() => {
    return () => {
      Tone.Transport.cancel();
      Tone.Transport.stop();
    };
  }, []);

  // Timer cập nhật thời gian
  useEffect(() => {
    let interval: number;
    if (isDemoPlaying && !isPaused) {
      interval = window.setInterval(() => {
        setCurrentTime(Tone.Transport.seconds);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isDemoPlaying, isPaused]);

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

  const playDemo = useCallback(async () => {
    await Tone.start();

    // Nếu đang tạm dừng (Paused) thì nhấn Play sẽ là Resume (tiếp tục)
    if (isDemoPlaying && isPaused) {
      Tone.Transport.start();
      setIsPaused(false);
      return;
    }

    // Nếu chưa phát hoặc muốn phát lại từ đầu
    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    setActiveNotes([]);
    setCurrentTime(0);

    const songEndTime = Math.max(...currentSong.map((e) => e.time + e.dur)) + 0.15;
    setDuration(songEndTime);

    for (const { time, dur, note, velocity } of currentSong) {
      const midi = Tone.Frequency(note).toMidi();
      const vel = velocity ?? 0.9;

      Tone.Transport.schedule((t) => {
        sampler.triggerAttackRelease(note, dur, t, vel);
        setActiveNotes((prev) => [...prev, midi]);
      }, time);

      Tone.Transport.schedule(() => {
        setActiveNotes((prev) => {
          const i = prev.indexOf(midi);
          if (i === -1) return prev;
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        });
      }, time + dur);
    }

    Tone.Transport.schedule(() => {
      setActiveNotes([]);
      setIsDemoPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      Tone.Transport.stop();
    }, songEndTime);

    setIsDemoPlaying(true);
    setIsPaused(false);
    Tone.Transport.start();
  }, [isDemoPlaying, isPaused, currentSong]);

  const pauseDemo = useCallback(() => {
    Tone.Transport.pause();
    setIsPaused(true);
  }, []);

  const seekDemo = useCallback((newTime: number) => {
    Tone.Transport.seconds = newTime;
    setCurrentTime(newTime);
    setActiveNotes([]);
  }, []);

  const playNote = async (midiNumber: number): Promise<void> => {
    if (isDemoPlaying && !isPaused) return;
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();
    sampler.triggerAttack(note);
    setActiveNotes((prev) => [...prev, midiNumber]);
  };

  const stopNote = (midiNumber: number): void => {
    if (isDemoPlaying && !isPaused) return;
    const note: string = Tone.Frequency(midiNumber, "midi").toNote();
    try {
      sampler.triggerRelease(note);
    } catch (e) {
      console.warn("Ignore release error", e);
    }
    setActiveNotes((prev) => prev.filter((n) => n !== midiNumber));
  };

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
