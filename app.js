/**
 * High-Performance Drawing Application
 * Optimized for bundle size, load times, and rendering performance
 */

class OptimizedDrawingApp {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.lastX = 0;
        this.lastY = 0;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        // Performance optimization flags
        this.useOffscreenCanvas = false;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.rafId = null;
        this.pendingDraw = false;
        
        // Touch and mouse event handling
        this.touchEvents = this.getTouchEvents();
        this.mouseEvents = this.getMouseEvents();
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupPerformanceOptimizations();
        this.hideLoadingIndicator();
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d', {
            alpha: false, // Disable alpha for better performance
            desynchronized: true // Allow canvas to be desynchronized from DOM
        });
        
        // Set canvas size with device pixel ratio optimization
        this.resizeCanvas();
        window.addEventListener('resize', this.debounce(() => this.resizeCanvas(), 100));
        
        // Initialize canvas with white background
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Setup offscreen canvas for complex operations
        if (typeof OffscreenCanvas !== 'undefined') {
            this.useOffscreenCanvas = true;
            this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
            this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        }
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        // Set display size
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Set actual size with device pixel ratio
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(dpr, dpr);
        
        // Update offscreen canvas if available
        if (this.useOffscreenCanvas) {
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }
        
        // Redraw current state
        this.redraw();
    }
    
    setupEventListeners() {
        // Tool selection
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.dataset.tool);
                this.updateToolButtons();
            });
        });
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        // Brush size
        document.getElementById('brushSize').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
        });
        
        // Action buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCanvas());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveCanvas());
        
        // Drawing events
        this.addDrawingEvents();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    addDrawingEvents() {
        const events = [
            ...this.mouseEvents,
            ...this.touchEvents
        ];
        
        events.forEach(({ event, handler }) => {
            this.canvas.addEventListener(event, handler, { passive: false });
        });
    }
    
    getMouseEvents() {
        return [
            {
                event: 'mousedown',
                handler: (e) => this.startDrawing(this.getMousePos(e))
            },
            {
                event: 'mousemove',
                handler: (e) => this.draw(this.getMousePos(e))
            },
            {
                event: 'mouseup',
                handler: () => this.stopDrawing()
            },
            {
                event: 'mouseout',
                handler: () => this.stopDrawing()
            }
        ];
    }
    
    getTouchEvents() {
        return [
            {
                event: 'touchstart',
                handler: (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    this.startDrawing(this.getTouchPos(touch));
                }
            },
            {
                event: 'touchmove',
                handler: (e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    this.draw(this.getTouchPos(touch));
                }
            },
            {
                event: 'touchend',
                handler: (e) => {
                    e.preventDefault();
                    this.stopDrawing();
                }
            }
        ];
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    getTouchPos(touch) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
    
    startDrawing(pos) {
        this.isDrawing = true;
        this.lastX = pos.x;
        this.lastY = pos.y;
        
        // Save state for undo
        this.saveState();
        
        // Start drawing based on tool
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
    }
    
    draw(pos) {
        if (!this.isDrawing) return;
        
        // Use requestAnimationFrame for smooth drawing
        if (!this.pendingDraw) {
            this.pendingDraw = true;
            this.rafId = requestAnimationFrame(() => {
                this.performDraw(pos);
                this.pendingDraw = false;
            });
        }
    }
    
    performDraw(pos) {
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.currentColor;
        
        switch (this.currentTool) {
            case 'pen':
                this.drawPen(pos);
                break;
            case 'eraser':
                this.drawEraser(pos);
                break;
            case 'line':
                this.drawLine(pos);
                break;
            case 'rectangle':
                this.drawRectangle(pos);
                break;
            case 'circle':
                this.drawCircle(pos);
                break;
        }
        
        this.lastX = pos.x;
        this.lastY = pos.y;
    }
    
    drawPen(pos) {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    drawEraser(pos) {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    drawLine(pos) {
        // Redraw previous state
        this.redraw();
        
        // Draw new line
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }
    
    drawRectangle(pos) {
        // Redraw previous state
        this.redraw();
        
        // Draw new rectangle
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.rect(this.lastX, this.lastY, pos.x - this.lastX, pos.y - this.lastY);
        this.ctx.stroke();
    }
    
    drawCircle(pos) {
        // Redraw previous state
        this.redraw();
        
        // Draw new circle
        const radius = Math.sqrt(Math.pow(pos.x - this.lastX, 2) + Math.pow(pos.y - this.lastY, 2));
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.beginPath();
        this.ctx.arc(this.lastX, this.lastY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }
    
    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.ctx.globalCompositeOperation = 'source-over';
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
    }
    
    updateToolButtons() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
    }
    
    saveState() {
        // Remove any states after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new state
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(imageData);
        this.historyIndex++;
        
        // Limit history size for memory optimization
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.redraw();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.redraw();
        }
    }
    
    redraw() {
        if (this.historyIndex >= 0 && this.history[this.historyIndex]) {
            this.ctx.putImageData(this.history[this.historyIndex], 0, 0);
        }
    }
    
    clearCanvas() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }
    
    saveCanvas() {
        // Create download link
        const link = document.createElement('a');
        link.download = `drawing-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png', 1.0);
        link.click();
    }
    
    handleKeyboard(e) {
        // Keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    this.saveCanvas();
                    break;
            }
        }
        
        // Tool shortcuts
        switch (e.key) {
            case 'p':
                this.selectTool('pen');
                this.updateToolButtons();
                break;
            case 'e':
                this.selectTool('eraser');
                this.updateToolButtons();
                break;
            case 'l':
                this.selectTool('line');
                this.updateToolButtons();
                break;
            case 'r':
                this.selectTool('rectangle');
                this.updateToolButtons();
                break;
            case 'c':
                this.selectTool('circle');
                this.updateToolButtons();
                break;
        }
    }
    
    setupPerformanceOptimizations() {
        // Enable hardware acceleration hints
        this.canvas.style.willChange = 'transform';
        
        // Optimize context settings
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
    }
    
    setupPerformanceMonitoring() {
        // Monitor frame rate
        let lastTime = performance.now();
        let frameCount = 0;
        
        const monitorPerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                console.log(`Drawing FPS: ${fps}`);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitorPerformance);
        };
        
        requestAnimationFrame(monitorPerformance);
    }
    
    hideLoadingIndicator() {
        const loading = document.getElementById('loadingIndicator');
        if (loading) {
            loading.style.display = 'none';
        }
    }
    
    // Utility function for debouncing
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptimizedDrawingApp();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizedDrawingApp;
}