import { ApiError } from "./api";

const IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp)$/i;

/** `![[schema.png]]` embeds a picture, `![[Note]]` embeds a note. */
export const isImageLink = (target: string) => IMAGE.test(target);

/** URL of a vault picture; the server finds it by name like Obsidian does. */
export function vaultImageUrl(link: string, from: string): string {
  return `/api/notes/image?link=${encodeURIComponent(link)}&from=${encodeURIComponent(from)}`;
}

/** A pasted or dropped picture goes to `attachments/`; returns the name to embed. */
export async function uploadImage(file: Blob): Promise<string> {
  const response = await fetch("/api/notes/attachments", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const data = (await response.json().catch(() => ({}))) as { name?: string; error?: string };
  if (!response.ok || !data.name) {
    throw new ApiError(data.error ?? "Не удалось сохранить картинку", response.status);
  }
  return data.name;
}
