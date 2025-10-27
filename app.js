// Main application entry point
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';
import { setupControls } from './controls.js';
import { registerSW } from './sw-register.js';

class EarthExplorer {
    constructor() {
        this.globe = null;
        this.init();
    }

    async init() {
        try {
            // Show loading state
            const loadingEl = document.getElementById('loading');
            loadingEl.style.display = 'block';

            // Initialize Globe
            this.globe = new Globe(document.getElementById('globe'), {
                globeImageUrl: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
                backgroundImageUrl: 'https://unpkg.com/three-globe/example/img/night-sky.png',
                width: window.innerWidth,
                height: window.innerHeight
            });

            // Load continents data
            await this.loadContinents();

            // Add markers
            this.addMarkers();

            // Setup controls (may need to adapt)
            setupControls(this.globe);

            // Setup content overlay
            this.setupContentOverlay();

            // Register service worker for offline functionality
            await registerSW();

            // Hide loading and show globe
            loadingEl.style.display = 'none';
            document.getElementById('globe').style.display = 'block';

        } catch (error) {
            console.error('Failed to initialize Earth Explorer:', error);
            document.getElementById('loading').textContent = 'Oops! Something went wrong. Please refresh the page.';
        }
    }

    async loadContinents() {
        try {
            const response = await fetch('./earth.json');
            const continentsData = await response.json();
            const continentsGeo = feature(continentsData, continentsData.objects.land);

            this.globe.polygonsData(continentsGeo.features)
                .polygonCapColor(() => 'rgba(0, 100, 0, 0.8)')
                .polygonSideColor(() => 'rgba(0, 100, 0, 0.3)')
                .polygonStrokeColor(() => '#fff');
        } catch (error) {
            console.error('Failed to load continents:', error);
        }
    }

    addMarkers() {
        const locations = [
            { lat: 43.6532, lng: -79.3832, name: 'Home in Toronto, Canada', type: 'home' },
            { lat: 53.3498, lng: -6.2603, name: 'Grandma in Dublin, Ireland', type: 'grandma' },
            // Add more locations as needed
        ];

        this.globe.pointsData(locations)
            .pointLat(d => d.lat)
            .pointLng(d => d.lng)
            .pointColor(d => d.type === 'home' ? '#ff0000' : '#00ff00')
            .pointAltitude(0.1)
            .pointRadius(0.5)
            .onPointClick((point, event, { lat, lng }) => this.onMarkerClick(point));
    }

    setupContentOverlay() {
        const closeBtn = document.getElementById('close-content');
        const overlay = document.getElementById('content-overlay');

        closeBtn.addEventListener('click', () => {
            overlay.classList.add('hidden');
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    }

    onMarkerClick(point) {
        const overlay = document.getElementById('content-overlay');
        const contentBody = document.getElementById('content-body');

        if (point.type === 'home') {
            contentBody.innerHTML = `
                <h2>Welcome Home!</h2>
                <p>This is your home in Toronto, Canada. 🌟</p>
                <p>Fun fact: Toronto is home to the CN Tower!</p>
                <button onclick="alert('Time for a game!')">Play a Game</button>
            `;
        } else if (point.type === 'grandma') {
            contentBody.innerHTML = `
                <h2>Grandma's House!</h2>
                <p>Say hi to Grandma in Dublin, Ireland! 🇮🇪</p>
                <video controls width="400">
                    <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <br><button onclick="alert('Let\'s fly to Grandma!')">Fly to Grandma</button>
            `;
        }

        overlay.classList.remove('hidden');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EarthExplorer();
});
