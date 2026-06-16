import pytest
from unittest.mock import patch
from app.services.ingestion import DocumentProcessor

@pytest.fixture
def processor():
    return DocumentProcessor(chunk_size=50, chunk_overlap=10)

def test_chunking_boundaries(processor):
    sample_text = "A" * 40 + " " + "B" * 40 + " " + "C" * 40
    chunks = processor.splitter.split_text(sample_text)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 50

@pytest.mark.asyncio
async def test_process_and_store_error_handling(processor):
    with patch(
        'app.services.vector_store.Chroma.add_texts',
        side_effect=Exception("ChromaDB Write Failure")
    ):
        with pytest.raises(Exception, match="ChromaDB Write Failure"):
            await processor.process_and_store("test.txt", b"Mock content")