import { CloudOff } from "lucide-react";
import type { ReactNode } from "react";
import { StateMessage } from "@/components/StateMessage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Error block for a failed request, with a retry. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <StateMessage
      tone="error"
      icon={CloudOff}
      title="Не удалось загрузить данные"
      action={
        <Button variant="secondary" onClick={onRetry}>
          Повторить
        </Button>
      }
    >
      {error instanceof Error ? error.message : "Неизвестная ошибка"}
    </StateMessage>
  );
}

/** Grid of card skeletons while the catalog loads. */
export function CardGridSkeleton({ count = 6 }: { count?: number }): ReactNode {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-3">
          <Skeleton className="aspect-video rounded-xl bg-surface-2" />
          <Skeleton className="mt-3 h-4 w-4/5 bg-surface-2" />
          <Skeleton className="mt-2 h-3 w-1/2 bg-surface-2" />
        </div>
      ))}
    </div>
  );
}
