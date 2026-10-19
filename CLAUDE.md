# Project
Hiking app frontend. React + Vite.

# Task
Задача описана в файле TASK.md, строго придерживайся задачи. Правила, описанные в файле TASK.md, имеют наибольший приоритет.

# Stack
- React 19, hooks
- Fetch API (no axios)
- Plain CSS (no Tailwind, no CSS-in-JS)

# Structure
src/components/screens/ — экраны
src/components/ — переиспользуемые компоненты
src/api/client.js — API-клиент с apiFetch
src/auth/AuthProvider.jsx — авторизация
src/navigation/ навигация
src/navigation/AppNavigator.jsx навигатор по экранам, перечисленным в screens.js
src/navigation/screens.js список экранов

# Conventions
- Functional components only
- Named exports preferred
- Async/await (no .then)
- Error handling: try/catch, показ toast

# Don'ts
- No new deps without asking

- No TypeScript for now

# Working style
- Make one change at a time
- Commit after each working change
- Ask before large refactors
- Never modify files outside the task scope