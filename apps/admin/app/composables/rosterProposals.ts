import type { RosterProposal, RosterProposalList } from "~/types/rosterProposal";
import { apiFetch } from "~/utils/apiFetch";

export async function getPendingRosterProposals(): Promise<RosterProposalList> {
  return apiFetch<RosterProposalList>("/roster-proposals", {
    method: "GET",
    query: { status: "pending" },
  });
}

export async function reviewRosterProposal(
  id: string,
  action: "approve" | "reject",
): Promise<RosterProposal> {
  const res = await apiFetch<{ proposal: RosterProposal }>(`/roster-proposals/${id}/${action}`, {
    method: "POST",
  });
  return res.proposal;
}
