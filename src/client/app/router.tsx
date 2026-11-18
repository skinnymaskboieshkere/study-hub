import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarPage } from "@/pages/CalendarPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { CoursePage } from "@/pages/CoursePage";
import { HomePage } from "@/pages/HomePage";
import { PlanPage } from "@/pages/PlanPage";
import { NotFoundPage, RoadmapPage, SettingsPage, StatsPage } from "@/pages/SectionPages";
import { WatchPage } from "@/pages/WatchPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "plan", element: <PlanPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "courses", element: <CatalogPage /> },
      { path: "courses/:slug", element: <CoursePage /> },
      { path: "watch/:youtubeId", element: <WatchPage /> },
      { path: "roadmap", element: <RoadmapPage /> },
      // Editor, Markdown and KaTeX are heavy: loaded only when notes are opened.
      {
        path: "notes",
        lazy: async () => ({ Component: (await import("@/pages/NotesPage")).NotesPage }),
      },
      { path: "stats", element: <StatsPage /> },
      { path: "settings", element: <SettingsPage /> },
      // Design showcase (SPEC §7): loaded on demand, so it never slows down the real screens.
      {
        path: "dev/ui",
        lazy: async () => ({ Component: (await import("@/dev/DevUiPage")).DevUiPage }),
      },
      {
        path: "dev/home",
        lazy: async () => ({ Component: (await import("@/dev/DevHomePage")).DevHomePage }),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
