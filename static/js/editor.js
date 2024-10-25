class Editor {
    constructor() {
        this.editorCanvas = document.getElementById('editor-canvas');
        this.editorContainer = document.getElementById('editor-container');
        this.resultContainer = document.getElementById('result-container');
        this.resultImage = document.getElementById('result-image');
        this.modeToggle = document.getElementById('mode-toggle');
        this.processBtn = document.getElementById('process-btn');
        this.retakeBtn = document.getElementById('retake-btn');
        this.backBtn = document.getElementById('back-btn');
        this.downloadBtn = document.getElementById('download-btn');
        
        // Initialize corners with null to indicate not set
        this.corners = null;
        this.isDragging = false;
        this.selectedCorner = null;
        this.mode = 'color';
        this.originalImage = null;
        this.lastPreview = null;
        this.animationFrame = null;
        this.pulsePhase = 0;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editorCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.editorCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.editorCanvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.editorCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.editorCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.editorCanvas.addEventListener('touchend', () => this.handleMouseUp());
        
        this.modeToggle.addEventListener('click', () => this.toggleMode());
        this.processBtn.addEventListener('click', () => this.processImage());
        this.retakeBtn.addEventListener('click', () => this.retake());
        this.backBtn.addEventListener('click', () => this.back());
    }

    startPulseAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        const animate = () => {
            this.pulsePhase = (this.pulsePhase + 0.05) % (2 * Math.PI);
            this.updatePreview();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopPulseAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    async loadImage(imageData, detectCorners = false) {
        console.log('Loading image...', { detectCorners });
        
        if (!imageData) {
            console.error('No image data provided');
            return;
        }

        this.originalImage = imageData;
        const img = new Image();
        
        try {
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('Image loaded successfully:', {
                        width: img.width,
                        height: img.height
                    });
                    
                    // Set canvas dimensions
                    this.editorCanvas.width = img.width;
                    this.editorCanvas.height = img.height;
                    
                    // Draw the image first
                    const ctx = this.editorCanvas.getContext('2d');
                    ctx.clearRect(0, 0, img.width, img.height);
                    ctx.drawImage(img, 0, 0);
                    
                    // Initialize corners after image is drawn
                    this.corners = [
                        [0, 0],
                        [img.width, 0],
                        [img.width, img.height],
                        [0, img.height]
                    ];
                    
                    console.log('Initial corners set:', this.corners);
                    
                    if (detectCorners) {
                        const formData = new FormData();
                        formData.append('image', imageData);
                        
                        fetch('/process', {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success && data.corners) {
                                console.log('Corners detected:', data.corners);
                                this.corners = data.corners;
                            } else {
                                console.warn('Using default corners - no corners detected from backend');
                            }
                            this.updatePreview();
                        })
                        .catch(error => {
                            console.error('Error detecting corners:', error);
                            this.updatePreview();
                        });
                    } else {
                        this.updatePreview();
                    }
                    
                    resolve();
                };
                
                img.onerror = (error) => {
                    console.error('Error loading image:', error);
                    reject(error);
                };
            });
            
            // Start animation only after successful load
            this.startPulseAnimation();
            
        } catch (error) {
            console.error('Failed to load image:', error);
            alert('Error loading image. Please try again.');
        }
        
        img.src = imageData;
    }

    updatePreview() {
        // Verify canvas and image availability
        if (!this.editorCanvas || !this.originalImage) {
            console.warn('Canvas or original image not available');
            return;
        }

        // Verify corners array
        if (!this.corners || !Array.isArray(this.corners) || this.corners.length !== 4) {
            console.error('Invalid corners array:', this.corners);
            return;
        }

        const ctx = this.editorCanvas.getContext('2d');
        console.log('Updating preview...', {
            mode: this.mode,
            canvasWidth: this.editorCanvas.width,
            canvasHeight: this.editorCanvas.height
        });

        // Clear canvas
        ctx.clearRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);
        
        // Draw original or B&W preview
        const img = new Image();
        img.onload = () => {
            console.log('Preview image loaded', {
                imgWidth: img.width,
                imgHeight: img.height
            });

            try {
                // Draw the image
                if (this.mode === 'bw') {
                    const offscreen = document.createElement('canvas');
                    offscreen.width = img.width;
                    offscreen.height = img.height;
                    const offCtx = offscreen.getContext('2d');
                    
                    offCtx.drawImage(img, 0, 0);
                    
                    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const value = avg > 128 ? 255 : 0;
                        data[i] = data[i + 1] = data[i + 2] = value;
                    }
                    offCtx.putImageData(imageData, 0, 0);
                    
                    ctx.drawImage(offscreen, 0, 0);
                } else {
                    ctx.drawImage(img, 0, 0);
                }

                // Verify all corners are valid before drawing
                const validCorners = this.corners.every(corner => 
                    Array.isArray(corner) && 
                    corner.length === 2 && 
                    typeof corner[0] === 'number' && 
                    typeof corner[1] === 'number'
                );

                if (!validCorners) {
                    console.error('Invalid corner coordinates:', this.corners);
                    return;
                }

                // Draw corners and lines
                ctx.beginPath();
                ctx.moveTo(this.corners[0][0], this.corners[0][1]);
                for (let i = 1; i <= 4; i++) {
                    ctx.lineTo(this.corners[i % 4][0], this.corners[i % 4][1]);
                }
                ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Calculate pulse effect
                const pulseRadius = 15 + Math.sin(this.pulsePhase) * 3;
                
                // Draw corner points with labels
                const labels = ['TL', 'TR', 'BR', 'BL'];
                this.corners.forEach((corner, index) => {
                    ctx.beginPath();
                    ctx.arc(corner[0], corner[1], pulseRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = this.selectedCorner === index ? 'rgba(255, 123, 0, 0.8)' : 'rgba(0, 123, 255, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Draw label
                    ctx.font = '14px Arial';
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(labels[index], corner[0], corner[1]);
                });

            } catch (error) {
                console.error('Error during preview update:', error);
            }
        };
        
        img.onerror = (error) => {
            console.error('Error loading preview image:', error);
        };
        
        img.src = this.originalImage;
    }

    handleMouseDown(e) {
        if (!this.corners) return;
        
        const rect = this.editorCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.editorCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.editorCanvas.height / rect.height);
        
        this.corners.forEach((corner, index) => {
            const dx = corner[0] - x;
            const dy = corner[1] - y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                this.isDragging = true;
                this.selectedCorner = index;
                this.updatePreview();
            }
        });
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.corners) return;
        
        const rect = this.editorCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(this.editorCanvas.width, 
            (e.clientX - rect.left) * (this.editorCanvas.width / rect.width)));
        const y = Math.max(0, Math.min(this.editorCanvas.height,
            (e.clientY - rect.top) * (this.editorCanvas.height / rect.height)));
        
        this.corners[this.selectedCorner] = [x, y];
        this.updatePreview();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.selectedCorner = null;
        this.updatePreview();
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    toggleMode() {
        this.mode = this.mode === 'color' ? 'bw' : 'color';
        this.modeToggle.textContent = this.mode === 'color' ? 'Toggle B&W' : 'Toggle Color';
        this.updatePreview();
    }

    async processImage() {
        if (!this.originalImage || !this.corners) {
            console.error('Missing image or corners for processing');
            return;
        }

        const formData = new FormData();
        formData.append('image', this.originalImage);
        formData.append('corners', JSON.stringify(this.corners));
        formData.append('mode', this.mode);

        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                this.showResult(data.processed_image);
            } else {
                console.error('Processing error:', data.error);
                alert('Error processing image: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing image');
        }
    }

    showResult(processedImage) {
        this.stopPulseAnimation();
        this.editorContainer.classList.add('d-none');
        this.resultContainer.classList.remove('d-none');
        this.resultImage.src = processedImage;
        this.downloadBtn.href = processedImage;
    }

    retake() {
        this.stopPulseAnimation();
        this.corners = null;
        this.originalImage = null;
        this.editorContainer.classList.add('d-none');
        document.getElementById('camera-container').classList.remove('d-none');
    }

    back() {
        this.resultContainer.classList.add('d-none');
        this.editorContainer.classList.remove('d-none');
        this.startPulseAnimation();
    }
}

// Initialize editor when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new Editor();
});
