import type { DatabaseSync } from "node:sqlite";
import type {
  Branding,
  BrandingLogo,
  BrandingSettings,
} from "../types/branding.ts";
import {
  DEFAULT_BRANDING,
  getLogoUrl,
  getThemeUrl,
  isBrandingCustomized,
} from "../utils/branding.ts";
import { isCustomizationEnabled } from "../utils/customization.ts";
import { Database } from "../utils/db.ts";
import { escapeHtml } from "../utils/html.ts";

interface StoredBranding {
  brand_name: string;
  primary_color: string;
  font_color: string;
  shadow_color: string | null;
  logo_mime_type: string | null;
  updated_at: number;
}

export class BrandingService {
  private static instance: BrandingService;
  private db: DatabaseSync;
  private cache: Branding | null = null;

  private constructor(db: DatabaseSync) {
    this.db = db;
  }

  public static getInstance(): BrandingService {
    if (!BrandingService.instance) {
      BrandingService.instance = new BrandingService(Database.getInstance().db);
    }
    return BrandingService.instance;
  }

  public static create(db: DatabaseSync): BrandingService {
    return new BrandingService(db);
  }

  /**
   * Reads the stored branding, falling back to the bundled defaults when the
   * instance has never been customized.
   */
  public get(): Branding {
    if (this.cache) {
      return this.cache;
    }

    let row: StoredBranding | undefined;
    try {
      row = this.db
        .prepare(
          `SELECT brand_name, primary_color, font_color, shadow_color,
                  logo_mime_type, updated_at
           FROM branding
           WHERE id = 1`,
        )
        .get() as StoredBranding | undefined;
    } catch {
      // The table only exists while customization is enabled.
      return DEFAULT_BRANDING;
    }

    this.cache = row
      ? {
          brandName: row.brand_name,
          primaryColor: row.primary_color,
          fontColor: row.font_color,
          shadowColor: row.shadow_color,
          logoMimeType: row.logo_mime_type,
          updatedAt: Number(row.updated_at) || 0,
        }
      : DEFAULT_BRANDING;

    return this.cache;
  }

  public getLogo(): BrandingLogo | null {
    let row: { logo: Uint8Array | null; logo_mime_type: string | null } | undefined;
    try {
      row = this.db
        .prepare("SELECT logo, logo_mime_type FROM branding WHERE id = 1")
        .get() as
        | { logo: Uint8Array | null; logo_mime_type: string | null }
        | undefined;
    } catch {
      return null;
    }

    if (!row?.logo || !row.logo_mime_type) {
      return null;
    }

    return { data: Buffer.from(row.logo), mimeType: row.logo_mime_type };
  }

  /**
   * Persists the branding settings, replacing the logo only when a new one was
   * uploaded.
   * @param settings - The validated brand name and theme colors.
   * @param logo - A new logo, or null to keep the current one.
   * @returns The branding as it is now stored.
   */
  public save(settings: BrandingSettings, logo: BrandingLogo | null): Branding {
    const updatedAt = Date.now();

    this.db
      .prepare(
        `INSERT INTO branding
           (id, brand_name, primary_color, font_color, shadow_color, updated_at)
         VALUES (1, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           brand_name = excluded.brand_name,
           primary_color = excluded.primary_color,
           font_color = excluded.font_color,
           shadow_color = excluded.shadow_color,
           updated_at = excluded.updated_at`,
      )
      .run(
        settings.brandName,
        settings.primaryColor,
        settings.fontColor,
        settings.shadowColor,
        updatedAt,
      );

    if (logo) {
      this.db
        .prepare("UPDATE branding SET logo = ?, logo_mime_type = ? WHERE id = 1")
        .run(logo.data, logo.mimeType);
    }

    this.cache = null;
    return this.get();
  }

  /**
   * Drops a custom logo and returns to the bundled artwork.
   */
  public clearLogo(): void {
    this.db
      .prepare(
        `UPDATE branding
         SET logo = NULL, logo_mime_type = NULL, updated_at = ?
         WHERE id = 1`,
      )
      .run(Date.now());
    this.cache = null;
  }
}

/**
 * Branding values every template can rely on.
 * @returns The escaped brand name, the logo and theme URLs, and which of the
 * sidebar's mutually exclusive footer links to hide.
 */
export const getBrandingView = (): {
  brandName: string;
  brandLogoUrl: string;
  brandThemeUrl: string;
  githubLinkHidden: string;
  attributionHidden: string;
} => {
  let branding = DEFAULT_BRANDING;
  if (isCustomizationEnabled()) {
    try {
      branding = BrandingService.getInstance().get();
    } catch {
      branding = DEFAULT_BRANDING;
    }
  }

  const customized = isBrandingCustomized(branding);

  return {
    brandName: escapeHtml(branding.brandName),
    brandLogoUrl: getLogoUrl(branding),
    brandThemeUrl: getThemeUrl(branding),
    githubLinkHidden: customized ? "hidden" : "",
    attributionHidden: customized ? "" : "hidden",
  };
};
