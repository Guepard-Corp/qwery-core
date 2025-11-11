// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';

global.fetch = vi.fn();
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});
