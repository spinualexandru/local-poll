export interface VoteServiceResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function getVotesByPollId(
  pollId: string | number,
): Promise<VoteServiceResponse | undefined>;

export function getPollResults(
  pollId: string | number,
): Promise<VoteServiceResponse | undefined>;

export function castVote(
  pollId: string | number,
  optionIds: number[],
  voterToken?: string,
): Promise<VoteServiceResponse | undefined>;

export function getOrCreateVoterToken(
  storage?: Pick<Storage, "getItem" | "setItem">,
  cryptoApi?: Pick<Crypto, "randomUUID">,
): string;
