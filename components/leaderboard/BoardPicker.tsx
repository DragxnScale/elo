"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { Leaderboard } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Up to this many boards are shown as chips; more become a native select. */
const MAX_CHIPS = 4;

type BoardPickerProps = {
  boards: Leaderboard[];
  /** The selected own board, or null while a board opened by code is showing. */
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/**
 * Switches between the viewer's boards. Chips for a few (one tap, the choice
 * is visible); a native select for many. Names only: the share code belongs
 * to the open board, not to every chip.
 */
export function BoardPicker({ boards, selectedId, onSelect }: BoardPickerProps) {
  if (boards.length > MAX_CHIPS) {
    return (
      <Field label="Your boards" hideLabel className="sm:max-w-xs">
        <Select
          value={selectedId ?? ""}
          onChange={(event) => onSelect(event.target.value)}
        >
          {selectedId === null && (
            <option value="" disabled hidden>
              Opened by code
            </option>
          )}
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  return (
    <div role="group" aria-label="Your boards" className="flex flex-wrap gap-2">
      {boards.map((board) => {
        const selected = board.id === selectedId;
        return (
          <Button
            key={board.id}
            variant={selected ? "secondary" : "ghost"}
            aria-pressed={selected}
            onClick={() => onSelect(board.id)}
            className={cn(
              "h-auto min-h-10 max-w-full whitespace-normal py-2 text-left wrap-anywhere",
              // Both states carry a 1px border so choosing a chip never
              // changes its size.
              selected ? "border-foreground/50" : "border border-transparent"
            )}
          >
            {board.name}
          </Button>
        );
      })}
    </div>
  );
}
