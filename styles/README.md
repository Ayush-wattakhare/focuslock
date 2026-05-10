# FocusLock Design System

This document describes the global CSS design system for FocusLock.

## Overview

The FocusLock design system is built around a **friction-first UX** principle with a **warm, non-judgmental tone**. The color palette uses purple gradients as the primary brand color, complemented by warm accent colors and a comprehensive neutral scale.

## Color Palette

### Primary Colors (Purple Gradient Theme)
- `--primary-500: #667eea` - Main brand color
- `--primary-600: #5a67d8` - Hover state
- `--primary-700: #4c51bf` - Active state
- `--primary-800: #764ba2` - Gradient end

### Secondary Colors (Warm Accents)
- `--secondary-500: #f093fb` - Pink accent
- `--secondary-600: #f5576c` - Red accent

### Semantic Colors
- **Success**: `#10b981` (green)
- **Warning**: `#f59e0b` (amber)
- **Error**: `#ef4444` (red)
- **Info**: `#3b82f6` (blue)

### Neutral Scale
From `--neutral-50` (lightest) to `--neutral-900` (darkest), providing a complete grayscale palette.

## Typography

### Font Families
- **Sans**: System font stack for optimal performance
- **Mono**: Monospace stack for code

### Type Scale
- `--text-xs`: 12px
- `--text-sm`: 14px
- `--text-base`: 16px
- `--text-lg`: 18px
- `--text-xl`: 20px
- `--text-2xl`: 24px
- `--text-3xl`: 30px
- `--text-4xl`: 36px
- `--text-5xl`: 48px

### Font Weights
- `--font-normal`: 400
- `--font-medium`: 500
- `--font-semibold`: 600
- `--font-bold`: 700

## Spacing Scale

Consistent spacing using a 4px base unit:
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px
- `--space-16`: 64px
- `--space-20`: 80px

## Border Radius

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-xl`: 16px
- `--radius-2xl`: 24px
- `--radius-full`: 9999px (circular)

## Shadows

Four shadow levels for depth hierarchy:
- `--shadow-sm`: Subtle elevation
- `--shadow-md`: Standard cards
- `--shadow-lg`: Modals and popovers
- `--shadow-xl`: Maximum elevation

## Component Classes

### Buttons
```html
<button class="btn btn-primary">Primary Button</button>
<button class="btn btn-secondary">Secondary Button</button>
<button class="btn btn-success">Success Button</button>
<button class="btn btn-error">Error Button</button>
<button class="btn btn-primary btn-sm">Small Button</button>
<button class="btn btn-primary btn-lg">Large Button</button>
```

### Cards
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
  </div>
  <div class="card-body">
    Card content goes here
  </div>
</div>
```

### Inputs
```html
<input type="text" class="input" placeholder="Enter text..." />
```

### Badges
```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
```

## Utility Classes

### Text Utilities
- Size: `.text-xs`, `.text-sm`, `.text-base`, `.text-lg`, `.text-xl`, etc.
- Weight: `.font-normal`, `.font-medium`, `.font-semibold`, `.font-bold`
- Alignment: `.text-center`, `.text-left`, `.text-right`
- Color: `.text-primary`, `.text-secondary`, `.text-success`, etc.

### Background Utilities
- `.bg-primary`, `.bg-surface`, `.bg-elevated`
- `.bg-gradient-primary`, `.bg-gradient-warm`, `.bg-gradient-purple`

### Spacing Utilities
- Margin: `.m-0` to `.m-8`, `.mt-*`, `.mb-*`, etc.
- Padding: `.p-0` to `.p-8`

### Flexbox Utilities
- `.flex`, `.flex-col`, `.flex-row`
- `.items-center`, `.items-start`, `.items-end`
- `.justify-center`, `.justify-between`, etc.
- `.gap-1` to `.gap-8`

### Grid Utilities
- `.grid`, `.grid-cols-1` to `.grid-cols-4`

### Border Utilities
- `.border`, `.border-t`, `.border-b`, `.border-l`, `.border-r`
- `.rounded-sm` to `.rounded-full`

### Shadow Utilities
- `.shadow-sm`, `.shadow-md`, `.shadow-lg`, `.shadow-xl`, `.shadow-none`

## Dark Mode

The design system automatically adapts to dark mode using `prefers-color-scheme: dark`. All color variables are redefined for optimal dark mode appearance.

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 641px - 768px
- Desktop: > 1024px

### Responsive Utilities
- `.mobile-hidden`, `.mobile-only`
- `.tablet-hidden`, `.tablet-only`
- `.desktop-hidden`, `.desktop-only`

## Animations

Pre-built animations:
- `.animate-fade-in`
- `.animate-slide-up`
- `.animate-spin`
- `.animate-pulse`

## Accessibility

- Focus visible states with `.focus-visible`
- Screen reader only content with `.sr-only`
- Respects `prefers-reduced-motion` for users who need it

## Usage Examples

### Creating a Card with Button
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Lock Rule</h3>
  </div>
  <div class="card-body">
    <p class="text-secondary mb-4">Configure your app lock settings</p>
    <button class="btn btn-primary">Save Rule</button>
  </div>
</div>
```

### Creating a Gradient Hero Section
```html
<section class="bg-gradient-purple min-h-screen flex items-center justify-center p-8">
  <div class="text-center">
    <h1 class="text-5xl font-bold text-white mb-4">FocusLock</h1>
    <p class="text-xl text-white mb-8">Take control of your digital life</p>
    <button class="btn btn-lg bg-white text-primary">Get Started</button>
  </div>
</section>
```

### Creating a Stats Grid
```html
<div class="grid grid-cols-3 gap-4">
  <div class="card text-center">
    <div class="text-4xl font-bold text-primary mb-2">7</div>
    <div class="text-sm text-secondary">Day Streak</div>
  </div>
  <div class="card text-center">
    <div class="text-4xl font-bold text-success mb-2">85%</div>
    <div class="text-sm text-secondary">Compliance</div>
  </div>
  <div class="card text-center">
    <div class="text-4xl font-bold text-info mb-2">12h</div>
    <div class="text-sm text-secondary">Time Saved</div>
  </div>
</div>
```

## Best Practices

1. **Use CSS Variables**: Always use CSS variables instead of hardcoded colors
2. **Consistent Spacing**: Use the spacing scale for margins and padding
3. **Semantic Colors**: Use semantic color variables (success, warning, error) for appropriate contexts
4. **Responsive First**: Design mobile-first, then enhance for larger screens
5. **Accessibility**: Always include focus states and ARIA labels
6. **Dark Mode**: Test all components in both light and dark modes

## Component-Specific Styles

For component-specific styles, create separate CSS files in the `styles/` directory:
- `dashboard.css` - Dashboard-specific styles
- `lock.css` - Lock screen styles
- `stats.css` - Statistics page styles
- `focus.css` - Pomodoro focus session styles
- `family.css` - Family mode styles

Import these in the relevant page components as needed.
