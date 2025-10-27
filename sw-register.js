export async function registerSW() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered successfully:', registration);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available, show update prompt
                        showUpdatePrompt();
                    }
                });
            });
        } catch (error) {
            console.log('Service Worker registration failed:', error);
        }
    }
}

function showUpdatePrompt() {
    // Create a simple update notification
    const updateDiv = document.createElement('div');
    updateDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        cursor: pointer;
    `;
    updateDiv.textContent = '🎉 Update available! Click to refresh.';
    updateDiv.onclick = () => window.location.reload();

    document.body.appendChild(updateDiv);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (updateDiv.parentNode) {
            updateDiv.parentNode.removeChild(updateDiv);
        }
    }, 10000);
}
