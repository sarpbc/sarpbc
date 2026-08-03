export class UserPickDto {
  match!: string;
  pickedParticipant!: string;
  points!: number | null;
  scored!: boolean;
}

export class LeaderboardEntryDto {
  userId!: string;
  userName!: string;
  points!: number;
}

export class PersonalRankingDto {
  rank!: number | null;
  total!: number;
  points!: number;
}
