export interface NavItem {
  to: string;
  label: string;
  /** Match only the exact path (for the home page). */
  end?: boolean;
}

/** Top navigation, in the order of the mockup (BRIEF: five main sections). */
export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Главная", end: true },
  { to: "/courses", label: "Мои курсы" },
  { to: "/roadmap", label: "Траектории" },
  { to: "/notes", label: "Заметки" },
  { to: "/stats", label: "Статистика" },
];
