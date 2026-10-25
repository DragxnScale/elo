import { NotFoundState } from "@/components/stats/NotFoundState";

export const metadata = { title: "Player not found · Kleos" };

export default function NotFound() {
  return (
    <NotFoundState
      title="That player doesn't exist"
      description="The link may be old, or the player was removed."
    />
  );
}
