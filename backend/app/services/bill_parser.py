from __future__ import annotations

import io
import re
from dataclasses import dataclass

from fastapi import HTTPException

try:
    import pdfplumber  # type: ignore
    _PDF_OK = True
except ImportError:
    _PDF_OK = False

try:
    import pytesseract  # type: ignore
    from PIL import Image  # type: ignore
    _OCR_OK = True
except ImportError:
    _OCR_OK = False


@dataclass
class BillParseResult:
    monthly_kwh: float
    estimated: bool = False


# Patterns tried in descending specificity — first valid match wins.
# P1/P2 target the authoritative CEB label; P4/P5 are last-resort bare-numeric.
_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"total\s+units?\s+consumed\s*:?\s*(\d[\d,]*\.?\d*)", re.IGNORECASE),
    re.compile(r"units?\s+consumed\s*:?\s*(\d[\d,]*\.?\d*)", re.IGNORECASE),
    re.compile(r"consumption\s*:?\s*(\d[\d,]*\.?\d*)\s*k?wh", re.IGNORECASE),
    re.compile(r"(\d[\d,]*\.?\d*)\s*kwh", re.IGNORECASE),
    re.compile(r"(\d[\d,]*\.?\d*)\s+units?(?!\s+consumed)", re.IGNORECASE),
]
_MIN_KWH: float = 1.0
_MAX_KWH: float = 9999.0

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _parse_kwh(text: str) -> float:
    for pat in _PATTERNS:
        m = pat.search(text)
        if m:
            v = float(m.group(1).replace(",", ""))
            if _MIN_KWH <= v <= _MAX_KWH:
                return v
    raise ValueError("no kWh value found in text")


def _pdf_text(data: bytes) -> str:
    if not _PDF_OK:
        raise HTTPException(422, "PDF library not installed — run: pip install pdfplumber")
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages)


def _image_text(data: bytes) -> str:
    if not _OCR_OK:
        raise HTTPException(
            422,
            "OCR not available — upload a PDF or enter kWh manually "
            "(server needs: pip install pytesseract Pillow + sudo apt-get install tesseract-ocr)",
        )
    try:
        return pytesseract.image_to_string(Image.open(io.BytesIO(data)), lang="eng")
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            422,
            "OCR not available — upload a PDF or enter kWh manually "
            "(sudo apt-get install tesseract-ocr)",
        )


def parse_bill(data: bytes, content_type: str) -> BillParseResult:
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large — maximum 10 MB.")

    mime = content_type.split(";")[0].strip().lower()
    if mime not in ALLOWED_TYPES:
        raise HTTPException(415, f"Unsupported type '{mime}'. Accepted: PDF, JPEG, PNG.")

    text = _pdf_text(data) if mime == "application/pdf" else _image_text(data)

    try:
        return BillParseResult(monthly_kwh=_parse_kwh(text))
    except ValueError:
        raise HTTPException(
            422,
            "Could not extract kWh from this bill — please enter your monthly units manually.",
        )
