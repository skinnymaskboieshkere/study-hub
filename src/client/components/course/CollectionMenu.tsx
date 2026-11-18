import { COLLECTIONS, type Collection } from "@shared/catalog";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { COLLECTION_LABEL } from "@/app/labels";
import { useSetCollection } from "@/app/queries";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NONE = "none";

/** One-click move between collections (SPEC §6.1). */
export function CollectionMenu({
  slug,
  collection,
}: {
  slug: string;
  collection: Collection | null;
}) {
  const mutation = useSetCollection(slug);

  function choose(value: string) {
    const next = value === NONE ? null : (value as Collection);
    mutation.mutate(next, {
      onSuccess: () =>
        toast.success(
          next ? `Курс перенесён в «${COLLECTION_LABEL[next]}»` : "Курс убран из коллекций",
        ),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="glass" size="pill" disabled={mutation.isPending}>
          {collection ? COLLECTION_LABEL[collection] : "В коллекцию"}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-52">
        <DropdownMenuRadioGroup value={collection ?? NONE} onValueChange={choose}>
          {COLLECTIONS.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {COLLECTION_LABEL[value]}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value={NONE}>Без коллекции</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
