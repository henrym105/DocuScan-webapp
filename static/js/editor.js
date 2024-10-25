class Editor {
    constructor() {
        this.editorCanvas = document.getElementById('editor-canvas');
        this.editorContainer = document.getElementById('editor-container');
        this.resultContainer = document.getElementById('result-container');
        this.resultImage = document.getElementById('result-image');
        this.retakeBtn = document.getElementById('retake-btn');
        
        this.originalImage = null;
        this.corners = null;
        this.isDragging = false;
        this.selectedCorner = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.retakeBtn.addEventListener('click', () => this.retake());
        
        // Add mouse/touch event listeners for corner dragging
        document.addEventListener('mousemove', (e) => this.handleCornerDrag(e));
        document.addEventListener('mouseup', () => this.handleCornerDragEnd());
        document.addEventListener('touchmove', (e) => this.handleCornerDrag(e.touches[0]));
        document.addEventListener('touchend', () => this.handleCornerDragEnd());
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
                
                // Initialize corner points
                this.corners = [
                    [0, 0],                    // Top-left
                    [img.width, 0],            // Top-right
                    [img.width, img.height],   // Bottom-right
                    [0, img.height]            // Bottom-left
                ];
                
                console.log('Corner points initialized:', this.corners);
                
                // Draw corner points and overlay
                this.drawCornerPoints();
                
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

    drawCornerPoints() {
        // Clear any existing corner points
        this.removeCornerPoints();
        
        // Create a container for corner points that's positioned relative to the canvas
        const cornerContainer = document.createElement('div');
        cornerContainer.style.position = 'absolute';
        cornerContainer.style.top = this.editorCanvas.offsetTop + 'px';
        cornerContainer.style.left = this.editorCanvas.offsetLeft + 'px';
        cornerContainer.style.width = this.editorCanvas.width + 'px';
        cornerContainer.style.height = this.editorCanvas.height + 'px';
        cornerContainer.id = 'corner-container';
        
        // Draw the semi-transparent overlay
        const overlay = document.createElement('canvas');
        overlay.width = this.editorCanvas.width;
        overlay.height = this.editorCanvas.height;
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        
        const ctx = overlay.getContext('2d');
        ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
        ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Draw the polygon
        ctx.beginPath();
        ctx.moveTo(this.corners[0][0], this.corners[0][1]);
        for (let i = 1; i < this.corners.length; i++) {
            ctx.lineTo(this.corners[i][0], this.corners[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        cornerContainer.appendChild(overlay);
        
        // Add corner points
        const labels = ['TL', 'TR', 'BR', 'BL'];
        this.corners.forEach((corner, index) => {
            const point = document.createElement('div');
            point.className = 'corner-point';
            point.style.left = corner[0] + 'px';
            point.style.top = corner[1] + 'px';
            point.setAttribute('data-index', index);
            
            // Add label
            point.innerHTML = `<span class="corner-label">${labels[index]}</span>`;
            
            // Add event listeners for dragging
            point.addEventListener('mousedown', (e) => this.handleCornerDragStart(e, index));
            point.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleCornerDragStart(e.touches[0], index);
            });
            
            cornerContainer.appendChild(point);
        });
        
        this.editorContainer.appendChild(cornerContainer);
        console.log('Corner points drawn');
    }

    removeCornerPoints() {
        const existingContainer = document.getElementById('corner-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    handleCornerDragStart(event, cornerIndex) {
        this.isDragging = true;
        this.selectedCorner = cornerIndex;
        console.log('Corner drag started:', { cornerIndex });
    }

    handleCornerDrag(event) {
        if (!this.isDragging || this.selectedCorner === null) return;

        const rect = this.editorCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(this.editorCanvas.width, 
            event.clientX - rect.left));
        const y = Math.max(0, Math.min(this.editorCanvas.height,
            event.clientY - rect.top));

        this.corners[this.selectedCorner] = [x, y];
        console.log('Corner dragged:', { index: this.selectedCorner, x, y });
        
        this.drawCornerPoints();
    }

    handleCornerDragEnd() {
        if (this.isDragging) {
            console.log('Corner drag ended:', { 
                index: this.selectedCorner,
                finalPosition: this.corners[this.selectedCorner]
            });
        }
        this.isDragging = false;
        this.selectedCorner = null;
    }

    retake() {
        this.originalImage = null;
        this.corners = null;
        this.removeCornerPoints();
        this.editorContainer.classList.add('d-none');
        document.getElementById('camera-container').classList.remove('d-none');
    }
}

// Initialize editor when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new Editor();
});
