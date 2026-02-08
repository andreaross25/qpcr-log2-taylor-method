export function getWorkbookFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        resolve(workbook);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

export function getSheetNames(workbook) {
  return workbook.SheetNames || [];
}

export function parseSheetToJson(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function normalizeHeaders(rows) {
  if (!rows.length) {
    return { headers: [], rows: [] };
  }
  const headers = Object.keys(rows[0]);
  const normalizedRows = rows.map((row) => {
    const normalized = {};
    headers.forEach((header) => {
      normalized[header] = row[header];
    });
    return normalized;
  });
  return { headers, rows: normalizedRows };
}

export function uniqueValues(rows, key) {
  const values = new Set();
  rows.forEach((row) => {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      values.add(String(value).trim());
    }
  });
  return Array.from(values);
}
