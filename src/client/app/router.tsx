import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import {
  CoursesPage,
  NotesPage,
  NotFoundPage,
  RoadmapPage,
  SettingsPage,
  StatsPage,
} from "@/pages/SectionPages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "courses", element: <CoursesPage /> },
      { path: "roadmap", element: <RoadmapPage /> },
      { path: "notes", element: <NotesPage /> },
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
