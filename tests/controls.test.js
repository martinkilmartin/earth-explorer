// Tests for controls.js - TDD approach for interaction reliability
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import { setupControls } from '../controls.js';

// Mock earthRenderer
const createMockEarthRenderer = () => ({
  earth: { rotation: { x: 0, y: 0 } },
  rotate: mock.fn(),
  zoomIn: mock.fn(),
  zoomOut: mock.fn(),
  resetView: mock.fn()
});

describe('Controls Setup', () => {
  let dom;
  let mockEarthRenderer;

  beforeEach(() => {
    // Setup JSDOM
    dom = new JSDOM('<html><body><canvas id="earth-canvas"></canvas></body></html>');
    global.document = dom.window.document;
    global.window = dom.window;
    global.MouseEvent = dom.window.MouseEvent;
    global.WheelEvent = dom.window.WheelEvent;
    global.KeyboardEvent = dom.window.KeyboardEvent;

    mockEarthRenderer = createMockEarthRenderer();
  });

  it('should setup mouse controls', () => {
    setupControls(mockEarthRenderer);
    const canvas = document.getElementById('earth-canvas');

    // Simulate mouse events
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 110 }));
    canvas.dispatchEvent(new MouseEvent('mouseup'));

    // Check that rotation changed
    assert(mockEarthRenderer.earth.rotation.y > 0, 'Y rotation should increase');
    assert(mockEarthRenderer.earth.rotation.x > 0, 'X rotation should increase');
  });

  it('should setup wheel zoom', () => {
    setupControls(mockEarthRenderer);
    const canvas = document.getElementById('earth-canvas');

    // Zoom in
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    assert.strictEqual(mockEarthRenderer.zoomIn.mock.callCount(), 1, 'zoomIn should be called');

    // Zoom out
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    assert.strictEqual(mockEarthRenderer.zoomOut.mock.callCount(), 1, 'zoomOut should be called');
  });

  it('should setup keyboard controls', () => {
    setupControls(mockEarthRenderer);

    // Test arrow keys
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    assert.strictEqual(mockEarthRenderer.earth.rotation.y, -0.05, 'ArrowLeft should decrease Y rotation');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    assert.strictEqual(mockEarthRenderer.earth.rotation.x, -0.05, 'ArrowUp should decrease X rotation');

    // Test zoom keys
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
    assert.strictEqual(mockEarthRenderer.zoomIn.mock.callCount(), 1, 'Plus should call zoomIn');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
    assert.strictEqual(mockEarthRenderer.zoomOut.mock.callCount(), 1, 'Minus should call zoomOut');

    // Test rotate toggle
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }));
    assert.strictEqual(mockEarthRenderer.rotate.mock.callCount(), 1, 'R should call rotate');

    // Test reset
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    assert.strictEqual(mockEarthRenderer.resetView.mock.callCount(), 1, 'Space should call resetView');
  });
});
