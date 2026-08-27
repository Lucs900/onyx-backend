/**
 * PDF text-layer reader. Reads printed page operators only.
 * Filename, Info metadata, and hidden comments are not extract sources.
 * OCR is a separate path — this module never invents glyphs or numbers.
 */

import { inflateSync } from "node:zlib";

export type PdfEmbeddedImage = {
  bytes: Uint8Array;
  mediaType: "image/jpeg" | "image/png";
};

const PDF_SIG = [0x25, 0x50, 0x44, 0x46];

export function isPdf(bytes: Uint8Array) {
  if (bytes.length < 5) return false;
  for (let i = 0; i < PDF_SIG.length; i += 1) {
    if (bytes[i] !== PDF_SIG[i]) return false;
  }
  return true;
}

function latin1(bytes: Uint8Array, start = 0, end = bytes.length) {
  return Buffer.from(bytes.subarray(start, end)).toString("latin1");
}

function decodePdfString(raw: string) {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    if (next == null) break;
    if (next === "n") {
      out += "\n";
      i += 1;
    } else if (next === "r") {
      out += "\r";
      i += 1;
    } else if (next === "t") {
      out += "\t";
      i += 1;
    } else if (next === "b") {
      out += "\b";
      i += 1;
    } else if (next === "f") {
      out += "\f";
      i += 1;
    } else if (next === "(" || next === ")" || next === "\\") {
      out += next;
      i += 1;
    } else if (/[0-7]/.test(next)) {
      let oct = next;
      let take = 1;
      if (/[0-7]/.test(raw[i + 2] ?? "")) {
        oct += raw[i + 2];
        take += 1;
      }
      if (/[0-7]/.test(raw[i + 3] ?? "") && take < 3) {
        oct += raw[i + 3];
        take += 1;
      }
      out += String.fromCharCode(parseInt(oct, 8));
      i += take;
    } else {
      out += next;
      i += 1;
    }
  }
  return out;
}

function decodeHexString(raw: string) {
  const hex = raw.replace(/\s+/g, "");
  const even = hex.length % 2 === 0 ? hex : `${hex}0`;
  let out = "";
  for (let i = 0; i < even.length; i += 2) {
    out += String.fromCharCode(parseInt(even.slice(i, i + 2), 16));
  }
  return out;
}

function extractLiteralStrings(content: string) {
  const pieces: { text: string; breakAfter?: boolean }[] = [];
  let i = 0;
  while (i < content.length) {
    const ch = content[i];
    if (ch === "(") {
      let depth = 1;
      let j = i + 1;
      let raw = "";
      while (j < content.length && depth > 0) {
        const cur = content[j];
        if (cur === "\\" && j + 1 < content.length) {
          raw += cur + content[j + 1];
          j += 2;
          continue;
        }
        if (cur === "(") depth += 1;
        if (cur === ")") depth -= 1;
        if (depth > 0) raw += cur;
        j += 1;
      }
      pieces.push({ text: decodePdfString(raw) });
      i = j;
      continue;
    }
    if (ch === "<" && content[i + 1] !== "<") {
      const end = content.indexOf(">", i + 1);
      if (end > i) {
        pieces.push({ text: decodeHexString(content.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (content.startsWith("T*", i) || content.startsWith("'", i) || content.startsWith("Td", i) || content.startsWith("TD", i)) {
      if (pieces.length) pieces[pieces.length - 1].breakAfter = true;
      else pieces.push({ text: "", breakAfter: true });
    }
    i += 1;
  }
  return pieces;
}

function piecesToLines(pieces: { text: string; breakAfter?: boolean }[]) {
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    const trimmed = current.replace(/\s+/g, " ").trim();
    if (trimmed) lines.push(trimmed);
    current = "";
  };
  for (const piece of pieces) {
    current += piece.text;
    if (piece.breakAfter) flush();
  }
  flush();
  return lines;
}

function meaningfulText(lines: string[]) {
  const blob = lines.join("").replace(/[^A-Za-z0-9]/g, "");
  return blob.length >= 6;
}

function dictHas(dict: string, key: string) {
  return new RegExp(`/${key}\\b`).test(dict);
}

function dictName(dict: string, key: string) {
  const match = dict.match(new RegExp(`/${key}\\s*/([A-Za-z0-9]+)`));
  return match?.[1] ?? "";
}

function decodeStream(dict: string, body: Uint8Array): Uint8Array {
  const filter = dictName(dict, "Filter");
  if (!filter || filter === "ASCII85Decode") return body;
  if (filter === "FlateDecode") {
    try {
      return new Uint8Array(inflateSync(Buffer.from(body)));
    } catch {
      return body;
    }
  }
  return body;
}

function streamBodies(bytes: Uint8Array): { dict: string; body: Uint8Array }[] {
  const text = latin1(bytes);
  const out: { dict: string; body: Uint8Array }[] = [];
  let search = 0;
  while (search < text.length) {
    const streamAt = text.indexOf("stream", search);
    if (streamAt < 0) break;
    const dictEnd = text.lastIndexOf(">>", streamAt);
    const dictStart = dictEnd >= 0 ? text.lastIndexOf("<<", dictEnd) : -1;
    if (dictStart < 0 || dictEnd < 0) {
      search = streamAt + 6;
      continue;
    }
    const dict = text.slice(dictStart, dictEnd + 2);
    let dataStart = streamAt + 6;
    if (text[dataStart] === "\r") dataStart += 1;
    if (text[dataStart] === "\n") dataStart += 1;
    const endAt = text.indexOf("endstream", dataStart);
    if (endAt < 0) break;
    let dataEnd = endAt;
    if (text[dataEnd - 1] === "\n") dataEnd -= 1;
    if (text[dataEnd - 1] === "\r") dataEnd -= 1;
    out.push({
      dict,
      body: bytes.subarray(dataStart, dataEnd),
    });
    search = endAt + 9;
  }
  return out;
}

/** Visible text operators only. Empty when the page has no text layer. */
export function readPdfTextLayer(bytes: Uint8Array): string[] | null {
  if (!isPdf(bytes)) return null;
  const lines: string[] = [];
  for (const part of streamBodies(bytes)) {
    if (dictHas(part.dict, "Subtype") && dictName(part.dict, "Subtype") === "Image") continue;
    const decoded = decodeStream(part.dict, part.body);
    const content = latin1(decoded);
    if (!/\b(BT|Tj|TJ|T\*|Td|TD|'|")\b/.test(content)) continue;
    lines.push(...piecesToLines(extractLiteralStrings(content)));
  }
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  return meaningfulText(cleaned) ? cleaned : null;
}

/** Embedded DCTDecode JPEGs for the existing vision / printed-OCR path. */
export function readPdfEmbeddedImages(bytes: Uint8Array): PdfEmbeddedImage[] {
  if (!isPdf(bytes)) return [];
  const images: PdfEmbeddedImage[] = [];
  for (const part of streamBodies(bytes)) {
    if (dictName(part.dict, "Subtype") !== "Image") continue;
    const filter = dictName(part.dict, "Filter");
    if (filter === "DCTDecode") {
      images.push({ bytes: part.body, mediaType: "image/jpeg" });
    }
  }
  return images;
}
