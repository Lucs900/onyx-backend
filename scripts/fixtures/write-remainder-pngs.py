#!/usr/bin/env python3
"""Write labeled remainder-doc PNGs. Visible page may differ from tEXt (sabotage)."""

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
}

SCALE = 5
PAD = 28
LINE_GAP = 12
BG = (255, 255, 252)
INK = (17, 17, 18)
RULE = (176, 160, 128)

BANK_PAGE = [
    "BANK STATEMENT",
    "INSTITUTION: FIRST NATIONAL",
    "PERIOD END: 2026-07-31",
    "ENDING BALANCE: $18,400",
]

CONTRACT_PAGE = [
    "PURCHASE CONTRACT",
    "PROPERTY ADDRESS: 14 OAK STREET",
    "PURCHASE PRICE: $1,200,000",
    "CLOSE DATE: 2026-10-15",
]

MORTGAGE_PAGE = [
    "MORTGAGE STATEMENT",
    "SERVICER: OAK SERVICING",
    "UNPAID PRINCIPAL: $960,000",
    "CURRENT PI: $4,800",
    "PROPERTY ADDRESS: 14 OAK STREET",
]

MORTGAGE_PAGE_NO_PI = [
    "MORTGAGE STATEMENT",
    "SERVICER: OAK SERVICING",
    "UNPAID PRINCIPAL: $960,000",
    "PROPERTY ADDRESS: 14 OAK STREET",
]

PINE_MORTGAGE_PAGE = [
    "MORTGAGE STATEMENT",
    "SERVICER: RIVER SERVICING",
    "UNPAID PRINCIPAL: $385,000",
    "CURRENT PI: $3,850",
    "PROPERTY ADDRESS: 88 PINE ROAD",
]

CEDAR_MORTGAGE_PAGE = [
    "MORTGAGE STATEMENT",
    "SERVICER: LAKE SERVICING",
    "UNPAID PRINCIPAL: $180,000",
    "CURRENT PI: $1,800",
    "PROPERTY ADDRESS: 12 CEDAR COURT",
]

ID_PAGE = [
    "GOVERNMENT ID",
    "FULL NAME: JORDAN HALE",
    "ID LAST 4: 4281",
]

# Wrong hidden comment — extract must ignore this.
SABOTAGE_COMMENT = [
    "FORM W-2 WAGE AND TAX STATEMENT",
    "TAX YEAR: 2025",
    "EMPLOYER: HARBOR STEEL",
    "WAGES: $84,000",
    "OVERTIME: $6,000",
]


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


def png_bytes(pixels: list[list[tuple[int, int, int]]], comment_lines: list[str]) -> bytes:
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

    printed = "Comment".encode("latin-1") + b"\0" + "\n".join(comment_lines).encode("latin-1")
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
            chunk(b"tEXt", printed),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def write_sample(name: str, visible: list[str], comment: list[str] | None = None) -> None:
    glyph_h = 7 * SCALE
    width = PAD * 2 + max(len(line) for line in visible) * 6 * SCALE
    height = PAD * 2 + len(visible) * glyph_h + (len(visible) - 1) * LINE_GAP + 20
    pixels = [[BG for _ in range(width)] for _ in range(height)]
    for x in range(PAD, width - PAD):
        for y in range(PAD - 8, PAD - 4):
            pixels[y][x] = RULE
    y = PAD
    for line in visible:
        blit(pixels, PAD, y, line)
        y += glyph_h + LINE_GAP
    out = Path(__file__).with_name(name)
    out.write_bytes(png_bytes(pixels, comment if comment is not None else visible))
    print(f"wrote {out} {out.stat().st_size} bytes {width}x{height}")


def main() -> None:
    write_sample("bank-statement-first-national.png", BANK_PAGE)
    write_sample("purchase-contract-oak.png", CONTRACT_PAGE)
    write_sample("mortgage-statement-oak.png", MORTGAGE_PAGE)
    write_sample("mortgage-statement-oak-no-pi.png", MORTGAGE_PAGE_NO_PI)
    write_sample("mortgage-statement-pine.png", PINE_MORTGAGE_PAGE)
    write_sample("mortgage-statement-cedar.png", CEDAR_MORTGAGE_PAGE)
    write_sample("government-id-jordan.png", ID_PAGE)
    write_sample("bank-statement-sabotage.png", BANK_PAGE, SABOTAGE_COMMENT)


if __name__ == "__main__":
    main()
