/**
 * Chuyển file .mid → mảng SongNote (time/dur/note/velocity) cho piano-app.
 *
 * Dùng:
 *   node scripts/midi-to-song.mjs public/bai.mid
 *   node scripts/midi-to-song.mjs public/bai.mid --out src/music/fromMidi.ts
 *   node scripts/midi-to-song.mjs public/bai.mid --track 1 --max-time 90
 *
 * --track N     : chỉ lấy track index N (0-based). Mặc định: gộp mọi track.
 * --max-time S  : chỉ lấy nốt có time < S giây (tránh file quá lớn).
 * --max-notes N : giới hạn số nốt sau khi sort.
 * --min-midi M  : bỏ nốt dưới M (mặc định 36 = C2).
 * --max-midi M  : bỏ nốt trên M (mặc định 84 = C6).
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const { Midi } = require("@tonejs/midi");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseArgs(argv) {
  const pathArg = argv.find((a) => !a.startsWith("--"));
  const out = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
  const getNum = (name) => {
    const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
    if (i === -1) return undefined;
    const a = argv[i];
    if (a.includes("=")) return Number(a.split("=")[1]);
    return Number(argv[i + 1]);
  };
  return {
    input: pathArg
      ? resolve(root, pathArg)
      : resolve(root, "public/81127_Con-Mua-Ngang-Qua--Khanh-Linh.mid"),
    out: out ? resolve(root, out) : null,
    track: getNum("--track"),
    maxTime: getNum("--max-time"),
    maxNotes: getNum("--max-notes"),
    minMidi: getNum("--min-midi") ?? 36,
    maxMidi: getNum("--max-midi") ?? 84,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (argv.includes("--info")) {
    const buf = readFileSync(args.input);
    const midi = new Midi(buf);
    console.log(`File: ${args.input}`);
    console.log(
      `Độ dài: ${midi.duration.toFixed(1)}s — ${midi.tracks.length} track(s)`,
    );
    midi.tracks.forEach((tr, i) => {
      console.log(
        `  [${i}] "${tr.name || "(không tên)"}" — ${tr.notes.length} nốt`,
      );
    });
    console.log(
      "\nGợi ý: thử --track N nếu gộp nhiều track bị loạn; --max-time 60 để giới hạn độ dài.",
    );
    return;
  }

  const buf = readFileSync(args.input);
  const midi = new Midi(buf);

  let notes = [];
  if (args.track !== undefined && !Number.isNaN(args.track)) {
    const t = midi.tracks[args.track];
    if (!t) {
      console.error(
        `Không có track index ${args.track} (có ${midi.tracks.length} track).`,
      );
      process.exit(1);
    }
    notes = [...t.notes];
  } else {
    for (const tr of midi.tracks) {
      notes.push(...tr.notes);
    }
  }

  notes = notes
    .filter((n) => n.midi >= args.minMidi && n.midi <= args.maxMidi)
    .map((n) => ({
      time: n.time,
      dur: Math.max(0.02, n.duration),
      note: n.name,
      velocity: Math.round(n.velocity * 1000) / 1000,
    }));

  if (args.maxTime !== undefined && !Number.isNaN(args.maxTime)) {
    notes = notes.filter((n) => n.time < args.maxTime);
  }

  notes.sort((a, b) => a.time - b.time || a.note.localeCompare(b.note));

  if (args.maxNotes !== undefined && !Number.isNaN(args.maxNotes)) {
    notes = notes.slice(0, args.maxNotes);
  }

  const baseName = args.input
    .split(/[/\\]/)
    .pop()
    .replace(/\.mid$/i, "");
  const ts = formatTs(notes, baseName);

  if (args.out) {
    writeFileSync(args.out, ts, "utf8");
    console.error(`Đã ghi ${notes.length} nốt → ${args.out}`);
  } else {
    console.log(ts);
    console.error(`\n(${notes.length} nốt)`);
  }
}

function formatTs(notes, fileHint) {
  const lines = [
    `/**`,
    ` * Tự động sinh từ MIDI: ${fileHint}`,
    ` * Sửa/import vào App hoặc đổi tên export const → demoSong`,
    ` */`,
    `import type { SongNote } from "./demoSong";`,
    ``,
    `export const songFromMidi: SongNote[] = [`,
  ];

  for (const n of notes) {
    const t = round3(n.time);
    const d = round3(n.dur);
    const v =
      n.velocity !== undefined && n.velocity !== 1
        ? `, velocity: ${n.velocity}`
        : "";
    lines.push(`  { time: ${t}, dur: ${d}, note: "${n.note}"${v} },`);
  }

  lines.push(`];`, ``);
  return lines.join("\n");
}

function round3(x) {
  return Math.round(x * 1000) / 1000;
}

main();
