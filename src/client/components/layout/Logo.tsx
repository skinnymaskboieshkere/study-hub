import { Link } from "react-router";

export function Logo() {
  return (
    <Link
      to="/"
      aria-label="Study Hub — на главную"
      className="font-display text-[22px] leading-none font-bold tracking-tight sm:text-2xl"
    >
      <span className="text-ink">STUDY</span> <span className="text-lilac text-glow">HUB</span>
    </Link>
  );
}
