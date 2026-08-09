export enum PlayerAwardType {
  MVP = "mvp",
}

export interface PlayerAwardListItem {
  id: string;
  awardType: PlayerAwardType;
  tournament: {
    id: string;
    name: string;
    endAt: Date | string | null;
    serie?: string | null;
    leagueName?: string;
  };
  player?: {
    id: string;
    name: string;
    slug: string;
  };
  participant?: {
    id: string;
    team?: {
      id: string;
      name: string;
    };
  };
}
