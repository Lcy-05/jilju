import XLSX from 'xlsx';
import * as fs from 'fs';
import { db } from '../server/db';
import { merchants, benefits, categories, regions } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

const NEW_EXCEL_FILE = 'scripts/new-merchants.xlsx';
const DRY_RUN = process.argv.includes('--dry-run');

// Region mapping (consistent with existing import scripts)
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

// Normalize name for duplicate detection
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Normalize address for duplicate detection
// Keep building numbers but normalize whitespace and casing
function normalizeAddress(address: string): string {
  return address
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Only normalize whitespace, keep building numbers
}

// Create duplicate detection key
function createDuplicateKey(name: string, address: string): string {
  return `${normalizeName(name)}|||${normalizeAddress(address)}`;
}

// Category mapping (consistent with existing import)
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

// Extract benefit type from partnership content
function getBenefitType(partnershipContent: string): 'PERCENT' | 'AMOUNT' | 'GIFT' {
  if (partnershipContent.includes('%') || partnershipContent.includes('할인')) {
    return 'PERCENT';
  }
  if (partnershipContent.includes('원') || partnershipContent.includes('₩')) {
    return 'AMOUNT';
  }
  return 'GIFT';
}

async function incrementalImport() {
  console.log('=== Safe Incremental Import ===\n');
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be modified\n');
  }
  
  try {
    // Step 1: Load existing merchants for duplicate detection
    console.log('Step 1: Loading existing merchants...');
    const existingMerchants = await db.select({
      id: merchants.id,
      name: merchants.name,
      address: merchants.address
    }).from(merchants);
    
    const duplicateIndex = new Set<string>();
    existingMerchants.forEach(m => {
      const key = createDuplicateKey(m.name, m.address);
      duplicateIndex.add(key);
    });
    
    console.log(`  Found ${existingMerchants.length} existing merchants`);
    console.log(`  Duplicate index size: ${duplicateIndex.size}\n`);
    
    // Step 2: Load categories and regions
    console.log('Step 2: Loading categories and regions...');
    const allCategories = await db.select().from(categories);
    const allRegions = await db.select().from(regions);
    
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
    const regionMap = new Map(allRegions.map(r => [r.code, r.id]));
    
    console.log(`  Categories: ${allCategories.length}, Regions: ${allRegions.length}\n`);
    
    // Step 3: Read Excel file
    console.log('Step 3: Reading Excel file...');
    const file = fs.readFileSync(NEW_EXCEL_FILE);
    const workbook = XLSX.read(file, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    console.log(`  Found ${data.length} rows in Excel\n`);
    
    // Step 4: Validate and prepare data
    console.log('Step 4: Validating and preparing data...');
    const validRows: any[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (header is row 1)
      
      // Validate required fields
      if (!row['상호명']) {
        errors.push(`Row ${rowNum}: Missing name (상호명)`);
        continue;
      }
      if (!row['가게 주소 (address) *']) {
        errors.push(`Row ${rowNum}: Missing address`);
        continue;
      }
      
      // Parse coordinates
      const lat = parseFloat(row['위도']);
      const lng = parseFloat(row['경도']);
      
      if (isNaN(lat) || isNaN(lng)) {
        errors.push(`Row ${rowNum}: Invalid coordinates (lat=${row['위도']}, lng=${row['경도']})`);
        continue;
      }
      
      // Check for duplicates
      const dupKey = createDuplicateKey(row['상호명'], row['가게 주소 (address) *']);
      if (duplicateIndex.has(dupKey)) {
        console.log(`  ⚠️  Row ${rowNum}: Duplicate - "${row['상호명']}" at "${row['가게 주소 (address) *']}"`);
        continue;
      }
      
      validRows.push({ row, rowNum, lat, lng, dupKey });
    }
    
    console.log(`  Valid rows: ${validRows.length}`);
    console.log(`  Skipped/Errors: ${data.length - validRows.length}`);
    if (errors.length > 0) {
      console.log(`\n  Errors:`);
      errors.forEach(e => console.log(`    - ${e}`));
    }
    console.log();
    
    if (DRY_RUN) {
      console.log('🔍 DRY RUN: Would insert the following merchants:');
      validRows.slice(0, 10).forEach(({ row, rowNum }) => {
        console.log(`  - Row ${rowNum}: ${row['상호명']} (${row['가게 주소 (address) *']})`);
      });
      if (validRows.length > 10) {
        console.log(`  ... and ${validRows.length - 10} more`);
      }
      console.log('\n✅ Dry run complete. Use --dry-run=false to proceed with import.');
      return;
    }
    
    // Step 5: Import new merchants and benefits
    console.log('Step 5: Importing new merchants and benefits...');
    let successCount = 0;
    let failCount = 0;
    
    for (const { row, rowNum, lat, lng, dupKey } of validRows) {
      try {
        // Get category
        const categoryName = getCategoryName(
          row['가게 카테고리 (category_name) *'],
          row['가게 설명 (description) *']
        );
        const categoryId = categoryMap.get(categoryName);
        
        if (!categoryId) {
          console.log(`  ⚠️  Row ${rowNum}: Category "${categoryName}" not found, skipping`);
          failCount++;
          continue;
        }
        
        // Get region
        let regionId: string | null = null;
        if (row['권역']) {
          const regionCode = REGION_MAP[row['권역']];
          if (regionCode) {
            regionId = regionMap.get(regionCode) || null;
          }
        }
        
        // Prepare images array (avoid value.map error)
        const images: string[] = [];
        if (row['가게 대표 이미지 URL (image_url) *']) {
          images.push(row['가게 대표 이미지 URL (image_url) *']);
        }
        
        // Insert merchant + benefit in transaction
        await db.transaction(async (tx) => {
          // Insert merchant
          const [newMerchant] = await tx.insert(merchants).values({
            name: row['상호명'],
            description: row['가게 설명 (description) *'] || null,
            categoryId,
            address: row['가게 주소 (address) *'],
            phone: row['가게 전화번호 (phone)'] || null, // Allow null
            regionId,
            location: { lat, lng },
            images,
            status: 'ACTIVE',
          }).returning();
          
          // Insert benefit
          const partnershipContent = row['제휴내용'] || '혜택 협의 중';
          const benefitType = getBenefitType(partnershipContent);
          
          await tx.insert(benefits).values({
            merchantId: newMerchant.id,
            title: `${row['상호명']} 제휴 혜택`,
            description: partnershipContent,
            type: benefitType,
            terms: [],
            images: [],
            validFrom: new Date(),
            validTo: new Date('2025-12-31'),
            status: 'ACTIVE',
          });
        });
        
        // Add to duplicate index to prevent intra-batch duplicates
        duplicateIndex.add(dupKey);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`  ✅ Imported ${successCount} merchants...`);
        }
      } catch (error) {
        console.error(`  ❌ Row ${rowNum}: Failed to import - ${error instanceof Error ? error.message : String(error)}`);
        failCount++;
      }
    }
    
    console.log('\n=== Import Complete ===');
    console.log(`✅ Successfully imported: ${successCount} merchants`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Skipped (duplicates): ${data.length - validRows.length - errors.length}`);
    
    // Step 6: Verify final state
    console.log('\n=== Final Database State ===');
    const [{ count: merchantCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(merchants);
    const [{ count: benefitCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(benefits);
    console.log(`Merchants: ${merchantCount}`);
    console.log(`Benefits: ${benefitCount}`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
incrementalImport()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
