class Editor {
    constructor() {
        this.editorCanvas = document.getElementById('editor-canvas');
        this.editorContainer = document.getElementById('editor-container');
        this.resultContainer = document.getElementById('result-container');
        this.resultImage = document.getElementById('result-image');
        this.retakeBtn = document.getElementById('retake-btn');
        
        this.originalImage = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.retakeBtn.addEventListener('click', () => this.retake());
    }

    loadImage(imageData) {
        console.log('Loading image...', {
            imageDataLength: imageData?.length,
            hasData: !!imageData
        });
        
        if (!imageData) {
            console.error('No image data provided');
            return;
        }

        this.originalImage = imageData;
        const img = new Image();
        
        try {
            img.onload = () => {
                console.log('Image loaded successfully:', {
                    width: img.width,
                    height: img.height,
                    aspectRatio: (img.width / img.height).toFixed(2)
                });
                
                // Set canvas dimensions
                this.editorCanvas.width = img.width;
                this.editorCanvas.height = img.height;
                
                // Draw the image
                const ctx = this.editorCanvas.getContext('2d');
                ctx.clearRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
                
                // Show editor container
                this.editorContainer.classList.remove('d-none');
            };
            
            img.onerror = (error) => {
                console.error('Error loading image:', error);
                alert('Error loading image. Please try again.');
            };
            
            img.src = imageData;
            
        } catch (error) {
            console.error('Failed to load image:', error);
            alert('Error loading image. Please try again.');
        }
    }

    retake() {
        this.originalImage = null;
        this.editorContainer.classList.add('d-none');
        document.getElementById('camera-container').classList.remove('d-none');
    }
}

// Initialize editor when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new Editor();
});
