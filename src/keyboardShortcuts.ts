/**
 * Mỗi nốt trong dải cần một `key` duy nhất (theo event.key) để vừa hiển thị
 * vừa bấm được — preset HOME_ROW không đủ khi dải rộng.
 */
const KEY_POOL: string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  "q",
  "w",
  "e",
  "r",
  "t",
  "y",
  "u",
  "i",
  "o",
  "p",
  "a",
  "s",
  "d",
  "f",
  "g",
  "h",
  "j",
  "k",
  "l",
  "z",
  "x",
  "c",
  "v",
  "b",
  "n",
  "m",
  ",",
  ".",
  "/",
  ";",
  "'",
  "[",
  "]",
  "\\",
  "-",
  "=",
  "`",
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad5",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",
  "Numpad0",
  "NumpadDecimal",
  "NumpadAdd",
  "NumpadSubtract",
  "NumpadMultiply",
  "NumpadDivide",
];

export function buildKeyboardShortcutsForRange(
  firstNote: number,
  lastNote: number
): { key: string; midiNumber: number }[] {
  const out: { key: string; midiNumber: number }[] = [];
  let i = 0;
  for (let m = firstNote; m <= lastNote; m++) {
    const key = KEY_POOL[i];
    if (!key) {
      throw new Error(
        `keyboardShortcuts: cần thêm phím trong KEY_POOL (dải quá rộng: ${lastNote - firstNote + 1} nốt)`
      );
    }
    out.push({ key, midiNumber: m });
    i++;
  }
  return out;
}

/** Hiển thị gọn trên phím đàn (Numpad dài, v.v.) */
export function formatKeyLabel(key: string): string {
  if (key.startsWith("Numpad")) {
    const rest = key.slice(6);
    if (rest === "Decimal") return "NP.";
    if (rest === "Add") return "NP+";
    if (rest === "Subtract") return "NP−";
    if (rest === "Multiply") return "NP×";
    if (rest === "Divide") return "NP÷";
    return `NP${rest}`;
  }
  return key.length === 1 ? key.toUpperCase() : key;
}
