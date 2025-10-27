# 🌍 Earth Explorer

An interactive 3D Earth exploration game designed for kids! Explore our beautiful planet with smooth rotations, zooming, and full-screen immersion. Works completely offline once loaded.

## Features

- **Full-Screen Interactive 3D Earth**: Drag to rotate, scroll to zoom, no UI distractions
- **Offline Capable**: Progressive Web App (PWA) that works without internet (crucial for reliability)
- **Accurate Continents**: Uses world-atlas package with Natural Earth data for precise continent boundaries
- **Responsive Design**: Adapts to landscape/portrait on all devices
- **Lightweight**: Minimal footprint (~18KB local + ~600KB cached Three.js + geographic data)

## Controls

- **Mouse**: Drag to rotate, scroll wheel to zoom
- **Touch**: Drag to rotate
- **Keyboard**:
  - Arrow keys: Rotate Earth (left/right horizontal, up/down vertical)
  - `+`/`-`: Zoom in/out
  - `R`: Toggle auto-rotation
  - `Space`: Reset to default view

## Development Standards

To maintain quality and reliability:

- **100% Offline-First**: Ensure all features work without internet. Cache all dependencies. No external APIs without fallbacks.
- **Lightweight**: Keep total size under 1MB. Use CDN for libraries but cache locally.
- **TDD Approach**: Write tests before implementing features. Run tests on every change.
- **Cross-Platform**: Test on desktop, mobile, tablet in both orientations.
- **Performance**: 60 FPS smooth animations, fast load times.
- **Accessibility**: Keyboard navigation, touch-friendly, screen reader compatible.
- **Modular Code**: ES6 modules, no globals, clean separation of concerns.

## Testing

We use Node.js built-in test runner for unit testing. Tests cover core functionality to ensure stability.

### Running Tests
```bash
npm test
```

### Adding Tests
- Tests in `tests/` directory
- Follow TDD: Write test first, then implement
- Cover interactions, rendering, offline functionality

## How to Run

### Option 1: Quick Start (Recommended)
```bash
npm start
```
Then open http://localhost:8000 in your browser

### Option 2: Direct Browser Opening
Simply open `index.html` in any modern web browser. The app will work offline after the first load.

### Option 3: Install as PWA
1. Open the app in Chrome/Edge
2. Click the install button in the address bar
3. The app will be available offline from your home screen

## Technical Details

- **Vanilla JavaScript**: No frameworks, just pure JS with ES6 modules
- **Three.js**: 3D graphics library for the interactive Earth
- **World-Atlas**: Geographic data from Natural Earth (CDN cached)
- **TopoJSON-Client**: Parses compressed geographic vector data (CDN cached)
- **Service Workers**: Enables offline functionality
- **PWA Manifest**: Allows installation as a native app
- **Node Test Runner**: Built-in testing for TDD

## Browser Support

Works in all modern browsers that support:
- ES6 Modules
- Service Workers
- WebGL (for 3D graphics)

## License

MIT License - feel free to modify and share!

---

Built with ❤️ for kids to explore and learn about our amazing planet! 🪐
