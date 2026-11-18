# Toast Notification System

## Overview

User feedback (success, errors, warnings) is shown as non-blocking toast notifications instead of `alert()`. The application contains no `alert()` calls.

- Toasts appear in the top-right corner and stack vertically.
- They disappear automatically after a type-specific duration and can be closed manually.
- They slide in and out (Angular animations).

## Toast Types

| Type | Method | Default duration | Color |
|---|---|---|---|
| Success | `success()` | 5 s | Green `rgba(16, 185, 129, 0.95)` |
| Error | `error()` | 7 s | Red `rgba(239, 68, 68, 0.95)` |
| Warning | `warning()` | 6 s | Orange `rgba(245, 158, 11, 0.95)` |
| Info | `info()` | 5 s | Teal `rgba(31, 106, 103, 0.95)` (accent color) |

Each type has its own icon (checkmark, X, triangle, info circle). The text is white on all types.

## Components

### Toast Service
**Location:** `apps/dividends/src/app/services/toast.service.ts`

Signal-based service (`providedIn: 'root'`):

```typescript
export class ToastService {
  toasts = signal<Toast[]>([]);

  success(message: string, duration = 5000): void
  error(message: string, duration = 7000): void
  warning(message: string, duration = 6000): void
  info(message: string, duration = 5000): void
  remove(id: string): void
  clear(): void
}
```

- A `duration` of `0` disables auto-dismiss; the toast must be closed manually.
- Pending timeouts are tracked per toast in a `Map` and cleared in `remove()` and `clear()`, so closing a toast early does not leave timers behind.
- Tests: `toast.service.spec.ts`

### Toast Container Component
**Location:** `apps/dividends/src/app/shared/toast-container/toast-container.component.ts`

- Renders `toastService.toasts()` with a slide-in/slide-out animation (`@slideIn`)
- Each toast has `role="alert"` and a close button with `aria-label="Schließen"`
- Desktop: fixed in the top-right corner, max. width 28rem
- Below 640px: full width with 1rem side margins
- Styles are defined inline in the component; there are no separate dark-mode styles

### Integration
- `apps/dividends/src/app/app.config.ts`: `provideAnimations()`
- `apps/dividends/src/app/layout/main-layout/main-layout.component.html`: `<app-toast-container />`

## Where Toasts Are Used

| Location | Purpose |
|---|---|
| `services/transaction-facade.service.ts` | Success and error messages for CRUD operations, currency creation, import and export |
| `interceptors/error.interceptor.ts` | Central display of HTTP errors (with deduplication) |
| `pages/login/login.component.ts` | Login feedback |

## Usage

```typescript
private readonly toastService = inject(ToastService);

this.toastService.success('Daten wurden gespeichert.');
this.toastService.error('Fehler beim Speichern');
this.toastService.warning('Bitte wählen Sie ein Wertpapier aus der Liste aus');
this.toastService.info('Daten werden geladen...');

// Custom duration
this.toastService.success('Gespeichert!', 3000);

// No auto-dismiss
this.toastService.info('Zum Schließen auf X klicken', 0);
```

HTTP errors do not need to be shown manually in most cases, because `error.interceptor.ts` already displays them as a toast.

## Customization

- **Durations:** default parameters in `toast.service.ts`
- **Colors and position:** `styles` in `toast-container.component.ts` (`.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info`, `.toast-container`)

## Possible Enhancements

1. Limit on the number of visible toasts
2. Progress bar showing the remaining time
3. Action buttons in toasts (e.g. Undo, Retry)
4. Dark-mode specific styles
