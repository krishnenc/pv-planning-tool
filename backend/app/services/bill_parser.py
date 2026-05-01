from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass
from typing import Tuple

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

log = logging.getLogger(__name__)


@dataclass
class BillParseResult:
    monthly_kwh: float
    confidence: float
    source: str  # "pdf_text" | "ocr"


# --- CONFIG ---
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}
MAX_BYTES = 10 * 1024 * 1024

_MIN_KWH = 1.0
_MAX_KWH = 9999.0

# Keywords ranked by importance
KEYWORDS = [
    "total units consumed",
    "units consumed",
    "consumption",
    "units"
]


# --- CORE PARSER ---
def _extract_kwh_with_context(text: str) -> Tuple[float, float]:
    text_lower = text.lower()

    for keyword in KEYWORDS:
        for match in re.finditer(keyword, text_lower):
            start = match.start()
            window = text_lower[start:start + 120]  # look ahead window

            num_match = re.search(r"(\d[\d,]*\.?\d*)", window)
            if num_match:
                value = float(num_match.group(1).replace(",", ""))

                if _MIN_KWH <= value <= _MAX_KWH:
                    # Confidence scoring
                    if "total units consumed" in keyword:
                        return value, 0.95
                    elif "units consumed" in keyword:
                        return value, 0.9
                    elif "consumption" in keyword:
                        return value, 0.8
                    else:
                        return value, 0.6

    raise ValueError("No valid kWh found with keyword context")


# --- PDF EXTRACTION ---
def _pdf_text(data: bytes) -> str:
    if not _PDF_OK:
        raise HTTPException(422, "Install pdfplumber to parse PDF files")

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            parts = []

            for page in pdf.pages:
                # Normal text
                txt = page.extract_text() or ""
                parts.append(txt)

                # Extract tables (important for CEB)
                for table in page.extract_tables() or []:
                    for row in table:
                        parts.append(" ".join(cell or "" for cell in row))

            return "\n".join(parts)

    except Exception as exc:
        raise HTTPException(
            422,
            f"Could not read PDF ({type(exc).__name__}). Upload valid PDF or enter manually."
        ) from exc


# --- OCR EXTRACTION ---
def _image_text(data: bytes) -> str:
    if not _OCR_OK:
        raise HTTPException(
            422,
            "OCR not available. Install pytesseract + Pillow + tesseract-ocr"
        )

    try:
        img = Image.open(io.BytesIO(data))

        # Preprocessing for better OCR
        img = img.convert("L")  # grayscale

        text = pytesseract.image_to_string(img, lang="eng")

        return text

    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            422,
            "Tesseract not installed on system"
        )


# --- MAIN ENTRY ---
def parse_bill(data: bytes, content_type: str) -> BillParseResult:
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "File too large (max 10MB)")

    mime = content_type.split(";")[0].strip().lower()

    if mime not in ALLOWED_TYPES:
        raise HTTPException(
            415,
            f"Unsupported type '{mime}'. Use PDF/JPEG/PNG."
        )

    # Extract text
    if mime == "application/pdf":
        text = _pdf_text(data)
        source = "pdf_text"
    else:
        text = _image_text(data)
        source = "ocr"

    log.debug("Extracted %d chars from %s", len(text), source)

    # Try context-based parsing
    try:
        kwh, confidence = _extract_kwh_with_context(text)

        return BillParseResult(
            monthly_kwh=kwh,
            confidence=confidence,
            source=source
        )

    except ValueError:
        log.warning("No kWh found in parsed text")

        raise HTTPException(
            422,
            "Could not extract consumption. Please enter your kWh manually."
        )