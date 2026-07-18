# QuestOS — Implementation Plan

QuestOS is a Life Operating System: quests turn real life into missions, every completion feeds XP, skills, achievements, timeline, and legacy. The spec spans 6 chapters (Vision, UX, Quests, XP/Character, Calendar, AI). We'll build in phases so each one is usable on its own.

## Design direction

- **Vibe**: "opening your game save file" — cinematic, calm, rewarding. Not childish, not corporate. Think Linear meets a well-designed RPG HUD.
- **Theme**: Dark-first with a light mode. Deep near-black background, one signature accent (proposed: warm gold `oklch(0.82 0.15 85)` for XP/level, cool violet `oklch(0.65 0.20 285)` for main quest, with per-category accent hues). All colors as semantic tokens in `src/styles.css`.
- **Type**: Display serif or geometric sans for headings (e.g. "Fraunces" or "Space Grotesk"), Inter for body. Loaded via `<link>` in `__root.tsx`.
- **Motion**: Subtle by default; celebration animations gated by user's Celebration Style preference (GTA / Minecraft / Modern / Silent).
- **Navigation**: Bottom tab bar on mobile, left rail on desktop — Home, Quests, Calendar, Legacy, Profile. Floating Action Button on every primary page.

## Phase 1 — Foundation & Design System (this build)

1. Replace placeholder `src/routes/index.tsx` with the Home dashboard shell.
2. Establish design tokens in `src/styles.css`: background/foreground, primary (gold), secondary (violet), muted, category color scale (fitness/business/academics/coding/football/creativity/finance/health), quest-type accents, celebration surfaces. All `oklch`.
3. Global shell: bottom nav (mobile) / side rail (desktop), consistent header, FAB.
4. Route files created up-front (empty shells are fine): `/` (Home), `/quests`, `/calendar`, `/legacy`, `/profile`. Real `head()` metadata per route.
5. Seed a small local demo dataset (in-memory / localStorage) so screens render meaningfully before Lovable Cloud is wired.

Deliverable: navigable app with the visual identity locked in.

## Phase 2 — Quest System

- Quest model: title, description, category, type (Main/Daily/Weekly/Side/Boss), priority, difficulty, estimated duration, XP, deadline, subtasks, tags, repeat schedule.
- Quest list screen with tabs (Main/Daily/Weekly/Side/Boss/Completed/Archived) and filters.
- Quick-create flow (< 30s target) + full editor.
- Completion flow with celebration animation styles.
- Templates (Morning Routine, Gym Session, etc.).

## Phase 3 — Calendar & Scheduling

- Today / Tomorrow / 7-day / Weekly / Monthly / Agenda / Timeline views.
- Drag & drop reschedule, recurring quests (Daily/Weekdays/Weekly/Custom), time blocks, conflict warnings.
- Daily Planner + Weekly Planner summary cards.

## Phase 4 — XP, Character & Legacy

- XP awarded on completion, category XP breakdown, life level, attributes, skill tree stubs.
- Achievements + Momentum (soft streaks).
- Legacy tab: timeline, milestones, memory vault, monthly/season/year reviews.

## Phase 5 — Lovable Cloud (persistence + auth)

- Enable Cloud, migrate schema (users, quests, quest_completions, xp_events, achievements, journal_entries, ai_memory).
- RLS + `user_roles` pattern.
- Real auth (email + Google), replace localStorage.

## Phase 6 — AI Operating System (via Lovable AI Gateway)

- Quest-from-goal: "I want to lose 10kg" → generated Main + Weekly + Daily quests.
- Morning Brief, Evening Reflection, Weekly Reflection, Monthly Reflection.
- Future Me letters, Goal Simulator, Dream Board.
- AI Memory: view/edit/delete/pin/disable/export.

## What I need from you before I start Phase 1

- **Confirm the design direction** above (dark, gold + violet, serif-or-Grotesk display). Say "go" or tell me what to swap.
- **First-launch setup**: implement the full onboarding (name/age/timezone/profession/goals/wake-sleep/celebration style) in Phase 1, or stub it and add later? Recommendation: stub in Phase 1, build fully in Phase 2.
- **Auth from day one, or local-only until Phase 5?** Recommendation: local-only so we can iterate on UI fast.

Reply with any changes and I'll start Phase 1.