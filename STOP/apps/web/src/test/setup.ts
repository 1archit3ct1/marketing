/**
 * AURA Web Test Setup
 * Global test utilities and mocks
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock drag and drop APIs
if (!global.DataTransfer) {
  global.DataTransfer = class DataTransfer {
    dropEffect = 'none';
    effectAllowed = 'uninitialized';
    files = [] as File[];
    items = [] as DataTransferItemList;
    types = [] as string[];
    
    clearData() {}
    getData() { return ''; }
    setData() {}
    setDragImage() {}
  } as any;
}
