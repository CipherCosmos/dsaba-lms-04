import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, 'icon.svg');

async function generateIcons() {
  try {
    console.log('Generating PWA icons from SVG...');

    // Read the SVG content
    const svgBuffer = fs.readFileSync(svgPath);

    // Generate standard icons
    await sharp(svgBuffer)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, 'icon-192.png'));

    await sharp(svgBuffer)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, 'icon-512.png'));

    console.log('Generated standard icons: icon-192.png, icon-512.png');

    // Generate maskable icon with safe padding
    // For maskable icons, create a 512x512 canvas and place the icon in the center 80% area
    const iconResized = await sharp(svgBuffer)
      .resize(409, 409) // 80% of 512
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{
        input: iconResized,
        top: 51, // (512 - 409) / 2
        left: 51
      }])
      .png()
      .toFile(path.join(__dirname, 'icon-512-maskable.png'));

    console.log('Generated maskable icon: icon-512-maskable.png');

    // Generate favicon variants
    await sharp(svgBuffer)
      .resize(16, 16)
      .png()
      .toFile(path.join(__dirname, 'favicon-16x16.png'));

    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, 'favicon-32x32.png'));

    await sharp(svgBuffer)
      .resize(48, 48)
      .png()
      .toFile(path.join(__dirname, 'favicon-48x48.png'));

    console.log('Generated favicon variants: favicon-16x16.png, favicon-32x32.png, favicon-48x48.png');

    console.log('All PWA icons generated successfully!');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
