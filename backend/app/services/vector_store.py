import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

PERSIST_DIRECTORY = os.path.join(os.getcwd(), "chroma_db")

def get_vector_store() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return Chroma(
        collection_name="documents",
        embedding_function=embeddings,
        persist_directory=PERSIST_DIRECTORY
    )