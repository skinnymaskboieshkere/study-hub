import { clock, parseYoutubeLink } from "@shared/note-templates";
import { resolveLink } from "@shared/notes";
import { cn } from "cn";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { useMemo, type ComponentProps, type ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { renderMarkdown } from "@/lib/markdown";
import { isImageLink, vaultImageUrl } from "@/lib/note-assets";
import { EmbeddedImage, NoteEmbed } from "./NoteEmbed";
import "katex/dist/katex.min.css";

export interface MarkdownPreviewProps {
  text: string;
  /** Path of the note shown: links resolve relative to its folder. */
  path: string;
  /** All note paths, to tell existing links from missing ones. */
  paths: readonly string[];
  onOpenNote: (path: string, heading: string | null) => void;
  /** A link to a note that does not exist yet: Obsidian creates it on click. */
  onCreateNote: (name: string) => void;
  onTag: (tag: string) => void;
  /** Same-note `[[#Heading]]` links scroll here. */
  onHeading: (heading: string) => void;
  /** YouTube links and timecodes open the lecture in the app (SPEC §6.6). */
  onVideoLink?: (videoId: string, seconds: number) => void;
  /** How deep inside `![[embeds]]` this preview is. */
  depth?: number;
}

const SAFE_URL = /^(https?:|mailto:)/i;

const text = (children: ReactNode): string =>
  Array.isArray(children)
    ? children.map(text).join("")
    : typeof children === "string" || typeof children === "number"
      ? String(children)
      : children && typeof children === "object" && "props" in children
        ? text((children.props as { children?: ReactNode }).children)
        : "";

/** Rendered note (SPEC §6.5): Markdown, wikilinks, tags, KaTeX formulas, highlighted code. */
export function MarkdownPreview(props: MarkdownPreviewProps) {
  const {
    text: source,
    path,
    paths,
    onOpenNote,
    onCreateNote,
    onTag,
    onHeading,
    onVideoLink,
  } = props;
  const rendered = useMemo(() => renderMarkdown(source), [source]);

  const components = useMemo<Partial<Components>>(() => {
    const heading =
      (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
      ({ children, ...rest }: ComponentProps<"h1">) => (
        <Tag {...rest} data-heading={text(children)}>
          {children}
        </Tag>
      );

    return {
      h1: heading("h1"),
      h2: heading("h2"),
      h3: heading("h3"),
      h4: heading("h4"),
      h5: heading("h5"),
      h6: heading("h6"),
      a: ({ children, href, ...rest }: ComponentProps<"a">) => {
        const data = rest as Record<string, string | undefined>;
        const tag = data["data-tag"];
        if (tag) {
          return (
            <button type="button" className="md-tag" onClick={() => onTag(tag)}>
              {children}
            </button>
          );
        }
        const target = data["data-wikilink"];
        if (target !== undefined) {
          const headingText = data["data-heading"] || null;
          if (!target && headingText) {
            return (
              <button type="button" className="md-wikilink" onClick={() => onHeading(headingText)}>
                {children}
              </button>
            );
          }
          if (data["data-embed"]) {
            return isImageLink(target) ? (
              <EmbeddedImage target={target} alias={data["data-alias"]} from={path} />
            ) : (
              <NoteEmbed {...props} target={target} heading={headingText} from={path} />
            );
          }
          const resolved = resolveLink(target, paths, path);
          return (
            <button
              type="button"
              className={cn("md-wikilink", !resolved && "md-wikilink-missing")}
              title={resolved ? resolved.replace(/\.md$/, "") : `Создать заметку «${target}»`}
              onClick={() => (resolved ? onOpenNote(resolved, headingText) : onCreateNote(target))}
            >
              {children}
            </button>
          );
        }
        const video = href ? parseYoutubeLink(href) : null;
        if (href && video && onVideoLink) {
          // A timecode is a normal YouTube link (works in Obsidian); here it drives our player.
          return (
            <a
              href={href}
              className={text(children).startsWith("▶") ? "md-timecode" : undefined}
              title={video.tSec ? `Открыть лекцию на ${clock(video.tSec)}` : "Открыть лекцию"}
              onClick={(event) => {
                if (event.ctrlKey || event.metaKey || event.shiftKey) return;
                event.preventDefault();
                onVideoLink(video.videoId, video.tSec);
              }}
            >
              {children}
            </a>
          );
        }
        if (href && SAFE_URL.test(href)) {
          return (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          );
        }
        return <span className="md-link-broken">{children}</span>;
      },
      // ![alt](attachments/x.png): a vault picture; web pictures load as they are.
      img: ({ src, alt, ...rest }: ComponentProps<"img">) => (
        <img
          {...rest}
          className="md-image"
          alt={alt ?? ""}
          loading="lazy"
          src={
            typeof src === "string" && !/^(https?:|data:)/i.test(src)
              ? vaultImageUrl(decodeURI(src), path)
              : src
          }
        />
      ),
    };
    // props is read for embeds: they get the same handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paths, onOpenNote, onCreateNote, onTag, onHeading, onVideoLink, props.depth]);

  const body = useMemo(
    () => toJsxRuntime(rendered.tree, { Fragment, jsx, jsxs, components }),
    [rendered.tree, components],
  );

  return (
    <article className={props.depth ? "markdown md-nested" : "markdown"}>
      {rendered.frontmatter && (
        <details className="md-properties">
          <summary>Свойства</summary>
          <pre>{rendered.frontmatter}</pre>
        </details>
      )}
      {body}
      {!source.trim() && <p className="text-ink-muted">Пустая заметка.</p>}
    </article>
  );
}
