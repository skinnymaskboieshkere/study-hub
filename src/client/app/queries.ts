import type {
  BookmarkDto,
  CatalogDto,
  ContinueDto,
  CourseDetailDto,
  ProgressDto,
  WatchDto,
} from "@shared/api";
import type { Collection } from "@shared/catalog";
import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export const keys = {
  catalog: ["catalog"] as const,
  course: (slug: string) => ["course", slug] as const,
  watch: (youtubeId: string, course?: string) => ["watch", youtubeId, course ?? ""] as const,
  continue: ["continue"] as const,
  bookmarks: (youtubeId: string) => ["bookmarks", youtubeId] as const,
};

export const useCatalog = () =>
  useQuery({ queryKey: keys.catalog, queryFn: () => api.get<CatalogDto>("/api/catalog") });

export const useCourse = (slug: string) =>
  useQuery({
    queryKey: keys.course(slug),
    queryFn: () => api.get<CourseDetailDto>(`/api/courses/${encodeURIComponent(slug)}`),
  });

export const useWatch = (youtubeId: string, course?: string) =>
  useQuery({
    queryKey: keys.watch(youtubeId, course),
    queryFn: () =>
      api.get<WatchDto>(
        `/api/watch/${encodeURIComponent(youtubeId)}${course ? `?course=${encodeURIComponent(course)}` : ""}`,
      ),
    // The resume point must be fresh every time the page opens.
    staleTime: 0,
  });

export const useContinue = () =>
  useQuery({
    queryKey: keys.continue,
    queryFn: async () => (await api.get<{ item: ContinueDto | null }>("/api/continue")).item,
    staleTime: 0,
  });

export const useBookmarks = (youtubeId: string) =>
  useQuery({
    queryKey: keys.bookmarks(youtubeId),
    queryFn: () => api.get<BookmarkDto[]>(`/api/videos/${encodeURIComponent(youtubeId)}/bookmarks`),
  });

/** Progress changes course numbers everywhere: refresh what shows them. */
export function useRefreshProgress() {
  const client = useQueryClient();
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: keys.catalog }),
      client.invalidateQueries({ queryKey: ["course"] }),
      client.invalidateQueries({ queryKey: keys.continue }),
    ]);
}

export function useSetCollection(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (collection: Collection | null) =>
      api.patch<CourseDetailDto>(`/api/courses/${encodeURIComponent(slug)}`, { collection }),
    onSuccess: (course) => {
      client.setQueryData(keys.course(slug), course);
      void client.invalidateQueries({ queryKey: keys.catalog });
    },
  });
}

export function useImportCourse(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CourseDetailDto>(`/api/courses/${encodeURIComponent(slug)}/import`),
    onSuccess: (course) => {
      client.setQueryData(keys.course(slug), course);
      void client.invalidateQueries({ queryKey: keys.catalog });
    },
  });
}

export function useSetCompletion(youtubeId: string) {
  const refresh = useRefreshProgress();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (completed: boolean) =>
      api.post<ProgressDto>(`/api/progress/${encodeURIComponent(youtubeId)}/complete`, {
        completed,
      }),
    onSuccess: () =>
      Promise.all([refresh(), client.invalidateQueries({ queryKey: ["watch", youtubeId] })]),
  });
}

export function useAddBookmark(youtubeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (bookmark: { tSec: number; label: string }) =>
      api.post<BookmarkDto>(`/api/videos/${encodeURIComponent(youtubeId)}/bookmarks`, bookmark),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bookmarks(youtubeId) }),
  });
}

export function useDeleteBookmark(youtubeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/bookmarks/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bookmarks(youtubeId) }),
  });
}
