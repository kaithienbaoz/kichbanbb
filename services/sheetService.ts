
/**
 * Service to fetch character names from a specific Google Sheet.
 */

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/18Xt1G1HbCsZWdszFCgvGwcnQv0YafpzCoVfEz4eloWc/export?format=csv&gid=0";

export const fetchCharacterNamesFromSheet = async (): Promise<string[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    console.log("Fetching character names from sheet...");
    // Add cache buster and use no-cache headers
    const url = `${SHEET_CSV_URL}&t=${Date.now()}`;
    const response = await fetch(url, { 
      cache: 'no-store',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
    }
    const csvText = await response.text();
    
    // Check if we got HTML instead of CSV (happens if sheet is not public)
    if (csvText.includes("<!DOCTYPE html>") || csvText.includes("<html")) {
      throw new Error("Dữ liệu nhận được không phải là CSV. Vui lòng đảm bảo Google Sheet đã được chia sẻ công khai (Anyone with the link can view).");
    }

    console.log("CSV data received, length:", csvText.length);
    
    // Parse CSV more robustly
    const rows = csvText.split(/\r?\n/);
    if (rows.length <= 1) {
      console.warn("CSV has only header or is empty.");
      return [];
    }

    const characterNames: string[] = [];
    
    // Column N is index 13 (A=0, B=1, ..., N=13)
    // Skip header row (index 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;
      
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < row.length; j++) {
        const char = row[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current);

      // Log the first data row's column count for debugging
      if (i === 1) console.log(`First data row has ${columns.length} columns.`);

      if (columns.length > 13) {
        const name = columns[13].replace(/^"|"$/g, "").trim();
        if (name && name.toLowerCase() !== "character" && name.toLowerCase() !== "nhân vật" && name.toLowerCase() !== "name") {
          characterNames.push(name);
        }
      }
    }
    
    const uniqueNames = Array.from(new Set(characterNames));
    console.log(`Found ${uniqueNames.length} unique characters in sheet.`);
    return uniqueNames;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Yêu cầu quá hạn (Timeout). Vui lòng kiểm tra lại kết nối mạng hoặc file Google Sheet.");
    }
    console.error("Error fetching character names from sheet:", error);
    throw error;
  }
};
