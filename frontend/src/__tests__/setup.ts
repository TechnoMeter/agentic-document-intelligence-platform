import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// This mock is used by the Login component for hashing.
// The hashing test is skipped, but we keep the mock for completeness.
const mockDigest = vi.fn().mockResolvedValue(new Uint8Array(32).buffer);

Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
    randomUUID: vi.fn(() => 'mock-uuid'),
  },
  configurable: true,
});

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: mockDigest,
    },
    randomUUID: vi.fn(() => 'mock-uuid'),
  },
  configurable: true,
});

global.fetch = vi.fn();

afterEach(() => {
  vi.clearAllMocks();
});