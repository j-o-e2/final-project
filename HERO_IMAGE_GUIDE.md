# Hero Image Generation Guide

## Image Specification
Create a high-quality promotional digital photograph with the following specifications:

### Main Subjects
- **Left: Male Worker**
  - Dark skin complexion
  - Holding a hoe
  - Wearing a green shirt
  - Wearing a yellow hat
  - Smiling, facing camera

- **Right: Male Worker**
  - Dark skin complexion
  - Holding a wrench
  - Wearing a blue shirt
  - Wearing a blue cap
  - Smiling, facing camera

### Background
- Clean beige background
- Simple flat green illustrations including:
  - Rural houses
  - Farms/fields
  - Tractors
  - Bicycles
  - People working in fields

### Text & Icons
- Top center: Subtle network-connection icon
- Middle of image: Bold dark-blue text reading "CONNECTING RURAL WORKERS TO JOBS"

### Style
- Blend real photographic subjects with minimal modern illustrations
- Communicate technology helping rural communities
- Professional, hopeful, and inclusive tone

## Generation Options

### Option 1: Midjourney (Recommended)
Use this prompt in Midjourney:
```
High-quality promotional photograph of two African rural workers with dark skin complexion. 
Left: man holding hoe, green shirt, yellow hat, smiling. 
Right: man holding wrench, blue shirt, blue cap, smiling. 
Clean beige background with minimal flat green illustrations of rural houses, farms, tractors, bicycles, and people working. 
Text in center: "CONNECTING RURAL WORKERS TO JOBS" in bold dark blue. 
Subtle network-connection icon at top. 
Professional style blending photography with minimal modern illustrations. 
--ar 4:3 --quality 2
```

### Option 2: DALL-E 3
Use a similar detailed prompt in ChatGPT + DALL-E 3

### Option 3: Adobe Firefly
Use the text-to-image generation with the above detailed specification

## File Instructions
1. Generate or source the hero image
2. Save as: `/public/hero-rural-workers.jpg`
3. Recommended dimensions: 1200x900px or 1600x1200px
4. File size: Optimize to under 500KB for web

## Integration
The image is already configured to load at:
- Path: `/public/hero-rural-workers.jpg`
- Component: `app/page.tsx` (Hero Section)
- Next.js Image component will auto-optimize and serve responsive versions

## If Using Stock Photo
As an alternative, search stock photo sites for:
- "African workers with tools smiling"
- "Rural workers with equipment"
- "Community workers portrait"
Then edit in Canva or Photoshop to add:
1. Beige background
2. Simple green flat illustration overlays
3. Add text "CONNECTING RURAL WORKERS TO JOBS"
4. Add network icon

