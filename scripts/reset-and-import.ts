import xlsx from 'xlsx';
import { db } from '../server/db';
import { merchants, benefits, categories, regions, users, eventLogs, userBookmarks, merchantHours, merchantHourExceptions, partnershipPosters } from '../shared/schema';
import { eq } from 'drizzle-orm';

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
  '정규명'?: string;
  '위도'?: number;
  '경도'?: number;
}

async function resetAndImport() {
  console.log('=== 가게 데이터 초기화 및 재임포트 ===\n');
  
  // Step 1: Delete all dependent data first (foreign key constraints)
  console.log('Step 1: 관련 데이터 삭제 중...');
  
  console.log('  - event_logs 삭제 중...');
  await db.delete(eventLogs);
  
  console.log('  - user_bookmarks 삭제 중...');
  await db.delete(userBookmarks);
  
  console.log('  - partnership_posters 삭제 중...');
  await db.delete(partnershipPosters);
  
  console.log('  - merchant_hour_exceptions 삭제 중...');
  await db.delete(merchantHourExceptions);
  
  console.log('  - merchant_hours 삭제 중...');
  await db.delete(merchantHours);
  
  console.log('✅ 관련 데이터 삭제 완료\n');
  
  // Step 2: Delete all existing benefits
  console.log('Step 2: 기존 혜택 데이터 삭제 중...');
  const deletedBenefits = await db.delete(benefits);
  console.log(`✅ ${deletedBenefits.rowCount || 0}개 혜택 삭제 완료\n`);
  
  // Step 3: Delete all existing merchants
  console.log('Step 3: 기존 가게 데이터 삭제 중...');
  const deletedMerchants = await db.delete(merchants);
  console.log(`✅ ${deletedMerchants.rowCount || 0}개 가게 삭제 완료\n`);
  
  // Step 4: Read new Excel file
  console.log('Step 4: 새로운 Excel 파일 읽기...');
  const workbook = xlsx.readFile('attached_assets/대협_업체 완료(1-50)_테스트 배포_1761702063260.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet) as ExcelRow[];
  console.log(`📄 ${data.length}개 행 발견\n`);
  
  // Check first row structure
  console.log('📋 컬럼 구조:', Object.keys(data[0] || {}));
  console.log('📋 샘플 데이터:', JSON.stringify(data[0], null, 2), '\n');
  
  // Step 5: Fetch categories and regions
  console.log('Step 5: 카테고리 및 지역 정보 조회...');
  const allCategories = await db.select().from(categories);
  const allRegions = await db.select().from(regions);
  console.log(`Found ${allCategories.length} categories and ${allRegions.length} regions\n`);
  
  const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));
  const regionMap = new Map(allRegions.map(r => [r.name, r]));
  
  // Step 6: Get admin user
  const adminUser = await db.select().from(users).where(eq(users.email, 'admin@jilju.com')).limit(1);
  const createdById = adminUser[0]?.id || null;
  
  // Step 7: Import new merchants
  console.log('Step 6: 새로운 가게 데이터 임포트 중...');
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
      const latitude = row['위도'];
      const longitude = row['경도'];
      
      // Map category - trim whitespace
      const trimmedCategory = categoryName?.trim();
      const categoryId = categoryMap.get(trimmedCategory) || null;
      if (!categoryId && trimmedCategory) {
        console.log(`  ⚠️  Warning: Category "${trimmedCategory}" not found for ${merchantName}`);
      }
      
      // Map region
      let regionId = null;
      if (regionName) {
        for (const [name, region] of regionMap) {
          if (name.includes(regionName) || regionName.includes(name)) {
            regionId = region.id;
            break;
          }
        }
      }
      if (!regionId) {
        const defaultRegion = allRegions.find(r => r.name === '아라권');
        regionId = defaultRegion?.id || allRegions[0]?.id;
      }
      
      // Create merchant with actual location from Excel
      const [newMerchant] = await db.insert(merchants).values({
        name: merchantName,
        description: description || null,
        categoryId: categoryId,
        address: address,
        addressDetail: null,
        phone: phone,
        regionId: regionId,
        location: latitude && longitude 
          ? { lat: latitude, lng: longitude }
          : { lat: 33.45, lng: 126.57 }, // Fallback to default Jeju location
        website: website || null,
        images: imageUrl ? [imageUrl] : [],
        status: 'ACTIVE',
        badges: [],
        createdBy: createdById,
        updatedBy: createdById,
      }).returning();
      
      // Create default benefit
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
  
  console.log(`\n=== 완료 ===`);
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 에러: ${errorCount}개`);
  console.log(`📊 총 처리: ${data.length}개`);
}

resetAndImport().catch(console.error).finally(() => process.exit(0));
