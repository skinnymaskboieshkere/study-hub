import {
  AppSettingsSchema,
  type AppSettings,
  type SettingsDto,
  type SettingsPatch,
} from "@shared/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { keys } from "./queries";

export interface BackupDto {
  name: string;
  size: number;
  createdAt: string;
}

export interface RestoreResultDto {
  safetyBackup: string;
  folder: string;
  vaultFolder: string | null;
}

const DEFAULTS = AppSettingsSchema.parse({});

export const useSettings = () =>
  useQuery({
    queryKey: keys.settings,
    queryFn: () => api.get<SettingsDto>("/api/settings"),
    staleTime: 5 * 60_000,
  });

/** The settings the player and editor follow; the defaults until they load. */
export function useAppSettings(): AppSettings {
  return useSettings().data?.settings ?? DEFAULTS;
}

export function useUpdateSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.put<SettingsDto>("/api/settings", patch),
    onSuccess: (settings, patch) => {
      client.setQueryData(keys.settings, settings);
      // Another vault: every notes screen and the note numbers in the statistics change.
      if ("vaultPath" in patch) {
        void client.invalidateQueries({ queryKey: ["notes"] });
        void client.invalidateQueries({ queryKey: ["stats"] });
      }
    },
  });
}

export const useBackups = () =>
  useQuery({ queryKey: keys.backups, queryFn: () => api.get<BackupDto[]>("/api/backups") });

export function useCreateBackup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<BackupDto & { files: number }>("/api/backups"),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.backups }),
  });
}

export function useRestoreBackup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<RestoreResultDto>("/api/backups/restore", { name }),
    // Progress, plan, collections and settings all came back from the backup.
    onSuccess: () => client.invalidateQueries(),
  });
}
