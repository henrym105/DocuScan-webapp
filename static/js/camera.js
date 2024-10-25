class Camera {
    constructor() {
        this.video = document.getElementById('video');
        this.previewCanvas = document.getElementById('preview-canvas');
        this.captureBtn = document.getElementById('capture-btn');
        this.cameraContainer = document.getElementById('camera-container');
        this.editorContainer = document.getElementById('editor-container');
        
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
            this.video.srcObject = stream;
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Error accessing camera. Please ensure camera permissions are granted.');
        }
    }

    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.captureImage());
    }

    captureImage() {
        // Set canvas dimensions to match video
        this.previewCanvas.width = this.video.videoWidth;
        this.previewCanvas.height = this.video.videoHeight;
        
        // Draw video frame to canvas
        const ctx = this.previewCanvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        // Convert to base64
        const imageData = this.previewCanvas.toDataURL('image/jpeg');
        
        // Show editor
        this.cameraContainer.classList.add('d-none');
        this.editorContainer.classList.remove('d-none');
        
        // Initialize editor with captured image
        window.editor.loadImage(imageData);
    }
}

// Initialize camera when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.camera = new Camera();
});
