import type { Subject } from "@shared/catalog";
import { cn } from "cn";
import { SUBJECT_COLOR, SUBJECT_LABEL } from "@/app/labels";

/** Subject of a course or a note: a colored dot and the name, so subjects tell apart at a glance. */
export function SubjectLabel({ subject, className }: { subject: Subject; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", SUBJECT_COLOR[subject].dotClass)}
      />
      {SUBJECT_LABEL[subject]}
    </span>
  );
}
