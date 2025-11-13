import XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { merchants, benefits, categories, regions } from '../shared/schema';
import { eq, sql, inArray } from 'drizzle-orm';

const filePath = 'scripts/new-merchants.xlsx';

// Region mapping
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

// Category mapping
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

// Normalize phone number: extract digits only
function normalizePhone(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

async function mergeWithDedup() {
  console.log('=== Starting Merge with Phone Deduplication ===\n');
  
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
    
    // 3. Get existing merchants with phone numbers
    console.log('Step 3: Loading existing merchants...');
    const existingMerchants = await db.select().from(merchants);
    const phoneToMerchantMap = new Map<string, typeof existingMerchants>();
    
    for (const merchant of existingMerchants) {
      const normalized = normalizePhone(merchant.phone);
      if (normalized) {
        if (!phoneToMerchantMap.has(normalized)) {
          phoneToMerchantMap.set(normalized, []);
        }
        phoneToMerchantMap.get(normalized)!.push(merchant);
      }
    }
    
    console.log(`Total existing merchants: ${existingMerchants.length}`);
    console.log(`Unique phone numbers: ${phoneToMerchantMap.size}\n`);
    
    // 4. Process new merchants
    console.log('Step 4: Processing new merchants...');
    let added = 0;
    let skipped = 0;
    let duplicatesFound = 0;
    const merchantsToDelete: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Skip if no name or address
        if (!row['상호명'] || !row['가게 주소 (address) *']) {
          console.log(`  ⚠️  Skipping row ${i + 2}: Missing name or address`);
          skipped++;
          continue;
        }
        
        const phoneRaw = row['가게 전화번호 (phone)'] || null;
        const normalizedPhone = normalizePhone(phoneRaw);
        
        // Check for duplicates by phone
        if (normalizedPhone && phoneToMerchantMap.has(normalizedPhone)) {
          const duplicates = phoneToMerchantMap.get(normalizedPhone)!;
          console.log(`  🔄  Phone duplicate found: ${phoneRaw}`);
          console.log(`      Existing: ${duplicates.map(m => m.name).join(', ')}`);
          console.log(`      New: ${row['상호명']}`);
          
          // Keep the oldest one, delete newer ones
          duplicates.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
          const keepMerchant = duplicates[0];
          const deleteMerchants = duplicates.slice(1);
          
          // Mark for deletion
          for (const m of deleteMerchants) {
            if (!merchantsToDelete.includes(m.id)) {
              merchantsToDelete.push(m.id);
            }
          }
          
          console.log(`      Keeping: ${keepMerchant.name} (created: ${keepMerchant.createdAt?.toISOString()})`);
          console.log(`      Deleting: ${deleteMerchants.map(m => m.name).join(', ')}`);
          
          duplicatesFound++;
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
          console.log(`  ⚠️  Skipping row ${i + 2}: Category not found`);
          skipped++;
          continue;
        }
        
        // Get region
        let regionId = null;
        if (row['권역']) {
          const regionCode = REGION_MAP[row['권역']];
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
          location = { lat: 33.4996, lng: 126.5312 };
        }
        
        // Build description
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
        
        // Get closed days
        const closedDays = row['가게 휴무일 (closed_days) *'] || null;
        
        // Insert merchant
        const [newMerchant] = await db.insert(merchants).values({
          name: row['상호명'],
          description,
          address: row['가게 주소 (address) *'],
          phone: phoneRaw,
          location,
          images,
          closedDays,
          categoryId,
          regionId,
          status: 'ACTIVE',
        }).returning();
        
        // Create benefit
        const benefitTitle = row['제휴 내용 (partnership_content) *'] || '제휴 협의 중';
        const benefitType = benefitTitle.includes('%') ? 'PERCENT' :
                            benefitTitle.includes('원') ? 'AMOUNT' : 'GIFT';
        
        const discountMatch = benefitTitle.match(/(\d+)%/) || benefitTitle.match(/(\d+)원/);
        const discountValue = discountMatch ? parseInt(discountMatch[1]) : null;
        
        await db.insert(benefits).values({
          merchantId: newMerchant.id,
          title: benefitTitle,
          description: benefitTitle,
          type: benefitType,
          discountValue,
          validFrom: new Date('2025-01-01'),
          validTo: new Date('2026-12-31'),
          terms: '학생증 제시 필수',
          status: 'ACTIVE',
        });
        
        // Add to map to detect future duplicates
        if (normalizedPhone) {
          if (!phoneToMerchantMap.has(normalizedPhone)) {
            phoneToMerchantMap.set(normalizedPhone, []);
          }
          phoneToMerchantMap.get(normalizedPhone)!.push(newMerchant);
        }
        
        added++;
        
        if (added % 10 === 0) {
          console.log(`  Processed ${added} new merchants...`);
        }
      } catch (error) {
        console.error(`  ❌  Error processing row ${i + 2}:`, error);
        skipped++;
      }
    }
    
    // 5. Delete duplicate merchants
    if (merchantsToDelete.length > 0) {
      console.log(`\nStep 5: Cleaning up ${merchantsToDelete.length} duplicate merchants...`);
      
      // Delete benefits first
      await db.delete(benefits).where(inArray(benefits.merchantId, merchantsToDelete));
      console.log(`  Deleted benefits for ${merchantsToDelete.length} duplicate merchants`);
      
      // Delete merchants
      await db.delete(merchants).where(inArray(merchants.id, merchantsToDelete));
      console.log(`  Deleted ${merchantsToDelete.length} duplicate merchants`);
    }
    
    // 6. Verification
    const [finalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(merchants);
    const [benefitsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(benefits);
    
    console.log('\n=== Merge Complete ===');
    console.log(`Total rows in Excel: ${data.length}`);
    console.log(`✅ New merchants added: ${added}`);
    console.log(`🔄 Phone duplicates found: ${duplicatesFound}`);
    console.log(`🗑️  Duplicate merchants deleted: ${merchantsToDelete.length}`);
    console.log(`❌ Skipped: ${skipped}`);
    console.log(`\n✅ Final database state:`);
    console.log(`  Merchants: ${finalCount.count}`);
    console.log(`  Benefits: ${benefitsCount.count}`);
    
  } catch (error) {
    console.error('Merge failed:', error);
    throw error;
  }
}

mergeWithDedup().catch(console.error);
