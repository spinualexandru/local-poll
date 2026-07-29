const nonNegativeNumber = (value) =>
  Number.isFinite(value) && value >= 0 ? value : 0;

export const createPollResultsViewModel = (optionNames, results) => {
  const totalBallots = nonNegativeNumber(results?.total_ballots);
  const resultsByOption = new Map(
    (results?.options || []).map((option) => [
      option.option_id,
      {
        selectionCount: nonNegativeNumber(option.selection_count),
        percentage: nonNegativeNumber(option.percentage),
      },
    ]),
  );

  return {
    totalLabel: `${totalBallots} total respondent${
      totalBallots === 1 ? "" : "s"
    }`,
    rows: optionNames.map((optionName, optionId) => {
      const result = resultsByOption.get(optionId) || {
        selectionCount: 0,
        percentage: 0,
      };

      return {
        optionName,
        ...result,
        selectionLabel: `${result.selectionCount} selection${
          result.selectionCount === 1 ? "" : "s"
        } (${result.percentage}%)`,
      };
    }),
  };
};
