# Design System Strategy: The Living Canvas

## 1. Overview & Creative North Star
This design system is built upon the "Creative North Star" of **The Living Canvas**. Unlike traditional minimalist frameworks that can feel clinical or unfinished, this system treats the screen as a physical, tactile surface—similar to high-grade washi paper. It synthesizes the modular logic of Notion, the focused intimacy of Inkdrop, and the spatial depth of Obsidian.

The goal is to move beyond "minimalism as an absence of content" and toward **"intentionality as a presence of space."** We achieve this through asymmetrical layouts that allow the eye to rest, high-contrast typography scales that feel editorial, and a total rejection of the "boxed-in" UI. Elements do not sit *on* the page; they emerge from it.

## 2. Colors & Surface Philosophy
The palette is a collection of warm, organic neutrals designed to reduce eye strain and promote a "flow state." 

### The "No-Line" Rule
Standard UI relies on 1px borders to separate ideas. This system prohibits them. To define sections, use **Tonal Transitions**. 
*   **Surface Hierarchy:** Place a `surface-container-low` (#f4f4f0) element against a `surface` (#faf9f6) background. The change in "warmth" provides the boundary.
*   **The Glass & Gradient Rule:** For floating elements (modals or popovers), use the `surface_container_lowest` (#ffffff) with a 60% opacity and a `backdrop-filter: blur(20px)`. This creates a "frosted glass" effect that feels premium and integrated.
*   **Signature Textures:** Use the primary accent (`primary` #516355) sparingly. It should feel like a soft ink stamp on paper. Main CTAs should utilize a soft gradient from `primary` to `primary_container` (#d4e8d6) to provide a subtle "glow" that flat colors lack.

## 3. Typography: The Editorial Voice
We use a single typeface—**Inter**—but treat it with the reverence of a print magazine. The hierarchy is driven by weight and line height rather than an explosion of font sizes.

*   **Generous Breathing Room:** All body text (`body-lg`, `body-md`) must utilize a line-height of at least 1.6 to 1.8. 
*   **The Display Scale:** Use `display-lg` (3.5rem) for moments of arrival, paired with `on_surface_variant` (#5c605c) to soften the impact.
*   **The Label Identity:** Small labels (`label-sm`) should be tracked out (letter-spacing: 0.05em) and set in Medium or SemiBold weight to act as "navigational anchors" amidst the whitespace.

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than traditional structural shadows.

*   **The Layering Principle:** 
    *   Base: `surface` (#faf9f6)
    *   Secondary Content: `surface-container-low` (#f4f4f0)
    *   Interactive Cards: `surface-container-lowest` (#ffffff)
*   **Ambient Shadows:** If a floating element requires lift, use a shadow with a 32px blur and 4% opacity, using the `on_surface` color (#2f3430) as the shadow tint. It should look like a soft atmospheric occlusion, not a "drop shadow."
*   **The "Stitched" Detail:** To highlight an active or focused element (like a selected note or a code block), use a 1px dashed line (the "stitched" line) using `outline-variant` (#afb3ae). This provides a tactile, bespoke feel without the heaviness of a solid border.

## 5. Components

### Buttons
*   **Primary:** A soft, pill-shaped container using `primary_container`. No border. Text in `on_primary_container`.
*   **Secondary:** No background. A `stitched` dashed line only on the bottom or as a soft underline to indicate interactivity.
*   **States:** On hover, primary buttons should shift to `primary_fixed_dim`. Transitions must be slow (300ms) to maintain the "Zen" vibe.

### Cards & Containers
*   **The Forbid Rule:** Never use divider lines. 
*   **The Implementation:** Use vertical whitespace (e.g., 48px or 64px) to separate content blocks. If containment is necessary, use a subtle background shift to `surface-container-high` (#e6e9e4) with a corner radius of `xl` (0.75rem).

### Input Fields
*   **Quiet Inputs:** Inputs are simply a line of text on the `surface`. Upon focus, a subtle "stitched" dashed line appears beneath the text in `primary` (#516355). 
*   **Error States:** Use `error` (#9f403d) only for the text. The background should remain neutral to avoid "visual shouting."

### Modularity (The "Block" System)
Borrowing from Notion, every element is a "block." Blocks are separated by 24px of empty space. This allows the user to perceive the UI as a collection of individual thoughts rather than a cluttered interface.

## 6. Do's and Don'ts

### Do
*   **Do** embrace asymmetry. Center a narrow column of text but offset the functional icons to the far right.
*   **Do** use `on_surface_variant` (#5c605c) for secondary text to create a soft, low-contrast reading experience.
*   **Do** use the "stitched" dashed line for focus states—it’s our signature tactile accent.

### Don't
*   **Don't** use pure black (#000000). It is too aggressive for this system. Use `on_background` (#2f3430).
*   **Don't** use solid 1px borders. If you feel you need a border, increase the padding or change the background tone instead.
*   **Don't** crowd the edges. Elements should have a minimum of 32px margin from the viewport edge to maintain "spatial clarity."

---
**Director's Final Note:** This system is about the "quiet between the notes." If the UI feels "empty," you are likely on the right track. Your job is to make that emptiness feel premium through perfect typography and subtle tonal shifts.
