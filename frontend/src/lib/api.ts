const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

export const api = {
  async uploadFile(file: File, sessionId: string): Promise<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);

    const response = await fetch(`${API_BASE}/api/v1/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Ingestion transmission failed.');
    }
    return response.json();
  },

  async chatStream(message: string, sessionId: string): Promise<Response> {
    const res = await fetch(`${API_BASE}/api/v1/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status} - ${errorText}`);
    }
    return res;
  },

  async getDocuments(sessionId: string): Promise<{ documents: any[] }> {
    const res = await fetch(`${API_BASE}/api/v1/documents?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to fetch documents.');
    return res.json();
  },

  async getDocumentChunks(filename: string, sessionId: string): Promise<{ chunks: string[] }> {
    const res = await fetch(`${API_BASE}/api/v1/documents/${encodeURIComponent(filename)}/chunks?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to fetch chunks.');
    return res.json();
  },

  async toggleDocument(id: number, isActive: boolean, sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/documents/${id}/toggle?session_id=${encodeURIComponent(sessionId)}&is_active=${isActive}`, {
      method: 'PUT',
    });
    if (!res.ok) throw new Error('Failed to toggle document state.');
  },

  async deleteDocument(id: number, _filename: string, sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/documents/${id}?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document.');
  },

  async getDocumentCount(sessionId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/api/v1/tools/document_count?session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error('Failed to fetch document count.');
    const data = await res.json();
    return data.result;
  }
};