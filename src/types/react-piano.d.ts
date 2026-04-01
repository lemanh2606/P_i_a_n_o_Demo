declare module "react-piano" {
    import * as React from "react";

    export interface RenderNoteLabelArgs {
      keyboardShortcut: string | undefined;
      midiNumber: number;
      isActive: boolean;
      isAccidental: boolean;
    }

    export interface PianoProps {
      noteRange: { first: number; last: number };
      playNote: (midiNumber: number) => void;
      stopNote: (midiNumber: number) => void;
      activeNotes?: number[];
      keyboardShortcuts?: unknown;
      width?: number;
      keyWidthToHeight?: number;
      className?: string;
      renderNoteLabel?: (args: RenderNoteLabelArgs) => React.ReactNode;
    }

    export const Piano: React.FC<PianoProps>;

    export const KeyboardShortcuts: {
      create: (config: unknown) => unknown;
      HOME_ROW: unknown;
    };

    export const MidiNumbers: {
      fromNote: (note: string) => number;
      getAttributes: (midiNumber: number) => {
        note: string;
        pitchName: string;
        octave: number;
        midiNumber: number;
        isAccidental: boolean;
      };
    };
  }