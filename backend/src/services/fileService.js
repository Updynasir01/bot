const fs = require('fs');
const path = require('path');

const extractPdfText = async (filePath) => {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text.trim();
  } catch (err) {
    console.error('PDF extraction error:', err);
    throw new Error('Failed to extract text from PDF: ' + err.message);
  }
};

const extractExcelText = async (filePath) => {
  try {
    const XLSX = require('xlsx');
    const ext = path.extname(filePath).toLowerCase();
    let text = '';

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      text += 'Price List / Product List:\n\n';
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const row = headers.map((h, idx) => `${h}: ${values[idx] || ''}`).join(' | ');
        text += row + '\n';
      }
    } else {
      const workbook = XLSX.readFile(filePath);
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        text += `Sheet: ${sheetName}\n`;
        for (const row of json) {
          const line = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ');
          text += line + '\n';
        }
        text += '\n';
      }
    }

    return text.trim();
  } catch (err) {
    console.error('Excel extraction error:', err);
    throw new Error('Failed to extract from Excel/CSV: ' + err.message);
  }
};

module.exports = { extractPdfText, extractExcelText };
