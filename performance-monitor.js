/**
 * Performance Monitoring Module
 * Tracks and reports performance metrics for optimization
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            loadTime: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            firstInputDelay: 0,
            cumulativeLayoutShift: 0,
            memoryUsage: 0,
            frameRate: 0,
            canvasOperations: 0,
            cacheHitRate: 0
        };
        
        this.observers = [];
        this.startTime = performance.now();
        this.frameCount = 0;
        this.lastFrameTime = this.startTime;
        
        this.init();
    }
    
    init() {
        this.measureLoadTime();
        this.measurePaintMetrics();
        this.measureInteractionMetrics();
        this.measureMemoryUsage();
        this.measureFrameRate();
        this.measureCanvasPerformance();
        this.measureCachePerformance();
        this.setupPerformanceObserver();
    }
    
    measureLoadTime() {
        window.addEventListener('load', () => {
            this.metrics.loadTime = performance.now() - this.startTime;
            this.reportMetric('loadTime', this.metrics.loadTime);
        });
    }
    
    measurePaintMetrics() {
        // First Paint
        if ('PerformanceObserver' in window) {
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    switch (entry.name) {
                        case 'first-paint':
                            this.metrics.firstPaint = entry.startTime;
                            this.reportMetric('firstPaint', entry.startTime);
                            break;
                        case 'first-contentful-paint':
                            this.metrics.firstContentfulPaint = entry.startTime;
                            this.reportMetric('firstContentfulPaint', entry.startTime);
                            break;
                    }
                }
            });
            
            paintObserver.observe({ entryTypes: ['paint'] });
            this.observers.push(paintObserver);
        }
        
        // Largest Contentful Paint
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.largestContentfulPaint = lastEntry.startTime;
                this.reportMetric('largestContentfulPaint', lastEntry.startTime);
            });
            
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(lcpObserver);
        }
    }
    
    measureInteractionMetrics() {
        // First Input Delay
        if ('PerformanceObserver' in window) {
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
                    this.reportMetric('firstInputDelay', this.metrics.firstInputDelay);
                }
            });
            
            fidObserver.observe({ entryTypes: ['first-input'] });
            this.observers.push(fidObserver);
        }
        
        // Cumulative Layout Shift
        if ('PerformanceObserver' in window) {
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        this.metrics.cumulativeLayoutShift += entry.value;
                        this.reportMetric('cumulativeLayoutShift', this.metrics.cumulativeLayoutShift);
                    }
                }
            });
            
            clsObserver.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(clsObserver);
        }
    }
    
    measureMemoryUsage() {
        if ('memory' in performance) {
            const updateMemoryUsage = () => {
                const memory = performance.memory;
                this.metrics.memoryUsage = {
                    used: memory.usedJSHeapSize,
                    total: memory.totalJSHeapSize,
                    limit: memory.jsHeapSizeLimit
                };
                this.reportMetric('memoryUsage', this.metrics.memoryUsage);
            };
            
            updateMemoryUsage();
            setInterval(updateMemoryUsage, 5000); // Update every 5 seconds
        }
    }
    
    measureFrameRate() {
        const measureFrame = (currentTime) => {
            this.frameCount++;
            
            if (currentTime - this.lastFrameTime >= 1000) {
                this.metrics.frameRate = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
                this.reportMetric('frameRate', this.metrics.frameRate);
                
                this.frameCount = 0;
                this.lastFrameTime = currentTime;
            }
            
            requestAnimationFrame(measureFrame);
        };
        
        requestAnimationFrame(measureFrame);
    }
    
    measureCanvasPerformance() {
        let operationCount = 0;
        
        // Monitor canvas operations
        const originalGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(...args) {
            const ctx = originalGetContext.apply(this, args);
            
            if (ctx) {
                // Wrap drawing methods to count operations
                const methods = ['fillRect', 'strokeRect', 'clearRect', 'fill', 'stroke', 'drawImage', 'putImageData'];
                
                methods.forEach(method => {
                    const original = ctx[method];
                    if (original) {
                        ctx[method] = function(...args) {
                            operationCount++;
                            this.metrics.canvasOperations = operationCount;
                            return original.apply(this, args);
                        }.bind(ctx);
                    }
                });
            }
            
            return ctx;
        };
    }
    
    measureCachePerformance() {
        let cacheHits = 0;
        let cacheMisses = 0;
        
        // Monitor Service Worker cache performance
        if ('serviceWorker' in navigator) {
            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                const startTime = performance.now();
                
                try {
                    const response = await originalFetch.apply(this, args);
                    const endTime = performance.now();
                    
                    // Check if response came from cache
                    if (response.headers.get('sw-cache') === 'hit') {
                        cacheHits++;
                    } else {
                        cacheMisses++;
                    }
                    
                    const hitRate = cacheHits / (cacheHits + cacheMisses);
                    this.metrics.cacheHitRate = hitRate;
                    this.reportMetric('cacheHitRate', hitRate);
                    
                    return response;
                } catch (error) {
                    cacheMisses++;
                    throw error;
                }
            };
        }
    }
    
    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.analyzePerformanceEntry(entry);
                }
            });
            
            observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
            this.observers.push(observer);
        }
    }
    
    analyzePerformanceEntry(entry) {
        switch (entry.entryType) {
            case 'navigation':
                this.analyzeNavigationTiming(entry);
                break;
            case 'resource':
                this.analyzeResourceTiming(entry);
                break;
            case 'measure':
                this.analyzeCustomMeasure(entry);
                break;
        }
    }
    
    analyzeNavigationTiming(entry) {
        const timing = {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            request: entry.responseStart - entry.requestStart,
            response: entry.responseEnd - entry.responseStart,
            dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            load: entry.loadEventEnd - entry.loadEventStart
        };
        
        this.reportMetric('navigationTiming', timing);
    }
    
    analyzeResourceTiming(entry) {
        if (entry.duration > 1000) { // Resources taking more than 1 second
            this.reportMetric('slowResource', {
                name: entry.name,
                duration: entry.duration,
                size: entry.transferSize
            });
        }
    }
    
    analyzeCustomMeasure(entry) {
        this.reportMetric('customMeasure', {
            name: entry.name,
            duration: entry.duration
        });
    }
    
    // Custom performance marks and measures
    mark(name) {
        performance.mark(name);
    }
    
    measure(name, startMark, endMark) {
        performance.measure(name, startMark, endMark);
    }
    
    // Report metrics
    reportMetric(name, value) {
        // Send to analytics service
        if (typeof gtag !== 'undefined') {
            gtag('event', 'performance_metric', {
                metric_name: name,
                metric_value: value
            });
        }
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Performance Metric - ${name}:`, value);
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('performance-metric', {
            detail: { name, value }
        }));
    }
    
    // Get performance report
    getPerformanceReport() {
        return {
            ...this.metrics,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
    
    // Performance recommendations
    getRecommendations() {
        const recommendations = [];
        
        if (this.metrics.loadTime > 3000) {
            recommendations.push('Consider optimizing initial load time');
        }
        
        if (this.metrics.firstContentfulPaint > 1500) {
            recommendations.push('First Contentful Paint is slow - optimize critical rendering path');
        }
        
        if (this.metrics.largestContentfulPaint > 2500) {
            recommendations.push('Largest Contentful Paint is slow - optimize largest content element');
        }
        
        if (this.metrics.firstInputDelay > 100) {
            recommendations.push('First Input Delay is high - reduce main thread blocking');
        }
        
        if (this.metrics.cumulativeLayoutShift > 0.1) {
            recommendations.push('High Cumulative Layout Shift - stabilize layout');
        }
        
        if (this.metrics.frameRate < 30) {
            recommendations.push('Low frame rate - optimize rendering performance');
        }
        
        if (this.metrics.cacheHitRate < 0.5) {
            recommendations.push('Low cache hit rate - improve caching strategy');
        }
        
        return recommendations;
    }
    
    // Cleanup
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
    window.performanceMonitor = new PerformanceMonitor();
}

// Export for module usage
if (typeof module !== 'undefined') {
    module.exports = PerformanceMonitor;
}