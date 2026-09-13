export type hearings = {
  id: number;
  id_process: number;
  type: string;
  date?: string;
  hour?: string;
  place: string;
  room: string;
  meeting_link: string;
  guidelines: string;
};

export type CreateHearing = Omit<hearings, "id">;
export type UpdateHearing = Partial<CreateHearing>;
