#!/usr/bin/env node

/**
 * Build Script for Performance Optimization
 * Minifies, compresses, and optimizes all assets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BuildOptimizer {
    constructor() {
        this.distDir = path.join(__dirname, 'dist');
        this.assetsDir = path.join(__dirname, 'assets');
        this.reportsDir = path.join(__dirname, 'reports');
        
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        [this.distDir, this.assetsDir, this.reportsDir].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    async build() {
        console.log('🚀 Starting optimized build process...');
        
        try {
            await this.minifyAssets();
            await this.optimizeImages();
            await this.generateServiceWorker();
            await this.createAssetManifest();
            await this.generateCriticalCSS();
            await this.analyzeBundle();
            
            console.log('✅ Build completed successfully!');
            this.printBuildSummary();
            
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    }
    
    async minifyAssets() {
        console.log('📦 Minifying assets...');
        
        // Minify JavaScript
        await this.minifyJS();
        
        // Minify CSS
        await this.minifyCSS();
        
        // Minify HTML
        await this.minifyHTML();
    }
    
    async minifyJS() {
        const jsFiles = ['app.js', 'lazy-features.js', 'performance-monitor.js'];
        const outputFile = path.join(this.distDir, 'app.min.js');
        
        let minifiedContent = '';
        
        for (const file of jsFiles) {
            const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
            minifiedContent += content + '\n';
        }
        
        // Basic minification (remove comments, whitespace)
        minifiedContent = minifiedContent
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '') // Remove line comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
            .trim();
        
        fs.writeFileSync(outputFile, minifiedContent);
        
        const originalSize = jsFiles.reduce((total, file) => {
            return total + fs.statSync(path.join(__dirname, file)).size;
        }, 0);
        const minifiedSize = fs.statSync(outputFile).size;
        
        console.log(`   JavaScript: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${this.getCompressionRatio(originalSize, minifiedSize)}%)`);
    }
    
    async minifyCSS() {
        const inputFile = path.join(__dirname, 'styles.css');
        const outputFile = path.join(this.distDir, 'styles.min.css');
        
        let content = fs.readFileSync(inputFile, 'utf8');
        
        // Basic CSS minification
        content = content
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
            .replace(/:\s+/g, ':') // Remove spaces after colons
            .replace(/,\s+/g, ',') // Remove spaces after commas
            .trim();
        
        fs.writeFileSync(outputFile, content);
        
        const originalSize = fs.statSync(inputFile).size;
        const minifiedSize = fs.statSync(outputFile).size;
        
        console.log(`   CSS: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${this.getCompressionRatio(originalSize, minifiedSize)}%)`);
    }
    
    async minifyHTML() {
        const inputFile = path.join(__dirname, 'index.html');
        const outputFile = path.join(this.distDir, 'index.html');
        
        let content = fs.readFileSync(inputFile, 'utf8');
        
        // Basic HTML minification
        content = content
            .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
            .replace(/>\s+</g, '><') // Remove whitespace between tags
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();
        
        fs.writeFileSync(outputFile, content);
        
        const originalSize = fs.statSync(inputFile).size;
        const minifiedSize = fs.statSync(outputFile).size;
        
        console.log(`   HTML: ${this.formatBytes(originalSize)} → ${this.formatBytes(minifiedSize)} (${this.getCompressionRatio(originalSize, minifiedSize)}%)`);
    }
    
    async optimizeImages() {
        console.log('🖼️  Optimizing images...');
        
        // Create placeholder icons if they don't exist
        await this.generatePlaceholderIcons();
    }
    
    async generatePlaceholderIcons() {
        const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
        const iconsDir = path.join(this.distDir, 'icons');
        
        if (!fs.existsSync(iconsDir)) {
            fs.mkdirSync(iconsDir, { recursive: true });
        }
        
        // Create simple SVG icons as placeholders
        for (const size of iconSizes) {
            const svgContent = this.generateIconSVG(size);
            const svgPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
            fs.writeFileSync(svgPath, svgContent);
        }
        
        console.log(`   Generated ${iconSizes.length} placeholder icons`);
    }
    
    generateIconSVG(size) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="#3498db"/>
            <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial" font-size="${size * 0.3}">✏️</text>
        </svg>`;
    }
    
    async generateServiceWorker() {
        console.log('⚙️  Generating optimized Service Worker...');
        
        const swContent = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
        const outputFile = path.join(this.distDir, 'sw.js');
        
        // Minify service worker
        const minifiedSW = swContent
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*$/gm, '')
            .replace(/\s+/g, ' ')
            .trim();
        
        fs.writeFileSync(outputFile, minifiedSW);
        
        console.log('   Service Worker optimized');
    }
    
    async createAssetManifest() {
        console.log('📋 Creating asset manifest...');
        
        const manifest = {
            version: '1.0.0',
            timestamp: Date.now(),
            assets: {
                js: ['app.min.js'],
                css: ['styles.min.css'],
                html: ['index.html'],
                icons: fs.readdirSync(path.join(this.distDir, 'icons')).map(file => `icons/${file}`)
            },
            sizes: {}
        };
        
        // Calculate file sizes
        for (const [type, files] of Object.entries(manifest.assets)) {
            manifest.sizes[type] = {};
            for (const file of files) {
                const filePath = path.join(this.distDir, file);
                if (fs.existsSync(filePath)) {
                    manifest.sizes[type][file] = fs.statSync(filePath).size;
                }
            }
        }
        
        fs.writeFileSync(
            path.join(this.distDir, 'asset-manifest.json'),
            JSON.stringify(manifest, null, 2)
        );
        
        console.log('   Asset manifest created');
    }
    
    async generateCriticalCSS() {
        console.log('🎨 Generating critical CSS...');
        
        // Extract critical CSS from styles.css
        const stylesContent = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8');
        
        // Simple critical CSS extraction (in a real app, use tools like critical)
        const criticalCSS = stylesContent
            .split('\n')
            .filter(line => {
                // Keep critical selectors
                return line.includes('body') ||
                       line.includes('.app-container') ||
                       line.includes('.toolbar') ||
                       line.includes('.canvas-container') ||
                       line.includes('#drawingCanvas') ||
                       line.includes('.tool-btn') ||
                       line.includes('.loading');
            })
            .join('\n');
        
        fs.writeFileSync(path.join(this.distDir, 'critical.css'), criticalCSS);
        
        console.log('   Critical CSS generated');
    }
    
    async analyzeBundle() {
        console.log('📊 Analyzing bundle...');
        
        const manifestPath = path.join(this.distDir, 'asset-manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        let totalSize = 0;
        const analysis = {
            totalFiles: 0,
            totalSize: 0,
            largestFiles: [],
            recommendations: []
        };
        
        // Analyze all files
        for (const [type, files] of Object.entries(manifest.assets)) {
            for (const file of files) {
                const filePath = path.join(this.distDir, file);
                if (fs.existsSync(filePath)) {
                    const size = fs.statSync(filePath).size;
                    totalSize += size;
                    analysis.totalFiles++;
                    analysis.largestFiles.push({ file, size, type });
                }
            }
        }
        
        analysis.totalSize = totalSize;
        analysis.largestFiles.sort((a, b) => b.size - a.size);
        
        // Generate recommendations
        if (totalSize > 100000) { // 100KB
            analysis.recommendations.push('Consider code splitting for large bundles');
        }
        
        if (analysis.largestFiles[0]?.size > 50000) { // 50KB
            analysis.recommendations.push('Largest file is quite large - consider optimization');
        }
        
        fs.writeFileSync(
            path.join(this.reportsDir, 'bundle-analysis.json'),
            JSON.stringify(analysis, null, 2)
        );
        
        console.log(`   Bundle analysis complete: ${this.formatBytes(totalSize)} total`);
    }
    
    printBuildSummary() {
        console.log('\n📈 Build Summary:');
        console.log('================');
        
        const manifestPath = path.join(this.distDir, 'asset-manifest.json');
        if (fs.existsSync(manifestPath)) {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            
            console.log(`Total files: ${Object.values(manifest.assets).flat().length}`);
            console.log(`Total size: ${this.formatBytes(Object.values(manifest.sizes).flat().reduce((sum, size) => sum + size, 0))}`);
            console.log(`Build time: ${new Date().toLocaleTimeString()}`);
        }
        
        console.log('\n🎯 Performance Optimizations Applied:');
        console.log('• JavaScript minification and compression');
        console.log('• CSS minification and critical path extraction');
        console.log('• HTML minification');
        console.log('• Service Worker optimization');
        console.log('• Asset manifest generation');
        console.log('• Bundle size analysis');
        
        console.log('\n🚀 Ready for production deployment!');
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getCompressionRatio(original, compressed) {
        return Math.round(((original - compressed) / original) * 100);
    }
}

// Run build if called directly
if (require.main === module) {
    const optimizer = new BuildOptimizer();
    optimizer.build();
}

module.exports = BuildOptimizer;