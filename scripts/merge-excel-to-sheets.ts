import { google } from 'googleapis';
import { read, utils } from 'xlsx';
import { readFileSync, existsSync } from 'fs';

async function mergeExcelToSheets() {
  console.log('=== Excel → Google Sheets 병합 (중복 제외) ===\n');
  
  // 1. Setup Google Sheets API
  console.log('Step 1: Google Sheets API 인증...');
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 환경 변수가 설정되지 않았습니다');
  }
  
  const credentials = JSON.parse(serviceAccountJson);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID 환경 변수가 설정되지 않았습니다');
  }
  
  console.log(`스프레드시트: ${spreadsheetId}\n`);
  
  // 2. Read Excel file
  console.log('Step 2: 엑셀 파일 읽기...');
  const excelPath = 'attached_assets/제휴 업체 완료 (최종_1104개)_1762174894927.xlsx';
  
  if (!existsSync(excelPath)) {
    throw new Error(`엑셀 파일을 찾을 수 없습니다: ${excelPath}`);
  }
  
  const buffer = readFileSync(excelPath);
  const workbook = read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const excelData: any[][] = utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log(`엑셀 데이터: ${excelData.length - 1}개 행 (헤더 제외)`);
  console.log(`엑셀 헤더:`, excelData[0]);
  console.log('');
  
  // 3. Read existing Google Sheets data
  console.log('Step 3: 구글 시트 기존 데이터 읽기...');
  
  const range = 'A:M';
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  
  const sheetsData = response.data.values || [];
  console.log(`구글 시트 데이터: ${sheetsData.length - 1}개 행 (헤더 제외)`);
  
  if (sheetsData.length > 0) {
    console.log(`구글 시트 헤더:`, sheetsData[0]);
  }
  console.log('');
  
  // 4. Identify duplicates by merchant name + address
  console.log('Step 4: 중복 확인...');
  
  const existingMerchants = new Set<string>();
  
  // Skip header row in sheets data
  for (let i = 1; i < sheetsData.length; i++) {
    const row = sheetsData[i];
    const name = row[0] || '';
    const address = row[3] || '';
    
    if (name && address) {
      const key = `${name}|${address}`.toLowerCase().trim();
      existingMerchants.add(key);
    }
  }
  
  console.log(`기존 가맹점: ${existingMerchants.size}개\n`);
  
  // 5. Filter out duplicates from Excel data
  console.log('Step 5: 새로운 데이터만 필터링...');
  
  const newRows: any[][] = [];
  let duplicateCount = 0;
  let invalidCount = 0;
  
  // Add header if sheets is empty
  if (sheetsData.length === 0) {
    newRows.push(excelData[0]);
  }
  
  for (let i = 1; i < excelData.length; i++) {
    const row = excelData[i];
    const name = row[0] || '';
    const address = row[3] || '';
    
    // Skip if missing essential data
    if (!name || !address) {
      invalidCount++;
      continue;
    }
    
    const key = `${name}|${address}`.toLowerCase().trim();
    
    if (existingMerchants.has(key)) {
      duplicateCount++;
      continue;
    }
    
    newRows.push(row);
  }
  
  console.log(`✅ 새로운 데이터: ${newRows.length}개`);
  console.log(`⚠️  중복 제외: ${duplicateCount}개`);
  console.log(`⚠️  필수 정보 누락: ${invalidCount}개`);
  console.log('');
  
  // 6. Append new data to Google Sheets
  if (newRows.length > 0) {
    console.log('Step 6: 구글 시트에 새로운 데이터 추가...');
    
    // If sheets is empty, start from A1
    // Otherwise, append after existing data
    const startRow = sheetsData.length === 0 ? 1 : sheetsData.length + 1;
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:M',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: newRows,
      },
    });
    
    console.log(`✅ ${newRows.length}개의 새로운 가맹점을 구글 시트에 추가했습니다!`);
    console.log(`\n스프레드시트 URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  } else {
    console.log('⚠️  추가할 새로운 데이터가 없습니다. 모든 데이터가 이미 존재합니다.');
  }
  
  console.log('\n=== 병합 완료 ===');
  console.log(`총 처리된 행: ${excelData.length - 1}`);
  console.log(`새로 추가됨: ${newRows.length}`);
  console.log(`중복 제외: ${duplicateCount}`);
  console.log(`필수 정보 누락: ${invalidCount}`);
  
  process.exit(0);
}

mergeExcelToSheets().catch((error) => {
  console.error('병합 실패:', error);
  process.exit(1);
});
