# Frontend Structure

This project now uses a structured static frontend instead of single-file pages.

## Current Pages

- `frontend/public/login.html`: login page
- `frontend/public/bot-chat-ui-v2.html`: user chat console
- `frontend/public/bot-admin-ui-v2.html`: admin console

## Assets

- `frontend/public/assets/styles/login.css`
- `frontend/public/assets/styles/chat.css`
- `frontend/public/assets/styles/admin.css`
- `frontend/public/assets/scripts/login.js`
- `frontend/public/assets/scripts/chat.js`
- `frontend/public/assets/scripts/admin.js`
- `frontend/public/assets/lib/api-client.js`
- `frontend/public/assets/lib/auth-manager.js`
- `frontend/public/assets/lib/bot-client.js`

## Routing and Serving

- Backend serves static files from `frontend/public`.
- Default entry is `frontend/public/index.html` which redirects to `login.html`.
- API routes stay unchanged under `/api/*`.

## Refactor Direction

- Keep page-level entry files small and focused.
- Move reusable UI logic into shared modules under `assets/scripts`.
- Move shared design tokens and component styles into shared CSS files.
- If you want a full SPA migration, this layout can be transitioned to Vite + React incrementally.
