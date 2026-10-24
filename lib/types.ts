export type Leaderboard = {
  id: string;
  user_id: string;
  name: string;
  share_code: string;
  starting_elo: number;
  created_at: string;
};

export type Player = {
  id: string;
  leaderboard_id: string;
  name: string;
  elo: number;
  user_id: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};

export type Match = {
  id: string;
  leaderboard_id: string;
  player1_id: string;
  player2_id: string;
  player1_score: number;
  player2_score: number;
  player1_elo_before: number;
  player2_elo_before: number;
  player1_change: number;
  player2_change: number;
  created_by: string | null;
  created_at: string;
};
