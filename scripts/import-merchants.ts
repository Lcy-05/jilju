import xlsx from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { merchants, benefits, categories, regions, users, userBookmarks, benefitTimeWindows, benefitBlackouts, benefitQuota, benefitAssets, benefitVersions, merchantHours, merchantHourExceptions, dailyMerchantKpis, eventLogs, userActivity, viewCountAggregates } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ExcelRow {
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

async function importMerchants() {
  console.log('=== Starting merchant import (1104 merchants) ===\n');
  
  // 1. Read Excel file
  console.log('Step 1: Reading Excel file...');
  const filePath = 'attached_assets/제휴 업체 완료 (최종_1104개)_1762177518030.xlsx';
  const file = fs.readFileSync(filePath);
  const workbook = xlsx.read(file, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet) as ExcelRow[];
  console.log(`Found ${data.length} rows\n`);
  
  // 2. Fetch existing categories and regions
  console.log('Step 2: Fetching categories and regions...');
  const allCategories = await db.select().from(categories);
  const allRegions = await db.select().from(regions);
  console.log(`Found ${allCategories.length} categories and ${allRegions.length} regions\n`);
  
  // Create maps
  const categoryNameToId = new Map(allCategories.map(c => [c.name, c.id]));
  const regionCodeToId = new Map(allRegions.map(r => [r.code || '', r.id]));
  
  console.log('Available categories:', Array.from(categoryNameToId.keys()));
  console.log('');
  
  // 3. Get admin user for createdBy
  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@jilju.com')).limit(1);
  const createdById = adminUser[0]?.id || null;
  
  // 4. DELETE ALL EXISTING DATA
  console.log('Step 3: Deleting existing merchants and benefits...');
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
  
  // 5. Process each row
  console.log(`Step 4: Importing ${data.length} merchants...`);
  let successCount = 0;
  let errorCount = 0;
  const errors: any[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    
    try {
      const name = row['상호명'];
      const imageUrl = row['가게 대표 이미지 URL (image_url) *'] || '';
      const phone = row['가게 전화번호 *'] || '';
      const address = row['가게 주소 (address) *'];
      const regionName = (row['지역'] || '').trim();
      const website = row['가게 URL (website) *'] || null;
      const closedDays = row['휴무일(요일)'] || '';
      const businessHours = row['가게 영업 시간 (business_hours) *'] || '';
      const categoryExcel = row['가게 카테고리 (category_name) *'] || '';
      const subDescription = row['가게 설명 (description) *'] || '';
      const partnershipContent = String(row['제휴 내용'] || '');
      const latitude = row['경도(px)'];
      const longitude = row['위도(py)'];

      if (!name || !address) {
        console.log(`  ⚠️  Skipping row ${i + 1}: Missing name or address`);
        errorCount++;
        continue;
      }

      // Map region
      const regionCode = REGION_MAP[regionName];
      const regionId = regionCode ? regionCodeToId.get(regionCode) : null;
      
      if (!regionId && regionName) {
        console.log(`  ⚠️  Warning: No region found for "${regionName}" (row ${i + 1}), using default`);
      }

      // Map category
      const mappedCategoryName = getCategoryName(categoryExcel, subDescription);
      const categoryId = categoryNameToId.get(mappedCategoryName);

      // Build description
      let description = subDescription;
      if (businessHours) {
        description = `${subDescription} | 영업시간: ${businessHours}`;
      }

      // Prepare location
      const location = {
        lat: latitude || 33.5,
        lng: longitude || 126.5
      };

      // Convert HTTP to HTTPS for image URLs (security fix)
      const secureImageUrl = imageUrl 
        ? imageUrl.replace(/^http:\/\//i, 'https://') 
        : '';
      const images = secureImageUrl ? [secureImageUrl] : [];

      // Insert merchant
      const [newMerchant] = await db.insert(merchants).values({
        name,
        description,
        categoryId: categoryId || null,
        address,
        phone,
        regionId: regionId || null,
        location,
        website,
        images,
        closedDays: closedDays || null,
        status: 'ACTIVE',
        createdBy: createdById,
        updatedBy: createdById,
      }).returning();

      // Create benefit if partnership content exists
      if (partnershipContent && partnershipContent.trim()) {
        let benefitType = 'GIFT';
        let percent: string | null = null;
        let amount: number | null = null;
        let gift: string | null = partnershipContent;

        // Extract percentage
        const percentMatch = partnershipContent.match(/(\d+)%/);
        if (percentMatch) {
          benefitType = 'PERCENT';
          percent = percentMatch[1] + '.00';
          gift = null;
        } else {
          // Extract amount (KRW)
          const amountMatch = partnershipContent.match(/(\d{1,3}(?:,\d{3})*)\s*원/);
          if (amountMatch) {
            benefitType = 'AMOUNT';
            amount = parseInt(amountMatch[1].replace(/,/g, ''));
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
      
    } catch (error: any) {
      errorCount++;
      errors.push({ row: i + 1, name: row['상호명'], error: error.message });
      console.error(`  ❌ Error row ${i + 1} (${row['상호명']}): ${error.message}`);
    }
  }
  
  console.log(`\n=== Import complete ===`);
  console.log(`Total rows: ${data.length}`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errors.length > 0 && errors.length <= 10) {
    console.log('\nError details:');
    errors.forEach(e => {
      console.log(`  Row ${e.row} (${e.name}): ${e.error}`);
    });
  }

  // Verify
  const merchantCount = await db.select().from(merchants);
  const benefitCount = await db.select().from(benefits);
  console.log(`\n✅ Database verification:`);
  console.log(`  Merchants: ${merchantCount.length}`);
  console.log(`  Benefits: ${benefitCount.length}`);
}

importMerchants().catch(console.error).finally(() => process.exit(0));
