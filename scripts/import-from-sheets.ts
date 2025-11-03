import { google } from 'googleapis';
import { db } from '../server/db';
import { merchants, benefits, categories, regions, users, userBookmarks, benefitTimeWindows, benefitBlackouts, benefitQuota, benefitAssets, benefitVersions, merchantHours, merchantHourExceptions, dailyMerchantKpis, eventLogs, userActivity, viewCountAggregates } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Google Sheets 데이터 구조
interface SheetsRow {
  '상호명': string;
  '가게 대표 이미지 URL (image_url) *': string;
  '가게 전화번호 *': string;
  '가게 주소 (address) *': string;
  '지역': string;
  '가게 URL (website) *': string;
  '휴무일(요일)': string;
  '가게 영업 시간 (business_hours) *': string;
  '가게 카테고리 (category_name) *': string;
  '가게 설명 (description) *': string;
  '제휴 내용': string;
  '경도(px)': number;
  '위도(py)': number;
}

// Region mapping
const REGION_MAP: Record<string, string> = {
  '시청권': 'ZONE_CITY_HALL',
  '노형권': 'ZONE_NOHYEONG',
  '아라권': 'ZONE_ARA',
  '공항연안권': 'ZONE_AIRPORT_COAST',
  '삼화권': 'ZONE_SAMHWA',
  '동부권': 'ZONE_EAST',
  '서부권': 'ZONE_WEST',
  '서귀포': 'ZONE_SEOGWIPO',
  '서귀포권': 'ZONE_SEOGWIPO',
};

// Category mapping function
function getCategoryName(excelCategory: string, description: string): string {
  const desc = description.toLowerCase();
  
  if (excelCategory === '음식' || desc.includes('양식') || desc.includes('한식') || desc.includes('중식') || desc.includes('일식') || desc.includes('치킨') || desc.includes('분식') || desc.includes('고기') || desc.includes('삼겹살')) {
    return '음식';
  }
  if (excelCategory === '카페' || excelCategory === '카페/바' || desc.includes('카페') || desc.includes('커피') || desc.includes('디저트') || desc.includes('베이커리') || desc.includes('주점') || desc.includes('바')) {
    return '카페/바';
  }
  if (excelCategory === '문화생활' || desc.includes('사진') || desc.includes('스튜디오') || desc.includes('영화') || desc.includes('공연') || desc.includes('문화')) {
    return '문화생활';
  }
  if (excelCategory === '스포츠' || desc.includes('헬스') || desc.includes('필라테스') || desc.includes('요가') || desc.includes('운동') || desc.includes('체육')) {
    return '스포츠';
  }
  if (excelCategory === '뷰티' || excelCategory === '뷰티/패션' || desc.includes('뷰티') || desc.includes('미용') || desc.includes('네일') || desc.includes('패션') || desc.includes('의류')) {
    return '뷰티/패션';
  }
  
  return '기타';
}

async function importFromSheets() {
  console.log('=== Starting Google Sheets import ===\n');
  
  // 1. Setup Google Sheets API authentication
  console.log('Step 1: Authenticating with Google Sheets API...');
  
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
  }
  
  const credentials = JSON.parse(serviceAccountJson);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 2. Read data from Google Sheets
  console.log('Step 2: Reading data from Google Sheets...');
  
  // TODO: USER NEEDS TO PROVIDE SPREADSHEET ID
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID environment variable not set. Please add your Google Spreadsheet ID.');
  }
  
  // Read all data from first sheet (A:M for 13 columns)
  const range = 'A:M';
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  
  const rows = response.data.values;
  
  if (!rows || rows.length === 0) {
    console.log('No data found in spreadsheet.');
    return;
  }
  
  // First row is headers
  const headers = rows[0];
  console.log('Headers:', headers);
  console.log(`Found ${rows.length - 1} data rows\n`);
  
  // Convert rows to objects
  const data: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    headers.forEach((header: string, index: number) => {
      obj[header] = row[index] || '';
    });
    data.push(obj);
  }
  
  console.log(`Parsed ${data.length} merchants\n`);
  
  // 3. Fetch existing categories and regions
  console.log('Step 3: Fetching categories and regions...');
  const allCategories = await db.select().from(categories);
  const allRegions = await db.select().from(regions);
  console.log(`Found ${allCategories.length} categories and ${allRegions.length} regions\n`);
  
  // Create maps
  const categoryNameToId = new Map(allCategories.map(c => [c.name, c.id]));
  const regionCodeToId = new Map(allRegions.map(r => [r.code || '', r.id]));
  
  console.log('Available categories:', Array.from(categoryNameToId.keys()));
  console.log('');
  
  // 4. Get admin user for createdBy
  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@jilju.com')).limit(1);
  const createdById = adminUser[0]?.id || null;
  
  // 5. DELETE ALL EXISTING DATA
  console.log('Step 4: Deleting existing merchants and benefits...');
  await db.delete(userActivity);
  await db.delete(viewCountAggregates);
  await db.delete(eventLogs);
  await db.delete(userBookmarks);
  await db.delete(benefitTimeWindows);
  await db.delete(benefitBlackouts);
  await db.delete(benefitQuota);
  await db.delete(benefitAssets);
  await db.delete(benefitVersions);
  await db.delete(benefits);
  await db.delete(merchantHours);
  await db.delete(merchantHourExceptions);
  await db.delete(dailyMerchantKpis);
  await db.delete(merchants);
  console.log('All existing data deleted.\n');
  
  // 6. Process each row
  console.log(`Step 5: Importing ${data.length} merchants...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    // Map to expected field names
    const name = row['상호명'];
    const imageUrl = row['가게 대표 이미지 URL (image_url) *'] || row['가게 대표 이미지(URL)'];
    const phone = row['가게 전화번호 *'] || row['가게 전화번호'];
    const address = row['가게 주소 (address) *'] || row['가게 주소'];
    const regionName = row['지역'] || row['지역(분류)'];
    const website = row['가게 URL (website) *'] || row['가게 URL'];
    const closedDays = row['휴무일(요일)'] || row['휴무일'] || '';
    const businessHours = row['가게 영업 시간 (business_hours) *'] || row['가게 영업시간'] || '';
    const categoryName = row['가게 카테고리 (category_name) *'] || row['가게 카테고리'];
    const description = row['가게 설명 (description) *'] || row['가게 설명'];
    const partnershipContent = row['제휴 내용'] || '';
    const longitude = parseFloat(row['경도(px)'] || row['경도'] || '0');
    const latitude = parseFloat(row['위도(py)'] || row['위도'] || '0');
    
    // Skip rows with missing essential data
    if (!name || !address) {
      console.log(`  ⚠️  Skipping row ${i + 2}: Missing name or address`);
      errorCount++;
      continue;
    }
    
    // Get category ID
    const mappedCategoryName = getCategoryName(categoryName, description);
    const categoryId = categoryNameToId.get(mappedCategoryName);
    
    // Get region ID
    const regionCode = REGION_MAP[regionName] || null;
    const regionId = regionCode ? regionCodeToId.get(regionCode) : null;
    
    // Prepare description with business hours
    const fullDescription = businessHours 
      ? `${description} | 영업시간: ${businessHours}`
      : description;
    
    // Convert HTTP to HTTPS for image URLs (security fix)
    const secureImageUrl = imageUrl 
      ? imageUrl.replace(/^http:\/\//i, 'https://') 
      : '';
    
    try {
      // Insert merchant
      const [newMerchant] = await db.insert(merchants).values({
        name,
        description: fullDescription,
        categoryId: categoryId || null,
        address,
        phone: phone || '',
        regionId: regionId || null,
        location: { lat: latitude, lng: longitude },
        website: website || null,
        images: secureImageUrl ? [secureImageUrl] : [],
        closedDays: closedDays || null,
        status: 'ACTIVE',
        createdBy: createdById,
        updatedBy: createdById,
      }).returning();
      
      // Create benefit if partnership content exists
      if (partnershipContent && partnershipContent.trim()) {
        // Parse benefit type from partnership content
        let benefitType = 'GIFT';
        let percent: string | null = null;
        let amount: number | null = null;
        let gift: string | null = partnershipContent;
        
        // Check for percentage discount
        const percentMatch = partnershipContent.match(/(\d+)%/);
        if (percentMatch) {
          benefitType = 'PERCENT';
          percent = percentMatch[1] + '.00';
          amount = null;
          gift = null;
        } else {
          // Check for amount discount
          const amountMatch = partnershipContent.match(/(\d{1,3}(?:,\d{3})*)원/);
          if (amountMatch) {
            benefitType = 'AMOUNT';
            const amountStr = amountMatch[1].replace(/,/g, '');
            amount = parseInt(amountStr);
            percent = null;
            gift = null;
          }
        }
        
        await db.insert(benefits).values({
          merchantId: newMerchant.id,
          categoryId: categoryId || null,
          title: `${name} 제휴 혜택`,
          description: partnershipContent,
          type: benefitType,
          percent,
          amount,
          gift,
          validFrom: new Date('2025-01-01'),
          validTo: new Date('2026-12-31'),
          geoRadiusM: 150,
          status: 'ACTIVE',
          createdBy: createdById,
          updatedBy: createdById,
          publishedAt: new Date(),
        });
      }
      
      successCount++;
      
      if ((i + 1) % 50 === 0) {
        console.log(`  Processed ${i + 1}/${data.length} merchants...`);
      }
    } catch (error) {
      console.error(`  ❌ Error processing row ${i + 2}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n=== Import complete ===');
  console.log(`Total rows: ${data.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  // Verify counts
  const merchantCount = await db.select().from(merchants);
  const benefitCount = await db.select().from(benefits);
  console.log(`\n✅ Database verification:`);
  console.log(`  Merchants: ${merchantCount.length}`);
  console.log(`  Benefits: ${benefitCount.length}`);
  
  process.exit(0);
}

importFromSheets().catch((error) => {
  console.error('Import failed:', error);
  process.exit(1);
});
