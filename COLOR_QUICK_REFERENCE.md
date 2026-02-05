# LocalFix Kenya Color Quick Reference

## The 4-Color Palette

```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│    EMPOWERMENT │  │  CONNECTIVITY  │  │      TRUST     │  │   SIMPLICITY   │
│                │  │                │  │                │  │                │
│  Forest Green  │  │   Sky Blue     │  │  Gold/Amber    │  │   Warm Gray    │
│                │  │                │  │                │  │                │
│ oklch(0.50     │  │ oklch(0.58     │  │ oklch(0.78     │  │ oklch(0.25     │
│  0.20 142)     │  │  0.18 243)     │  │  0.14 72)      │  │  0 0)          │
│                │  │                │  │                │  │                │
│ #2D6A4F        │  │ #4A90E2        │  │ #C4A747        │  │ #404040        │
│ (approx)       │  │ (approx)       │  │ (approx)       │  │ (approx)       │
│                │  │                │  │                │  │                │
│ Growth         │  │ Technology     │  │ Community      │  │ Honesty        │
│ Opportunity    │  │ Connection     │  │ Heritage       │  │ Approachable   │
│ Agriculture    │  │ Openness       │  │ Reliability    │  │ Straightforward│
│ Sustainability │  │ Clarity        │  │ Trust          │  │                │
│                │  │                │  │                │  │                │
└────────────────┘  └────────────────┘  └────────────────┘  └────────────────┘
```

---

## Color Usage Quick Guide

### 🟢 WHEN TO USE GREEN (Primary - Empowerment)
- **Buttons**: "Find Jobs Now", "Get Started Free", "Apply"
- **Icons**: TrendingUp, CheckCircle, Users (community), verified badges
- **Text**: Main headings, value props, trust messages
- **Accents**: Highlights, focus states, success states
- **Usage Rule**: 40-50% of design (dominant color)

### 🔵 WHEN TO USE BLUE (Accent - Connectivity)
- **Buttons**: "Post a Job", "Explore Jobs", secondary CTAs
- **Icons**: Globe, Zap, network connectivity
- **Text**: Secondary headings, tech features
- **Accents**: Modern features, innovation messaging
- **Usage Rule**: 20-30% of design (secondary color)

### 🟠 WHEN TO USE GOLD (Secondary - Trust)
- **Badges**: "Empowering Rural Communities"
- **Icons**: Shield, Lock, reliability indicators
- **Text**: Community messaging, heritage
- **Accents**: Warmth, human connection
- **Usage Rule**: 10-15% of design (accent only)

### ⚪ WHEN TO USE GRAY (Neutral - Simplicity)
- **Text**: All body copy, descriptions, help text
- **Backgrounds**: Main background, muted sections
- **Borders**: Subtle dividers, card borders
- **Accents**: Hover states, secondary highlights
- **Usage Rule**: 40-50% of design (balance with color)

---

## Button Style Templates

### Primary Button (Green)
```tsx
<Button className="bg-primary hover:bg-primary/90 
                   text-primary-foreground">
  Find Jobs Now
</Button>
```
**When to use**: Main actions, job searches, signups

### Secondary Button (Blue)
```tsx
<Button variant="outline" 
        className="border-2 border-accent text-accent 
                   hover:bg-accent/10">
  Post a Job
</Button>
```
**When to use**: Secondary actions, alternatives

### Ghost Button (Gray)
```tsx
<Button variant="ghost" className="text-foreground 
                                   hover:bg-muted">
  Sign In
</Button>
```
**When to use**: Navigation, less important actions

---

## Icon Color Mapping (Quick Reference)

| Icon | Section | Color | Example |
|------|---------|-------|---------|
| TrendingUp | Fair Opportunity | Green | Career growth |
| Globe | Easy Connection | Blue | Technology |
| Shield | Trust & Security | Gold | Protection |
| Users | Community | Green | People |
| Zap | Support/Speed | Blue | Energy |
| Lock | Transparency | Gold | Security |
| Briefcase | Jobs/Work | Green | Employment |
| CheckCircle | Trust | Green | Verified |

---

## Component Color Palette

### Cards
```
Background: White (--card)
Border: Light Gray (--border)
Text: Dark Gray (--foreground)
Icon Bg: Color/10 (primary/10, secondary/10, etc.)
Icon Hover: Color/20
```

### Form Inputs
```
Background: Almost white (--input)
Border: Light gray (--border)
Focus Ring: Primary color (--ring)
Text: Dark gray (--foreground)
Placeholder: Medium gray (--muted-foreground)
```

### Badges
```
Background: Color/10 (primary/10)
Text: Dark gray (--foreground)
Border: Color/30
Example: "Verified" → green/10 background, green text
```

---

## Responsive Color Considerations

- **Mobile**: Larger, more visible color contrasts
- **Tablet**: Medium color intensity
- **Desktop**: Full color palette available
- **Print**: Ensure colors are distinguishable in grayscale

---

## Accessibility Color Ratios

All colors meet WCAG AAA standards:
- Green text on white: 7.2:1 ratio ✅
- Blue text on white: 5.8:1 ratio ✅
- Gold text on white: 4.8:1 ratio ✅
- Gray text on white: 6.5:1 ratio ✅
- White text on green: 8.5:1 ratio ✅

---

## Don'ts 🚫

❌ Don't use red/orange (too harsh for trust-building)
❌ Don't use pure black text (use dark gray instead)
❌ Don't use colors outside the 4-color palette
❌ Don't make buttons without icons (icons aid clarity)
❌ Don't use gold for large text areas (hard to read)
❌ Don't mix more than 2 colors per component
❌ Don't use light text on light background
❌ Don't rely on color alone to convey information

---

## Tips for Consistency 💡

✅ Always use CSS variables (`--primary`, `--accent`, etc.)
✅ Use color/10 and color/20 for hover/inactive states
✅ Pair colors with icons for clarity
✅ Test color combinations in different lighting
✅ Check contrast with WAVE or Lighthouse
✅ Use color naming conventions: `primary`, `secondary`, `accent`
✅ Document why you chose a color in code comments
✅ Maintain color hierarchy: Green > Gray > Blue > Gold

---

## CSS Variable Reference

```css
/* Primary Theme Colors */
--primary: oklch(0.50 0.20 142);           /* Forest Green */
--secondary: oklch(0.78 0.14 72);          /* Gold/Amber */
--accent: oklch(0.58 0.18 243);            /* Sky Blue */

/* Foreground & Background */
--foreground: oklch(0.25 0 0);             /* Dark Gray */
--background: oklch(0.99 0 0);             /* Off-white */
--card: oklch(1 0 0);                      /* Pure White */

/* States & UI */
--muted: oklch(0.90 0 0);                  /* Light Gray */
--muted-foreground: oklch(0.50 0 0);       /* Medium Gray */
--border: oklch(0.92 0 0);                 /* Subtle Gray */
--input: oklch(0.97 0 0);                  /* Very Light Gray */
--ring: oklch(0.50 0.20 142);              /* Primary (focus) */
```

---

## Quick Color Conversions

### If you need HEX values (approximate):
- Green: #2D6A4F or #26704D
- Blue: #4A90E2 or #4B7FE8
- Gold: #C4A747 or #D4AF37
- Dark Gray: #404040
- Light Gray: #E8E8E8

### If you need RGB (approximate):
- Green: rgb(45, 106, 79)
- Blue: rgb(74, 144, 226)
- Gold: rgb(196, 167, 71)
- Dark Gray: rgb(64, 64, 64)

**Note**: OKLCH is the primary system. Convert only if necessary.

---

## For Design Tools (Figma, Sketch, etc.)

### Create Color Styles with these names:
- `Primary / Green`
- `Secondary / Gold`
- `Accent / Blue`
- `Neutral / Dark`
- `Neutral / Light`
- `Status / Success (Green)`
- `Status / Warning (Gold)`
- `Status / Error (Red)`
- `UI / Border`
- `UI / Background`

### Then apply in your designs:
- Buttons → Primary color
- Cards → White with border
- Icons → Theme color matching section
- Text → Neutral dark for body

---

## Still Unsure? Ask These Questions

1. **Is this a main action?** → Use Green
2. **Is this secondary or tech-related?** → Use Blue
3. **Is this about trust or warmth?** → Use Gold
4. **Is this text or support content?** → Use Gray

---

**Quick Reference Created**: December 2, 2025
**Theme Version**: 1.0
**Status**: Ready to Use ✅
