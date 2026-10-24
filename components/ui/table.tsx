import type * as React from "react";
import { cn } from "@/lib/utils";

/** Scrolls horizontally rather than crushing columns on small screens. */
export function Table({
  className,
  ...props
}: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead {...props} />;
}

export function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({
  className,
  ...props
}: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-border transition-colors duration-150 ease-out last:border-b-0 hover:bg-muted/60",
        className
      )}
      {...props}
    />
  );
}

type CellProps = { numeric?: boolean };

/** `numeric` right-aligns the column. Set it on both the head and the cells. */
export function TableHead({
  numeric,
  className,
  ...props
}: React.ComponentProps<"th"> & CellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 border-b border-border-strong px-3 text-xs font-medium text-muted-foreground first:pl-0 last:pr-0",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  numeric,
  className,
  ...props
}: React.ComponentProps<"td"> & CellProps) {
  return (
    <td
      className={cn(
        "px-3 py-3 first:pl-0 last:pr-0",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  );
}
