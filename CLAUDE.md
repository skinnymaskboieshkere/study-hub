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
SQLite (better-sqlite3) + Drizzle ORM · zod · Vitest.
Planned for later stages: TanStack Query, Zustand, CodeMirror 6, unified/remark, React Flow, react-force-graph, chokidar, Playwright.

TypeScript is pinned to 6.0.x on purpose: typescript-eslint does not support TypeScript 7 yet.

## Commands

| Command                                                           | What it does                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`                                                     | API (`tsx watch`, 127.0.0.1:5181) + Vite (127.0.0.1:5180, proxies `/api` to the API) |
| `npm run build`                                                   | client → `dist/client`, server → `dist/server` (Vite SSR build)                      |
| `npm start`                                                       | production server on 127.0.0.1:5180: API + built client                              |
| `npm run typecheck` / `lint` / `format` / `format:check` / `test` | quality checks                                                                       |
| `npm run db:generate`                                             | SQL migration from `src/server/db/schema.ts` into `drizzle/`                         |

Migrations run automatically on server start. Run every command from the project root (paths use `process.cwd()`).

## Structure

```
src/client/   React app (alias @/): app/ (router, nav, tracks), components/layout, components/ui (shadcn), pages/, styles/
              class names are merged with `cn` from the `cn` package (shadcn's replacement for clsx + tailwind-merge)
src/server/   Fastify: app.ts builds the app (testable), index.ts starts it, config.ts, db/, routes/
src/shared/   types and zod schemas shared by client and server (alias @shared/)
drizzle/      SQL migrations (committed)
data/         study.db (gitignored)
seed/, scripts/  course catalog and playlist importer (from stage 1)
docs/         BRIEF, ASSESSMENT, design references
```

## Conventions

- Server layers: routes → services → repositories. Validate API input with zod.
- Components ≤ ~250 lines.
- Pure functions get unit tests (scheduler, link parsing, roadmap state, …).
- Dates as local `YYYY-MM-DD`, timestamps as UTC ISO. Week starts Monday; timezone from the system (Europe/Kyiv).
- Server listens on 127.0.0.1 only. `Referrer-Policy: strict-origin-when-cross-origin` (YouTube embeds need a Referer).

## Environment

- `.env` (gitignored; template in `.env.example`): `YOUTUBE_API_KEY`, `VAULT_PATH` (the user's existing Obsidian vault in OneDrive), `PORT=5180`.
- Windows 10, Node 22. `gh` lives in `C:\Program Files\GitHub CLI` and may be missing from PATH in Claude's shell.

## Design

Top navigation (not a sidebar), per BRIEF. Main reference: `docs/design/reference/01-home-mockup.jpg`.
Dark purple-black theme; tokens live in `src/client/styles/index.css`.
