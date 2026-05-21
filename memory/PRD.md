# BalansPLN - Product Requirements Document

## Original Problem Statement
"Hej, potrzebuję aplikacji która pomoże mi zbalansować wydatki miesięczne. Chciałbym mógł tam zapisywać ile pieniędzy idzie np. na wynajem, zakupy, opłaty, Subskrypcje itd."

## User Choices
- Bez logowania (single-user, prywatna aplikacja)
- Waluta: PLN (zł)
- Funkcje: kategorie + budżety + wykresy + powtarzające się + przychody
- Styl: decyzja projektanta (wybrano "Organic & Earthy" - forest green + bone white + terracotta)
- AI: Asystent finansowy (Claude Sonnet 4.5 via EMERGENT_LLM_KEY)

## Architecture
- **Backend**: FastAPI + Motor (MongoDB) + emergentintegrations (Claude Sonnet 4.5)
- **Frontend**: React 19 + React Router + Shadcn UI + Recharts + @phosphor-icons/react
- **Design**: Outfit (headings) + Manrope (body), earthy palette, bento-grid dashboard, rounded-2xl cards
- **Storage**: MongoDB collections - categories, transactions, budgets, recurring, ai_messages

## Implemented (Iteration 2 - Feb 2026)
- **Goals (Cele oszczędnościowe)**: Backend endpoints `/api/goals` (GET/POST/PUT/DELETE) and `/api/goals/{id}/contribute`. Frontend `GoalsCard` with progress bars, color picker, deadline, and contribute dialog (supports negative amounts for withdrawals).
- **Transaction filtering & search**: `TransactionsCard` upgraded with search input (matches description, category, amount, date) and category/type filter dropdown.
- **PWA support**: Added `manifest.json`, generated PNG icons (192, 512, maskable, apple-touch, favicon) via `/app/scripts/make_pwa_icons.py`, updated `public/index.html` with proper meta tags (theme-color #1E3A2F, apple-mobile-web-app-capable, Polish lang, real title). Users can now "Add to Home Screen" on Android/iOS.

## Implemented (Iteration 1 - Feb 2026)
### Backend Endpoints
- `GET/POST/DELETE /api/categories` - 9 seeded Polish defaults (Wynajem, Zakupy, Opłaty, Subskrypcje, Transport, Rozrywka, Zdrowie, Jedzenie, Inne)
- `GET/POST/DELETE /api/transactions` (filter by month YYYY-MM)
- `GET/POST/DELETE /api/budgets` (upsert per category+month)
- `GET/POST/DELETE /api/recurring` + `POST /api/recurring/apply` (idempotent per month)
- `GET /api/summary?month=` - balance, income, expenses, breakdown
- `GET /api/trend?months=6` - 6-month trend data
- `POST /api/ai/chat` - Claude Sonnet 4.5 chat with full financial context
- `GET/DELETE /api/ai/messages` - chat history

### Frontend Dashboard
- Hero balance card (text-6xl/7xl forest green)
- Income/Expense summary cards
- Month switcher (prev/next)
- Add Transaction dialog (toggle expense/income, category, date, amount, description)
- Transactions list with delete
- Budgets card with progress bars (red when exceeded)
- Pie chart - expenses by category
- Bar chart - 6-month trend (income vs expenses)
- Recurring expenses card + "Apply now" button
- AI Chat floating button + dialog (suggestions, clear history, real-time chat)
- Toast notifications (sonner)

### Quality
- Backend test pass rate: 100% (10/10 cases)
- Frontend: dashboard, all CRUD flows, AI chat all working
- ResizeObserver overlay suppressed in index.js
- All interactive elements tagged with `data-testid`
- No MongoDB `_id` leaks
- All dates stored as ISO strings

## Backlog (P1)
- Export to CSV/PDF
- Multi-currency support
- Categories with custom icons (icon picker)
- Saving goals (cele oszczędnościowe)
- Filtering transactions by category in the list

## Backlog (P2)
- Receipt OCR (upload + extract)
- Bank statement import (CSV)
- Multi-account support
- Family/shared budgets (requires login)
- Mobile PWA install prompt

## Next Action Items
- User can add transactions and watch the dashboard react in real time
- Consider adding goal-based savings tracking (P1) - would boost engagement
