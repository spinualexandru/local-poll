export interface ColorPickerStateInput {
  textValue: string;
  swatchValue: string;
  inheritLabel?: string;
}

export interface ColorPickerState {
  inherited: boolean;
  invalid: boolean;
  value: string;
}

export function normalizeHexColor(value: string): string | null;

export function resolveColorPickerState(
  input: ColorPickerStateInput,
): ColorPickerState;
