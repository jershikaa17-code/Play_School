# Design System Reference Page — CLAUDE.md

## ROLE

You are an expert product designer and frontend engineer.

Build the requested `design-system.html` as a **premium, highly polished, interactive design-system showcase**, not as a boring documentation page.

The page must feel like a **real premium product interface** where the design system itself is the product.

Think:

* sophisticated SaaS product
* premium design studio
* modern glass interface
* elegant enterprise product
* highly intentional spacing
* rich depth
* subtle translucency
* beautiful typography
* polished interactions
* strong visual hierarchy
* refined motion

DO NOT make it look like:

* a Word document
* a documentation website
* a plain component gallery
* a generic Bootstrap page
* a basic admin dashboard
* a collection of random cards
* a page with every section inside identical bordered boxes

The result should immediately feel **designed**, not assembled.

---

# 1. READ THE REQUIREMENT FIRST

Before changing or creating anything:

1. Read the **complete original requirement**.
2. Inspect the existing project structure.
3. Inspect `styles.css`.
4. Inspect the existing T00 Design System.
5. Identify:

   * existing colors
   * typography
   * spacing
   * radii
   * shadows
   * buttons
   * cards
   * inputs
   * tables
   * tabs
   * modals
   * drawers
   * existing interaction patterns
6. Reuse the existing T00 Design System wherever possible.

DO NOT create an unrelated visual language.

The new page must look like a **premium evolution of T00**, not a completely different product.

---

# 2. PRIMARY GOAL

Create:

`design-system.html`

This page is the **single visual source of truth** for the entire product.

It must demonstrate:

* every colour
* every typography style
* every component
* every component state
* every important interaction
* every responsive behavior

Every future screen should be visually derivable from this page.

The page should therefore feel like a **living interactive design system**, not static documentation.

---

# 3. IMPORTANT VISUAL DIRECTION

## Overall aesthetic

Create an:

### "Elegant Glass Product Lab"

visual language.

Use:

* sophisticated glass surfaces
* layered depth
* subtle translucency
* controlled blur
* refined borders
* soft shadows
* premium typography
* generous whitespace
* strong alignment
* elegant micro-interactions
* subtle gradients ONLY when they are derived from allowed colors
* restrained glow
* layered backgrounds
* floating surfaces
* beautiful hover states

The design must feel:

**expensive + modern + calm + intelligent + premium**

NOT:

**loud + childish + colorful + cartoonish + generic + corporate-document-like**

---

# 4. DO NOT INVENT COLORS

This is extremely important.

Every color must come from the existing CSS variables in:

`styles.css`

Do NOT type hex colors directly inside:

* `design-system.html`
* inline styles
* JavaScript
* component markup

Bad:

```css
color: #123456;
background: #ffffff;
border-color: #cccccc;
```

Good:

```css
color: var(--text-primary);
background: var(--surface-primary);
border-color: var(--border-subtle);
```

If the current design system already has CSS variables, reuse them.

If a required semantic color does not have a variable, add the variable to `styles.css`.

Examples of semantic variables are acceptable ONLY if their actual values come from the approved existing palette:

```css
--color-primary
--color-secondary
--color-background
--color-surface
--color-surface-glass
--color-text-primary
--color-text-secondary
--color-border
--color-success
--color-warning
--color-error
```

Do not create a completely new palette.

---

# 5. PREMIUM BACKGROUND

Do NOT use a boring flat white or flat gray documentation background.

Create visual depth using the approved design-system colors.

The background can have:

* extremely subtle radial lighting
* layered gradients
* glass atmosphere
* faint blurred color fields
* translucent decorative shapes
* subtle grid/noise treatment if appropriate

Keep it elegant.

The decorative background must NEVER interfere with readability.

Avoid:

* excessive blobs
* neon effects
* rainbow gradients
* childish floating circles
* excessive stars
* visual clutter

The background should feel like **premium ambient lighting**.

---

# 6. PAGE STRUCTURE

Create a strong visual hierarchy.

Recommended structure:

```text
┌─────────────────────────────────────────────┐
│ Floating / glass header                     │
│ Design System        Components / States    │
└─────────────────────────────────────────────┘

        DESIGN SYSTEM
        The visual language behind the product

        [version] [components] [states]

───────────────────────────────────────────────

FOUNDATIONS
Color
Typography
Spacing
Radius
Elevation

───────────────────────────────────────────────

COMPONENTS

Buttons
Inputs
Cards
Tabs
Filters
Tables
Navigation
Modals
Drawers
...

───────────────────────────────────────────────

INTERACTION LAB
Hover
Focus
Loading
Disabled
Error
Success
Locked
Empty
Confirmation

───────────────────────────────────────────────

RESPONSIVE PREVIEW
360
768
1024
1440

───────────────────────────────────────────────

FINAL COMPONENT GALLERY
```

Do NOT literally reproduce this layout if a better visual composition exists.

The important thing is the hierarchy.

---

# 7. HERO / INTRODUCTION

The top section should NOT look like:

```text
Design System
This page contains...
```

inside a normal documentation card.

Instead create a premium introduction.

Example visual direction:

```text
DESIGN SYSTEM / T00

THE LANGUAGE
BEHIND THE
PRODUCT.

A living reference for colour, typography,
components, interaction and responsive behavior.

[CORE SYSTEM]   [COMPONENTS]   [STATES]
```

Use very strong typography.

Create visual depth around the hero.

Possible elements:

* tiny eyebrow label
* large editorial heading
* short supporting statement
* version/status indicator
* component count
* interactive navigation
* subtle glass panel

Make it feel like a premium product launch page.

---

# 8. STICKY NAVIGATION

Create a premium sticky navigation/header.

It should remain useful while scrolling.

Include:

* design system title
* section navigation
* current section indication
* optional search/filter
* responsive hamburger

Desktop:

```text
Brand     Foundations  Components  States  Responsive
```

Tablet/mobile:

```text
Brand                                  ☰
```

Do not make the navigation huge.

Use glass/translucent styling.

---

# 9. SECTION DESIGN

Every section must have strong visual identity.

Do NOT make every section:

```text
white box
heading
paragraph
border
```

Instead vary compositions.

Use combinations of:

* open canvas
* floating cards
* glass panels
* horizontal strips
* split layouts
* large typography
* component playgrounds
* interactive demonstrations
* comparison layouts

The entire page should feel editorial and intentional.

---

# 10. COLOR SYSTEM

Show every available design-system color.

For each color include:

* visual swatch
* name
* semantic purpose
* variable name
* usage example
* contrast context where useful

Example:

```text
PRIMARY

████████

Primary
--color-primary

Used for:
Primary actions
Interactive states
Brand emphasis
```

Make the swatches visually beautiful.

Avoid making them look like a basic spreadsheet.

Use:

* large swatches
* subtle labels
* elegant typography
* hover interaction
* copy-variable interaction if appropriate

When a swatch is hovered:

* slightly elevate
* reveal variable name
* show usage
* provide copy interaction if useful

---

# 11. TYPOGRAPHY

Show the complete typography hierarchy.

Include:

* display
* heading 1
* heading 2
* heading 3
* body large
* body
* body small
* caption
* label
* button text
* overline

Show actual examples rather than only specifications.

Example:

```text
DISPLAY
The future of effortless design.

HEADING 1
A complete design language.

HEADING 2
Build with confidence.

BODY
Supporting interface copy...
```

Show:

* size
* weight
* line height
* letter spacing
* semantic purpose

Do not make typography documentation look like a table.

---

# 12. SPACING

Create a visual spacing scale.

Show spacing using actual visual measurements.

Example:

```text
4
8
12
16
24
32
48
64
80
```

Use elegant horizontal/vertical visual indicators.

Avoid a boring numeric list.

---

# 13. BUTTON SYSTEM

Show all button variants.

Include every state that applies:

* Primary
* Secondary
* Tertiary / Ghost
* Destructive
* Icon button
* Text button

States:

* Default
* Hover
* Focus
* Active
* Disabled
* Loading
* Success where applicable

Every interactive button must actually demonstrate its state.

Example:

```text
DEFAULT     HOVER       FOCUS       DISABLED
[Button]    [Button]    [Button]    [Button]
```

Do not fake the visual hierarchy.

---

# 14. INPUT SYSTEM

Show:

* text input
* search
* textarea
* select
* date field if specified
* password if specified
* checkbox
* radio
* toggle

States:

* Empty
* Filled
* Focus
* Hover
* Disabled
* Error
* Success
* Required

Show realistic values.

Use clear validation messages.

Example:

```text
Email
┌───────────────────────────────┐
│ jershika@example.com          │
└───────────────────────────────┘
```

Do not make inputs excessively rounded unless T00 already uses that style.

---

# 15. CARDS

Show all relevant card patterns.

Do not use identical cards everywhere.

Demonstrate:

* basic card
* glass card
* interactive card
* selected card
* disabled card
* status card
* information card
* action card

Use hierarchy.

Some cards should feel almost floating.

Some can have subtle glass layers.

---

# 16. TABLES

Show the required table.

Desktop:

Normal structured table.

Tablet:

Maintain readable horizontal layout without breaking the viewport.

Mobile at 360px:

Convert the table into stacked cards.

Required mobile pattern:

```text
Status              Active
Owner               Jershika
Created             08 Oct 2026
```

Label:

```text
font-weight: medium
```

Value:

```text
primary text
```

Do NOT allow horizontal scrolling on mobile.

---

# 17. TABS

Demonstrate:

* default
* active
* hover
* focus
* disabled

The active indicator should feel polished.

Use subtle animation.

Avoid generic Bootstrap-style tabs.

---

# 18. FILTERS

Create realistic filters.

Include:

* filter button
* dropdown
* selected filter
* removable filter chip
* reset filters
* active state

Interactions must work.

Example:

```text
[Filter] [Status: Active ×] [Role: Admin ×] [Clear]
```

---

# 19. MODALS

Create functional modal demonstrations.

States:

* default
* confirmation
* destructive confirmation
* success
* error

The modal should include:

* backdrop
* title
* description
* actions
* close button
* keyboard focus handling

Desktop:

Centered glass modal.

Mobile:

Full-screen bottom sheet.

Animation:

Slide upward + fade.

Do NOT use an abrupt appearance.

---

# 20. DRAWERS

Create a functional drawer.

Desktop:

Side drawer.

Tablet:

Overlay drawer.

Mobile:

Full-screen or near-full-screen sheet depending on content.

Required interaction:

```text
Open drawer
↓
Backdrop appears
↓
Drawer slides in
↓
Close
↓
Backdrop disappears
```

Escape key should close it.

Focus should remain usable.

---

# 21. LOADING STATES

Do not only write:

```text
Loading...
```

Demonstrate realistic loading UI.

Use:

* skeletons
* spinner where appropriate
* button loading
* card loading
* table loading

Skeleton animation should be subtle.

No flashy animation.

---

# 22. EMPTY STATES

Create polished empty states.

Include:

* visual/icon
* title
* supporting text
* primary action

Example:

```text
Nothing here yet

Once data is added, it will appear here.

[Create something]
```

Do not make the empty state childish.

---

# 23. ERROR STATES

Demonstrate:

* inline field error
* component error
* page-level error
* retry action

Use the existing semantic error color.

Keep error messaging calm and clear.

---

# 24. SUCCESS STATES

Show:

* success toast
* successful form state
* confirmation state
* success button state

Animations should be subtle and premium.

---

# 25. LOCKED STATES

Where applicable, show:

* locked button
* locked card
* restricted content
* permission message

Make locked states visually obvious without making them ugly.

---

# 26. TOAST / NOTIFICATION SYSTEM

Create interactive notifications if applicable.

Include:

* success
* error
* warning
* information

Use appropriate hierarchy.

Allow dismissing.

Animate in/out smoothly.

---

# 27. MICRO-INTERACTIONS

This is VERY important.

The page must feel alive.

Add tasteful interactions such as:

* buttons slightly lifting on hover
* cards subtly elevating
* glass surfaces shifting light
* tabs smoothly transitioning
* underline/indicator motion
* modal transitions
* drawer transitions
* toast entrance
* skeleton shimmer
* dropdown transitions
* focus transitions
* copy-variable feedback

Do NOT add random animation everywhere.

Animation must communicate:

* hierarchy
* interaction
* state
* continuity

---

# 28. GLASSMORPHISM

Use glass carefully.

Preferred characteristics:

```text
translucent surface
+
backdrop blur
+
subtle border
+
soft shadow
+
ambient background
```

Example conceptual CSS:

```css
background: color-mix(
  in srgb,
  var(--surface-primary) 72%,
  transparent
);

backdrop-filter: blur(20px);

border: 1px solid var(--border-subtle);

box-shadow: var(--shadow-lg);
```

Only use techniques compatible with the existing design system.

Do NOT make every element glass.

Use glass to create hierarchy.

---

# 29. DEPTH

Create at least three visual depth levels:

### Level 1

Background

### Level 2

Primary surfaces

### Level 3

Floating / interactive surfaces

This creates the premium feeling.

Do not rely only on borders.

---

# 30. RESPONSIVE DESIGN

Breakpoints:

```text
Desktop ≥ 1024px
Tablet 768–1023px
Mobile < 768px
```

Design specifically for:

```text
360px
768px
1024px
1440px
```

Do not simply shrink the desktop version.

---

# 31. TABLET

At tablet:

* sidebar hidden
* hamburger visible
* sidebar opens as overlay drawer
* dimmed backdrop
* drawer closes on backdrop click
* Escape closes drawer

Content must remain balanced.

---

# 32. MOBILE

Design at exactly:

### 360px

This is a critical requirement.

At mobile:

* tables become stacked cards
* modals become full-screen sheets
* drawers adapt appropriately
* navigation collapses
* spacing becomes tighter
* typography scales intelligently
* controls remain touch-friendly

Primary page action:

### Floating yellow round button

Specifications:

```text
56px × 56px
position: fixed
bottom: 20px
right: 20px
```

Use the existing yellow variable from the design system.

Do NOT type a hex code.

The floating action button should have:

* elegant shadow
* subtle hover
* pressed state
* focus ring
* accessible label

---

# 33. NO HORIZONTAL SCROLL

At:

```text
360px
768px
1024px
1440px
```

There must be:

```text
NO horizontal page scrolling.
```

Test this explicitly.

Look for:

* overflowing tables
* oversized headings
* wide cards
* fixed-width components
* modal overflow
* navigation overflow
* long labels
* code samples

Fix them.

---

# 34. ACCESSIBILITY

Every interactive control must be keyboard accessible.

Requirements:

* Tab navigation
* visible focus ring
* Enter activation
* Space activation where appropriate
* Escape closes modal/drawer
* logical focus order
* accessible labels
* button semantics
* input labels
* adequate contrast

NEVER remove the browser focus indicator without replacing it with a better visible focus state.

Example:

```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 3px;
}
```

Use the existing design-system variable if available.

---

# 35. INTERACTION REQUIREMENTS

The HTML must not be a static screenshot.

Implement real interactions.

Required examples:

### Navigation

Click section → scroll to section.

### Sidebar

Hamburger → drawer.

### Modal

Open → modal.
Close → modal disappears.

### Drawer

Open → drawer.
Backdrop → close.

### Tabs

Click tab → active content changes.

### Filters

Select filter → filter chip appears.

### Toast

Trigger → notification appears.
Close → notification disappears.

### Buttons

Demonstrate hover/focus/disabled/loading.

### Color tokens

Copy action if useful.

Show a small feedback message after copying.

---

# 36. COMPONENT PLAYGROUND

Where possible, create a small "interactive playground" for major components.

For example:

```text
BUTTON PLAYGROUND

Variant
[ Primary ▼ ]

Size
[ Medium ▼ ]

State
[ Default ▼ ]

Preview

        [Continue]
```

This makes the design system feel like a real tool rather than documentation.

Use this especially for:

* buttons
* inputs
* cards
* badges
* tabs
* modals

---

# 37. VISUAL CONSISTENCY

Everything must feel related.

Use a consistent system for:

* border radius
* spacing
* shadows
* typography
* transitions
* icon sizing
* control heights
* alignment

Never randomly change radius or spacing.

---

# 38. ICONS

Use a consistent icon system.

Do NOT mix:

* random emoji
* different icon styles
* unrelated SVG styles

Avoid emoji as UI icons.

Icons should feel professional and minimal.

---

# 39. CONTENT

Use realistic product content.

Do not fill the page with:

```text
Lorem ipsum
Example text
Test
Card title
Sample
```

Use meaningful labels and realistic data.

The design should look like a real production product.

---

# 40. AVOID "DOCUMENTATION PAGE" VISUALS

This is one of the most important requirements.

DO NOT create:

```text
Section title
paragraph
bordered box
section title
paragraph
bordered box
```

repeated for the entire page.

Instead create visual rhythm:

```text
large editorial section
↓
component showcase
↓
interactive playground
↓
visual comparison
↓
floating component examples
↓
full-width demonstration
↓
state gallery
```

The page should be enjoyable to scroll.

---

# 41. PREMIUM VISUAL DETAILS

Add small details that make the design feel finished.

Examples:

* tiny section labels
* elegant divider lines
* subtle gradients
* glass reflections
* soft shadows
* hover elevation
* animated active indicators
* subtle background lighting
* tiny status indicators
* refined corner radii
* visual grouping
* carefully controlled whitespace

Use these sparingly.

The result should feel **intentional rather than decorated**.

---

# 42. MOTION

Use motion where it improves the interface.

Recommended duration:

```text
150ms — micro interaction
200ms — normal transition
300ms — modal/drawer
400ms — larger entrance
```

Use easing such as:

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

Avoid excessive bouncing.

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

When reduced motion is enabled, disable unnecessary animation.

---

# 43. CODE QUALITY

Keep the implementation clean.

Do not create:

* duplicate CSS
* duplicate components
* unnecessary inline styles
* random magic numbers
* unnecessary JavaScript
* hardcoded colors
* inaccessible interactions

Prefer:

```text
semantic HTML
+
CSS variables
+
reusable classes
+
small reusable JS functions
```

---

# 44. FILE RESPONSIBILITIES

### `design-system.html`

Contains:

* semantic markup
* component examples
* state examples
* interaction hooks

### `styles.css`

Contains:

* design tokens
* colors
* typography
* spacing
* layout
* responsive styles
* glass styling
* animations
* focus states

### JavaScript

Contains:

* navigation
* modal
* drawer
* tabs
* filters
* toast
* interactive demonstrations

Do not put large amounts of CSS inside HTML.

Do not use inline color values.

---

# 45. CSS VARIABLE RULE

Before writing new styles, inspect existing `styles.css`.

Reuse existing variables.

If variables are missing, create a coherent semantic token system.

Example:

```css
:root {
  --color-primary: ...;
  --color-secondary: ...;

  --surface-primary: ...;
  --surface-secondary: ...;
  --surface-glass: ...;

  --text-primary: ...;
  --text-secondary: ...;
  --text-muted: ...;

  --border-subtle: ...;
  --border-strong: ...;

  --success: ...;
  --warning: ...;
  --error: ...;

  --radius-sm: ...;
  --radius-md: ...;
  --radius-lg: ...;

  --shadow-sm: ...;
  --shadow-md: ...;
  --shadow-lg: ...;
}
```

Do NOT invent arbitrary values if equivalent existing variables already exist.

---

# 46. MOBILE QUALITY BAR

At 360px, check manually:

### Header

No overflow.

### Hero

Heading wraps elegantly.

### Navigation

No clipped controls.

### Cards

No horizontal overflow.

### Tables

Converted into stacked cards.

### Modal

Full-screen sheet.

### Buttons

Touch friendly.

### Inputs

Full width.

### Floating Action Button

Exactly 56px.

### Typography

No awkward wrapping.

### Footer

No overflow.

---

# 47. DESKTOP QUALITY BAR

At 1440px:

The page should NOT feel stretched.

Use:

```text
max-width
```

for content.

Create strong composition.

Use the available space intelligently.

The page should feel spacious but not empty.

---

# 48. 1024px QUALITY BAR

At 1024px:

* sidebar behavior should transition correctly
* content should not become cramped
* cards should adapt
* navigation should remain usable
* tables should remain readable

---

# 49. 768px QUALITY BAR

At 768px:

* tablet layout
* hamburger
* overlay sidebar
* no desktop overflow
* comfortable touch targets

---

# 50. VISUAL QA

After implementation, inspect the page at:

```text
360px
768px
1024px
1440px
```

Check:

* no horizontal scroll
* no clipped text
* no overlapping elements
* no broken cards
* no broken modals
* no broken tables
* no broken navigation
* focus states visible
* responsive behavior correct
* colors consistent
* typography consistent
* glass effects not excessive

Fix every visible issue.

---

# 51. FINAL QUALITY TEST

Before considering the work complete, verify:

### Design

* Premium
* Elegant
* Classy
* Glassy
* Visually engaging
* Strong hierarchy
* Not documentation-like

### System

* Every color demonstrated
* Every typography style demonstrated
* Every component demonstrated
* Every required state demonstrated

### Interaction

* Buttons work
* Tabs work
* Filters work
* Modal works
* Drawer works
* Toast works
* Navigation works

### Responsive

* 360px
* 768px
* 1024px
* 1440px

### Accessibility

* Keyboard navigation
* Visible focus
* Escape behavior
* Labels
* Touch targets

### Code

* No hardcoded hex colors in HTML
* CSS variables used
* Reusable styles
* Clean structure

---

# 52. MOST IMPORTANT DESIGN RULE

If you have to choose between:

### "Technically correct but visually boring"

and

### "Technically correct + premium + visually impressive"

ALWAYS aim for the second.

But do not sacrifice:

* usability
* accessibility
* responsive behavior
* consistency
* maintainability

The design should feel like something a **top-tier product design team would actually ship**.

---

# 53. FINAL CREATIVE DIRECTION

Imagine opening the page for the first time.

The reaction should be:

> "This is a design system."

Not:

> "This is a documentation page."

It should feel like a **premium interactive design laboratory**.

Use:

**glass + depth + typography + whitespace + subtle motion + elegant color + strong composition**

to make the experience memorable.

Every section should have a reason to exist.

Every interaction should feel intentional.

Every pixel should feel considered.

Do not stop at "working".

Push the visual quality until the result feels **extremely polished, premium, unique, elegant and production-ready.**

---

# EXECUTION RULE

Do not explain what you are going to build.

Inspect the existing files and implement it.

After implementation:

1. Review the result.
2. Identify anything that looks generic, flat, boring, or documentation-like.
3. Improve it.
4. Check all four viewport sizes.
5. Fix all overflow and interaction issues.
6. Only then consider the task complete.
