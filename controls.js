export function setupControls(globe) {
    // Globe.gl has built-in controls for mouse, touch, and keyboard.
    // Add any custom controls here if needed.

    // Example: Custom key for reset
    document.addEventListener('keydown', (e) => {
        if (e.key === ' ') {
            e.preventDefault();
            globe.pointOfView({ lat: 0, lng: 0, altitude: 2 });
        }
    });
}
