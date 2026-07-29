const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const normalizeHexColor = (value) => {
  const candidate = value.trim();
  return HEX_COLOR.test(candidate) ? candidate.toLowerCase() : null;
};

export const resolveColorPickerState = ({
  textValue,
  swatchValue,
  inheritLabel = "",
}) => {
  const normalizedText = normalizeHexColor(textValue);
  const normalizedSwatch = normalizeHexColor(swatchValue) || "#000000";
  const inherited =
    inheritLabel.length > 0 && textValue.trim() === inheritLabel.trim();

  return {
    inherited,
    invalid: !normalizedText && !inherited,
    value: normalizedText || normalizedSwatch,
  };
};
