import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { RankingsHead, WIN_RATE_COLUMN } from "./RankingsHead";

const ROWS = 4;

/** A block sized like the figure it stands in for, inside a 24px line. */
function Bar({ className, end }: { className: string; end?: boolean }) {
  return (
    <div className={cn("flex h-6 items-center", end && "justify-end")}>
      <Skeleton className={cn("h-4", className)} />
    </div>
  );
}

/** The real header and four rows of placeholders, in the real cell structure. */
export function RankingsSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading rankings
      </p>
      <Table>
        <caption className="sr-only">Rankings</caption>
        <RankingsHead />
        <TableBody>
          {Array.from({ length: ROWS }, (_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell>
                <Bar className="w-4" />
              </TableCell>
              <TableCell>
                <Bar className="w-28" />
              </TableCell>
              <TableCell numeric>
                <Bar end className="w-10" />
              </TableCell>
              <TableCell numeric className={WIN_RATE_COLUMN}>
                <Bar end className="w-10" />
              </TableCell>
              <TableCell numeric>
                <Bar end className="w-10" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
