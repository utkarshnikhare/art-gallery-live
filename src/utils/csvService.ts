/**
 * Intelligent CSV / Spreadsheet Migration & Export Service
 * Adheres to RFC-4180 parsing with robust row-level validation and conflict reports.
 */

import { UserArtwork } from '../types';

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

export interface ImportValidationRow<T> {
  rowNumber: number;
  originalData: Record<string, string>;
  parsedData?: T;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

export interface ImportPreview<T> {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  rows: ImportValidationRow<T>[];
}

/**
 * Standard RFC-4180 CSV Text Parser
 */
export function parseCsvText(csvText: string): CsvParseResult {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        insideQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  // Push final field/row if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = lines[0].map((h) => h.replace(/^\uFEFF/, '').trim()); // Strip BOM
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const values = lines[r];
    const rowObj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = values[c] !== undefined ? values[c] : '';
    }
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Validate and map CSV rows to UserArtwork objects
 */
export function validateArtworkImport(
  rows: Record<string, string>[],
  columnMap: Record<string, string>,
  existingArtworks: UserArtwork[],
  artistNameDefault = 'Artist'
): ImportPreview<UserArtwork> {
  const existingTitles = new Set(existingArtworks.map((a) => a.title.toLowerCase().trim()));
  const validatedRows: ImportValidationRow<UserArtwork>[] = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // +1 for header, +1 for 1-based index
    const errors: string[] = [];

    // Map fields
    const getVal = (targetField: string): string => {
      const csvHeader = columnMap[targetField];
      return csvHeader && row[csvHeader] !== undefined ? row[csvHeader].trim() : '';
    };

    const title = getVal('title') || row['Title'] || row['Artwork Title'] || row['title'] || '';
    const medium = getVal('medium') || row['Medium'] || row['Materials'] || row['medium'] || 'Mixed Media';
    const yearStr = getVal('yearCreated') || row['Year'] || row['year'] || '';
    const heightStr = getVal('height') || row['Height'] || row['height'] || '';
    const widthStr = getVal('width') || row['Width'] || row['width'] || '';
    const priceStr = getVal('listPrice') || row['Price'] || row['List Price'] || row['price'] || '';
    const costStr = getVal('productionCost') || row['Cost'] || row['cost'] || '0';
    const availabilityRaw = (getVal('availability') || row['Status'] || row['availability'] || 'available').toLowerCase();

    if (!title) {
      errors.push('Artwork Title is missing');
    }

    const yearCreated = parseInt(yearStr, 10) || new Date().getFullYear();
    const height = parseFloat(heightStr) || 0;
    const width = parseFloat(widthStr) || 0;
    const listPrice = parseFloat(priceStr.replace(/[^0-9.-]/g, '')) || 0;
    const productionCost = parseFloat(costStr.replace(/[^0-9.-]/g, '')) || 0;

    if (height <= 0 || width <= 0) {
      errors.push('Dimensions (height and width) must be numbers greater than 0');
    }

    const isDuplicate = existingTitles.has(title.toLowerCase());
    if (isDuplicate) {
      duplicateCount++;
    }

    let availability: UserArtwork['availability'] = 'available';
    if (availabilityRaw.includes('sold')) availability = 'sold';
    else if (availabilityRaw.includes('reserve')) availability = 'reserved';
    else if (availabilityRaw.includes('exhibit')) availability = 'on-exhibition';
    else if (availabilityRaw.includes('consign')) availability = 'on-consignment';

    let parsedArtwork: UserArtwork | undefined;
    const isValid = errors.length === 0;

    if (isValid) {
      parsedArtwork = {
        id: `art-imp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        title,
        artistName: artistNameDefault,
        yearCreated,
        medium,
        dimensions: {
          height,
          width,
          unit: 'cm',
        },
        orientation: width > height ? 'horizontal' : width < height ? 'vertical' : 'square',
        artworkType: 'original',
        productionCost,
        listPrice,
        currency: 'USD',
        availability,
        location: getVal('location') || 'Studio Storage',
        tags: ['imported'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      validCount++;
    } else {
      errorCount++;
    }

    validatedRows.push({
      rowNumber,
      originalData: row,
      parsedData: parsedArtwork,
      isValid,
      errors,
      isDuplicate,
    });
  });

  return {
    totalRows: rows.length,
    validCount,
    errorCount,
    duplicateCount,
    rows: validatedRows,
  };
}

/**
 * Export data array to standard downloadable CSV string
 */
export function exportToCsv<T extends Record<string, any>>(data: T[], columns: { key: keyof T; label: string }[]): string {
  if (data.length === 0) return '';

  const headerRow = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        const val = item[col.key];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerRow, ...rows].join('\r\n');
}

/**
 * Trigger browser file download
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
