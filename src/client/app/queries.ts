import type {
  BookmarkDto,
  CalendarDto,
  CatalogDto,
  ContinueDto,
  CourseDetailDto,
  PlanDto,
  PlanInput,
  PlanItemDto,
  ProgressDto,
  RoadmapDto,
  StatsDto,
  TaskDto,
  TodayDto,
  WatchDto,
} from "@shared/api";
import type { Collection } from "@shared/catalog";
import type { StatsPeriod } from "@shared/stats";
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
  roadmap: ["roadmap"] as const,
  stats: (period: StatsPeriod, date: string) => ["stats", period, date] as const,
  settings: ["settings"] as const,
  backups: ["backups"] as const,
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

export const useRoadmap = () =>
  useQuery({ queryKey: keys.roadmap, queryFn: () => api.get<RoadmapDto>("/api/roadmap") });

export const useStats = (period: StatsPeriod, date: string) =>
  useQuery({
    queryKey: keys.stats(period, date),
    queryFn: () =>
      api.get<StatsDto>(`/api/stats?period=${period}&date=${encodeURIComponent(date)}`),
    placeholderData: (previous) => previous,
  });

export const useBookmarks = (youtubeId: string) =>
  useQuery({
    queryKey: keys.bookmarks(youtubeId),
    queryFn: () => api.get<BookmarkDto[]>(`/api/videos/${encodeURIComponent(youtubeId)}/bookmarks`),
  });

/** Everything watching can change: course numbers, the day's plan, the calendar. */
export const PROGRESS_QUERY_KEYS = [
  keys.catalog,
  ["course"],
  keys.continue,
  keys.roadmap,
  ["stats"],
  ["today"],
  ["calendar"],
];

/** Progress changes course numbers everywhere: refresh what shows them. */
export function useRefreshProgress() {
  const client = useQueryClient();
  return () =>
    Promise.all(PROGRESS_QUERY_KEYS.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export function useSetCollection(slug: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (collection: Collection | null) =>
      api.patch<CourseDetailDto>(`/api/courses/${encodeURIComponent(slug)}`, { collection }),
    onSuccess: (course) => {
      client.setQueryData(keys.course(slug), course);
      void client.invalidateQueries({ queryKey: keys.catalog });
      void client.invalidateQueries({ queryKey: keys.roadmap });
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
      void client.invalidateQueries({ queryKey: keys.roadmap });
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

// ── Plan, Today, calendar, tasks (stage 2) ─────────────────────────────────────

export const usePlan = () =>
  useQuery({
    queryKey: ["plan"],
    queryFn: async () => (await api.get<{ plan: PlanDto | null }>("/api/plan")).plan,
  });

/** `date` is only for checking other days; normally the server uses today. */
export const useToday = (date?: string) =>
  useQuery({
    queryKey: ["today", date ?? ""],
    queryFn: () => api.get<TodayDto>(`/api/today${date ? `?date=${date}` : ""}`),
    staleTime: 0,
  });

export const useCalendar = (from: string, to: string) =>
  useQuery({
    queryKey: ["calendar", from, to],
    queryFn: () => api.get<CalendarDto>(`/api/calendar?from=${from}&to=${to}`),
  });

export const useTasks = (date: string) =>
  useQuery({
    queryKey: ["tasks", date],
    queryFn: () => api.get<TaskDto[]>(`/api/tasks?date=${date}`),
  });

function useInvalidatePlan() {
  const client = useQueryClient();
  return () =>
    Promise.all(
      [["plan"], ["today"], ["calendar"], keys.roadmap].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    );
}

export function useSavePlan() {
  const invalidate = useInvalidatePlan();
  return useMutation({
    mutationFn: (input: PlanInput) => api.put<PlanDto>("/api/plan", input),
    onSuccess: () => invalidate(),
  });
}

export function useReplan() {
  const invalidate = useInvalidatePlan();
  return useMutation({
    mutationFn: () => api.post<{ parts: number }>("/api/plan/replan"),
    onSuccess: () => invalidate(),
  });
}

export function useSetItemDone() {
  const invalidate = useInvalidatePlan();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      api.post<PlanItemDto>(`/api/plan/items/${id}`, { done }),
    onSuccess: () => invalidate(),
  });
}

function useInvalidateTasks() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ["tasks"] });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (task: { title: string; date: string | null }) =>
      api.post<TaskDto>("/api/tasks", task),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: number;
      title?: string;
      done?: boolean;
      date?: string | null;
    }) => api.patch<TaskDto>(`/api/tasks/${id}`, changes),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: () => invalidate(),
  });
}
