import xlsx from 'xlsx';
import { db } from '../server/db';
import { merchants, benefits, categories, regions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function readExcelFile() {
  const workbook = xlsx.readFile('attached_assets/대협 업체 완료_(1-50)_1761658710662.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  
  console.log('Total rows:', data.length);
  console.log('Sample row:', JSON.stringify(data[0], null, 2));
  console.log('Column names:', Object.keys(data[0] || {}));
  
  return data;
}

readExcelFile().catch(console.error);
