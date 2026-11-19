import {
  hotkeyLabel,
  TIMECODE_HOTKEYS,
  type AppSettings,
  type SettingsPatch,
} from "@shared/settings";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SettingsSection } from "./SettingsSection";

interface PlayerSettingsProps {
  settings: AppSettings;
  onChange: (patch: SettingsPatch) => void;
}

function SwitchRow(props: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <Label htmlFor={props.id}>{props.label}</Label>
        <p className="mt-1 max-w-[60ch] text-sm text-ink-muted">{props.hint}</p>
      </div>
      <Switch id={props.id} checked={props.checked} onCheckedChange={props.onChange} />
    </div>
  );
}

/** Player and timecode settings (SPEC §6.8). */
export function PlayerSettings({ settings, onChange }: PlayerSettingsProps) {
  return (
    <SettingsSection title="Плеер и таймкоды">
      <div className="space-y-6">
        <SwitchRow
          id="captions"
          label="Русские субтитры на английских видео"
          hint="Плеер сам включает автоперевод субтитров на русский."
          checked={settings.captions}
          onChange={(captions) => onChange({ captions })}
        />
        <SwitchRow
          id="nocookie"
          label="Режим youtube-nocookie"
          hint="YouTube не сохраняет cookie, пока ты не нажмёшь «Смотреть». Иногда в этом режиме не работают субтитры и рекомендации."
          checked={settings.youtubeNoCookie}
          onChange={(youtubeNoCookie) => onChange({ youtubeNoCookie })}
        />
        <SwitchRow
          id="pause"
          label="Пауза при вставке таймкода"
          hint="Видео останавливается, пока ты пишешь заметку к моменту."
          checked={settings.pauseOnTimecode}
          onChange={(pauseOnTimecode) => onChange({ pauseOnTimecode })}
        />
        <div>
          <p id="hotkey-label" className="text-sm font-medium text-ink">
            Клавиши таймкода
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            Вставляют в конспект ссылку на текущий момент лекции.
          </p>
          <ToggleGroup
            type="single"
            aria-labelledby="hotkey-label"
            value={settings.timecodeHotkey}
            onValueChange={(value) =>
              value && onChange({ timecodeHotkey: value as AppSettings["timecodeHotkey"] })
            }
            spacing={2}
            className="mt-3 flex-wrap"
          >
            {TIMECODE_HOTKEYS.map((hotkey) => (
              <ToggleGroupItem
                key={hotkey}
                value={hotkey}
                className="rounded-full border border-line bg-surface-2 px-4 font-mono text-sm text-ink-muted data-[state=on]:border-lilac/50 data-[state=on]:bg-brand/20 data-[state=on]:text-ink"
              >
                {hotkeyLabel(hotkey)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
    </SettingsSection>
  );
}
