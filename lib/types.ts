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
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  created_at: string;
};
