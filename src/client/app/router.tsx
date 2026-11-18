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
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
