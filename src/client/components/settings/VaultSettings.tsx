import type { SettingsDto } from "@shared/settings";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useUpdateSettings } from "@/app/settings-queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pluralRu } from "@/lib/format";
import { SettingsSection } from "./SettingsSection";

/** The Obsidian vault folder (SPEC §6.8): switching only re-reads files, never writes them. */
export function VaultSettings({ dto }: { dto: SettingsDto }) {
  const update = useUpdateSettings();
  const [folder, setFolder] = useState("");
  const { vault } = dto;
  const custom = dto.settings.vaultPath !== null;

  function connect(vaultPath: string | null) {
    update.mutate(
      { vaultPath },
      {
        onSuccess: (next) => {
          setFolder("");
          toast.success(
            next.vault.available
              ? `Хранилище подключено: ${next.vault.notes} ${pluralRu(next.vault.notes, ["заметка", "заметки", "заметок"])}`
              : "Папка сохранена, но сейчас недоступна",
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (folder.trim()) connect(folder.trim());
  }

  return (
    <SettingsSection
      title="Хранилище заметок"
      hint="Папка Obsidian, в которой лежат твои заметки. При смене Study Hub только перечитывает файлы — ничего не переносит и не удаляет."
    >
      <div className="flex items-start gap-3 rounded-xl bg-surface-2 p-4">
        {vault.available ? (
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success" />
        ) : (
          <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
        )}
        <div className="min-w-0">
          <p className="font-mono text-sm break-all text-ink">{vault.path ?? "не выбрано"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {vault.available
              ? `${vault.notes} ${pluralRu(vault.notes, ["заметка", "заметки", "заметок"])} · ${custom ? "выбрано здесь" : "из файла .env"}`
              : "Папка не найдена — заметки недоступны"}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-2">
        <Label htmlFor="vault-folder">Другая папка</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="vault-folder"
            value={folder}
            onChange={(event) => setFolder(event.target.value)}
            placeholder="Полный путь, например D:\Obsidian Vault"
            className="font-mono"
          />
          <Button type="submit" disabled={!folder.trim() || update.isPending}>
            Подключить
          </Button>
        </div>
      </form>
      {custom && vault.envPath && (
        <Button
          variant="link"
          className="mt-2 h-auto px-0"
          disabled={update.isPending}
          onClick={() => connect(null)}
        >
          Вернуть папку из .env
        </Button>
      )}
    </SettingsSection>
  );
}
