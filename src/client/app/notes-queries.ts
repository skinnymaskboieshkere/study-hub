import type {
  BacklinkDto,
  LectureNoteDto,
  NoteTemplateDto,
  VideoNoteDto,
  NoteFileDto,
  NoteListItemDto,
  NoteSavedDto,
  NoteSearchResultDto,
  NotesStatusDto,
  NoteTreeNodeDto,
  TagCountDto,
} from "@shared/api";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

const enc = encodeURIComponent;

/** Everything about notes lives under ["notes", …]: one invalidation refreshes it all. */
export const noteKeys = {
  all: ["notes"] as const,
  status: ["notes", "status"] as const,
  tree: ["notes", "tree"] as const,
  list: ["notes", "list"] as const,
  file: (path: string) => ["notes", "file", path] as const,
  backlinks: (path: string) => ["notes", "backlinks", path] as const,
  tags: ["notes", "tags"] as const,
  search: (query: string, tag: string) => ["notes", "search", query, tag] as const,
};

export const useNotesStatus = () =>
  useQuery({
    queryKey: noteKeys.status,
    queryFn: () => api.get<NotesStatusDto>("/api/notes/status"),
  });

/**
 * Notes change outside the app too (Obsidian, OneDrive). The server counts changes; when the
 * count moves, everything about notes is fetched again.
 */
export function useNotesSync(enabled: boolean) {
  const client = useQueryClient();
  const seen = useRef<number | undefined>(undefined);
  const version = useQuery({
    queryKey: ["notes-version"],
    queryFn: () => api.get<{ version: number }>("/api/notes/version"),
    refetchInterval: 2000,
    enabled,
  });
  const current = version.data?.version;
  useEffect(() => {
    if (current === undefined) return;
    if (seen.current !== undefined && seen.current !== current) {
      void client.invalidateQueries({ queryKey: noteKeys.all });
    }
    seen.current = current;
  }, [client, current]);
}

export const useNoteTree = (enabled = true) =>
  useQuery({
    queryKey: noteKeys.tree,
    queryFn: () => api.get<NoteTreeNodeDto[]>("/api/notes/tree"),
    enabled,
  });

export const useNoteList = (enabled = true) =>
  useQuery({
    queryKey: noteKeys.list,
    queryFn: () => api.get<NoteListItemDto[]>("/api/notes/list"),
    enabled,
  });

export const fetchNote = (path: string) =>
  api.get<NoteFileDto>(`/api/notes/file?path=${enc(path)}`);

export const useNoteFile = (path: string | null) =>
  useQuery({
    queryKey: noteKeys.file(path ?? ""),
    queryFn: () => fetchNote(path ?? ""),
    enabled: Boolean(path),
    staleTime: 0,
    retry: false,
  });

export const useBacklinks = (path: string | null) =>
  useQuery({
    queryKey: noteKeys.backlinks(path ?? ""),
    queryFn: () => api.get<BacklinkDto[]>(`/api/notes/backlinks?path=${enc(path ?? "")}`),
    enabled: Boolean(path),
  });

export const useTags = (enabled = true) =>
  useQuery({
    queryKey: noteKeys.tags,
    queryFn: () => api.get<TagCountDto[]>("/api/notes/tags"),
    enabled,
  });

export const useNoteSearch = (query: string, tag: string) =>
  useQuery({
    queryKey: noteKeys.search(query, tag),
    queryFn: () =>
      api.get<NoteSearchResultDto[]>(`/api/notes/search?q=${enc(query)}&tag=${enc(tag)}`),
    enabled: query.trim().length > 0 || tag.length > 0,
    placeholderData: keepPreviousData,
  });

export const saveNote = (path: string, content: string, baseHash: string | null) =>
  api.put<NoteSavedDto>("/api/notes/file", { path, content, baseHash });

function useInvalidateNotes() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: noteKeys.all });
}

export function useCreateNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: { folder: string; name?: string }) =>
      api.post<NoteSavedDto>("/api/notes", input),
    onSuccess: () => invalidate(),
  });
}

export function useCreateFolder() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (input: { parent: string; name: string }) =>
      api.post<{ path: string }>("/api/notes/folders", input),
    onSuccess: () => invalidate(),
  });
}

export function useTrashNote() {
  const invalidate = useInvalidateNotes();
  return useMutation({
    mutationFn: (path: string) =>
      api.delete(`/api/notes/file?path=${enc(path)}`) as Promise<unknown>,
    onSuccess: () => invalidate(),
  });
}

// ── Video ↔ notes (stage 4) ────────────────────────────────────────────────────

export const videoNoteKeys = {
  lecture: (video: string) => ["notes", "lecture", video] as const,
  video: (video: string) => ["notes", "video", video] as const,
  noted: ["notes", "noted-videos"] as const,
  templates: ["notes", "templates"] as const,
};

/** The lecture note of a video, if there is one (frontmatter `video:`). */
export const useLectureNote = (video: string, enabled = true) =>
  useQuery({
    queryKey: videoNoteKeys.lecture(video),
    queryFn: async () =>
      (await api.get<LectureNoteDto>(`/api/notes/lecture?video=${enc(video)}`)).path,
    enabled,
  });

export function useCreateLectureNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { youtubeId: string; course?: string }) =>
      api.post<LectureNoteDto>("/api/notes/lecture", input),
    onSuccess: () => client.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

/** Notes that link to a video or carry its timecodes (SPEC §6.6). */
export const useVideoNotes = (video: string, enabled = true) =>
  useQuery({
    queryKey: videoNoteKeys.video(video),
    queryFn: () => api.get<VideoNoteDto[]>(`/api/notes/video?video=${enc(video)}`),
    enabled,
  });

/** Videos with notes: the course program marks them. */
export const useNotedVideos = () =>
  useQuery({
    queryKey: videoNoteKeys.noted,
    queryFn: async () => new Set(await api.get<string[]>("/api/notes/noted-videos")),
  });

export function useCreateDailyNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => api.post<LectureNoteDto>("/api/notes/daily", { date }),
    onSuccess: () => client.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export const useTemplates = (enabled = true) =>
  useQuery({
    queryKey: videoNoteKeys.templates,
    queryFn: () => api.get<NoteTemplateDto[]>("/api/notes/templates"),
    enabled,
  });
