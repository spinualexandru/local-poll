interface PollOptionAggregate {
  option_id: number;
  selection_count: number;
  percentage: number;
}

interface PollResultsAggregate {
  total_ballots: number;
  total_selections: number;
  options: PollOptionAggregate[];
}

interface PollResultRow {
  optionName: string;
  selectionCount: number;
  percentage: number;
  selectionLabel: string;
}

interface PollResultsViewModel {
  totalLabel: string;
  rows: PollResultRow[];
}

export function createPollResultsViewModel(
  optionNames: string[],
  results?: PollResultsAggregate,
): PollResultsViewModel;
