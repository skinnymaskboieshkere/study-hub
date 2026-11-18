# Study Hub — notes for Claude

Local single-user study platform: course catalog with an embedded YouTube player, daily plan, roadmap to Computer Vision, Obsidian-style notes linked to video timecodes.

## Source of truth

- `SPEC.md` — full specification (Russian).
- `docs/BRIEF.md` — interview results. **Overrides SPEC where they differ.**
- `docs/ASSESSMENT.md` — risks, proposed SPEC changes, plugin choices.
- `PROGRESS.md` — stage status. Update it at the end of every stage.

## Working rules

- Work stage by stage (SPEC §8; stage 1 is split into 1a/1b per ASSESSMENT). End of every stage:
  `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build` all green →
  check the acceptance criteria in the running app (built-in browser, screenshot) →
  Conventional Commit + push → update `PROGRESS.md` → **stop and report** (what was done, how to check, decisions, what's next).
- Code, identifiers, commits, comments: English. **All UI text: Russian.**
- The user is a 1st-year student: explain key decisions in 1–3 sentences, no lectures.
- Add a dependency only when it is actually needed; use current stable versions.
- Never commit secrets. Before every push check `git status` and the diff for `.env`, `data/`, vault paths.
- Never read or print the value of `YOUTUBE_API_KEY`.
- SPEC §2: no downloading YouTube media, official university sources only, no reverse engineering.

## Stack

TypeScript (strict) · React 19 + Vite 8 + React Router 8 · Tailwind CSS 4 + shadcn/ui · Fastify 5 ·
SQLite (better-sqlite3) + Drizzle ORM · zod · TanStack Query · Vitest.
Planned for later stages: Zustand, CodeMirror 6, unified/remark, React Flow, react-force-graph, chokidar, Playwright.

TypeScript is pinned to 6.0.x on purpose: typescript-eslint does not support TypeScript 7 yet.

## Commands

| Command                                                           | What it does                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                                                     | API (`tsx watch`, 127.0.0.1:5181) + Vite (127.0.0.1:5180, proxies `/api` to the API) |
| `npm run build`                                                   | client → `dist/client`, server → `dist/server` (Vite SSR build)                      |
| `npm start`                                                       | production server on 127.0.0.1:5180: API + built client                              |
| `npm run typecheck` / `lint` / `format` / `format:check` / `test` | quality checks                                                                       |
| `npm run db:generate`                                             | SQL migration from `src/server/db/schema.ts` into `drizzle/`                         |
| `npm run catalog [-- <slug>]`                                     | rebuild `seed/` from official YouTube playlists (needs `YOUTUBE_API_KEY`)            |
| `npm run yt -- <channel/playlists/playlist/video/info/search>`    | research helper for finding official playlists (search costs 100 quota units)        |

Migrations run automatically on server start. `seed/` is loaded into the database on start whenever its files
changed (hash in `settings.seed_hash`); user collections and progress survive. Run every command from the project
root (paths use `process.cwd()`).

## Catalog rules (BRIEF)

- Course recipes live in `scripts/catalog/` (imported track-1 courses, candidates of tracks 2–4, track placement and
  prerequisites). Never hand-edit `seed/courses/*.json`: change the recipe and run `npm run catalog`.
- Official university channels only; a Russian translation may replace official videos only when it is complete
  and credits the original (store it with `language: "ru"` and `originalYoutubeId`). Doubtful cases → ask the user.
- Videos are classified as lecture / section / recitation / problem-solving / short; practice is part of the plan.

## Structure

```
src/client/   React app (alias @/): app/ (router, nav, tracks, labels incl. subject colors), components/ (layout,
              ui = shadcn, course, roadmap, today = Today screen blocks, plan = plan wizard parts, calendar,
              shared pieces like CardRow, FilterChips, StateMessage, Timecode), components/player (IFrame player,
              progress + played-time saving, plan segments, hotkeys, bookmarks), lib/ (api, format, youtube, player,
              catalog-filter, plan, segment, calendar), pages/ (Home = "Сегодня", Plan, Calendar, Catalog, Course,
              Watch), app/queries.ts (TanStack Query hooks), styles/
              dev/ = design showcase /dev/ui and sample home /dev/home (lazy routes, sample data only)
              class names are merged with `cn` from the `cn` package (shadcn's replacement for clsx + tailwind-merge)
src/server/   Fastify: app.ts builds the app (testable), index.ts starts it, config.ts, db/, routes/ (catalog, progress,
              plan, tasks), catalog/ (seed loading, repository, services, playlist import), plan/ (plan service with
              daily re-planning, Today/calendar views, tasks), youtube/ (Data API client)
src/shared/   code shared by client and server (alias @shared/): catalog (seed zod), api (DTOs), progress rules,
              scheduler (plan layout), dates, roadmap (hours to CV), streak
drizzle/      SQL migrations (committed)
data/         study.db (gitignored)
seed/         tracks.json + courses/*.json — generated by `npm run catalog`, committed
scripts/      build-catalog.ts, catalog/ recipes, youtube.ts research helper
docs/         BRIEF, ASSESSMENT, design references
```

## Conventions

- Server layers: routes → services → repositories. Validate API input with zod.
- Components ≤ ~250 lines.
- Pure functions get unit tests (scheduler, link parsing, roadmap state, …).
- Dates as local `YYYY-MM-DD`, timestamps as UTC ISO. Week starts Monday; timezone from the system (Europe/Kyiv).
- Server listens on 127.0.0.1 only. `Referrer-Policy: strict-origin-when-cross-origin` (YouTube embeds need a Referer).
- Plan (SPEC §6.4, BRIEF): one daily budget shared by 1–2 subjects taking turns, parts ≥ 10 min. The plan is rebuilt
  from the furthest watched point on the first request of a new day (`ensureFresh`) and by "Перепланировать";
  done parts stay. A part is done when watching passes its end or it is ticked by hand (that also moves the
  watched point). `/?day=YYYY-MM-DD` and `/api/today?date=` open another day — for checking the skip-a-day rule.
- Browser checks write to `data/study.db`: back it up first and restore it afterwards (server stopped).

## Environment

- `.env` (gitignored; template in `.env.example`): `YOUTUBE_API_KEY`, `VAULT_PATH` (the user's existing Obsidian vault in OneDrive), `PORT=5180`.
- Windows 10, Node 22. `gh` lives in `C:\Program Files\GitHub CLI` and may be missing from PATH in Claude's shell.

## Design

Top navigation (not a sidebar), per BRIEF. Main reference: `docs/design/reference/01-home-mockup.jpg`.
Dark purple-black theme; tokens live in `src/client/styles/index.css`.

- Build new screens from the components shown on `/dev/ui`; add new reusable pieces there too.
- Main action on a hero: white pill (`Button variant="hero" size="pill"`); elsewhere the violet default button.
- Covers are YouTube thumbnails (`CourseCover`): `hqdefault` for cards, `maxresdefault` with fallback for heroes,
  a drawn track-colored cover when a course has no video yet.
- Fonts: Inter (UI), JetBrains Mono (timecodes, durations), Unbounded for headings and the logo
  (approved by the user on `/dev/ui`, 18.11.2026).
- shadcn components are installed with `npx shadcn@latest add <name>`; it may add `next-themes` — remove it,
  the app is dark-only.
