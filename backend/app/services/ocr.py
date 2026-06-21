import os
import logging
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

logger = logging.getLogger(__name__)

def get_di_client():
    endpoint = os.getenv("AZURE_DI_ENDPOINT")
    key = os.getenv("AZURE_DI_KEY")
    if not endpoint or not key:
        raise ValueError("Azure Document Intelligence credentials missing. Set AZURE_DI_ENDPOINT and AZURE_DI_KEY.")
    return DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))

def ocr_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF using Azure Document Intelligence.
    Returns extracted text as a string, or empty string on failure.
    """
    try:
        client = get_di_client()
        # Send the PDF directly (no image conversion needed!)
        poller = client.begin_analyze_document(
            "prebuilt-read",  # The prebuilt-read model extracts text
            document=pdf_bytes,
            content_type="application/pdf"
        )
        result = poller.result()
        
        if not result or not result.content:
            logger.warning("Azure DI returned empty content for the document.")
            return ""
        
        # Return the full text content
        return result.content
    except Exception as e:
        logger.error(f"Azure Document Intelligence OCR failed: {e}", exc_info=True)
        return ""