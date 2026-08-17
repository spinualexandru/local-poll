export interface ResetTarget {
  value?: unknown;
  dataset?: Record<string, string | undefined>;
  resetToDefault?: () => void;
  isAtDefault?: () => boolean;
}

export type ResetOutcome = "component" | "value" | "skipped";

export function parseTargetIds(value: string | null | undefined): string[];

export function applyResetToTarget(
  target: ResetTarget | null | undefined,
  notify?: (target: ResetTarget) => void,
): ResetOutcome;

export function isTargetAtDefault(
  target: ResetTarget | null | undefined,
): boolean;

export function areTargetsAtDefault(
  targets: (ResetTarget | null | undefined)[],
): boolean;
