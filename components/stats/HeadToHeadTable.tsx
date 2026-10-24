import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextLink } from "@/components/ui/link";
import type { HeadToHead } from "@/lib/stats";
import { formatRecord } from "@/lib/utils";

export function HeadToHeadTable({
  rows,
  names,
}: {
  rows: HeadToHead[];
  names: Record<string, string | undefined>;
}) {
  if (rows.length === 0) return null;
  return (
    <Table>
      <caption className="sr-only">Record against each opponent, most played first</caption>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Opponent</TableHead>
          <TableHead numeric>W–L</TableHead>
          <TableHead numeric>Played</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.opponentId}>
            <TableCell className="break-words">
              <TextLink variant="plain" href={`/p/${r.opponentId}`} className="-my-3 block py-3">
                {names[r.opponentId] ?? "Unknown"}
              </TextLink>
            </TableCell>
            <TableCell numeric>{formatRecord(r.wins, r.losses)}</TableCell>
            <TableCell numeric className="text-muted-foreground">
              {r.played}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
