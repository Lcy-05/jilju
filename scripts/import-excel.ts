import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read Excel file
const filePath = path.join(__dirname, '..', 'attached_assets', '협의 완료 업체_1759578775630.xlsx');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Total rows:', data.length);
  console.log('\nFirst 5 rows:');
  console.log(JSON.stringify(data.slice(0, 5), null, 2));
  
  // Save to file for inspection
  fs.writeFileSync(
    path.join(__dirname, 'excel-data.json'),
    JSON.stringify(data, null, 2)
  );
  
  console.log('\nData saved to scripts/excel-data.json');
} catch (error) {
  console.error('Error reading Excel file:', error);
  process.exit(1);
}
