/**
 * PDF text-layer reader. Reads printed page operators only.
 * Filename, Info metadata, and hidden comments are not extract sources.
 * OCR is a separate path — this module never invents glyphs or numbers.
 */

import { deflateSync, inflateSync } from "node:zlib";

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
  const bytes = Buffer.from(even, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const rest = bytes.subarray(2);
    const swapped = Buffer.alloc(rest.length);
    for (let i = 0; i + 1 < rest.length; i += 2) {
      swapped[i] = rest[i + 1] ?? 0;
      swapped[i + 1] = rest[i] ?? 0;
    }
    return swapped.toString("utf16le").replace(/\0/g, "");
  }
  if (bytes.length >= 4 && bytes.length % 2 === 0) {
    let highNulls = 0;
    for (let i = 0; i < bytes.length; i += 2) {
      if (bytes[i] === 0) highNulls += 1;
    }
    if (highNulls >= bytes.length / 4) {
      const swapped = Buffer.alloc(bytes.length);
      for (let i = 0; i + 1 < bytes.length; i += 2) {
        swapped[i] = bytes[i + 1] ?? 0;
        swapped[i + 1] = bytes[i] ?? 0;
      }
      return swapped.toString("utf16le").replace(/\0/g, "");
    }
  }
  return bytes.toString("latin1");
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
    if (
      content.startsWith("T*", i) ||
      content.startsWith("'", i) ||
      content.startsWith("Td", i) ||
      content.startsWith("TD", i) ||
      content.startsWith("Tm", i)
    ) {
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

function dictNum(dict: string, key: string) {
  const match = dict.match(new RegExp(`/${key}\\s+(-?\\d+)`));
  return match ? Number(match[1]) : 0;
}

function dictFilters(dict: string): string[] {
  const array = dict.match(/\/Filter\s*\[([^\]]+)\]/);
  if (array?.[1]) {
    const found: string[] = [];
    const re = /\/([A-Za-z0-9]+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(array[1]))) {
      if (match[1]) found.push(match[1]);
    }
    return found;
  }
  const one = dictName(dict, "Filter");
  return one ? [one] : [];
}

function decodeAscii85(body: Uint8Array): Uint8Array {
  const text = latin1(body).replace(/\s+/g, "").replace(/~>$/, "");
  const out: number[] = [];
  let tuple = 0;
  let count = 0;
  const flush = (bytes: number) => {
    for (let i = 0; i < bytes; i += 1) {
      out.push((tuple >>> (24 - i * 8)) & 255);
    }
  };
  for (const ch of text) {
    if (ch === "z" && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const code = ch.charCodeAt(0) - 33;
    if (code < 0 || code > 84) continue;
    tuple = tuple * 85 + code;
    count += 1;
    if (count === 5) {
      flush(4);
      tuple = 0;
      count = 0;
    }
  }
  if (count > 1) {
    for (let i = count; i < 5; i += 1) tuple = tuple * 85 + 84;
    flush(count - 1);
  }
  return Uint8Array.from(out);
}

function decodeStream(dict: string, body: Uint8Array): Uint8Array {
  let decoded = body;
  const filters = dictFilters(dict);
  if (!filters.length) return decoded;
  for (const filter of filters) {
    if (filter === "ASCII85Decode") {
      decoded = decodeAscii85(decoded);
    } else if (filter === "FlateDecode") {
      try {
        decoded = new Uint8Array(inflateSync(Buffer.from(decoded)));
      } catch {
        return body;
      }
    } else if (filter === "DCTDecode") {
      return decoded;
    }
  }
  return decoded;
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

function collectPdfTextLines(bytes: Uint8Array): string[] {
  const lines: string[] = [];
  for (const part of streamBodies(bytes)) {
    const subtype = dictName(part.dict, "Subtype");
    if (subtype === "Image") continue;
    const decoded = decodeStream(part.dict, part.body);
    const content = latin1(decoded);
    if (!/(BT|Tj|TJ|T\*|Td|TD|Tm|'|")/.test(content)) continue;
    lines.push(...piecesToLines(extractLiteralStrings(content)));
  }
  return lines.map((line) => line.trim()).filter(Boolean);
}

/** Non-whitespace characters from the visible text layer. 0 means no text layer. */
export function pdfTextLayerCharCount(bytes: Uint8Array): number {
  if (!isPdf(bytes)) return 0;
  return collectPdfTextLines(bytes).join("").replace(/\s+/g, "").length;
}

/** Visible text operators only. Empty when the page has no text layer. */
export function readPdfTextLayer(bytes: Uint8Array): string[] | null {
  if (!isPdf(bytes)) return null;
  const cleaned = collectPdfTextLines(bytes);
  return meaningfulText(cleaned) ? cleaned : cleaned.length ? cleaned : null;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i] ?? 0;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const payload = Buffer.concat([Buffer.from(type, "ascii"), Buffer.from(data)]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  payload.copy(out, 4);
  out.writeUInt32BE(crc32(payload), 8 + data.length);
  return out;
}

function encodePngRgb(width: number, height: number, rgb: Uint8Array): Uint8Array | null {
  if (width < 1 || height < 1 || rgb.length < width * height * 3) return null;
  const stride = width * 3;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y += 1) {
    const dest = y * (1 + stride);
    raw[dest] = 0;
    raw.set(rgb.subarray(y * stride, (y + 1) * stride), dest + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function unfilterPngRows(raw: Uint8Array, width: number, channels: number): Uint8Array | null {
  const stride = width * channels;
  const expected = heightRows(raw, stride);
  if (expected < 0) return null;
  const height = expected;
  const pixels = new Uint8Array(width * height * channels);
  const prev = new Uint8Array(stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (1 + stride);
    const filter = raw[rowStart] ?? 0;
    const dest = pixels.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i += 1) {
      const src = raw[rowStart + 1 + i] ?? 0;
      const left = i >= channels ? dest[i - channels] ?? 0 : 0;
      const up = prev[i] ?? 0;
      const upLeft = i >= channels ? prev[i - channels] ?? 0 : 0;
      if (filter === 1) dest[i] = (src + left) & 255;
      else if (filter === 2) dest[i] = (src + up) & 255;
      else if (filter === 3) dest[i] = (src + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) dest[i] = (src + paeth(left, up, upLeft)) & 255;
      else dest[i] = src;
    }
    prev.set(dest);
  }
  return pixels;
}

function heightRows(raw: Uint8Array, stride: number) {
  const row = 1 + stride;
  if (row < 2 || raw.length < row || raw.length % row !== 0) return -1;
  return raw.length / row;
}

function grayToRgb(gray: Uint8Array): Uint8Array {
  const rgb = new Uint8Array(gray.length * 3);
  for (let i = 0; i < gray.length; i += 1) {
    const v = gray[i] ?? 0;
    rgb[i * 3] = v;
    rgb[i * 3 + 1] = v;
    rgb[i * 3 + 2] = v;
  }
  return rgb;
}

function flateImagePng(dict: string, decoded: Uint8Array): Uint8Array | null {
  const width = dictNum(dict, "Width");
  const height = dictNum(dict, "Height");
  const bits = dictNum(dict, "BitsPerComponent") || 8;
  if (bits !== 8 || width < 1 || height < 1 || width * height > 20_000_000) return null;
  const space = dictName(dict, "ColorSpace");
  const channels = space === "DeviceGray" ? 1 : space === "DeviceRGB" ? 3 : 0;
  if (!channels) return null;
  const predictor = dictNum(dict, "Predictor");
  let pixels = decoded;
  if (predictor >= 10) {
    const rows = unfilterPngRows(decoded, width, channels);
    if (!rows) return null;
    pixels = rows;
  } else if (decoded.length < width * height * channels) {
    return null;
  }
  const rgb = channels === 1 ? grayToRgb(pixels.subarray(0, width * height)) : pixels.subarray(0, width * height * 3);
  return encodePngRgb(width, height, rgb);
}

/** Embedded images for the existing vision / printed-OCR path. JPEG first, then Flate RGB/Gray. */
export function readPdfEmbeddedImages(bytes: Uint8Array): PdfEmbeddedImage[] {
  if (!isPdf(bytes)) return [];
  const images: PdfEmbeddedImage[] = [];
  for (const part of streamBodies(bytes)) {
    if (dictName(part.dict, "Subtype") !== "Image") continue;
    const filters = dictFilters(part.dict);
    if (filters.includes("DCTDecode")) {
      images.push({ bytes: part.body, mediaType: "image/jpeg" });
      continue;
    }
    if (filters.includes("FlateDecode") || !filters.length) {
      const decoded = decodeStream(part.dict, part.body);
      const png = flateImagePng(part.dict, decoded);
      if (png) images.push({ bytes: png, mediaType: "image/png" });
    }
  }
  return images;
}
