import { Outlet } from "react-router";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-night"
      >
        Перейти к содержимому
      </a>
      <SiteHeader />
      <main id="content" className="mx-auto w-full max-w-[1360px] px-4 pb-16 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
