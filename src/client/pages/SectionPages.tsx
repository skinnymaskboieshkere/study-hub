import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section className="pt-8 sm:pt-12">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Такой страницы нет
      </h1>
      <p className="mt-4 text-lg text-ink-muted">
        Проверь адрес или вернись{" "}
        <Link to="/" className="text-lilac underline-offset-4 hover:underline">
          на главную
        </Link>
        .
      </p>
    </section>
  );
}
