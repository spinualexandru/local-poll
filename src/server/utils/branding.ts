import type {
  Branding,
  BrandingLogo,
  BrandingSettings,
  BrandingSettingsInput,
  BrandingValidationResult,
} from "../types/branding.ts";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Text the shadow color field carries while it follows the font color. */
export const INHERIT_SHADOW_LABEL = "Inherit Font Color";
export const MAX_BRAND_NAME_LENGTH = 60;
export const MAX_LOGO_SIZE = 512 * 1024;
export const DEFAULT_LOGO_URL = "/logo.png";
export const BRANDING_LOGO_PATH = "/branding/logo";
export const BRANDING_THEME_PATH = "/branding/theme";

export const DEFAULT_BRANDING: Branding = {
  brandName: "LocalPoll",
  primaryColor: "#fcc435",
  fontColor: "#121e37",
  shadowColor: null,
  logoMimeType: null,
  updatedAt: 0,
};

const LOGO_SIGNATURES: {
  mimeType: string;
  matches: (data: Buffer) => boolean;
}[] = [
  {
    mimeType: "image/png",
    matches: (data) =>
      data
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: "image/jpeg",
    matches: (data) =>
      data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
  },
  {
    mimeType: "image/webp",
    matches: (data) =>
      data.subarray(0, 4).toString("latin1") === "RIFF" &&
      data.subarray(8, 12).toString("latin1") === "WEBP",
  },
];

export const normalizeHexColor = (value: string): string | null => {
  const candidate = value.trim();
  return HEX_COLOR.test(candidate) ? candidate.toLowerCase() : null;
};

const isInheritRequest = (value: string): boolean => {
  const candidate = value.trim().toLowerCase();
  return candidate === "" || candidate === INHERIT_SHADOW_LABEL.toLowerCase();
};

/**
 * Validates the brand name and theme colors submitted by an administrator.
 * @param input - The raw form values.
 * @returns The normalized settings, or the reasons they were rejected.
 */
export const validateBrandingSettings = (
  input: BrandingSettingsInput,
): BrandingValidationResult<BrandingSettings> => {
  const errors: string[] = [];
  const brandName = input.brandName.trim().replace(/\s+/g, " ");

  if (brandName.length === 0) {
    errors.push("Enter a brand name.");
  } else if (brandName.length > MAX_BRAND_NAME_LENGTH) {
    errors.push(
      `Keep the brand name under ${MAX_BRAND_NAME_LENGTH + 1} characters.`,
    );
  }

  const primaryColor = normalizeHexColor(input.primaryColor);
  if (!primaryColor) {
    errors.push("Enter the primary color as a hex value such as #fcc435.");
  }

  const fontColor = normalizeHexColor(input.fontColor);
  if (!fontColor) {
    errors.push("Enter the font color as a hex value such as #121e37.");
  }

  const inheritsShadow = isInheritRequest(input.shadowColor);
  const shadowColor = inheritsShadow ? null : normalizeHexColor(input.shadowColor);
  if (!inheritsShadow && !shadowColor) {
    errors.push(
      `Enter the shadow color as a hex value, or "${INHERIT_SHADOW_LABEL}".`,
    );
  }

  if (errors.length > 0 || !primaryColor || !fontColor) {
    return { errors };
  }

  return {
    errors,
    values: { brandName, primaryColor, fontColor, shadowColor },
  };
};

/**
 * Validates an uploaded logo by inspecting its bytes rather than trusting the
 * content type the browser reported.
 * @param file - The uploaded file name, declared type, and bytes.
 * @returns The stored logo, or the reasons it was rejected.
 */
export const validateLogo = (file: {
  filename: string;
  data: Buffer;
}): BrandingValidationResult<BrandingLogo> => {
  if (file.data.length > MAX_LOGO_SIZE) {
    return {
      errors: [`Choose a logo smaller than ${MAX_LOGO_SIZE / 1024}KB.`],
    };
  }

  const signature = LOGO_SIGNATURES.find((candidate) =>
    candidate.matches(file.data),
  );

  if (!signature) {
    return { errors: ["Choose a logo in PNG, JPG, or WebP format."] };
  }

  return {
    errors: [],
    values: { data: file.data, mimeType: signature.mimeType },
  };
};

const toRgbChannels = (hexColor: string): [number, number, number] => [
  parseInt(hexColor.slice(1, 3), 16),
  parseInt(hexColor.slice(3, 5), 16),
  parseInt(hexColor.slice(5, 7), 16),
];

/**
 * Builds the stylesheet that re-points the design tokens at the instance theme.
 * @param branding - The stored branding settings.
 * @returns CSS overriding the color tokens declared in tokens.css.
 */
export const buildThemeCss = (branding: Branding): string => {
  const primaryColor = normalizeHexColor(branding.primaryColor) || DEFAULT_BRANDING.primaryColor;
  const fontColor = normalizeHexColor(branding.fontColor) || DEFAULT_BRANDING.fontColor;
  const shadowColor = branding.shadowColor
    ? normalizeHexColor(branding.shadowColor) || fontColor
    : fontColor;
  const [red, green, blue] = toRgbChannels(primaryColor);

  return `:root {
  --lp-color-primary: ${primaryColor};
  --lp-color-ink: ${fontColor};
  --lp-shadow-raised: 5px 5px 0 ${shadowColor};
  --lp-focus-ring: 0 0 0 4px rgb(${red} ${green} ${blue} / 45%);
}
`;
};

/**
 * Reports whether an administrator has moved the instance away from the
 * bundled identity, which is when LocalPoll steps back into an attribution.
 * @param branding - The stored branding settings.
 */
export const isBrandingCustomized = (branding: Branding): boolean =>
  branding.brandName !== DEFAULT_BRANDING.brandName ||
  normalizeHexColor(branding.primaryColor) !== DEFAULT_BRANDING.primaryColor ||
  normalizeHexColor(branding.fontColor) !== DEFAULT_BRANDING.fontColor ||
  branding.shadowColor !== DEFAULT_BRANDING.shadowColor ||
  branding.logoMimeType !== null;

/**
 * Resolves the URL a template should use for the instance logo.
 * @param branding - The stored branding settings.
 * @returns The uploaded logo URL, or the bundled default.
 */
export const getLogoUrl = (branding: Branding): string =>
  branding.logoMimeType
    ? `${BRANDING_LOGO_PATH}?v=${branding.updatedAt}`
    : DEFAULT_LOGO_URL;

/**
 * Resolves the URL a layout should use for the generated theme stylesheet.
 * @param branding - The stored branding settings.
 * @returns The theme URL, versioned so saved changes bust caches.
 */
export const getThemeUrl = (branding: Branding): string =>
  `${BRANDING_THEME_PATH}?v=${branding.updatedAt}`;
