class Camera {
    constructor() {
        this.video = document.getElementById('video');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.cameraContainer = document.getElementById('camera-container');
        this.editorContainer = document.getElementById('editor-container');
        
        this.stream = null;
        this.videoReady = false;
        
        this.setupCamera();
        this.setupEventListeners();
    }

    async setupCamera() {
        try {
            // First check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API is not supported in this browser');
            }

            // Request camera access with preferred settings
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            
            this.stream = stream;
            this.video.srcObject = stream;
            
            // Set up video ready state handlers
            this.video.onloadeddata = () => {
                this.videoReady = true;
                console.log('Video stream is ready');
            };
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = resolve;
            });
            
            this.video.play();
            
        } catch (err) {
            console.error('Error accessing camera:', err);
            let errorMessage = 'Error accessing camera. ';
            
            if (err.name === 'NotAllowedError') {
                errorMessage += 'Please grant camera permissions and reload the page.';
            } else if (err.name === 'NotFoundError') {
                errorMessage += 'No camera device found.';
            } else {
                errorMessage += 'Please ensure camera permissions are granted and try again.';
            }
            
            alert(errorMessage);
        }
    }

    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.captureImage());
    }

    async captureImage() {
        if (!this.stream || !this.stream.active) {
            console.error('No active video stream available');
            return;
        }

        if (!this.videoReady) {
            console.warn('Waiting for video stream to initialize...');
            return;
        }

        try {
            console.log('Starting image capture process...');
            
            // Set canvas dimensions to match video
            this.previewCanvas.width = this.video.videoWidth;
            this.previewCanvas.height = this.video.videoHeight;
            
            // Draw video frame to canvas
            const ctx = this.previewCanvas.getContext('2d');
            ctx.drawImage(this.video, 0, 0);
            
            // Convert to base64
            const capturedImage = this.previewCanvas.toDataURL('image/jpeg', 0.9);
            
            console.log('Image captured, hiding camera view...');
            // Hide camera view
            this.cameraContainer.classList.add('d-none');
            
            // Wait for a brief moment to ensure DOM updates are complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('Initializing editor with captured image...');
            // Initialize editor with captured image
            if (window.editor) {
                window.editor.loadImage(capturedImage);
                console.log('Editor initialized with captured image successfully');
            } else {
                throw new Error('Editor not initialized');
            }
            
        } catch (error) {
            console.error('Error during image capture:', error);
            alert('Failed to capture image. Please try again.');
            
            // Reset view state
            this.cameraContainer.classList.remove('d-none');
            this.editorContainer.classList.add('d-none');
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.videoReady = false;
    }
}

// Initialize camera when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.camera = new Camera();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.camera) {
        window.camera.stop();
    }
});
