import { NotFoundState } from "@/components/stats/NotFoundState";

export const metadata = { title: "User not found · Kleos" };

export default function NotFound() {
  return (
    <NotFoundState
      title="That user doesn't exist"
      description="Check the username, or open a board with its share code."
    />
  );
}
