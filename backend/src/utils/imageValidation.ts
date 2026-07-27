import sharp from 'sharp';

export interface ImageQualityResult {
  status: 'good' | 'warn' | 'blocked';
  dpi: number;
  widthPx: number;
  heightPx: number;
  message: string;
}

/**
 * Validates whether an image meets print quality requirements for the given
 * physical print dimensions (in mm). Thresholds are read from the product
 * config so this function is reusable for any future product type.
 */
export async function validateImageQuality(
  buffer: Buffer,
  widthMm: number,
  heightMm: number,
  minDpi: number,
  warnDpi: number,
  targetDpi: number
): Promise<ImageQualityResult> {
  const meta = await sharp(buffer).metadata();
  const widthPx = meta.width ?? 0;
  const heightPx = meta.height ?? 0;

  // Calculate effective DPI based on smallest dimension
  const mmPerInch = 25.4;
  const dpiW = Math.round((widthPx / widthMm) * mmPerInch);
  const dpiH = Math.round((heightPx / heightMm) * mmPerInch);
  const dpi = Math.min(dpiW, dpiH);

  if (dpi < minDpi) {
    return {
      status: 'blocked',
      dpi,
      widthPx,
      heightPx,
      message: `Your photo is too low-resolution for printing (${dpi} DPI — minimum is ${minDpi} DPI). Please upload a higher-quality photo.`,
    };
  }

  if (dpi < warnDpi) {
    return {
      status: 'warn',
      dpi,
      widthPx,
      heightPx,
      message: `This photo might look a little blurry when printed (${dpi} DPI). For best results we recommend at least ${targetDpi} DPI — you can continue if you're happy with it.`,
    };
  }

  return {
    status: 'good',
    dpi,
    widthPx,
    heightPx,
    message: `Great quality! (${dpi} DPI)`,
  };
}

/** Client-side pixel threshold check (no sharp needed) */
export function clientSideQualityCheck(
  widthPx: number,
  heightPx: number,
  widthMm: number,
  heightMm: number,
  minDpi: number,
  warnDpi: number
): 'good' | 'warn' | 'blocked' {
  const mmPerInch = 25.4;
  const dpiW = (widthPx / widthMm) * mmPerInch;
  const dpiH = (heightPx / heightMm) * mmPerInch;
  const dpi = Math.min(dpiW, dpiH);
  if (dpi < minDpi) return 'blocked';
  if (dpi < warnDpi) return 'warn';
  return 'good';
}
