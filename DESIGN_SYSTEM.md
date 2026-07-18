# Sentinel AI Design System

Last updated: Thursday, July 16, 2026

## Visual Direction

- Industrial
- Enterprise
- Premium
- Professional
- Minimal
- Data dense

The frontend foundation avoids glassmorphism, neon styling, gaming motifs, crypto aesthetics, and heavy decorative gradients.

## Theme Model

- Dark-first, with light and system theme support via `next-themes`.
- Theme tokens live in `frontend/src/styles/tokens.css`.
- Global styling and surface utilities live in `frontend/src/app/globals.css`.

## Color Tokens

- Background: slate-driven dark canvas via `--background`
- Foreground: `--foreground`
- Card / panel surfaces: `--card`
- Primary action: `--primary`
- Accent / signal: `--accent`
- Success: `--success`
- Warning: `--warning`
- Critical: `--critical`
- Borders: `--border`
- Focus ring: `--ring`

## Typography

- Font family: Inter via `next/font/google`
- Large headings for page identity
- Compact supporting text for dense analytical views
- Tight but readable tables
- Clear hierarchy between:
  - eyebrow labels
  - section headers
  - metric values
  - status microcopy

## Spacing and Radius

- Layout follows an 8px rhythm in practice through `gap-4`, `gap-6`, `p-4`, `p-5`, `p-6`, `p-8`.
- Default radius token: `--radius`
- Large surface language uses `rounded-xl` and `rounded-2xl`.

## Surfaces

- Primary panel treatment: `.surface-panel`
- Metric surface treatment: `.metric-tile`
- Shared layout grouping: `.panel-grid`

Surfaces emphasize:

- subtle border separation
- muted translucency
- restrained depth
- strong legibility over ornament

## Motion

- Framer Motion is used for:
  - metric card entrances
  - toast entrances
  - modal animation
  - drawer animation
- Skeleton shimmer is implemented through Tailwind keyframes.
- Motion remains subtle and utilitarian.

## Data Presentation Rules

- Metrics surface important numeric posture first.
- Risk and status states use compact badges.
- Large data blocks favor tables and stacked evidence cards.
- Charts are limited to high-signal analytical use:
  - severity bar chart
  - status donut chart
- Map interactions are reserved for plant and zone spatial awareness.

## Navigation Language

- Persistent desktop sidebar
- Mobile drawer navigation
- Sticky top navigation
- Breadcrumb context
- Role-aware menu visibility
- Global search and command palette
- Notification center
- Session user menu

## Accessibility

- Keyboard focus styling via `.focus-ring`
- Semantic labels for dialogs and action buttons
- Text contrast tuned for dark surfaces
- Mobile navigation and drawers remain keyboard reachable
- Search, notifications, and auth controls include screen-reader labels

## State Design

Every major screen supports at least the following state patterns:

- loading
- skeleton
- error
- success
- empty
- retry

## Backend Alignment

- No mock API layer
- No placeholder screens
- No frontend-only fake data
- Auth, dashboard, risk, analytics, compliance, notifications, and Copilot all point to existing backend APIs only

## Known Product Constraint

- The current backend does not expose a password-reset endpoint.
- The frontend therefore implements an honest assisted-reset workflow instead of a fake self-service flow.
