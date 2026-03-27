# Design System Strategy: The Sacred Modernist

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Sanctuary."**

We are moving away from the cluttered, "utility-first" map applications of the past and toward a high-end editorial experience that feels as intentional as a Parisian cathedral. The system rejects the "standard grid" in favor of **Atmospheric Depth**. By utilizing wide margins, intentional asymmetry, and a "Glass-on-Vellum" layering technique, we create a UI that breathes. This isn't just a church finder; it is a premium curation of history and spirituality. We prioritize the "quiet" moments—letting high-contrast typography and vast negative space guide the user's eye.

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, ecclesiastical violet, balanced by architectural grays and warm whites.

### The "No-Line" Rule
To achieve a "Liquid UI" feel, **1px solid borders for sectioning are strictly prohibited.**
*   **The Technique:** Define boundaries through background shifts. A `surface-container-low` section should sit directly on a `surface` background.
*   **The Result:** The interface feels like a continuous, carved piece of marble rather than a collection of boxes.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of semi-transparent layers.
*   **Base:** `surface` (#f9f9ff)
*   **Secondary Content:** `surface-container-low` (#f1f3ff)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff)
*   **Nesting:** Place a `surface-container-lowest` card inside a `surface-container-low` sidebar to create a soft, natural lift.

### The "Glass & Gradient" Rule
Floating elements (Modals, Navigation Bars, and Detail Sheets) must utilize **Glassmorphism**.
*   **Token:** Use `surface` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Texture:** Use a subtle linear gradient on Primary CTAs (`primary` #630ed4 to `primary-container` #7c3aed) at a 135-degree angle. This adds a "silk" finish that flat hex codes lack.

## 3. Typography: Editorial Authority
We use the Apple system stack (SF Pro) with an editorial eye. Hierarchy is achieved through extreme scale contrast rather than color changes.

*   **Display-LG (3.5rem):** Reserved for hero titles (e.g., "Notre-Dame de Paris"). Use tight letter-spacing (-0.02em) to mimic premium print.
*   **Headline-SM (1.5rem):** Used for section headers. Always paired with generous top-padding (`spacing-12`) to allow the text to "own" the space.
*   **Body-MD (0.875rem):** The workhorse. Use `on-surface-variant` (#4a4455) for secondary metadata to maintain a soft, professional gray-scale.
*   **Label-SM (0.6875rem):** All-caps with +0.05em letter-spacing for "Overline" text (e.g., DISTRICT 4).

## 4. Elevation & Depth
We eschew "Material" shadows for **Tonal Layering** and **Ambient Light**.

*   **The Layering Principle:** Depth is "baked into" the background colors. No shadow is needed when moving from `surface-dim` to `surface-bright`.
*   **Ambient Shadows:** For floating elements like the "Search Here" bar, use a `40px` blur with 4% opacity of the `on-surface` color. It should look like a soft glow, not a drop shadow.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility (e.g., search inputs), use `outline-variant` (#ccc3d8) at **15% opacity**. It should be felt, not seen.
*   **Pulse & Shimmer:** Active map markers use a `pulse` animation with a 2s duration, expanding a 10% opacity `primary` ring to signify life and activity.

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-container`), `rounded-xl` (0.75rem), white text.
*   **Secondary:** No background, `outline-variant` ghost border (15%), `rounded-xl`.
*   **Interaction:** 200ms ease-in-out "Hover Lift" (transform: translateY(-2px)).

### Inputs & Search
*   **Style:** `surface-container-lowest` background, ghost border, `rounded-full` (9999px) for search bars to mimic Apple Maps.
*   **Micro-interaction:** On focus, the ghost border opacity increases from 15% to 40%.

### Cards & Lists (The "No Divider" Rule)
*   **Forbid Divider Lines:** Never use a line to separate church listings.
*   **The Alternative:** Use `spacing-4` vertical gaps. The change in typography (Title-SM to Body-SM) provides the necessary cognitive break.
*   **Shimmer Skeletons:** Use a linear-gradient shimmer on `surface-container-high` during data fetches.

### The "Altar" (Custom Component)
*   **The Detail Sheet:** A bottom-anchored slide-up panel with `backdrop-blur-xl`. It features a "Grabber" (a 32x4mm pill of `outline-variant` at 20% opacity) and houses high-resolution photography of the church interiors.

## 6. Do's and Don'ts

### Do:
*   **Embrace Whitespace:** If a layout feels crowded, double the padding. High-end design is "expensive" space.
*   **Use Lucide with Precision:** Icons should always be `1.25px` or `1.5px` stroke width. Never `2px` (too heavy) or `1px` (too fragile).
*   **Smooth State Transitions:** Every state change (hover, focus, active) must have a `200ms` cubic-bezier transition.

### Don't:
*   **No Pure Blacks:** Never use #000000. Use `on-background` (#181c24) for text to keep the contrast "human" and readable.
*   **No Sharp Corners:** Avoid `rounded-none`. Even the most formal cards should have at least `rounded-md` (0.375rem) to feel approachable.
*   **No Grid-Lock:** Don't feel forced to align every image to the text. Overlap a map marker over a card edge to create "The Curator's Layer."

## Color Tokens

| Token | Hex |
|-------|-----|
| primary | #630ed4 |
| primary-container | #7c3aed |
| secondary | #6a4fa0 |
| secondary-container | #c4a7ff |
| tertiary | #7d3d00 |
| tertiary-container | #a15100 |
| surface | #f9f9ff |
| surface-container-low | #f1f3ff |
| surface-container | #ebedfa |
| surface-container-high | #e5e8f4 |
| surface-container-highest | #dfe2ee |
| surface-container-lowest | #ffffff |
| surface-dim | #d7dae6 |
| on-surface | #181c24 |
| on-surface-variant | #4a4455 |
| on-background | #181c24 |
| background | #f9f9ff |
| outline | #7b7487 |
| outline-variant | #ccc3d8 |
| error | #ba1a1a |
| on-primary | #ffffff |
| on-secondary | #ffffff |
| inverse-surface | #2c3039 |
| inverse-on-surface | #eef0fd |
| inverse-primary | #d2bbff |
