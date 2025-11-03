import XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { merchants, benefits, categories, regions } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const filePath = 'attached_assets/제휴 업체 완료 (최종_1104개)_2_1762182768572.xlsx';

// Region mapping - 지역을 region code로 매핑
const REGION_MAP: Record<string, string> = {
  '시청권': 'ZONE_CITY_HALL',
  '노형권': 'ZONE_NOHYEONG',
  '노형동': 'ZONE_NOHYEONG',
  '아라권': 'ZONE_ARA',
  '아라동': 'ZONE_ARA',
  '공항연안권': 'ZONE_AIRPORT_COAST',
  '삼화권': 'ZONE_SAMHWA',
  '동부권': 'ZONE_EAST',
  '서부권': 'ZONE_WEST',
  '서귀포': 'ZONE_SEOGWIPO',
  '서귀포권': 'ZONE_SEOGWIPO',
};

// Category mapping function
function getCategoryName(excelCategory?: string, description?: string): string {
  const desc = (description || '').toLowerCase();
  const category = (excelCategory || '').toLowerCase();
  
  if (category.includes('음식') || desc.includes('양식') || desc.includes('한식') || desc.includes('중식') || desc.includes('일식') || desc.includes('치킨') || desc.includes('분식') || desc.includes('고기') || desc.includes('삼겹살')) {
    return '음식';
  }
  if (category.includes('카페') || category.includes('바') || desc.includes('카페') || desc.includes('커피') || desc.includes('디저트') || desc.includes('베이커리') || desc.includes('주점') || desc.includes('바')) {
    return '카페/바';
  }
  if (category.includes('문화') || desc.includes('사진') || desc.includes('스튜디오') || desc.includes('영화') || desc.includes('공연') || desc.includes('문화')) {
    return '문화생활';
  }
  if (category.includes('스포츠') || desc.includes('헬스') || desc.includes('필라테스') || desc.includes('요가') || desc.includes('운동') || desc.includes('체육') || desc.includes('풋살')) {
    return '스포츠';
  }
  if (category.includes('뷰티') || category.includes('패션') || desc.includes('뷰티') || desc.includes('미용') || desc.includes('네일') || desc.includes('패션') || desc.includes('의류') || desc.includes('안경')) {
    return '뷰티/패션';
  }
  
  return '기타';
}

async function importFromExcel() {
  console.log('=== Starting Excel import ===\n');
  
  try {
    // 1. Read Excel file
    console.log('Step 1: Reading Excel file...');
    const file = fs.readFileSync(filePath);
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    console.log(`Found ${data.length} rows in Excel file\n`);
    
    // 2. Fetch existing categories and regions
    console.log('Step 2: Fetching categories and regions...');
    const allCategories = await db.select().from(categories);
    const allRegions = await db.select().from(regions);
    console.log(`Found ${allCategories.length} categories and ${allRegions.length} regions\n`);
    
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
    const regionMap = new Map(allRegions.map(r => [r.code, r.id]));
    
    console.log('Available categories:', allCategories.map(c => c.name));
    
    // 3. Delete existing data
    console.log('\nStep 3: Deleting existing merchants and benefits...');
    await db.delete(benefits);
    await db.execute(sql`DELETE FROM user_roles WHERE merchant_id IS NOT NULL`);
    await db.delete(merchants);
    console.log('All existing data deleted.\n');
    
    // 4. Import merchants and benefits
    console.log('Step 4: Importing merchants and benefits...');
    let imported = 0;
    let skipped = 0;
    let benefitsCreated = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Skip if no name or address
        if (!row['상호명'] || !row['가게 주소 (address) *']) {
          console.log(`  ⚠️  Skipping row ${i + 2}: Missing name or address`);
          skipped++;
          continue;
        }
        
        // Get category
        const categoryName = getCategoryName(
          row['가게 카테고리 (category_name) *'],
          row['가게 설명 (description) *']
        );
        const categoryId = categoryMap.get(categoryName);
        
        if (!categoryId) {
          console.log(`  ⚠️  Skipping row ${i + 2}: Category not found for ${categoryName}`);
          skipped++;
          continue;
        }
        
        // Get region
        let regionId = null;
        if (row['지역']) {
          const regionCode = REGION_MAP[row['지역']];
          if (regionCode) {
            regionId = regionMap.get(regionCode) || null;
          }
        }
        
        // Get location
        let location;
        const lat = parseFloat(row['위도']);
        const lng = parseFloat(row['경도']);
        
        if (!isNaN(lat) && !isNaN(lng) && lat > 0 && lng > 0) {
          location = { lat, lng };
        } else {
          // Use Jeju Island center as default if no coordinates
          location = { lat: 33.4996, lng: 126.5312 };
        }
        
        // Build description with business hours
        let description = row['가게 설명 (description) *'] || '';
        if (row['가게 영업 시간 (business_hours) *']) {
          description = description 
            ? `${description} | 영업시간: ${row['가게 영업 시간 (business_hours) *']}`
            : `영업시간: ${row['가게 영업 시간 (business_hours) *']}`;
        }
        
        // Get images
        const images: string[] = [];
        if (row['가게 대표 이미지 URL (image_url) *']) {
          images.push(row['가게 대표 이미지 URL (image_url) *']);
        }
        
        // Create merchant
        const [merchant] = await db.insert(merchants).values({
          name: row['상호명'],
          description: description || row['상호명'],
          categoryId: categoryId,
          regionId: regionId,
          address: row['가게 주소 (address) *'],
          phone: row['가게 전화번호 (phone) *'] || '',
          website: row['가게 URL (website) *'] || null,
          location: location,
          images: images.length > 0 ? images : null,
          status: 'ACTIVE'
        }).returning();
        
        imported++;
        
        // Create benefit from 제휴 내용
        const benefitContent = row['제휴 내용'];
        if (benefitContent && benefitContent.trim()) {
          let benefitType = 'PERCENT';
          let percent: string | null = null;
          let amount: number | null = null;
          let gift: string | null = null;
          
          // Parse benefit content
          // Check for percentage discount (e.g., "10%", "15%할인")
          const percentMatch = benefitContent.match(/(\d+)%/);
          if (percentMatch) {
            benefitType = 'PERCENT';
            percent = percentMatch[1];
          }
          // Check for amount discount (e.g., "3,000원", "5천원")
          else if (benefitContent.match(/[\d,]+원/)) {
            benefitType = 'AMOUNT';
            const amountMatch = benefitContent.match(/([\d,]+)원/);
            if (amountMatch) {
              amount = parseInt(amountMatch[1].replace(/,/g, ''));
            }
          }
          // Otherwise it's a gift/service
          else {
            benefitType = 'GIFT';
            gift = benefitContent;
          }
          
          // Create benefit
          await db.insert(benefits).values({
            merchantId: merchant.id,
            categoryId: categoryId,
            title: benefitContent.substring(0, 100),
            description: benefitContent,
            type: benefitType,
            percent: percent,
            amount: amount,
            gift: gift,
            validFrom: new Date('2024-01-01'),
            validTo: new Date('2025-12-31'),
            geofenceRadius: 150,
            status: 'ACTIVE'
          });
          
          benefitsCreated++;
        }
        
        if ((i + 1) % 50 === 0) {
          console.log(`  Processed ${i + 1}/${data.length} merchants...`);
        }
      } catch (error) {
        console.error(`  ❌ Error importing row ${i + 2} (${row['상호명']}):`, error);
        skipped++;
      }
    }
    
    console.log('\n=== Import complete ===');
    console.log(`Total rows: ${data.length}`);
    console.log(`✅ Merchants imported: ${imported}`);
    console.log(`✅ Benefits created: ${benefitsCreated}`);
    console.log(`❌ Skipped: ${skipped}`);
    
    // Verify database
    const merchantCount = await db.select({ count: sql`count(*)` }).from(merchants);
    const benefitCount = await db.select({ count: sql`count(*)` }).from(benefits);
    
    console.log('\n✅ Database verification:');
    console.log(`  Merchants: ${merchantCount[0].count}`);
    console.log(`  Benefits: ${benefitCount[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importFromExcel();
