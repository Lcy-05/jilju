import xlsx from 'xlsx';
import { db } from '../server/db';
import { merchants, benefits, categories, regions, users } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

interface ExcelRow {
  '상호명': string;
  '가게 대표 이미지 URL (image_url) *': string;
  '가게 전화번호 (phone) *': string;
  '가게 주소 (address) *': string;
  '지역': string;
  '가게 URL (website) *': string;
  '가게 영업 시간 (business_hours) *': string;
  '가게 카테고리 (category_name) *': string;
  '가게 설명 (description) *': string;
}

async function importMerchants() {
  console.log('=== Starting merchant import ===\n');
  
  // 1. Read Excel file
  console.log('Step 1: Reading Excel file...');
  const workbook = xlsx.readFile('attached_assets/대협 업체 완료_(1-50)_1761658710662.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet) as ExcelRow[];
  console.log(`Found ${data.length} rows\n`);
  
  // 2. Fetch existing categories and regions
  console.log('Step 2: Fetching categories and regions...');
  const allCategories = await db.select().from(categories);
  const allRegions = await db.select().from(regions);
  console.log(`Found ${allCategories.length} categories and ${allRegions.length} regions\n`);
  
  // Create category map
  const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
  console.log('Available categories:', Array.from(categoryMap.keys()));
  
  // Create region map (by name)
  const regionMap = new Map(allRegions.map(r => [r.name, r]));
  console.log('Available regions:', Array.from(regionMap.keys()).slice(0, 10), '...\n');
  
  // 3. Get admin user for createdBy
  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@jilju.com')).limit(1);
  const createdById = adminUser[0]?.id || null;
  
  // 4. Process each row
  console.log('Step 3: Processing merchants...');
  let successCount = 0;
  let errorCount = 0;
  
  for (const row of data) {
    try {
      const merchantName = row['상호명'];
      const imageUrl = row['가게 대표 이미지 URL (image_url) *'];
      const phone = row['가게 전화번호 (phone) *'];
      const address = row['가게 주소 (address) *'];
      const regionName = row['지역'];
      const website = row['가게 URL (website) *'];
      const categoryName = row['가게 카테고리 (category_name) *'];
      const description = row['가게 설명 (description) *'];
      
      // Skip if merchant already exists
      const existing = await db.select().from(merchants).where(eq(merchants.name, merchantName)).limit(1);
      if (existing.length > 0) {
        console.log(`  ⏭️  Skipped: ${merchantName} (already exists)`);
        continue;
      }
      
      // Map category
      const categoryId = categoryMap.get(categoryName) || null;
      if (!categoryId) {
        console.log(`  ⚠️  Warning: Category "${categoryName}" not found for ${merchantName}`);
      }
      
      // Map region - find by name or use default
      let regionId = null;
      for (const [name, region] of regionMap) {
        if (name.includes(regionName) || regionName.includes(name)) {
          regionId = region.id;
          break;
        }
      }
      if (!regionId) {
        // Use 아라권 as default
        const defaultRegion = allRegions.find(r => r.name === '아라권');
        regionId = defaultRegion?.id || allRegions[0]?.id;
      }
      
      // Create merchant
      const [newMerchant] = await db.insert(merchants).values({
        name: merchantName,
        description: description || null,
        categoryId: categoryId,
        address: address,
        addressDetail: null,
        phone: phone,
        regionId: regionId,
        location: { lat: 33.45, lng: 126.57 }, // Default Jeju location - will be geocoded later
        website: website || null,
        images: imageUrl ? [imageUrl] : [],
        status: 'ACTIVE',
        badges: [],
        createdBy: createdById,
        updatedBy: createdById,
      }).returning();
      
      // Create a default benefit for this merchant
      await db.insert(benefits).values({
        merchantId: newMerchant.id,
        categoryId: categoryId,
        title: `${merchantName} 학생 할인`,
        description: '제주대학교 학생 전용 혜택입니다.',
        type: 'PERCENT',
        percent: '10.00',
        studentOnly: true,
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2025-12-31'),
        geoRadiusM: 150,
        status: 'ACTIVE',
        createdBy: createdById,
        updatedBy: createdById,
        publishedAt: new Date(),
      });
      
      console.log(`  ✅ Created: ${merchantName}`);
      successCount++;
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${row['상호명']}:`, error.message);
      errorCount++;
    }
  }
  
  console.log(`\n=== Import complete ===`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`Total processed: ${data.length}`);
}

importMerchants().catch(console.error).finally(() => process.exit(0));
