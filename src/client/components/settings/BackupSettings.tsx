import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  useBackups,
  useCreateBackup,
  useRestoreBackup,
  type BackupDto,
  type RestoreResultDto,
} from "@/app/settings-queries";
import { QueryError } from "@/components/QueryState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes, pluralRu } from "@/lib/format";
import { SettingsSection } from "./SettingsSection";

const when = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" });

function RestoreResult({ result }: { result: RestoreResultDto }) {
  return (
    <div
      role="status"
      className="mt-5 rounded-xl border border-success/40 bg-success/10 p-4 text-sm"
    >
      <p className="font-medium text-ink">
        Готово: прогресс, план, задачи и настройки восстановлены.
      </p>
      {result.vaultFolder && (
        <p className="mt-2 text-ink-muted">
          Заметки из бэкапа распакованы сюда — забери нужные файлы сам, твоё хранилище не тронуто:
          <span className="mt-1 block font-mono break-all text-ink">{result.vaultFolder}</span>
        </p>
      )}
      <p className="mt-2 text-ink-muted">
        Что было до восстановления, сохранено в бэкап{" "}
        <span className="font-mono text-ink">{result.safetyBackup}</span>.
      </p>
    </div>
  );
}

/** "Сделать бэкап" and restore (SPEC §6.8, ASSESSMENT: restore never overwrites the vault). */
export function BackupSettings({ backupsDir }: { backupsDir: string }) {
  const backups = useBackups();
  const create = useCreateBackup();
  const restore = useRestoreBackup();
  const [asked, setAsked] = useState<BackupDto | null>(null);
  const [result, setResult] = useState<RestoreResultDto | null>(null);

  function makeBackup() {
    create.mutate(undefined, {
      onSuccess: (backup) =>
        toast.success(
          `Бэкап готов: база и ${backup.files} ${pluralRu(backup.files, ["файл", "файла", "файлов"])} хранилища`,
        ),
      onError: (error) => toast.error(error.message),
    });
  }

  function confirmRestore() {
    if (!asked) return;
    restore.mutate(asked.name, {
      onSuccess: (done) => {
        setAsked(null);
        setResult(done);
        toast.success("Данные восстановлены из бэкапа");
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <SettingsSection
      id="backups"
      title="Резервные копии"
      hint={
        <>
          Zip с базой (прогресс, план, задачи, настройки) и всеми файлами хранилища. Лежат в{" "}
          <span className="font-mono break-all text-ink">{backupsDir}</span>.
        </>
      }
    >
      <Button onClick={makeBackup} disabled={create.isPending || restore.isPending}>
        {create.isPending ? <LoaderCircle className="animate-spin" /> : <Archive />}
        {create.isPending ? "Собираю бэкап…" : "Сделать бэкап"}
      </Button>

      {result && <RestoreResult result={result} />}

      <div className="mt-6">
        {backups.isPending ? (
          <Skeleton className="h-24 rounded-xl bg-surface-2" />
        ) : backups.isError ? (
          <QueryError error={backups.error} onRetry={() => void backups.refetch()} />
        ) : backups.data.length === 0 ? (
          <p className="text-sm text-ink-muted">Бэкапов пока нет.</p>
        ) : (
          <ul aria-label="Бэкапы" className="divide-y divide-line">
            {backups.data.map((backup) => (
              <li key={backup.name} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-ink">{when(backup.createdAt)}</p>
                  <p className="font-mono text-xs break-all text-ink-muted">
                    {backup.name} · {formatBytes(backup.size)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={create.isPending || restore.isPending}
                  onClick={() => setAsked(backup)}
                >
                  <ArchiveRestore />
                  Восстановить
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={asked !== null} onOpenChange={(open) => !open && setAsked(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить бэкап?</DialogTitle>
            <DialogDescription>
              Прогресс, план, задачи и настройки вернутся к состоянию на{" "}
              {asked ? when(asked.createdAt) : ""}. Сначала текущие данные сохранятся в новый бэкап.
              Заметки не перезаписываются: файлы из бэкапа распакуются в отдельную папку.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Отмена</Button>
            </DialogClose>
            <Button onClick={confirmRestore} disabled={restore.isPending}>
              {restore.isPending && <LoaderCircle className="animate-spin" />}
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
