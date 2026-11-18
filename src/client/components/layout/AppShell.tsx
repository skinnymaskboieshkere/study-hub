import { cn } from "cn";
import { Outlet, useSearchParams } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteHeader } from "./SiteHeader";

export function AppShell() {
  const [params] = useSearchParams();
  // Focus mode (SPEC §6.2): only the video, no menus.
  const focus = params.get("focus") === "1";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-night"
        >
          Перейти к содержимому
        </a>
        {!focus && <SiteHeader />}
        <main
          id="content"
          className={cn(
            "mx-auto w-full px-4 pb-16 sm:px-6 lg:px-8",
            focus ? "max-w-[1600px]" : "max-w-[1360px]",
          )}
        >
          <Outlet />
        </main>
      </div>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
