export interface Branding {
  brandName: string;
  primaryColor: string;
  fontColor: string;
  /** A null shadow color inherits the font color. */
  shadowColor: string | null;
  logoMimeType: string | null;
  /** Epoch milliseconds of the last save, 0 while the defaults are in use. */
  updatedAt: number;
}

export interface BrandingSettingsInput {
  brandName: string;
  primaryColor: string;
  fontColor: string;
  shadowColor: string;
}

export interface BrandingSettings {
  brandName: string;
  primaryColor: string;
  fontColor: string;
  shadowColor: string | null;
}

export interface BrandingLogo {
  data: Buffer;
  mimeType: string;
}

export interface BrandingValidationResult<T> {
  errors: string[];
  values?: T;
}
