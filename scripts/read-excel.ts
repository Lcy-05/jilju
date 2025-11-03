import XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'attached_assets/제휴 업체 완료 (최종_1104개)_2_1762182768572.xlsx';

const file = fs.readFileSync(filePath);
const workbook = XLSX.read(file, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(sheet);

console.log('Total rows:', data.length);
console.log('\nFirst row sample:');
console.log(JSON.stringify(data[0], null, 2));

console.log('\nColumn names:');
if (data[0]) {
  console.log(Object.keys(data[0]));
}

console.log('\nFirst 3 rows:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));
