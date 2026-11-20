import { z } from "zod";
import {
  MAX_PRIZE_AMOUNT,
  MAX_PRIZE_ENTRIES,
  MAX_PRIZE_PLAYERS,
  isIso4217Code,
} from "@sarpbc/utils";
import type { RosterProposalService } from "../../../roster-proposal/application/roster-proposal.service";
import { defineTool } from "../define-tool";
import { proposalSourceUrlSchema, proposer } from "./proposals";

export interface PrizeToolServices {
  rosterProposalService: Pick<RosterProposalService, "propose">;
}

export const prizeTools = ({ rosterProposalService }: PrizeToolServices) => {
  const propose = proposer(rosterProposalService);

  return [
    defineTool({
      description:
        "Propose the prize distribution of one tournament stage. Once approved, it replaces the whole distribution of that stage, so list every paid placement, and every row takes sourceUrl as its source. To correct one row or only its source, use propose_tournament_prize_update. Read get_tournament_prizes first. Every team must be a participant of the stage and every listed player must be on that team's stage roster. Enter each amount in the currency the source states; never convert it.",
      handler: async ({ tournamentId, prizes, sourceUrl }, user) =>
        await propose(
          {
            kind: "set_tournament_prizes",
            prizes: prizes.map(({ playerIds, ...prize }) => ({
              ...prize,
              playerIds: playerIds ?? [],
            })),
            tournamentId,
          },
          sourceUrl,
          user.id,
        ),
      input: {
        prizes: z
          .array(
            z.object({
              amount: z
                .number()
                .int()
                .min(1)
                .max(MAX_PRIZE_AMOUNT)
                .describe("Whole amount in the stated currency."),
              currency: z
                .string()
                .refine(isIso4217Code, "Use an ISO 4217 currency code")
                .describe("ISO 4217 currency code as stated by the source (e.g. USD, EUR)."),
              placement: z
                .number()
                .int()
                .min(1)
                .describe("Final placement; tied teams share the same placement."),
              playerIds: z
                .array(z.uuid())
                .max(MAX_PRIZE_PLAYERS)
                .optional()
                .describe(
                  "Optional player UUIDs from the team's stage roster who share this prize.",
                ),
              teamId: z.uuid().describe("Team UUID."),
            }),
          )
          .max(MAX_PRIZE_ENTRIES)
          .describe("Every paid placement of the stage."),
        sourceUrl: proposalSourceUrlSchema,
        tournamentId: z.uuid().describe("Tournament stage UUID."),
      },
      name: "propose_tournament_prizes",
      permission: "tournaments.manage",
      write: true,
    }),

    defineTool({
      description:
        "Propose a correction of one prize row of a tournament stage, keyed by its team, without replacing the rest of the distribution. Send only the fields that change; send none of them to re-source the row without changing its value. Once approved, the row's source becomes sourceUrl. Read get_tournament_prizes first: the team must already have a prize in that stage. Enter the amount in the currency the source states; never convert it.",
      handler: async (
        { tournamentId, teamId, placement, amount, currency, playerIds, sourceUrl },
        user,
      ) =>
        await propose(
          {
            kind: "update_tournament_prize",
            patch: { amount, currency, placement, playerIds },
            teamId,
            tournamentId,
          },
          sourceUrl,
          user.id,
        ),
      input: {
        amount: z
          .number()
          .int()
          .min(1)
          .max(MAX_PRIZE_AMOUNT)
          .optional()
          .describe("Corrected whole amount in the stated currency."),
        currency: z
          .string()
          .refine(isIso4217Code, "Use an ISO 4217 currency code")
          .optional()
          .describe("Corrected ISO 4217 currency code."),
        placement: z.number().int().min(1).optional().describe("Corrected final placement."),
        playerIds: z
          .array(z.uuid())
          .max(MAX_PRIZE_PLAYERS)
          .optional()
          .describe("Replacement list of player UUIDs from the team's stage roster."),
        sourceUrl: proposalSourceUrlSchema.describe(
          "Required public source of the corrected row, usually the official Rocket League rules (prize attachments) or the organiser's announcement. Never Liquipedia, a mirror of it, BLAST.tv or start.gg.",
        ),
        teamId: z.uuid().describe("UUID of the team whose prize row changes."),
        tournamentId: z.uuid().describe("Tournament stage UUID."),
      },
      name: "propose_tournament_prize_update",
      permission: "tournaments.manage",
      write: true,
    }),
  ];
};
