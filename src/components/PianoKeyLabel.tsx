import { MidiNumbers } from "react-piano";
import { formatKeyLabel } from "../keyboardShortcuts";

interface PianoKeyLabelProps {
  keyboardShortcut: string | undefined;
  midiNumber: number;
  isActive: boolean;
  isAccidental: boolean;
}

export function renderNoteLabel({
  keyboardShortcut,
  midiNumber,
  isActive,
  isAccidental,
}: PianoKeyLabelProps) {
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
