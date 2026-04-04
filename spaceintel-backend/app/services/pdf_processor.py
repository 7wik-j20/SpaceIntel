import fitz
import pytesseract
from PIL import Image
from pdf2image import convert_from_bytes
import io
import re

# Set paths
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
POPPLER_PATH = r"C:\Users\PANATCHTS\Downloads\Release-25.12.0-0\poppler-25.12.0\Library\bin"

def is_clean_text(text: str) -> bool:
    if not text or len(text.strip()) < 20:
        return False
    non_ascii = sum(1 for c in text if ord(c) > 127)
    return (non_ascii / len(text)) < 0.3

def extract_text_with_ocr(pdf_bytes: bytes) -> list:
    try:
        images = convert_from_bytes(
            pdf_bytes,
            dpi=200,
            poppler_path=POPPLER_PATH
        )
        pages = []
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image, lang="eng")
            if text.strip():
                pages.append({
                    "page_number": i + 1,
                    "text": text.strip()
                })
        return pages
    except Exception as e:
        print(f"OCR failed: {e}")
        return []

def extract_text_from_pdf(pdf_bytes: bytes) -> dict:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    total_text = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if text.strip():
            total_text += len(text.strip())
            pages.append({
                "page_number": page_num + 1,
                "text": text.strip()
            })

    avg_text = total_text / max(len(doc), 1)
    if avg_text < 200:
        print(f"Low text detected ({avg_text:.0f} chars/page). Switching to OCR...")
        ocr_pages = extract_text_with_ocr(pdf_bytes)
        if ocr_pages:
            pages = ocr_pages

    metadata = extract_metadata(pages)

    return {
        "pages": pages,
        "total_pages": len(doc),
        "metadata": metadata
    }

def extract_metadata(pages: list) -> dict:
    full_text = " ".join([p["text"] for p in pages[:5]]).lower()

    agency_keywords = {
        "ISRO": ["isro", "indian space research"],
        "NASA": ["nasa", "national aeronautics"],
        "ESA": ["esa", "european space agency"],
        "JAXA": ["jaxa", "japan aerospace"],
        "SpaceX": ["spacex", "falcon", "starship"],
        "CNSA": ["cnsa", "china national space"]
    }

    agency_counts = {}
    for agency, keywords in agency_keywords.items():
        count = sum(full_text.count(kw) for kw in keywords)
        if count > 0:
            agency_counts[agency] = count

    agency = max(agency_counts, key=agency_counts.get) if agency_counts else "Unknown"

    year_matches = re.findall(r'\b(20\d{2})\b', full_text)
    year = max(set(year_matches), key=year_matches.count) if year_matches else "Unknown"

    return {"agency": agency, "year": year}

def chunk_text(pages: list, chunk_size: int = 512, overlap: int = 50) -> list:
    chunks = []
    for page in pages:
        text = page["text"]
        page_number = page["page_number"]
        words = text.split()

        if not words:
            continue

        start = 0
        chunk_index = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk_text_str = " ".join(words[start:end])

            if is_clean_text(chunk_text_str):
                chunks.append({
                    "text": chunk_text_str,
                    "page_number": page_number,
                    "chunk_index": chunk_index
                })
                chunk_index += 1

            start += chunk_size - overlap

    return chunks