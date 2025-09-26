/**
 * Lazy Loading Module for Advanced Features
 * Loads non-critical features on demand to improve initial load time
 */

class LazyFeatureLoader {
    constructor() {
        this.loadedFeatures = new Set();
        this.loadingPromises = new Map();
        this.intersectionObserver = null;
        this.setupIntersectionObserver();
    }
    
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const feature = entry.target.dataset.lazyFeature;
                            if (feature) {
                                this.loadFeature(feature);
                                this.intersectionObserver.unobserve(entry.target);
                            }
                        }
                    });
                },
                { rootMargin: '50px' }
            );
        }
    }
    
    // Load feature on demand
    async loadFeature(featureName) {
        if (this.loadedFeatures.has(featureName)) {
            return;
        }
        
        if (this.loadingPromises.has(featureName)) {
            return this.loadingPromises.get(featureName);
        }
        
        const loadPromise = this.performFeatureLoad(featureName);
        this.loadingPromises.set(featureName, loadPromise);
        
        try {
            await loadPromise;
            this.loadedFeatures.add(featureName);
            this.loadingPromises.delete(featureName);
            console.log(`Feature ${featureName} loaded successfully`);
        } catch (error) {
            console.error(`Failed to load feature ${featureName}:`, error);
            this.loadingPromises.delete(featureName);
            throw error;
        }
    }
    
    async performFeatureLoad(featureName) {
        switch (featureName) {
            case 'filters':
                return this.loadFilters();
            case 'layers':
                return this.loadLayers();
            case 'text':
                return this.loadTextTools();
            case 'shapes':
                return this.loadAdvancedShapes();
            case 'export':
                return this.loadExportTools();
            case 'collaboration':
                return this.loadCollaboration();
            case 'ai-tools':
                return this.loadAITools();
            default:
                throw new Error(`Unknown feature: ${featureName}`);
        }
    }
    
    async loadFilters() {
        // Dynamically import filter functionality
        const filterModule = await import('./modules/filters.js');
        return filterModule.initializeFilters();
    }
    
    async loadLayers() {
        // Dynamically import layer management
        const layerModule = await import('./modules/layers.js');
        return layerModule.initializeLayers();
    }
    
    async loadTextTools() {
        // Dynamically import text tools
        const textModule = await import('./modules/text.js');
        return textModule.initializeTextTools();
    }
    
    async loadAdvancedShapes() {
        // Dynamically import advanced shapes
        const shapesModule = await import('./modules/shapes.js');
        return shapesModule.initializeAdvancedShapes();
    }
    
    async loadExportTools() {
        // Dynamically import export functionality
        const exportModule = await import('./modules/export.js');
        return exportModule.initializeExportTools();
    }
    
    async loadCollaboration() {
        // Dynamically import collaboration features
        const collaborationModule = await import('./modules/collaboration.js');
        return collaborationModule.initializeCollaboration();
    }
    
    async loadAITools() {
        // Dynamically import AI-powered tools
        const aiModule = await import('./modules/ai-tools.js');
        return aiModule.initializeAITools();
    }
    
    // Preload feature when user hovers over button
    preloadOnHover(element, featureName) {
        let preloadTimeout;
        
        element.addEventListener('mouseenter', () => {
            preloadTimeout = setTimeout(() => {
                this.loadFeature(featureName).catch(() => {
                    // Silently fail preloading
                });
            }, 500); // Preload after 500ms hover
        });
        
        element.addEventListener('mouseleave', () => {
            clearTimeout(preloadTimeout);
        });
    }
    
    // Load feature when element becomes visible
    observeElement(element, featureName) {
        if (this.intersectionObserver) {
            element.dataset.lazyFeature = featureName;
            this.intersectionObserver.observe(element);
        }
    }
    
    // Load feature on user interaction
    loadOnInteraction(element, featureName, eventType = 'click') {
        element.addEventListener(eventType, () => {
            this.loadFeature(featureName);
        }, { once: true });
    }
    
    // Get loading status
    isFeatureLoaded(featureName) {
        return this.loadedFeatures.has(featureName);
    }
    
    isFeatureLoading(featureName) {
        return this.loadingPromises.has(featureName);
    }
    
    // Get all loaded features
    getLoadedFeatures() {
        return Array.from(this.loadedFeatures);
    }
    
    // Cleanup
    destroy() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        this.loadingPromises.clear();
        this.loadedFeatures.clear();
    }
}

// Feature modules (these would be separate files in a real implementation)
const FilterModule = {
    async initializeFilters() {
        // Simulate loading filter functionality
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add filter buttons to toolbar
        const toolbar = document.querySelector('.toolbar');
        const filterSection = document.createElement('div');
        filterSection.className = 'filter-section';
        filterSection.innerHTML = `
            <div style="width: 30px; height: 1px; background: #555; margin: 10px 0;"></div>
            <button class="tool-btn" data-filter="blur" title="Blur">🌫️</button>
            <button class="tool-btn" data-filter="sharpen" title="Sharpen">🔍</button>
            <button class="tool-btn" data-filter="grayscale" title="Grayscale">⚫</button>
            <button class="tool-btn" data-filter="sepia" title="Sepia">📸</button>
        `;
        
        toolbar.appendChild(filterSection);
        
        // Add event listeners
        filterSection.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyFilter(e.target.dataset.filter);
            });
        });
        
        console.log('Filter module loaded');
    },
    
    async applyFilter(filterType) {
        const canvas = document.getElementById('drawingCanvas');
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use Web Worker for filter processing
        const worker = new Worker('drawing-worker.js');
        
        return new Promise((resolve, reject) => {
            worker.postMessage({
                type: 'APPLY_FILTER',
                data: {
                    imageData,
                    filterType,
                    intensity: 1.0
                },
                id: Date.now()
            });
            
            worker.onmessage = (e) => {
                const { type, result } = e.data;
                
                if (type === 'SUCCESS') {
                    const newImageData = new ImageData(result, imageData.width, imageData.height);
                    ctx.putImageData(newImageData, 0, 0);
                    worker.terminate();
                    resolve();
                } else {
                    worker.terminate();
                    reject(new Error('Filter application failed'));
                }
            };
        });
    }
};

const LayerModule = {
    async initializeLayers() {
        // Simulate loading layer functionality
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add layer panel
        const layerPanel = document.createElement('div');
        layerPanel.className = 'layer-panel';
        layerPanel.innerHTML = `
            <div class="layer-header">
                <h3>Layers</h3>
                <button id="addLayerBtn">+</button>
            </div>
            <div class="layer-list">
                <div class="layer-item active">
                    <span>Layer 1</span>
                    <div class="layer-controls">
                        <button class="visibility-btn">👁️</button>
                        <button class="delete-btn">🗑️</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(layerPanel);
        
        console.log('Layer module loaded');
    }
};

const TextModule = {
    async initializeTextTools() {
        // Simulate loading text functionality
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Add text tool
        const toolbar = document.querySelector('.toolbar');
        const textBtn = document.createElement('button');
        textBtn.className = 'tool-btn';
        textBtn.dataset.tool = 'text';
        textBtn.title = 'Text';
        textBtn.textContent = '📝';
        
        toolbar.appendChild(textBtn);
        
        console.log('Text module loaded');
    }
};

// Export for use in main app
if (typeof window !== 'undefined') {
    window.LazyFeatureLoader = LazyFeatureLoader;
}

// Mock module exports for demonstration
if (typeof module !== 'undefined') {
    module.exports = {
        LazyFeatureLoader,
        FilterModule,
        LayerModule,
        TextModule
    };
}