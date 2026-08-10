export const parseTargetIds = (value) =>
  String(value || "")
    .split(/\s+/)
    .filter((id) => id.length > 0);

/**
 * Returns a target to the value it was served with.
 *
 * Components own their own reset when they expose `resetToDefault`, because a
 * value alone cannot describe states such as a cleared file input. Everything
 * else is a native control carrying `data-default-value`.
 *
 * @param target - The element to reset.
 * @param notify - Called after a native value changes, so listeners can sync.
 * @returns How the target was reset: "component", "value", or "skipped".
 */
export const applyResetToTarget = (target, notify) => {
  if (!target) return "skipped";

  if (typeof target.resetToDefault === "function") {
    target.resetToDefault();
    return "component";
  }

  if (!("value" in target)) return "skipped";

  target.value = target.dataset?.defaultValue ?? "";
  notify?.(target);
  return "value";
};

/**
 * Reports whether a target still holds the value it was served with, which is
 * when offering a reset would be noise.
 *
 * Components answer for themselves through `isAtDefault`; a target that can
 * neither answer nor hold a value has nothing to reset, so it counts as
 * untouched.
 *
 * @param target - The element to inspect.
 */
export const isTargetAtDefault = (target) => {
  if (!target) return true;

  if (typeof target.isAtDefault === "function") {
    return target.isAtDefault();
  }

  if (!("value" in target)) return true;

  return String(target.value) === (target.dataset?.defaultValue ?? "");
};

export const areTargetsAtDefault = (targets) =>
  targets.every((target) => isTargetAtDefault(target));
