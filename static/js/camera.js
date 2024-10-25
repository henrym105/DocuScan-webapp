class Camera {
    constructor() {
        this.video = document.getElementById('video');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.cameraContainer = document.getElementById('camera-container');
        this.editorContainer = document.getElementById('editor-container');
        
        this.stream = null;
        
        this.setupCamera();
        this.setupEventListeners();
    }

    async setupCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });
            this.stream = stream;
            this.video.srcObject = stream;
            
            console.log('Camera setup successful', {
                tracks: stream.getTracks().length,
                settings: stream.getTracks()[0].getSettings()
            });
            
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please ensure camera permissions are granted.');
        }
    }

    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.captureImage());
    }

    async captureImage() {
        // Verify video stream is active
        if (!this.stream || !this.stream.active) {
            console.error('No active video stream available');
            return;
        }

        // Verify video is playing
        if (this.video.readyState !== 4) {
            console.warn('Video is not ready yet');
            return;
        }

        try {
            console.log('Capturing image...', {
                videoWidth: this.video.videoWidth,
                videoHeight: this.video.videoHeight
            });

            // Set canvas dimensions to match video
            this.previewCanvas.width = this.video.videoWidth;
            this.previewCanvas.height = this.video.videoHeight;
            
            // Draw video frame to canvas
            const ctx = this.previewCanvas.getContext('2d');
            ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            ctx.drawImage(this.video, 0, 0);
            
            // Convert to base64
            const capturedImage = this.previewCanvas.toDataURL('image/jpeg');
            
            console.log('Image captured successfully');
            
            // Hide camera view and pass image to editor
            this.cameraContainer.classList.add('d-none');
            
            // Initialize editor with captured image
            if (window.editor) {
                window.editor.loadImage(capturedImage);
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
