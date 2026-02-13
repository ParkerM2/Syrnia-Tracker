/**
 * Shared CSV parsing utilities.
 * Single source of truth for CSV field escaping and line parsing.
 */

/**
 * Escape a CSV field value, wrapping in quotes if it contains commas, quotes, or newlines.
 */
export const escapeCSVField = (field: string | undefined | null): string => {
  const safeField = field || "";
  if (safeField.includes(",") || safeField.includes('"') || safeField.includes("\n")) {
    return `"${safeField.replace(/"/g, '""')}"`;
  }
  return safeField;
};

/**
 * Parse a single CSV line into an array of field values.
 * Handles quoted fields with commas and escaped quotes.
 */
export const parseCSVLine = (line: string): string[] => {
  const row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current);

  return row;
};
