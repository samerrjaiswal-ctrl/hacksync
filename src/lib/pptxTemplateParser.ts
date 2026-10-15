import JSZip from 'jszip';
import type { PptxParsedTemplate } from '../types';

/**
 * Calculates perceived relative luminance (0 to 255) of a 6-char hex color.
 */
export function calculateHexLuminance(hex: string): number {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return 255;
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

/**
 * Extracts a 6-digit hex color from an XML color node element string.
 */
function extractClrHex(xml: string, tag: string): string | null {
  const openIdx = xml.indexOf(`<a:${tag}>`);
  if (openIdx === -1) return null;
  const closeIdx = xml.indexOf(`</a:${tag}>`, openIdx);
  if (closeIdx === -1) return null;
  const block = xml.substring(openIdx, closeIdx);

  // Check <a:srgbClr val="RRGGBB"/>
  const srgbMatch = block.match(/<a:srgbClr\s+val="([0-9a-fA-F]{6})"/i);
  if (srgbMatch) return srgbMatch[1].toUpperCase();

  // Check <a:sysClr val="..." lastClr="RRGGBB"/>
  const sysMatch = block.match(/lastClr="([0-9a-fA-F]{6})"/i);
  if (sysMatch) return sysMatch[1].toUpperCase();

  return null;
}

/**
 * Parses an uploaded .pptx PowerPoint file using client/server JSZip OOXML inspection.
 * Extracts theme color schemes, font families, master background, layout counts, and media assets.
 */
export async function parseUploadedPptxTemplate(
  fileOrBuffer: File | Blob | ArrayBuffer | Uint8Array,
  fileName?: string
): Promise<PptxParsedTemplate> {
  let buffer: ArrayBuffer;

  if (typeof Blob !== 'undefined' && fileOrBuffer instanceof Blob) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else if (fileOrBuffer instanceof Uint8Array) {
    buffer = fileOrBuffer.buffer.slice(
      fileOrBuffer.byteOffset,
      fileOrBuffer.byteOffset + fileOrBuffer.byteLength
    ) as ArrayBuffer;
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
  } else {
    throw new Error('Unsupported template input format: expected File, Blob, or ArrayBuffer.');
  }

  const zip = await JSZip.loadAsync(buffer);

  // Verify Content_Types
  const contentTypes = zip.file('[Content_Types].xml');
  if (!contentTypes) {
    throw new Error('Invalid PowerPoint file: Missing [Content_Types].xml manifest.');
  }

  // Count slides in template
  let slideCount = 0;
  zip.forEach((relativePath) => {
    if (/^ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slideCount++;
    }
  });

  // Count media files in template (logos, header banners)
  let mediaFilesCount = 0;
  zip.forEach((relativePath) => {
    if (/^ppt\/media\//i.test(relativePath)) {
      mediaFilesCount++;
    }
  });

  // Extract layout names
  const layoutNames: string[] = [];
  zip.forEach((relativePath) => {
    if (/^ppt\/slideLayouts\/slideLayout\d+\.xml$/i.test(relativePath)) {
      const match = relativePath.match(/slideLayout(\d+)\.xml$/i);
      layoutNames.push(`Layout ${match ? match[1] : layoutNames.length + 1}`);
    }
  });

  // Parse Theme XML
  let themeName = 'Custom Theme';
  let fontHeading = 'Segoe UI';
  let fontBody = 'Segoe UI';
  let accent1 = '0284C7'; // Fallback Ocean
  let accent2 = '06B6D4'; // Fallback Cyan
  let dk1 = '0A0F1D';
  let lt1 = 'FFFFFF';

  // Find theme XML file
  let themeFile = zip.file('ppt/theme/theme1.xml');
  if (!themeFile) {
    zip.forEach((relativePath, file) => {
      if (/^ppt\/theme\/theme\d+\.xml$/i.test(relativePath) && !themeFile) {
        themeFile = file;
      }
    });
  }

  if (themeFile) {
    const themeXml = await themeFile.async('string');

    // Extract theme name
    const themeNameMatch = themeXml.match(/<a:clrScheme\s+name="([^"]+)"/i);
    if (themeNameMatch) {
      themeName = themeNameMatch[1];
    }

    // Extract colors
    dk1 = extractClrHex(themeXml, 'dk1') || dk1;
    lt1 = extractClrHex(themeXml, 'lt1') || lt1;
    accent1 = extractClrHex(themeXml, 'accent1') || accent1;
    accent2 = extractClrHex(themeXml, 'accent2') || accent2;

    // Extract fonts
    const majorFontMatch = themeXml.match(/<a:majorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/i);
    if (majorFontMatch) {
      fontHeading = majorFontMatch[1];
    }
    const minorFontMatch = themeXml.match(/<a:minorFont>[\s\S]*?<a:latin\s+typeface="([^"]+)"/i);
    if (minorFontMatch) {
      fontBody = minorFontMatch[1];
    }
  }

  // Inspect Slide Master background if present
  let masterBgHex: string | null = null;
  const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
  if (masterFile) {
    const masterXml = await masterFile.async('string');
    const srgbBg = masterXml.match(/<p:bg>[\s\S]*?<a:srgbClr\s+val="([0-9a-fA-F]{6})"/i);
    if (srgbBg) {
      masterBgHex = srgbBg[1].toUpperCase();
    }
  }

  // Determine Background & Contrast Mode
  const detectedBg = masterBgHex || lt1;
  const luminance = calculateHexLuminance(detectedBg);
  const isLightMode = luminance > 128;

  // Build clean, harmonized palette based on extracted template
  const textPrimary = isLightMode ? (dk1.length === 6 ? dk1 : '0F172A') : (lt1.length === 6 ? lt1 : 'FFFFFF');
  const textSecondary = isLightMode ? '475569' : '94A3B8';
  const cardBackground = isLightMode ? 'FFFFFF' : '0F172A';
  const border = isLightMode ? '000000' : accent1;

  return {
    isTemplateValid: true,
    themeName,
    colors: {
      background: detectedBg,
      cardBackground,
      border,
      textPrimary,
      textSecondary,
      accentPrimary: accent1,
      accentSecondary: accent2
    },
    fonts: {
      heading: fontHeading,
      body: fontBody
    },
    slideCount,
    layoutNames,
    mediaFilesCount,
    fileName: fileName || (fileOrBuffer instanceof File ? fileOrBuffer.name : 'custom_template.pptx'),
    fileSize: buffer.byteLength,
    isLightMode
  };
}
