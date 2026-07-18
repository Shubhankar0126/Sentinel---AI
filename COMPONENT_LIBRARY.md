# Sentinel AI Component Library

Last updated: Thursday, July 16, 2026

## UI Primitives

- `Button`
  - Primary, secondary, ghost, danger, and success variants.
- `Input`
  - Standard text and numeric input styling.
- `Textarea`
  - Multi-line input and read-only evidence blocks.
- `Select`
  - Compact enterprise select control.
- `Checkbox`
  - Boolean form control.
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`, `CardFooter`
  - Base information surface primitives.
- `Badge`
  - Compact semantic state labeling.
- `Skeleton`
  - Loading placeholder with shimmer.
- `Table` primitives
  - Shared tabular data presentation.
- `Modal`
  - Centered overlay for search and confirmations.
- `Drawer`
  - Right-side panel for details and mobile navigation.

## Shared Product Components

- `EnterpriseCard`
  - Default enterprise panel wrapper.
- `MetricCard`
  - Animated KPI tile for command-center metrics.
- `StatusBadge`
  - Maps lifecycle, workflow, and operational states to semantic styles.
- `RiskBadge`
  - Maps severity levels to safety-oriented visual language.
- `PageHeader`
  - Page identity, description, and action slot.
- `FilterBar`
  - Shared control row wrapper.
- `SearchBar`
  - Inline search field with icon.
- `Pagination`
  - Page-navigation footer for list endpoints with pagination metadata.
- `ActivityFeed`
  - Vertical feed for alerts and operational activity.
- `Timeline`
  - Investigation and event-sequence presentation.
- `EmptyState`
  - Explicit empty-result experience.
- `LoadingState`
  - Shared skeleton-based loading state.
- `ErrorState`
  - Retry-aware error presentation.
- `SuccessBanner`
  - Positive mutation and workflow feedback.
- `ConfirmationDialog`
  - Reusable confirmation overlay.

## Navigation and Shell

- `AppShell`
  - Protected enterprise application frame.
- `Sidebar`
  - Desktop operational navigation.
- `MobileNavigation`
  - Drawer-based mobile navigation.
- `TopNavigation`
  - Sticky header with search, notifications, and session controls.
- `Breadcrumbs`
  - Context trail inside the app shell.
- `UserMenu`
  - Session profile and theme switching.
- `Footer`
  - Product footer.
- `CommandPalette`
  - Cross-entity search over navigation, plants, equipment, workers, and incidents.
- `NotificationCenter`
  - Drawer-based unread and recent notification experience.

## Data Visualization

- `SeverityBarChart`
  - Recharts bar chart for severity distributions.
- `StatusDonutChart`
  - Recharts donut chart for categorical status mixes.
- `PlantMapView`
  - Leaflet wrapper.
- `PlantMapViewInner`
  - Client-only map implementation for plant and zone coordinates.

## Feature Components

- `LoginForm`
  - JWT login using the existing FastAPI auth API.
- `ForgotPasswordPanel`
  - Assisted reset workflow aligned with the current backend capability set.
- `DashboardOverview`
  - Dashboard summary orchestration and layout.
- `CopilotWorkbench`
  - Gemini + RAG chat, citations, and conversation memory UI.

## Provider Components

- `AppProviders`
  - Root provider composer.
- `AppErrorBoundary`
  - Global runtime safety net.
- `AuthProvider`
  - Session bootstrap, refresh, and user state.
- `NotificationProvider`
  - Toast system.
- `QueryProvider`
  - React Query client configuration.
- `ThemeProvider`
  - Dark, light, and system theming.

## Service and State Support

- `apiClient`
  - Shared Axios client with JWT, refresh-token handling, and safe retry behavior.
- `authStorage`
  - Local token persistence helpers.
- `queryKeys`
  - Central React Query key registry.
