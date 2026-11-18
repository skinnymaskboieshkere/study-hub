import { ExternalLink, VideoOff } from "lucide-react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { playerErrorText } from "@/lib/player";
import { youtubeWatchUrl } from "@/lib/youtube";

interface PlayerErrorProps {
  code: number;
  youtubeId: string;
  seconds?: number;
}

/** Replaces the player when YouTube cannot show the video, with a way out (SPEC §6.2). */
export function PlayerError({ code, youtubeId, seconds }: PlayerErrorProps) {
  const { title, text } = playerErrorText(code);
  return (
    <div className="grid size-full place-items-center bg-surface p-6">
      <StateMessage
        tone="error"
        icon={VideoOff}
        title={title}
        action={
          <Button asChild variant="secondary">
            <a href={youtubeWatchUrl(youtubeId, seconds)} target="_blank" rel="noreferrer">
              Открыть на YouTube
              <ExternalLink aria-hidden />
            </a>
          </Button>
        }
      >
        {text}
      </StateMessage>
    </div>
  );
}
