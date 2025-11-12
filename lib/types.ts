export type Item = {
  id: string;
  year: string;
  domain: string;
  stem: string;
  type: 'mcq'|'short';
  options?: string[];
  correct?: string|null;
  programme?: string;
}

export type Asset = {
  item_id: string;
  video_title?: string;
  video_id?: string;
  share_url?: string;
  download_url?: string;
  video_thumbnail?: string;
  player_url?: string;
}

export type Session = {
  id: string;
  school_id: string;
  year: string;
  candidate_name: string;
  status: 'active'|'finished';
  item_index: number;
  selected_ids?: string[] | null;
  created_at?: string;
}
