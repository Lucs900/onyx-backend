#!/usr/bin/env python3
"""Write labeled mortgage-sample tax PNGs. Printed sample only — not a real return."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

# 5x7 glyphs, row-major bits (MSB left).
GLYPHS: dict[str, tuple[str, ...]] = {
    " ": ("00000", "00000", "00000", "00000", "00000", "00000", "00000"),
    "A": ("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
    "B": ("11110", "10001", "10001", "11110", "10001", "10001", "11110"),
    "C": ("01110", "10001", "10000", "10000", "10000", "10001", "01110"),
    "D": ("11110", "10001", "10001", "10001", "10001", "10001", "11110"),
    "E": ("11111", "10000", "10000", "11110", "10000", "10000", "11111"),
    "F": ("11111", "10000", "10000", "11110", "10000", "10000", "10000"),
    "G": ("01110", "10001", "10000", "10111", "10001", "10001", "01110"),
    "H": ("10001", "10001", "10001", "11111", "10001", "10001", "10001"),
    "I": ("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "J": ("00111", "00010", "00010", "00010", "00010", "10010", "01100"),
    "K": ("10001", "10010", "10100", "11000", "10100", "10010", "10001"),
    "L": ("10000", "10000", "10000", "10000", "10000", "10000", "11111"),
    "M": ("10001", "11011", "10101", "10001", "10001", "10001", "10001"),
    "N": ("10001", "11001", "10101", "10011", "10001", "10001", "10001"),
    "O": ("01110", "10001", "10001", "10001", "10001", "10001", "01110"),
    "P": ("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
    "Q": ("01110", "10001", "10001", "10001", "10101", "10010", "01101"),
    "R": ("11110", "10001", "10001", "11110", "10100", "10010", "10001"),
    "S": ("01111", "10000", "10000", "01110", "00001", "00001", "11110"),
    "T": ("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": ("10001", "10001", "10001", "10001", "10001", "10001", "01110"),
    "V": ("10001", "10001", "10001", "10001", "10001", "01010", "00100"),
    "W": ("10001", "10001", "10001", "10101", "10101", "10101", "01010"),
    "X": ("10001", "10001", "01010", "00100", "01010", "10001", "10001"),
    "Y": ("10001", "10001", "01010", "00100", "00100", "00100", "00100"),
    "Z": ("11111", "00001", "00010", "00100", "01000", "10000", "11111"),
    "0": ("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
    "1": ("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
    "2": ("01110", "10001", "00001", "00010", "00100", "01000", "11111"),
    "3": ("01110", "10001", "00001", "00110", "00001", "10001", "01110"),
    "4": ("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
    "5": ("11111", "10000", "11110", "00001", "00001", "10001", "01110"),
    "6": ("01110", "10000", "11110", "10001", "10001", "10001", "01110"),
    "7": ("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
    "8": ("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
    "9": ("01110", "10001", "10001", "01111", "00001", "00001", "01110"),
    "$": ("00100", "01111", "10100", "01110", "00101", "11110", "00100"),
    ".": ("00000", "00000", "00000", "00000", "00000", "00100", "00100"),
    ",": ("00000", "00000", "00000", "00000", "00100", "00100", "01000"),
    ":": ("00000", "00100", "00100", "00000", "00100", "00100", "00000"),
    "-": ("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    "/": ("00001", "00001", "00010", "00100", "01000", "10000", "10000"),
    "(": ("00100", "01000", "10000", "10000", "10000", "01000", "00100"),
    ")": ("00100", "00010", "00001", "00001", "00001", "00010", "00100"),
}

SCALE = 5
PAD = 28
LINE_GAP = 12
BG = (255, 255, 252)
INK = (17, 17, 18)
RULE = (176, 160, 128)

SAMPLES: dict[str, list[str]] = {
    "return-2023.png": [
        "IRS FORM 1040 SCHEDULE C",
        "TAX YEAR: 2023",
        "MORTGAGE SAMPLE NOT A REAL RETURN",
        "PROPRIETOR: JORDAN HALE",
        "BUSINESS: HALE DESIGN STUDIO",
        "LINE 6 OTHER INCOME: $0",
        "LINE 12 DEPLETION: $0",
        "LINE 13 DEPRECIATION: $8,000",
        "LINE 30 BUSINESS USE OF HOME: $0",
        "LINE 31 NET PROFIT: $80,000",
    ],
    "return-declining-2024.png": [
        "IRS FORM 1040 SCHEDULE C",
        "TAX YEAR: 2024",
        "MORTGAGE SAMPLE DECLINING YEAR",
        "PROPRIETOR: JORDAN HALE",
        "BUSINESS: HALE DESIGN STUDIO",
        "LINE 13 DEPRECIATION: $6,000",
        "LINE 31 NET PROFIT: $66,000",
    ],
    "entity-ordinary-2024.png": [
        "SCHEDULE K-1 FORM 1120-S",
        "TAX YEAR: 2024",
        "MORTGAGE SAMPLE NOT A REAL K-1",
        "SHAREHOLDER: JORDAN HALE",
        "CORPORATION: HALE STUDIO INC",
        "BOX 1 ORDINARY BUSINESS INCOME: $40,000",
        "DISTRIBUTIONS: NOT SHOWN",
    ],
    "w2-ot-bonus-2025.png": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "TAX YEAR: 2025",
        "MORTGAGE SAMPLE NOT A REAL W-2",
        "EMPLOYER: HARBOR STEEL",
        "WAGES: $84,000",
        "OVERTIME: $6,000",
        "BONUS: $0",
    ],
    "paystub-ot-bonus-2026.png": [
        "PAYSTUB",
        "EMPLOYER: HARBOR STEEL",
        "PAY PERIOD END: 2026-07-31",
        "MORTGAGE SAMPLE TWO-YEAR OT",
        "GROSS PERIOD: $7,000",
        "OVERTIME YTD: $12,000",
        "BONUS YTD: $0",
    ],
    "w2-bonus-2025.png": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "TAX YEAR: 2025",
        "MORTGAGE SAMPLE NOT A REAL W-2",
        "EMPLOYER: HARBOR STEEL",
        "WAGES: $84,000",
        "BONUS: $12,000",
    ],
    "paystub-bonus-declining-2026.png": [
        "PAYSTUB",
        "EMPLOYER: HARBOR STEEL",
        "PAY PERIOD END: 2026-07-31",
        "MORTGAGE SAMPLE DECLINING BONUS",
        "GROSS PERIOD: $7,000",
        "BONUS YTD: $6,000",
    ],
    "paystub-second-job.png": [
        "PAYSTUB",
        "EMPLOYER: NIGHT SHIFT CO",
        "PAY PERIOD END: 2026-07-31",
        "MORTGAGE SAMPLE SECOND JOB",
        "GROSS PERIOD: $1,200",
        "YTD GROSS: $8,400",
    ],
    "paystub-harbor.png": [
        "PAYSTUB",
        "EMPLOYER: HARBOR CAFE",
        "PAY PERIOD END: 2026-07-31",
        "PAY FREQUENCY: MONTHLY",
        "MORTGAGE SAMPLE SECOND EMPLOYER",
        "GROSS PERIOD: $400",
        "YTD GROSS: $6,400",
    ],
}


def blit(pixels: list[list[tuple[int, int, int]]], x: int, y: int, text: str) -> None:
    cx = x
    for ch in text:
        glyph = GLYPHS.get(ch, GLYPHS[" "])
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit != "1":
                    continue
                for dy in range(SCALE):
                    for dx in range(SCALE):
                        px = cx + col * SCALE + dx
                        py = y + row * SCALE + dy
                        if 0 <= py < len(pixels) and 0 <= px < len(pixels[0]):
                            pixels[py][px] = INK
        cx += 6 * SCALE


def png_bytes(pixels: list[list[tuple[int, int, int]]]) -> bytes:
    height = len(pixels)
    width = len(pixels[0])
    raw = bytearray()
    for row in pixels:
        raw.append(0)
        for r, g, b in row:
            raw.extend((r, g, b))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def write_sample(name: str, lines: list[str]) -> None:
    glyph_h = 7 * SCALE
    width = PAD * 2 + max(len(line) for line in lines) * 6 * SCALE
    height = PAD * 2 + len(lines) * glyph_h + (len(lines) - 1) * LINE_GAP + 20
    pixels = [[BG for _ in range(width)] for _ in range(height)]
    for x in range(PAD, width - PAD):
        for y in range(PAD - 8, PAD - 4):
            pixels[y][x] = RULE
    y = PAD
    for line in lines:
        blit(pixels, PAD, y, line)
        y += glyph_h + LINE_GAP
    out = Path(__file__).with_name(name)
    out.write_bytes(png_bytes(pixels))
    print(f"wrote {out} {out.stat().st_size} bytes {width}x{height}")


def main() -> None:
    for name, lines in SAMPLES.items():
        write_sample(name, lines)


if __name__ == "__main__":
    main()
