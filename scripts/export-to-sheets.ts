import { google } from 'googleapis';
import { db } from '../server/db';
import { merchants, benefits, categories, regions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function exportToSheets() {
  console.log('=== Starting export to Google Sheets ===\n');
  
  // 1. Setup Google Sheets API authentication
  console.log('Step 1: Authenticating with Google Sheets API...');
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }
  
  const credentials = JSON.parse(serviceAccountJson);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 2. Get spreadsheet ID
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable not set. Please add your Google Spreadsheet ID.');
  }
  
  console.log(`Using spreadsheet: ${spreadsheetId}\n`);
  
  // 3. Fetch all merchants with related data
  console.log('Step 2: Fetching merchants from database...');
  const allMerchants = await db.select().from(merchants);
  const allCategories = await db.select().from(categories);
  const allRegions = await db.select().from(regions);
  const allBenefits = await db.select().from(benefits);
  
  console.log(`Found ${allMerchants.length} merchants\n`);
  
  // Create lookup maps
  const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
  const regionMap = new Map(allRegions.map(r => [r.id, r]));
  const benefitsByMerchant = new Map<string, typeof allBenefits>();
  
  allBenefits.forEach(benefit => {
    const merchantId = benefit.merchantId;
    if (!benefitsByMerchant.has(merchantId)) {
      benefitsByMerchant.set(merchantId, []);
    }
    benefitsByMerchant.get(merchantId)!.push(benefit);
  });
  
  // Reverse region mapping
  const REGION_MAP_REVERSE: Record<string, string> = {
    'ZONE_CITY_HALL': '시청권',
    'ZONE_NOHYEONG': '노형권',
    'ZONE_ARA': '아라권',
    'ZONE_AIRPORT_COAST': '공항연안권',
    'ZONE_SAMHWA': '삼화권',
    'ZONE_EAST': '동부권',
    'ZONE_WEST': '서부권',
    'ZONE_SEOGWIPO': '서귀포권',
  };
  
  // 4. Prepare data for Google Sheets
  console.log('Step 3: Preparing data for Google Sheets...');
  
  const headers = [
    '상호명',
    '가게 대표 이미지(URL)',
    '가게 전화번호',
    '가게 주소',
    '지역(분류)',
    '가게 URL',
    '휴무일',
    '가게 영업시간',
    '가게 카테고리',
    '가게 설명',
    '제휴 내용',
    '경도',
    '위도',
  ];
  
  const rows: any[][] = [headers];
  
  for (const merchant of allMerchants) {
    const category = merchant.categoryId ? categoryMap.get(merchant.categoryId) : '';
    const region = merchant.regionId ? regionMap.get(merchant.regionId) : null;
    const regionName = region ? REGION_MAP_REVERSE[region.code || ''] || region.name : '';
    
    // Get location
    const location = merchant.location as any;
    const latitude = location?.lat || 0;
    const longitude = location?.lng || 0;
    
    // Extract business hours from description
    const description = merchant.description || '';
    let businessHours = '';
    let cleanDescription = description;
    
    const hoursMatch = description.match(/\|\s*영업시간:\s*(.+?)$/);
    if (hoursMatch) {
      businessHours = hoursMatch[1];
      cleanDescription = description.replace(/\s*\|\s*영업시간:.+$/, '');
    }
    
    // Get first benefit for this merchant
    const merchantBenefits = benefitsByMerchant.get(merchant.id) || [];
    const firstBenefit = merchantBenefits[0];
    const partnershipContent = firstBenefit?.description || '';
    
    const row = [
      merchant.name,
      merchant.images?.[0] || '',
      merchant.phone || '',
      merchant.address || '',
      regionName,
      merchant.website || '',
      merchant.closedDays || '',
      businessHours,
      category || '',
      cleanDescription,
      partnershipContent,
      longitude,
      latitude,
    ];
    
    rows.push(row);
  }
  
  console.log(`Prepared ${rows.length - 1} rows (+ 1 header row)\n`);
  
  // 5. Clear existing data and write new data
  console.log('Step 4: Writing to Google Sheets...');
  
  // Clear the sheet first
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'A:M',
  });
  
  // Write the data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  });
  
  console.log('✅ Export complete!');
  console.log(`Exported ${rows.length - 1} merchants to Google Sheets`);
  console.log(`\nSpreadsheet URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  
  process.exit(0);
}

exportToSheets().catch((error) => {
  console.error('Export failed:', error);
  process.exit(1);
});
