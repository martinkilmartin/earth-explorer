import * as THREE from 'https://cdn.skypack.dev/three@0.150.1';
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3/+esm';

export class EarthRenderer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.earth = null;
        this.isRotating = true;
        this.targetRotation = 0;
        this.continentsData = null;

        this.init();
        this.loadContinentsData();
        this.animate();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 3;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById(this.canvasId), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        // Earth will be created after continents data loads
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    async loadContinentsData() {
        try {
            const response = await fetch('./earth.json');
            this.continentsData = await response.json();
            this.createEarth(); // Create Earth now that data is loaded
        } catch (error) {
            console.error('Failed to load continents data:', error);
            // Fallback to simple continents
            this.continentsData = null;
            this.createEarth();
        }
    }

    createEarth() {
        // Create procedural Earth texture with continents
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Fill with ocean blue
        ctx.fillStyle = '#2233ff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw simple continents (simplified shapes)
        ctx.fillStyle = '#228B22';
        this.drawContinents(ctx);

        const texture = new THREE.CanvasTexture(canvas);

        // Earth geometry and material with texture
        const geometry = new THREE.SphereGeometry(1, 64, 64);
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            shininess: 0.1,
            transparent: true,
            opacity: 0.9
        });

        this.earth = new THREE.Mesh(geometry, material);
        this.scene.add(this.earth);

        // Add atmosphere effect
        this.addAtmosphere();
    }

    drawContinents(ctx) {
        ctx.fillStyle = '#228B22';

        // Convert lat/lon to canvas coordinates
        const latToY = (lat) => (90 - Math.max(-85, Math.min(85, lat))) / 180 * ctx.canvas.height;
        const lonToX = (lon) => (lon + 180) / 360 * ctx.canvas.width;

        if (this.continentsData) {
            // Use world-atlas data
            const continentsGeo = feature(this.continentsData, this.continentsData.objects.land);

            // Draw each continent
            continentsGeo.features.forEach(continent => {
                if (continent.geometry.type === 'Polygon') {
                    continent.geometry.coordinates.forEach(ring => {
                        this.drawPolygon(ctx, ring.map(([lon, lat]) => [lonToX(lon), latToY(lat)]));
                    });
                } else if (continent.geometry.type === 'MultiPolygon') {
                    continent.geometry.coordinates.forEach(polygon => {
                        polygon.forEach(ring => {
                            this.drawPolygon(ctx, ring.map(([lon, lat]) => [lonToX(lon), latToY(lat)]));
                        });
                    });
                }
            });
        } else {
            // Fallback: simple continents
            // North America
            ctx.beginPath();
            ctx.ellipse(400, 320, 160, 120, 0, 0, 2 * Math.PI);
            ctx.fill();

            // South America
            ctx.beginPath();
            ctx.ellipse(480, 560, 60, 200, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Africa
            ctx.beginPath();
            ctx.ellipse(1000, 480, 80, 240, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Europe
            ctx.beginPath();
            ctx.ellipse(960, 280, 100, 60, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Asia
            ctx.beginPath();
            ctx.ellipse(1400, 280, 320, 160, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Australia
            ctx.beginPath();
            ctx.ellipse(1680, 640, 100, 60, 0, 0, 2 * Math.PI);
            ctx.fill();

            // Antarctica
            ctx.beginPath();
            ctx.ellipse(1024, 880, 960, 80, 0, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    drawPolygon(ctx, points) {
        if (points.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.closePath();
        ctx.fill();
    }

    addAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(1.1, 64, 64);
        const atmosphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.earth && this.isRotating) {
            this.earth.rotation.y += 0.005;
        }

        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    rotate() {
        this.isRotating = !this.isRotating;
    }

    zoomIn() {
        if (this.camera.position.z > 1.5) {
            this.camera.position.z -= 0.2;
        }
    }

    zoomOut() {
        if (this.camera.position.z < 5) {
            this.camera.position.z += 0.2;
        }
    }

    resetView() {
        this.camera.position.set(0, 0, 3);
        this.camera.lookAt(0, 0, 0);
        this.isRotating = true;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
