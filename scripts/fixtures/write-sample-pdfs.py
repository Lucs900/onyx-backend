#!/usr/bin/env python3
"""Write text-layer PDF fixtures that match known ONYX sample pages. No invented facts."""

from __future__ import annotations

from pathlib import Path

# Same labeled lines as the existing PNG samples.
PAGES: dict[str, list[str]] = {
    "government-id-jordan.pdf": [
        "GOVERNMENT ID",
        "FULL NAME: JORDAN HALE",
        "ID LAST 4: 4281",
    ],
    "paystub-acme.pdf": [
        "PAYSTUB",
        "EMPLOYER: ACME",
        "PAY PERIOD END: 2026-07-31",
        "GROSS PERIOD: $4,230.77",
        "YTD GROSS: $29,615.39",
        "NET PERIOD: $3,180.12",
    ],
    "paystub-ot-bonus-2026.pdf": [
        "PAYSTUB",
        "EMPLOYER: HARBOR STEEL",
        "PAY PERIOD END: 2026-07-31",
        "MORTGAGE SAMPLE TWO-YEAR OT",
        "GROSS PERIOD: $7,000",
        "OVERTIME YTD: $12,000",
        "BONUS YTD: $0",
    ],
    "paystub-bonus-declining-2026.pdf": [
        "PAYSTUB",
        "EMPLOYER: HARBOR STEEL",
        "PAY PERIOD END: 2026-07-31",
        "MORTGAGE SAMPLE DECLINING BONUS",
        "GROSS PERIOD: $7,000",
        "BONUS YTD: $6,000",
    ],
    "w2-ot-bonus-2025.pdf": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "TAX YEAR: 2025",
        "MORTGAGE SAMPLE NOT A REAL W-2",
        "EMPLOYER: HARBOR STEEL",
        "WAGES: $84,000",
        "OVERTIME: $6,000",
        "BONUS: $0",
    ],
    "w2-bonus-2025.pdf": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "TAX YEAR: 2025",
        "MORTGAGE SAMPLE NOT A REAL W-2",
        "EMPLOYER: HARBOR STEEL",
        "WAGES: $84,000",
        "BONUS: $12,000",
    ],
    "government-id-name-alias.pdf": [
        "DRIVER LICENSE",
        "NAME: JORDAN HALE",
        "ADDRESS: 14 OAK STREET",
    ],
    "paystub-gross-pay-alias.pdf": [
        "PAY STUB",
        "EMPLOYER NAME: HARBOR STEEL",
        "PAY DATE: 2026-07-31",
        "GROSS PAY: $7,000",
        "YTD GROSS: $49,000",
    ],
    "w2-box1-alias.pdf": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "EMPLOYER NAME: HARBOR STEEL",
        "BOX 1 WAGES: $84,000",
    ],
    "government-id-unlabeled-text.pdf": [
        "SAMPLE PAGE",
        "JORDAN HALE",
        "HARBOR STEEL",
    ],
}


def pdf_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def content_stream(lines: list[str]) -> bytes:
    commands = ["BT", "/F1 12 Tf", "72 720 Td"]
    for i, line in enumerate(lines):
        if i:
            commands.append("0 -18 Td")
        commands.append(f"({pdf_escape(line)}) Tj")
    commands.append("ET")
    return "\n".join(commands).encode("latin-1")


def write_pdf_bytes(path: Path, stream: bytes) -> None:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
        ),
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    chunks: list[bytes] = [b"%PDF-1.4\n"]
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(sum(len(part) for part in chunks))
        chunks.append(f"{index} 0 obj\n".encode("ascii") + body + b"\nendobj\n")
    xref_at = sum(len(part) for part in chunks)
    xref = [b"xref\n", f"0 {len(objects) + 1}\n".encode("ascii"), b"0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n".encode("ascii"))
    chunks.extend(xref)
    chunks.append(
        (
            f"trailer << /Root 1 0 R /Size {len(objects) + 1} >>\n"
            f"startxref\n{xref_at}\n%%EOF\n"
        ).encode("ascii")
    )
    path.write_bytes(b"".join(chunks))
    print(f"wrote {path} {path.stat().st_size} bytes")


def write_pdf(path: Path, lines: list[str]) -> None:
    write_pdf_bytes(path, content_stream(lines))


FOUNDER_BANK_NAME = "05-bank-statement-pacific-coast-jul-2026.pdf"


def write_founder_bank_pdf(path: Path) -> None:
    """Founder layout: Ending balance 07/31/2026 next to $84,220.15.

    Not the thin stub (ENDING BALANCE: $x / PERIOD END: ISO date).
    Date and dollar are separate text runs so extract cannot treat 07 as money.
    Filbert is residence only. No last4.
    """
    stream = "\n".join(
        [
            "BT",
            "/F1 18 Tf",
            "72 740 Td",
            "(PACIFIC COAST BANK) Tj",
            "/F1 11 Tf",
            "0 -20 Td",
            "(ACCOUNT STATEMENT) Tj",
            "0 -18 Td",
            "(RESIDENTIAL ADDRESS: 1847 Filbert St, San Francisco, CA 94123) Tj",
            "0 -28 Td",
            "(Ending balance 07/31/2026) Tj",
            "260 0 Td",
            "($84,220.15) Tj",
            "-260 -36 Td",
            "(MORTGAGE SAMPLE - NOT A REAL STATEMENT) Tj",
            "ET",
        ]
    ).encode("latin-1")
    if b"ENDING BALANCE:" in stream or b"PERIOD END:" in stream:
        raise SystemExit("founder bank page must not recreate the labeled stub")
    if b"07/31/2026" not in stream or b"$84,220.15" not in stream:
        raise SystemExit("founder bank page must print 07/31/2026 and $84,220.15")
    write_pdf_bytes(path, stream)


def write_empty_pdf(path: Path) -> None:
    """Page with no text operators — character count must be 0."""
    stream = b"q\nQ\n"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (
            b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            b"/Contents 4 0 R >>"
        ),
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
    ]
    chunks: list[bytes] = [b"%PDF-1.4\n"]
    offsets = [0]
    for index, body in enumerate(objects, start=1):
        offsets.append(sum(len(part) for part in chunks))
        chunks.append(f"{index} 0 obj\n".encode("ascii") + body + b"\nendobj\n")
    xref_at = sum(len(part) for part in chunks)
    xref = [b"xref\n", f"0 {len(objects) + 1}\n".encode("ascii"), b"0000000000 65535 f \n"]
    for offset in offsets[1:]:
        xref.append(f"{offset:010d} 00000 n \n".encode("ascii"))
    chunks.extend(xref)
    chunks.append(
        (
            f"trailer << /Root 1 0 R /Size {len(objects) + 1} >>\n"
            f"startxref\n{xref_at}\n%%EOF\n"
        ).encode("ascii")
    )
    path.write_bytes(b"".join(chunks))
    print(f"wrote {path} {path.stat().st_size} bytes")


LOUD_PAGES: dict[str, list[str]] = {
    "06-w2-2025-box5-loud.pdf": [
        "FORM W-2 WAGE AND TAX STATEMENT",
        "TAX YEAR: 2025",
        "EMPLOYER: Harbor Pacific Design Inc",
        "EMPLOYEE NAME: Jordan Hale",
        "BOX 5 MEDICARE WAGES AND TIPS: 118400.00",
        "BOX 5: 118400.00",
        "one hundred eighteen thousand four hundred",
    ],
    "07-paystub-biweekly-loud.pdf": [
        "PAYSTUB",
        "EMPLOYER: Harbor Pacific Design Inc",
        "EMPLOYEE NAME: Jordan Hale",
        "GROSS PERIOD: 4615.38",
        "PAY FREQUENCY: biweekly",
    ],
}


def main() -> None:
    here = Path(__file__).resolve().parent
    for name, lines in PAGES.items():
        write_pdf(here / name, lines)
    write_empty_pdf(here / "government-id-no-text-layer.pdf")
    sample_docs = here.parent.parent / "sample-docs"
    sample_docs.mkdir(parents=True, exist_ok=True)
    for name, lines in LOUD_PAGES.items():
        write_pdf(sample_docs / name, lines)
    write_founder_bank_pdf(here / FOUNDER_BANK_NAME)
    write_founder_bank_pdf(sample_docs / FOUNDER_BANK_NAME)


if __name__ == "__main__":
    main()
