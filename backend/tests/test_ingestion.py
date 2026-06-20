import pytest
import asyncio
from unittest.mock import patch, MagicMock
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
            await processor.process_and_store("test.txt", b"Mock content", "owner123")

def test_metadata_includes_owner_id(processor):
    text_content = "This is a sample document content."
    owner_id = "test_owner_abc"
    with patch.object(processor.vector_store, 'add_texts') as mock_add_texts:
        processor._split_and_embed(text_content, "sample.txt", owner_id)
        args, kwargs = mock_add_texts.call_args
        metadatas = kwargs.get('metadatas', [])
        assert len(metadatas) > 0
        for meta in metadatas:
            assert meta.get('owner_id') == owner_id
            assert meta.get('source') == "sample.txt"

def test_concurrent_upload_race_condition(processor):
    """Simulate two users uploading the same filename; ensure metadata is isolated."""
    with patch.object(processor, '_insert_metadata') as mock_insert, \
         patch.object(processor, '_split_and_embed') as mock_split:
        async def run_concurrent():
            await asyncio.gather(
                processor.process_and_store("common.txt", b"content1", "ownerA"),
                processor.process_and_store("common.txt", b"content2", "ownerB")
            )
        asyncio.run(run_concurrent())

        calls = mock_insert.call_args_list
        assert len(calls) == 2
        owners = {call[0][3] for call in calls}
        assert owners == {"ownerA", "ownerB"}

def test_large_file_and_edge_cases(processor):
    """Test empty file, binary file, and huge content handling."""
    # Empty file
    text_empty = ""
    with patch.object(processor, '_extract_text', return_value=text_empty):
        with patch.object(processor, '_insert_metadata') as mock_insert:
            asyncio.run(processor.process_and_store("empty.txt", b"", "ownerA"))
            mock_insert.assert_not_called()

    # Binary-only file (simulate extraction returning no valid text)
    with patch.object(processor, '_extract_text', return_value="\x00\x01\x02"):
        with patch.object(processor.splitter, 'split_text', return_value=[]):
            with patch.object(processor, '_insert_metadata') as mock_insert:
                asyncio.run(processor.process_and_store("binary.bin", b"\x00\x01", "ownerA"))
                mock_insert.assert_called_once_with("binary.bin", "bin", 0, "ownerA")

    # Huge content
    huge_text = "A " * 10000
    with patch.object(processor.splitter, 'split_text', return_value=["chunk1", "chunk2"]):
        with patch.object(processor.vector_store, 'add_texts') as mock_add:
            asyncio.run(processor.process_and_store("huge.txt", huge_text.encode(), "ownerA"))
            mock_add.assert_called_once()