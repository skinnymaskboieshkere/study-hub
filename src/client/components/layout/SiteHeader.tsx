import { cn } from "cn";
import { NavLink, useLocation } from "react-router";
import { NAV_ITEMS } from "@/app/nav";
import { Logo } from "./Logo";
import { ProfileMenu } from "./ProfileMenu";

export function SiteHeader() {
  const { pathname } = useLocation();
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
                    isActive || item.also?.some((path) => pathname.startsWith(path))
                      ? "text-ink"
                      : "text-ink-muted hover:text-ink",
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ProfileMenu />
    </header>
  );
}
