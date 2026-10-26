import { cn } from "@/lib/utils";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Hidden below 24rem so the player's name keeps its room on narrow phones. */
export const WIN_RATE_COLUMN = "hidden min-[24rem]:table-cell";

/** The header row shared by the table and its skeleton, so columns never shift. */
export function RankingsHead() {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {/* Left-aligned so the rank sits on the column's left edge. */}
        <TableHead className="w-8">#</TableHead>
        <TableHead className="w-full">Player</TableHead>
        <TableHead numeric className="whitespace-nowrap">
          <span aria-hidden="true">W–L</span>
          <span className="sr-only">Wins, losses and draws</span>
        </TableHead>
        <TableHead numeric className={cn("whitespace-nowrap", WIN_RATE_COLUMN)}>
          Win %
        </TableHead>
        <TableHead numeric>ELO</TableHead>
      </TableRow>
    </TableHeader>
  );
}
