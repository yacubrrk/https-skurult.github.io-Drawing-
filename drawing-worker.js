/**
 * Web Worker for heavy drawing computations
 * Handles image processing, filters, and complex operations
 */

class DrawingWorker {
    constructor() {
        this.setupMessageHandler();
    }
    
    setupMessageHandler() {
        self.onmessage = (e) => {
            const { type, data, id } = e.data;
            
            try {
                let result;
                
                switch (type) {
                    case 'APPLY_FILTER':
                        result = this.applyFilter(data);
                        break;
                    case 'RESIZE_IMAGE':
                        result = this.resizeImage(data);
                        break;
                    case 'CONVERT_FORMAT':
                        result = this.convertFormat(data);
                        break;
                    case 'COMPRESS_IMAGE':
                        result = this.compressImage(data);
                        break;
                    case 'DETECT_EDGES':
                        result = this.detectEdges(data);
                        break;
                    case 'BLUR_IMAGE':
                        result = this.blurImage(data);
                        break;
                    case 'SHARPEN_IMAGE':
                        result = this.sharpenImage(data);
                        break;
                    default:
                        throw new Error(`Unknown operation: ${type}`);
                }
                
                self.postMessage({
                    type: 'SUCCESS',
                    id,
                    result
                });
                
            } catch (error) {
                self.postMessage({
                    type: 'ERROR',
                    id,
                    error: error.message
                });
            }
        };
    }
    
    applyFilter(data) {
        const { imageData, filterType, intensity = 1.0 } = data;
        const { data: pixels, width, height } = imageData;
        const newPixels = new Uint8ClampedArray(pixels);
        
        switch (filterType) {
            case 'GRAYSCALE':
                return this.applyGrayscale(newPixels);
            case 'SEPIA':
                return this.applySepia(newPixels, intensity);
            case 'INVERT':
                return this.applyInvert(newPixels);
            case 'BRIGHTNESS':
                return this.applyBrightness(newPixels, intensity);
            case 'CONTRAST':
                return this.applyContrast(newPixels, intensity);
            default:
                throw new Error(`Unknown filter: ${filterType}`);
        }
    }
    
    applyGrayscale(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
            pixels[i] = gray;     // R
            pixels[i + 1] = gray; // G
            pixels[i + 2] = gray; // B
            // Alpha channel remains unchanged
        }
        return pixels;
    }
    
    applySepia(pixels, intensity) {
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            
            pixels[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189)) * intensity + r * (1 - intensity);
            pixels[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168)) * intensity + g * (1 - intensity);
            pixels[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131)) * intensity + b * (1 - intensity);
        }
        return pixels;
    }
    
    applyInvert(pixels) {
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = 255 - pixels[i];         // R
            pixels[i + 1] = 255 - pixels[i + 1]; // G
            pixels[i + 2] = 255 - pixels[i + 2]; // B
            // Alpha channel remains unchanged
        }
        return pixels;
    }
    
    applyBrightness(pixels, intensity) {
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.max(0, Math.min(255, pixels[i] + intensity * 255));
            pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + intensity * 255));
            pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + intensity * 255));
        }
        return pixels;
    }
    
    applyContrast(pixels, intensity) {
        const factor = (259 * (intensity * 255 + 255)) / (255 * (259 - intensity * 255));
        
        for (let i = 0; i < pixels.length; i += 4) {
            pixels[i] = Math.max(0, Math.min(255, factor * (pixels[i] - 128) + 128));
            pixels[i + 1] = Math.max(0, Math.min(255, factor * (pixels[i + 1] - 128) + 128));
            pixels[i + 2] = Math.max(0, Math.min(255, factor * (pixels[i + 2] - 128) + 128));
        }
        return pixels;
    }
    
    resizeImage(data) {
        const { imageData, newWidth, newHeight } = data;
        const { data: pixels, width, height } = imageData;
        
        const newPixels = new Uint8ClampedArray(newWidth * newHeight * 4);
        const xRatio = width / newWidth;
        const yRatio = height / newHeight;
        
        for (let y = 0; y < newHeight; y++) {
            for (let x = 0; x < newWidth; x++) {
                const sourceX = Math.floor(x * xRatio);
                const sourceY = Math.floor(y * yRatio);
                
                const sourceIndex = (sourceY * width + sourceX) * 4;
                const targetIndex = (y * newWidth + x) * 4;
                
                newPixels[targetIndex] = pixels[sourceIndex];
                newPixels[targetIndex + 1] = pixels[sourceIndex + 1];
                newPixels[targetIndex + 2] = pixels[sourceIndex + 2];
                newPixels[targetIndex + 3] = pixels[sourceIndex + 3];
            }
        }
        
        return {
            data: newPixels,
            width: newWidth,
            height: newHeight
        };
    }
    
    convertFormat(data) {
        const { imageData, format, quality = 0.9 } = data;
        
        // Create a temporary canvas to convert formats
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        
        ctx.putImageData(imageData, 0, 0);
        
        switch (format) {
            case 'JPEG':
                return canvas.convertToBlob({ type: 'image/jpeg', quality });
            case 'WEBP':
                return canvas.convertToBlob({ type: 'image/webp', quality });
            case 'PNG':
                return canvas.convertToBlob({ type: 'image/png' });
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    
    compressImage(data) {
        const { imageData, quality = 0.8 } = data;
        
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        
        ctx.putImageData(imageData, 0, 0);
        
        return canvas.convertToBlob({ 
            type: 'image/jpeg', 
            quality 
        });
    }
    
    detectEdges(data) {
        const { imageData } = data;
        const { data: pixels, width, height } = imageData;
        const newPixels = new Uint8ClampedArray(pixels);
        
        // Sobel edge detection
        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        const gray = pixels[pixelIndex] * 0.299 + pixels[pixelIndex + 1] * 0.587 + pixels[pixelIndex + 2] * 0.114;
                        
                        gx += gray * sobelX[(ky + 1) * 3 + (kx + 1)];
                        gy += gray * sobelY[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edgeValue = Math.min(255, magnitude);
                
                const index = (y * width + x) * 4;
                newPixels[index] = edgeValue;
                newPixels[index + 1] = edgeValue;
                newPixels[index + 2] = edgeValue;
                newPixels[index + 3] = 255;
            }
        }
        
        return newPixels;
    }
    
    blurImage(data) {
        const { imageData, radius = 5 } = data;
        const { data: pixels, width, height } = imageData;
        const newPixels = new Uint8ClampedArray(pixels);
        
        // Simple box blur
        for (let y = radius; y < height - radius; y++) {
            for (let x = radius; x < width - radius; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                let count = 0;
                
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const index = ((y + ky) * width + (x + kx)) * 4;
                        r += pixels[index];
                        g += pixels[index + 1];
                        b += pixels[index + 2];
                        a += pixels[index + 3];
                        count++;
                    }
                }
                
                const index = (y * width + x) * 4;
                newPixels[index] = r / count;
                newPixels[index + 1] = g / count;
                newPixels[index + 2] = b / count;
                newPixels[index + 3] = a / count;
            }
        }
        
        return newPixels;
    }
    
    sharpenImage(data) {
        const { imageData, intensity = 1.0 } = data;
        const { data: pixels, width, height } = imageData;
        const newPixels = new Uint8ClampedArray(pixels);
        
        // Unsharp mask kernel
        const kernel = [
            0, -intensity, 0,
            -intensity, 1 + 4 * intensity, -intensity,
            0, -intensity, 0
        ];
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let r = 0, g = 0, b = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                        const kernelValue = kernel[(ky + 1) * 3 + (kx + 1)];
                        
                        r += pixels[pixelIndex] * kernelValue;
                        g += pixels[pixelIndex + 1] * kernelValue;
                        b += pixels[pixelIndex + 2] * kernelValue;
                    }
                }
                
                const index = (y * width + x) * 4;
                newPixels[index] = Math.max(0, Math.min(255, r));
                newPixels[index + 1] = Math.max(0, Math.min(255, g));
                newPixels[index + 2] = Math.max(0, Math.min(255, b));
                newPixels[index + 3] = pixels[index + 3];
            }
        }
        
        return newPixels;
    }
}

// Initialize the worker
new DrawingWorker();