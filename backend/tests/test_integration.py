import pytest
import requests
import time
import json
import os
import hashlib
import urllib3

BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8000")
VERIFY_SSL = os.getenv("TEST_VERIFY_SSL", "true").lower() == "true"

if not VERIFY_SSL:
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

TEST_DOC = "test_integration_doc.md"
TEST_CONTENT = "# Integration Test Doc\n\nThis is a document used for integration testing."

def hash_credentials(username: str, password: str) -> str:
    combined = username + password
    return hashlib.sha256(combined.encode()).hexdigest()

def extract_text(reply):
    if isinstance(reply, str):
        return reply
    if isinstance(reply, list):
        texts = []
        for item in reply:
            if isinstance(item, dict) and "text" in item:
                texts.append(item["text"])
            elif isinstance(item, str):
                texts.append(item)
        return " ".join(texts)
    return str(reply)

@pytest.fixture(scope="module")
def user_a_session():
    return hash_credentials("userA", "passA")

@pytest.fixture(scope="module")
def user_b_session():
    return hash_credentials("userB", "passB")

@pytest.fixture(scope="module")
def isolated_session():
    return hash_credentials("isolated_user", "isolated_pass")

@pytest.fixture(scope="module")
def uploaded_doc(user_a_session):
    with open(TEST_DOC, "w", encoding="utf-8") as f:
        f.write(TEST_CONTENT)
    
    with open(TEST_DOC, "rb") as f:
        files = {"file": (TEST_DOC, f, "text/markdown")}
        data = {"session_id": user_a_session}
        resp = requests.post(f"{BASE_URL}/api/v1/upload", files=files, data=data, verify=VERIFY_SSL)
        assert resp.status_code == 202, f"Upload failed: {resp.text}"
    
    for _ in range(15):
        resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": user_a_session}, verify=VERIFY_SSL)
        if resp.status_code == 200:
            docs = resp.json().get("documents", [])
            if any(doc["filename"] == TEST_DOC for doc in docs):
                break
        time.sleep(1)
    
    yield TEST_DOC
    
    if os.path.exists(TEST_DOC):
        os.remove(TEST_DOC)

@pytest.fixture(scope="module")
def uploaded_isolated_doc(isolated_session):
    # Clean up existing documents for isolated session
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
    if resp.status_code == 200:
        docs = resp.json().get("documents", [])
        for doc in docs:
            requests.delete(
                f"{BASE_URL}/api/v1/documents/{doc['id']}",
                params={"session_id": isolated_session},
                verify=VERIFY_SSL
            )

    doc_name = "isolated_test_doc.md"
    with open(doc_name, "w", encoding="utf-8") as f:
        f.write("# Isolated Test Document\n\nThis is a document for isolation testing.")
    
    with open(doc_name, "rb") as f:
        files = {"file": (doc_name, f, "text/markdown")}
        data = {"session_id": isolated_session}
        resp = requests.post(f"{BASE_URL}/api/v1/upload", files=files, data=data, verify=VERIFY_SSL)
        assert resp.status_code == 202, f"Upload failed: {resp.text}"
    
    for _ in range(15):
        resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
        if resp.status_code == 200:
            docs = resp.json().get("documents", [])
            if any(doc["filename"] == doc_name for doc in docs):
                break
        time.sleep(1)
    
    yield doc_name
    
    # Cleanup
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
    if resp.status_code == 200:
        docs = resp.json().get("documents", [])
        for doc in docs:
            if doc["filename"] == doc_name:
                requests.delete(
                    f"{BASE_URL}/api/v1/documents/{doc['id']}",
                    params={"session_id": isolated_session},
                    verify=VERIFY_SSL
                )
                break
    
    if os.path.exists(doc_name):
        os.remove(doc_name)

# ---- Tests ----

def test_isolation_user_b_sees_no_documents(user_b_session):
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": user_b_session}, verify=VERIFY_SSL)
    assert resp.status_code == 200
    docs = resp.json().get("documents", [])
    assert len(docs) == 0

def test_isolation_user_b_cannot_get_chunks(uploaded_doc, user_b_session):
    resp = requests.get(
        f"{BASE_URL}/api/v1/documents/{TEST_DOC}/chunks",
        params={"session_id": user_b_session},
        verify=VERIFY_SSL
    )
    if resp.status_code == 200:
        data = resp.json()
        assert len(data.get("chunks", [])) == 0
    else:
        assert resp.status_code in (404, 500)

def test_isolation_user_b_chat_about_file(uploaded_doc, user_b_session):
    payload = {"message": f"What is the {TEST_DOC} document about?", "session_id": user_b_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "Integration Test" not in text

def test_isolation_user_a_can_access(uploaded_doc, user_a_session):
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": user_a_session}, verify=VERIFY_SSL)
    assert resp.status_code == 200
    docs = resp.json().get("documents", [])
    assert any(doc["filename"] == TEST_DOC for doc in docs)
    
    payload = {"message": f"What is the {TEST_DOC} document about?", "session_id": user_a_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "Integration Test" in text

def test_agent_memory(user_a_session):
    fact_message = "My secret code is 4455."
    payload = {"message": fact_message, "session_id": user_a_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    
    query = "What is my secret code?"
    payload = {"message": query, "session_id": user_a_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "4455" in text

def test_streaming_with_session(user_a_session, uploaded_doc):
    payload = {"message": f"What is the {TEST_DOC} document about?", "session_id": user_a_session}
    tokens = []
    with requests.post(f"{BASE_URL}/api/v1/chat/stream", json=payload, stream=True, verify=VERIFY_SSL) as resp:
        assert resp.status_code == 200
        for line in resp.iter_lines():
            if not line:
                continue
            line = line.decode('utf-8')
            if line.startswith("data: "):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    if "token" in data:
                        tokens.append(data["token"])
                    elif "done" in data:
                        break
                    elif "error" in data:
                        pytest.fail(f"Stream error: {data['error']}")
                except json.JSONDecodeError:
                    pass
    full_reply = "".join(tokens)
    assert "Integration Test" in full_reply

def test_session_memory_isolation(user_a_session, user_b_session):
    fact = "My favorite color is blue."
    payload = {"message": fact, "session_id": user_a_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200

    query = "What is my favorite color?"
    payload = {"message": query, "session_id": user_b_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "blue" not in text

    payload = {"message": query, "session_id": user_a_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "blue" in text

def test_inactive_document_behavior(isolated_session, uploaded_isolated_doc):
    doc_filename = uploaded_isolated_doc
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
    docs = resp.json().get("documents", [])
    doc_id = next(d for d in docs if d["filename"] == doc_filename)["id"]

    # Toggle to inactive
    resp = requests.put(
        f"{BASE_URL}/api/v1/documents/{doc_id}/toggle",
        params={"session_id": isolated_session, "is_active": False},
        verify=VERIFY_SSL
    )
    assert resp.status_code == 200
    time.sleep(2)

    # Verify inactive
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
    docs = resp.json().get("documents", [])
    doc = next(d for d in docs if d["filename"] == doc_filename)
    assert doc["is_active"] is False

    # Should not have content
    payload = {"message": f"What is the {doc_filename} document about?", "session_id": isolated_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "This is a document for isolation testing" not in text

    # Toggle to active
    resp = requests.put(
        f"{BASE_URL}/api/v1/documents/{doc_id}/toggle",
        params={"session_id": isolated_session, "is_active": True},
        verify=VERIFY_SSL
    )
    assert resp.status_code == 200
    time.sleep(2)

    # Now should have content
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "isolation testing" in text

def test_missing_session_id_error():
    resp = requests.get(f"{BASE_URL}/api/v1/documents", verify=VERIFY_SSL)
    assert resp.status_code == 422

    temp_doc = "temp_upload_test.txt"
    with open(temp_doc, "w") as f:
        f.write("dummy")
    with open(temp_doc, "rb") as f:
        files = {"file": (temp_doc, f, "text/plain")}
        resp = requests.post(f"{BASE_URL}/api/v1/upload", files=files, verify=VERIFY_SSL)
    assert resp.status_code == 422
    os.remove(temp_doc)

def test_metadata_tool_correctness(isolated_session, uploaded_isolated_doc):
    resp = requests.get(f"{BASE_URL}/api/v1/documents", params={"session_id": isolated_session}, verify=VERIFY_SSL)
    docs = resp.json().get("documents", [])
    assert len(docs) == 1

    payload = {"message": "How many documents are uploaded?", "session_id": isolated_session}
    resp = requests.post(f"{BASE_URL}/api/v1/chat", json=payload, verify=VERIFY_SSL)
    assert resp.status_code == 200
    reply = resp.json().get("reply", "")
    text = extract_text(reply)
    assert "1" in text or "one" in text.lower()