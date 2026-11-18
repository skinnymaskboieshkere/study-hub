import { cn } from "cn";
import { UserRound } from "lucide-react";
import { NavLink } from "react-router";
import { NAV_ITEMS } from "@/app/nav";
import { Logo } from "./Logo";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1360px] flex-wrap items-center gap-x-10 gap-y-2 px-4 pt-5 pb-3 sm:px-6 lg:px-8">
      <Logo />

      <nav
        aria-label="Основные разделы"
        className="no-scrollbar order-3 -mx-3 w-[calc(100%+1.5rem)] overflow-x-auto lg:order-none lg:mx-0 lg:w-auto"
      >
        <ul className="flex whitespace-nowrap">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "block rounded-full px-3 py-2 text-[17px] transition-colors duration-150",
                    isActive ? "text-ink" : "text-ink-muted hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <NavLink
        to="/settings"
        aria-label="Настройки"
        title="Настройки"
        className={({ isActive }) =>
          cn(
            "ml-auto grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-deep text-white transition-shadow duration-150",
            "hover:shadow-[0_0_0_3px_rgb(139_92_246/0.35)]",
            isActive && "shadow-[0_0_0_3px_rgb(167_139_250/0.6)]",
          )
        }
      >
        <UserRound className="size-5" aria-hidden />
      </NavLink>
    </header>
  );
}
