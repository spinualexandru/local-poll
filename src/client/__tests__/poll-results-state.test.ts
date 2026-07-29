import assert from "node:assert";
import { test } from "node:test";
import { createPollResultsViewModel } from "../public/pages/poll-results-state.mjs";

test("single-choice results show respondents and conventional percentages", () => {
  assert.deepStrictEqual(
    createPollResultsViewModel(["First", "Second"], {
      total_ballots: 2,
      total_selections: 2,
      options: [
        { option_id: 0, selection_count: 1, percentage: 50 },
        { option_id: 1, selection_count: 1, percentage: 50 },
      ],
    }),
    {
      totalLabel: "2 total respondents",
      rows: [
        {
          optionName: "First",
          selectionCount: 1,
          percentage: 50,
          selectionLabel: "1 selection (50%)",
        },
        {
          optionName: "Second",
          selectionCount: 1,
          percentage: 50,
          selectionLabel: "1 selection (50%)",
        },
      ],
    },
  );
});

test("multiple-choice results preserve percentages above 100 percent in total", () => {
  assert.deepStrictEqual(
    createPollResultsViewModel(["First", "Second", "Third"], {
      total_ballots: 2,
      total_selections: 4,
      options: [
        { option_id: 0, selection_count: 1, percentage: 50 },
        { option_id: 1, selection_count: 2, percentage: 100 },
        { option_id: 2, selection_count: 1, percentage: 50 },
      ],
    }),
    {
      totalLabel: "2 total respondents",
      rows: [
        {
          optionName: "First",
          selectionCount: 1,
          percentage: 50,
          selectionLabel: "1 selection (50%)",
        },
        {
          optionName: "Second",
          selectionCount: 2,
          percentage: 100,
          selectionLabel: "2 selections (100%)",
        },
        {
          optionName: "Third",
          selectionCount: 1,
          percentage: 50,
          selectionLabel: "1 selection (50%)",
        },
      ],
    },
  );
});

test("zero results render every poll option with zero selections", () => {
  assert.deepStrictEqual(
    createPollResultsViewModel(["First", "Second"], {
      total_ballots: 0,
      total_selections: 0,
      options: [],
    }),
    {
      totalLabel: "0 total respondents",
      rows: [
        {
          optionName: "First",
          selectionCount: 0,
          percentage: 0,
          selectionLabel: "0 selections (0%)",
        },
        {
          optionName: "Second",
          selectionCount: 0,
          percentage: 0,
          selectionLabel: "0 selections (0%)",
        },
      ],
    },
  );
});
