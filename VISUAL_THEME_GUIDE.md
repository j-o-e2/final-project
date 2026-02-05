# LocalFix Kenya - Visual Theme Guide

## Theme Philosophy: 4 Core Values

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  EMPOWERMENT     CONNECTIVITY     TRUST      SIMPLICITY        │
│  (Fair Ops)      (Technology)     (Security) (Clarity)         │
│  Forest Green    Sky Blue         Gold       Warm Gray         │
│                                                                 │
│  "Fair Opportunities for Every Worker"                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Application Guide

### 🟢 Forest Green (Primary) - `oklch(0.50 0.20 142)`
**When to Use**: Opportunity, Growth, Action Items
```
✓ Primary buttons "Find Jobs Now", "Get Started Free"
✓ Main heading color
✓ Trust checkmarks and security icons
✓ Navigation highlights
✓ Feature icons (TrendingUp, Community)
✓ Success states
✓ Logo accent
```

### 🟠 Gold/Amber (Secondary) - `oklch(0.78 0.14 72)`
**When to Use**: Community, Heritage, Warmth
```
✓ "Empowering Rural Communities" badge
✓ Trust indicator for heritage/reliability
✓ Secondary feature highlights
✓ Sidebar accents
✓ Community-focused messaging
```

### 🔵 Sky Blue (Accent) - `oklch(0.58 0.18 243)`
**When to Use**: Technology, Connection, Modern Features
```
✓ "Post a Job" secondary button
✓ Tech-forward feature icons (Globe, Zap)
✓ Connectivity messaging
✓ Modern, progressive indicators
✓ Alternative CTA options
```

### ⚪ Warm Gray (Neutral) - `oklch(0.25 0 0)` text, `oklch(0.99 0 0)` bg
**When to Use**: Readable, Approachable Text
```
✓ All body copy
✓ Secondary headings
✓ Borders and dividers (slightly lighter)
✓ Muted text (help text, descriptions)
✓ Background surfaces
```

---

## Homepage Layout Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│ Navigation (Sticky, White bg with subtle shadow)               │
│ • LocalFix Kenya logo + tagline                                │
│ • Sign In | Get Started (green button)                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        HERO SECTION                             │
│                                                                 │
│  [TEXT]                              [IMAGE WITH GLOW]         │
│  • Gold badge "Empowering..."                                  │
│  • Green heading: "Fair Opportunities"                          │
│  • Gray body text                                               │
│  • Green "Find Jobs Now" button                                 │
│  • Blue "Post a Job" button                                     │
│  • Trust indicators (checkmarks, lock, zap)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     STATS SECTION                               │
│        (Light green tint background)                            │
│                                                                 │
│  5,000+      2,000+      98%        47                         │
│  Workers     Jobs        Success    Counties                   │
│  (Green)     (Blue)      (Gold)     (Green)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              WHY CHOOSE LOCALFIX? (6 Cards)                     │
│                                                                 │
│  [GREEN ICON]    [BLUE ICON]    [GOLD ICON]                   │
│  Fair Oppty      Easy Conn      Trust/Secure                  │
│  TrendingUp      Globe          Shield                         │
│                                                                 │
│  [GREEN ICON]    [BLUE ICON]    [GOLD ICON]                   │
│  Community       Real Support   Transparent                    │
│  Users           Zap            Lock                           │
│                                                                 │
│  Each card has color-coded icon background + hover effect     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│               HOW IT WORKS (4 Steps)                             │
│          (Muted background, gray divider)                       │
│                                                                 │
│  ① Sign Up    ─────→    ② Find Jobs    ─────→    ③ Apply      │
│                                           ─────→    ④ Earn     │
│                                                                 │
│  Each step in white card with green numbered badge             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              CTA SECTION (Green to Blue Gradient)               │
│                                                                 │
│     "Ready to Transform Your Future?"                           │
│     [White Button]        [Outline White Button]               │
│     Get Started Free      Explore Jobs                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    FOOTER (Dark gray/black)                     │
│                                                                 │
│  LocalFix Kenya     For Workers        For Employers    Support│
│  (Why we exist)     Find Jobs          Post a Job      Contact │
│                     Services           Dashboard       FAQ      │
│                     My Profile                         Privacy  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Button & CTA Style Guide

### Primary Button (Green)
```
Background: Forest Green
Text: White
Padding: 1.5rem (lg size), 1rem (md)
Border: None
Hover: Darker green (-10%)
Icon: Briefcase, Users, etc.
Example: "Find Jobs Now", "Get Started Free"
```

### Secondary Button (Blue Outline)
```
Background: Transparent
Border: 2px Sky Blue
Text: Sky Blue
Padding: 1.5rem (lg size), 1rem (md)
Hover: Light blue background
Icon: Users, Globe, etc.
Example: "Post a Job", "Explore Jobs"
```

### Ghost Button (Navigation)
```
Background: Transparent
Text: Dark Gray
Hover: Light gray background
Example: "Sign In"
```

---

## Icon Color Mapping

| Icon | Section | Color | Meaning |
|------|---------|-------|---------|
| TrendingUp | Fair Opportunity | Green | Growth |
| Globe | Easy Connection | Blue | Technology |
| Shield | Trusted & Secure | Gold | Protection |
| Users | Community First | Green | People |
| Zap | Real Support | Blue | Energy/Speed |
| Lock | 100% Transparent | Gold | Security |
| CheckCircle2 | Trust Indicator | Green | Verified |

---

## Responsive Breakpoints

### Mobile (< 768px)
- Single column layouts
- Full-width images
- Stacked buttons (flex-col)
- Larger touch targets (56px minimum)
- Simplified navigation (no tagline)

### Tablet (768px - 1024px)
- 2-column grids for some sections
- Medium card layouts
- Side-by-side hero (text + image)

### Desktop (> 1024px)
- 3-column grids for features
- Full layout spacing (max-w-7xl)
- Sidebar-ready structure
- Optimal reading width (70-80 chars)

---

## Accessibility Checklist

```
✅ High Contrast Ratios (WCAG AAA compliant)
✅ Color Not Only Indicator (icons + text + color)
✅ Semantic HTML (proper heading hierarchy)
✅ Focus States (visible keyboard navigation)
✅ Screen Reader Friendly (alt text, aria labels)
✅ Touch-Friendly (56px+ button targets)
✅ Font Sizing (readable at 16px+)
✅ Line Spacing (1.5+ for body text)
✅ Mobile Optimization (responsive)
✅ Link Underlines (blue links clearly marked)
```

---

## Example Component: Feature Card

```jsx
<Card className="p-8 bg-card border border-border shadow-sm 
                  hover:shadow-lg hover:border-primary/30 
                  transition-all duration-300 group">
  {/* Icon Container with Color */}
  <div className="w-14 h-14 bg-primary/10 rounded-lg 
                   flex items-center justify-center mb-6 
                   group-hover:bg-primary/20 transition-colors">
    <TrendingUp className="w-7 h-7 text-primary" />
  </div>
  
  {/* Content */}
  <h3 className="text-xl font-bold text-foreground mb-3">
    Fair Opportunity
  </h3>
  <p className="text-muted-foreground leading-relaxed">
    Access verified job opportunities with fair wages 
    and transparent terms.
  </p>
</Card>
```

**Color Logic**:
- Icon background: `primary/10` (10% opacity green)
- Icon color: `primary` (full green)
- Hover: `primary/20` (20% opacity)
- Title: `foreground` (dark gray)
- Description: `muted-foreground` (medium gray)

---

## Theme Consistency Rules

1. **Never** use random colors outside the palette
2. **Always** pair icons with text (no icon-only CTAs)
3. **Use green** for primary actions and trust
4. **Use blue** for secondary actions and tech features
5. **Use gold** sparingly for warmth and community
6. **Use gray** for readable, honest messaging
7. **Maintain** hover states for interactivity feedback
8. **Ensure** minimum contrast ratio of 4.5:1 for text

---

## Theme File Locations

```
app/
  ├── globals.css (Theme variables)
  ├── page.tsx (Homepage with theme applied)
  └── layout.tsx (Base layout)

components/
  └── ui/ (All UI components inherit theme)

THEME_DOCUMENTATION.md (This file)
VISUAL_THEME_GUIDE.md (Visual guide - you're reading it!)
```

---

## Testing Your Theme

1. **Color Verification**: Open DevTools → Inspect any styled element
2. **Responsive Test**: Resize browser to mobile/tablet/desktop
3. **Accessibility**: Use WAVE or Lighthouse in DevTools
4. **Print View**: Print homepage (should maintain readability)
5. **Mobile Test**: Test on actual phone/tablet if possible

---

## Future Theme Enhancements

- [ ] Add dark mode support (if needed later)
- [ ] Create component library with theme presets
- [ ] Add animation/transition specifications
- [ ] Create design tokens for design systems
- [ ] Document brand guidelines for external designers
- [ ] Add pattern library (grids, layouts, etc.)

---

**Theme Created**: December 2, 2025
**Version**: 1.0 - Launch
**Status**: Ready for production homepage
