import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically unmount React trees after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Polyfill scrollTo
window.scrollTo = vi.fn();

// Polyfill URL.createObjectURL / revokeObjectURL for file tests
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
}
if (!window.URL.revokeObjectURL) {
  window.URL.revokeObjectURL = vi.fn();
}

// Global default mock for ThemeContext
vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    toggleTheme: vi.fn(),
    isDark: false
  }),
  ThemeProvider: ({ children }) => children,
  default: {}
}));

// Global default mock for socket.js
vi.mock('../services/socket', () => ({
  connectSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false
  })),
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false
  })),
  disconnectSocket: vi.fn(),
  subscribeToNotifications: vi.fn(() => () => {})
}));


