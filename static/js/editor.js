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
        this.editorCanvas.addEventListener('mouseleave', () => this.handleMouseUp());
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
        console.log('Loading image...', { 
            detectCorners,
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
            await new Promise((resolve, reject) => {
                img.onload = () => {
                    console.log('Image loaded successfully:', {
                        width: img.width,
                        height: img.height,
                        aspectRatio: (img.width / img.height).toFixed(2)
                    });
                    
                    // Set canvas dimensions
                    this.editorCanvas.width = img.width;
                    this.editorCanvas.height = img.height;
                    
                    // Draw the image first
                    const ctx = this.editorCanvas.getContext('2d');
                    ctx.clearRect(0, 0, img.width, img.height);
                    ctx.drawImage(img, 0, 0);
                    
                    // Initialize corners with proper margin
                    const margin = Math.min(img.width, img.height) * 0.1;
                    this.corners = [
                        [margin, margin], // Top-left
                        [img.width - margin, margin], // Top-right
                        [img.width - margin, img.height - margin], // Bottom-right
                        [margin, img.height - margin] // Bottom-left
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
                                // Validate detected corners
                                if (this.validateCorners(data.corners)) {
                                    this.corners = data.corners;
                                } else {
                                    console.warn('Detected corners invalid, using default corners');
                                }
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

    validateCorners(corners) {
        if (!Array.isArray(corners) || corners.length !== 4) {
            return false;
        }
        
        // Check each corner is valid and within bounds
        return corners.every(corner => 
            Array.isArray(corner) && 
            corner.length === 2 &&
            typeof corner[0] === 'number' &&
            typeof corner[1] === 'number' &&
            corner[0] >= 0 &&
            corner[0] <= this.editorCanvas.width &&
            corner[1] >= 0 &&
            corner[1] <= this.editorCanvas.height
        );
    }

    updatePreview() {
        // Verify canvas and image availability
        if (!this.editorCanvas || !this.originalImage) {
            console.warn('Canvas or original image not available');
            return;
        }

        // Verify corners array
        if (!this.validateCorners(this.corners)) {
            console.error('Invalid corners array:', this.corners);
            return;
        }

        const ctx = this.editorCanvas.getContext('2d');
        console.log('Updating preview...', {
            mode: this.mode,
            canvasWidth: this.editorCanvas.width,
            canvasHeight: this.editorCanvas.height,
            corners: this.corners
        });

        // Clear canvas
        ctx.clearRect(0, 0, this.editorCanvas.width, this.editorCanvas.height);
        
        // Draw original or B&W preview
        const img = new Image();
        img.onload = () => {
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

                // Draw semi-transparent document area
                ctx.beginPath();
                ctx.moveTo(this.corners[0][0], this.corners[0][1]);
                for (let i = 1; i <= 4; i++) {
                    ctx.lineTo(this.corners[i % 4][0], this.corners[i % 4][1]);
                }
                ctx.closePath();
                
                // Fill with semi-transparent blue
                ctx.fillStyle = 'rgba(0, 123, 255, 0.2)';
                ctx.fill();
                
                // Draw border lines
                ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.stroke();

                // Draw corner points with enhanced visibility
                const cornerRadius = this.isDragging ? 25 : 20;
                const pulseEffect = this.isDragging ? 0 : Math.sin(this.pulsePhase) * 5;
                
                const labels = ['TL', 'TR', 'BR', 'BL'];
                this.corners.forEach((corner, index) => {
                    const radius = (this.selectedCorner === index ? cornerRadius + 5 : cornerRadius) + pulseEffect;
                    
                    // Draw larger highlight circle
                    ctx.beginPath();
                    ctx.arc(corner[0], corner[1], radius + 3, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fill();
                    
                    // Draw corner point
                    ctx.beginPath();
                    ctx.arc(corner[0], corner[1], radius, 0, 2 * Math.PI);
                    ctx.fillStyle = this.selectedCorner === index ? 
                        'rgba(255, 123, 0, 0.8)' : 
                        'rgba(0, 123, 255, 0.8)';
                    ctx.fill();
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    // Draw label with enhanced visibility
                    ctx.font = 'bold 16px Arial';
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
        
        // Use larger hit area for better touch interaction
        const hitRadius = 25;
        
        this.corners.forEach((corner, index) => {
            const dx = corner[0] - x;
            const dy = corner[1] - y;
            if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                this.isDragging = true;
                this.selectedCorner = index;
                console.log('Corner selected:', { index, position: corner });
                this.updatePreview();
            }
        });
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.corners) return;
        
        const rect = this.editorCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.editorCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.editorCanvas.height / rect.height);
        
        // Apply bounds checking with small margin
        const margin = 10;
        const newX = Math.max(margin, Math.min(this.editorCanvas.width - margin, x));
        const newY = Math.max(margin, Math.min(this.editorCanvas.height - margin, y));
        
        // Update corner position
        this.corners[this.selectedCorner] = [newX, newY];
        console.log('Corner moved:', {
            index: this.selectedCorner,
            position: [newX, newY]
        });
        
        // Update preview immediately
        this.updatePreview();
    }

    handleMouseUp() {
        if (this.isDragging) {
            console.log('Corner drag ended:', {
                index: this.selectedCorner,
                finalPosition: this.corners[this.selectedCorner]
            });
        }
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
        console.log('Mode toggled:', this.mode);
        this.updatePreview();
    }

    async processImage() {
        if (!this.originalImage || !this.validateCorners(this.corners)) {
            console.error('Missing image or invalid corners for processing');
            return;
        }

        const formData = new FormData();
        formData.append('image', this.originalImage);
        formData.append('corners', JSON.stringify(this.corners));
        formData.append('mode', this.mode);

        try {
            console.log('Processing image...', {
                corners: this.corners,
                mode: this.mode
            });
            
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
