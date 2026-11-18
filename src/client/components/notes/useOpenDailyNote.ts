import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateDailyNote } from "@/app/notes-queries";

/** Opens `Daily/YYYY-MM-DD.md`, creating it with the day's plan when it is missing. */
export function useOpenDailyNote() {
  const navigate = useNavigate();
  const daily = useCreateDailyNote();
  const open = (date: string) =>
    daily.mutate(date, {
      onSuccess: (note) => {
        if (note.path) void navigate(`/notes?path=${encodeURIComponent(note.path)}`);
      },
      onError: (error) => toast.error(error.message),
    });
  return { open, pending: daily.isPending };
}
