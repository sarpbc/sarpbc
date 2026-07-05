export interface PostCreationStatusDto {
  canCreate: boolean;
  nextAvailableAt: string | null;
  cooldownHours: number;
}
