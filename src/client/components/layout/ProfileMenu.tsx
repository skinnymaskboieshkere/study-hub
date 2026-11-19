import { Archive, ChevronDown, LayoutTemplate, Palette, Settings, UserRound } from "lucide-react";
import { Link } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Avatar menu in the header (BRIEF): settings and backups, plus the design showcase. */
export function ProfileMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Меню профиля"
        className="group ml-auto flex items-center gap-1.5 rounded-full p-0.5 text-ink-muted transition-colors duration-150 hover:text-ink data-[state=open]:text-ink"
      >
        <span className="grid size-10 place-items-center rounded-full bg-linear-to-br from-brand to-brand-deep text-white transition-shadow duration-150 group-hover:shadow-[0_0_0_3px_rgb(139_92_246/0.35)] group-data-[state=open]:shadow-[0_0_0_3px_rgb(167_139_250/0.6)]">
          <UserRound aria-hidden className="size-5" />
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-150 group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings aria-hidden />
            Настройки
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings#backups">
            <Archive aria-hidden />
            Резервные копии
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dev/ui">
            <Palette aria-hidden />
            Витрина интерфейса
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dev/home">
            <LayoutTemplate aria-hidden />
            Пример главной
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
