import { CalendarCog } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/app/settings-queries";
import { QueryError } from "@/components/QueryState";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { PlayerSettings } from "@/components/settings/PlayerSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { VaultSettings } from "@/components/settings/VaultSettings";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** "Настройки" (SPEC §6.8): player, vault, plan and backups. The theme is dark-only (BRIEF). */
export function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const { hash } = useLocation();
  const loaded = Boolean(settings.data);

  // "Резервные копии" in the avatar menu leads to /settings#backups.
  useEffect(() => {
    if (loaded && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [loaded, hash]);

  return (
    <section className="max-w-3xl space-y-6 pt-8 sm:pt-10">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Настройки
      </h1>
      {settings.isPending ? (
        <Skeleton className="h-[60vh] rounded-3xl bg-surface" />
      ) : settings.isError ? (
        <QueryError error={settings.error} onRetry={() => void settings.refetch()} />
      ) : (
        <>
          <PlayerSettings
            settings={settings.data.settings}
            onChange={(patch) =>
              update.mutate(patch, {
                onSuccess: () => toast.success("Сохранено"),
                onError: (error) => toast.error(error.message),
              })
            }
          />
          <VaultSettings dto={settings.data} />
          <SettingsSection
            title="План"
            hint="Минуты в день, учебные дни, дни без учёбы и практика задаются в мастере плана."
          >
            <Button asChild variant="secondary">
              <Link to="/plan">
                <CalendarCog />
                Открыть мастер плана
              </Link>
            </Button>
          </SettingsSection>
          <BackupSettings backupsDir={settings.data.backupsDir} />
          <p className="text-sm text-ink-muted">
            База данных: <span className="font-mono break-all">{settings.data.dataDir}</span>
          </p>
        </>
      )}
    </section>
  );
}
