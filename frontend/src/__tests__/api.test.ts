import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api', () => {
  const sessionId = 'test-session';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('uploadFile sends FormData with session_id', async () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ok', filename: 'test.txt' }),
    });

    await api.uploadFile(file, sessionId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('http://localhost:8000/api/v1/upload');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeInstanceOf(FormData);
    const formData = call[1].body as FormData;
    expect(formData.get('session_id')).toBe(sessionId);
    expect(formData.get('file')).toBe(file);
  });

  it('chatStream sends session_id in JSON body', async () => {
    const message = 'Hello';
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: new ReadableStream(),
    });

    await api.chatStream(message, sessionId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe('http://localhost:8000/api/v1/chat/stream');
    expect(call[1].method).toBe('POST');
    expect(call[1].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(call[1].body)).toEqual({ message, session_id: sessionId });
  });

  it('getDocuments appends session_id as query param', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ documents: [] }),
    });

    await api.getDocuments(sessionId);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain(`session_id=${encodeURIComponent(sessionId)}`);
  });

  it('toggleDocument appends session_id and is_active', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await api.toggleDocument(123, true, sessionId);

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain(`/123/toggle?session_id=${encodeURIComponent(sessionId)}&is_active=true`);
    expect(call[1].method).toBe('PUT');
  });

  it('deleteDocument appends session_id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await api.deleteDocument(123, 'file.txt', sessionId);

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain(`/123?session_id=${encodeURIComponent(sessionId)}`);
    expect(call[1].method).toBe('DELETE');
  });

  it('getDocumentChunks appends session_id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ chunks: [] }),
    });

    await api.getDocumentChunks('file.txt', sessionId);

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain(`/file.txt/chunks?session_id=${encodeURIComponent(sessionId)}`);
  });
});