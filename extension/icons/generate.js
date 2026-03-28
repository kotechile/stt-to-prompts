#!/usr/bin/env node

/**
 * Icon Generator Script
 *
 * This script generates the required PNG icons for the Chrome extension.
 * Run with: node generate.js
 *
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
    require.resolve('sharp');
} catch (e) {
    console.log('Installing sharp...');
    const { execSync } = require('child_process');
    execSync('npm install sharp', { stdio: 'inherit' });
}

const sharp = require('sharp');

// SVG icons
const normalIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285f4"/>
      <stop offset="100%" style="stop-color:#34a853"/>
    </linearGradient>
  </defs>
  <rect width="24" height="24" rx="4" fill="url(#grad)"/>
  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" fill="white"/>
  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" fill="white"/>
</svg>`;

const recordingIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="128" height="128">
  <rect width="24" height="24" rx="4" fill="#ea4335"/>
  <circle cx="12" cy="12" r="6" fill="white"/>
</svg>`;

const sizes = [16, 32, 48, 128];

async function generateIcons() {
    console.log('🎨 Generating extension icons...\n');

    for (const size of sizes) {
        // Generate normal icon
        await sharp(Buffer.from(normalIcon))
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(`icon${size}.png`);
        console.log(`✅ Generated icon${size}.png (${size}x${size})`);

        // Generate recording icon
        await sharp(Buffer.from(recordingIcon))
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(`icon${size}-recording.png`);
        console.log(`✅ Generated icon${size}-recording.png (${size}x${size})`);
    }

    console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(err => {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
});