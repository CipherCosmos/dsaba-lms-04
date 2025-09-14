# PWA Icons for IEMS

This directory contains the Progressive Web App (PWA) icons for the Internal Exam Management System.

## Required Icons

- `icon-192.png` - 192x192 pixels, standard icon
- `icon-512.png` - 512x512 pixels, standard icon  
- `icon-512-maskable.png` - 512x512 pixels, maskable icon for adaptive icons

## Current Status

Currently, placeholder icons have been created. To complete the PWA setup, you need to replace these with proper icons.

## Creating Proper Icons

### Option 1: Using the provided SVG
1. Open `icon.svg` in a design tool (Figma, Adobe Illustrator, etc.)
2. Export as PNG in the required sizes
3. For the maskable icon, ensure there's safe padding around the icon (about 10% on all sides)

### Option 2: Using online tools
1. Use an online SVG to PNG converter
2. Convert `icon.svg` to 192x192 and 512x512 PNG files
3. Create a maskable version with safe padding

### Option 3: Using Node.js tools
```bash
npm install sharp
# Then use sharp to convert the SVG to PNG
```

## Icon Guidelines

- **Format**: PNG with transparency
- **Background**: Transparent
- **Content**: Should be clearly visible on both light and dark backgrounds
- **Maskable Icon**: Should have safe padding (10% on all sides) for adaptive icons
- **Optimization**: Compress for web use while maintaining quality

## Testing

After replacing the placeholder icons:
1. Clear your browser cache
2. Test the PWA installation
3. Verify icons appear correctly in the browser's "Add to Home Screen" dialog
4. Check that the maskable icon works with adaptive icons on Android
