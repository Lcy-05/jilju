import XLSX from 'xlsx';
import * as fs from 'fs';

const file = fs.readFileSync('scripts/new-merchants.xlsx');
const workbook = XLSX.read(file, { type: 'buffer' });
const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

console.log('Rows:', data.length);
console.log('Columns:', Object.keys(data[0] || {}).join(', '));
console.log('\nFirst row:', JSON.stringify(data[0], null, 2));
