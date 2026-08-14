import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Ensure components are unmounted between tests (RTL auto-cleanup needs globals).
afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});

// jsdom does not implement navigator.clipboard
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
    writable: true,
  });
}

// jsdom does not implement canvas; provide a minimal stub for zipGenerator icon generation.
class FakeCanvasContext {
  fillStyle = '';
  strokeStyle = '';
  lineWidth = 1;
  createLinearGradient() {
    return { addColorStop: () => {} };
  }
  beginPath() {}
  roundRect() {}
  fill() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  arc() {}
  fillRect() {}
  clearRect() {}
  save() {}
  restore() {}
  scale() {}
  translate() {}
}

const canvasProto = (globalThis as any).HTMLCanvasElement?.prototype;
if (canvasProto && !canvasProto.__mockedForTests) {
  canvasProto.__mockedForTests = true;
  canvasProto.getContext = function () {
    return new FakeCanvasContext() as unknown as CanvasRenderingContext2D;
  };
  canvasProto.toBlob = function (cb: (blob: Blob | null) => void) {
    cb(new Blob([], { type: 'image/png' }));
  };
}
