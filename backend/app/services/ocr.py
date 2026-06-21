import os
import logging
from pdf2image import convert_from_bytes
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

OCR_DPI = 300
MAX_PAGES = 10
TESSERACT_CONFIG = '--psm 6 --oem 3'

def ocr_pdf(pdf_bytes: bytes) -> str:
    try:
        images = convert_from_bytes(pdf_bytes, dpi=OCR_DPI, fmt='jpeg')
        if len(images) > MAX_PAGES:
            logger.warning(f"PDF has {len(images)} pages, truncating to {MAX_PAGES}")
            images = images[:MAX_PAGES]

        extracted = []
        for img in images:
            img = img.convert('L')   # grayscale
            text = pytesseract.image_to_string(img, lang='eng', config=TESSERACT_CONFIG)
            extracted.append(text.strip())
            img.close()

        full_text = "\n\n".join(extracted)
        logger.info(f"Local OCR extracted {len(full_text)} chars from {len(images)} pages.")
        return full_text
    except Exception as e:
        logger.error(f"Local OCR failed: {e}", exc_info=True)
        return ""