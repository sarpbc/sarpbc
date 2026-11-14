import type { RosterProposal, RosterProposalList } from "@sarpbc/types";

export const getPendingRosterProposals = async (): Promise<RosterProposalList> =>
  await apiFetch<RosterProposalList>("/roster-proposals", {
    method: "GET",
    query: { status: "pending" },
  });

export const reviewRosterProposal = async (
  id: string,
  action: "approve" | "reject",
): Promise<RosterProposal> => {
  const res = await apiFetch<{ proposal: RosterProposal }>(`/roster-proposals/${id}/${action}`, {
    method: "POST",
  });

  return res.proposal;
};
