interface VoteOptionDocument {
  createElement(localName: string): any;
}

export function createVoteOption(
  document: VoteOptionDocument,
  option: string,
  index: number,
  isMultipleChoice: boolean,
): any;

interface VoteOptionForm {
  querySelectorAll(selector: string): Iterable<{ value: string }>;
}

export function getSelectedOptionIds(form: VoteOptionForm): number[];
