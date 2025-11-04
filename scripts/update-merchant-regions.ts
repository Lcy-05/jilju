import { db } from '../server/db';
import { merchants, regions } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

// 동/읍/면 -> 권역 매핑
const DONG_TO_REGION_MAP: Record<string, string> = {
  // 시청권
  '일도일동': 'ZONE_CITY_HALL',
  '일도이동': 'ZONE_CITY_HALL',
  '이도일동': 'ZONE_CITY_HALL',
  '이도이동': 'ZONE_CITY_HALL',
  '삼도일동': 'ZONE_CITY_HALL',
  '삼도이동': 'ZONE_CITY_HALL',
  '용담일동': 'ZONE_CITY_HALL',
  '용담이동': 'ZONE_CITY_HALL',
  '건입동': 'ZONE_CITY_HALL',
  '화북동': 'ZONE_CITY_HALL',
  '화북일동': 'ZONE_CITY_HALL',
  '화북이동': 'ZONE_CITY_HALL',
  '삼양동': 'ZONE_CITY_HALL',
  '삼양일동': 'ZONE_CITY_HALL',
  '삼양이동': 'ZONE_CITY_HALL',
  '삼양삼동': 'ZONE_CITY_HALL',
  '도두일동': 'ZONE_CITY_HALL',
  '도두이동': 'ZONE_CITY_HALL',
  '용담삼동': 'ZONE_CITY_HALL',
  
  // 노형권
  '노형동': 'ZONE_NOHYEONG',
  '이호일동': 'ZONE_NOHYEONG',
  '이호이동': 'ZONE_NOHYEONG',
  '도남동': 'ZONE_NOHYEONG',
  
  // 아라권
  '아라일동': 'ZONE_ARA',
  '아라이동': 'ZONE_ARA',
  '오라일동': 'ZONE_ARA',
  '오라이동': 'ZONE_ARA',
  '오라삼동': 'ZONE_ARA',
  
  // 공항연안권
  '연동': 'ZONE_AIRPORT_COAST',
  '도련일동': 'ZONE_AIRPORT_COAST',
  '도련이동': 'ZONE_AIRPORT_COAST',
  '내도동': 'ZONE_AIRPORT_COAST',
  '외도일동': 'ZONE_AIRPORT_COAST',
  '외도이동': 'ZONE_AIRPORT_COAST',
  '이호동': 'ZONE_AIRPORT_COAST',
  
  // 삼화권  
  '봉개동': 'ZONE_SAMHWA',
  '오등동': 'ZONE_SAMHWA',
  '영평동': 'ZONE_SAMHWA',
  
  // 동부권
  '구좌읍': 'ZONE_EAST',
  '조천읍': 'ZONE_EAST',
  
  // 서부권
  '애월읍': 'ZONE_WEST',
  '한림읍': 'ZONE_WEST',
  '한경면': 'ZONE_WEST',
  
  // 서귀포권
  '동홍동': 'ZONE_SEOGWIPO',
  '서귀동': 'ZONE_SEOGWIPO',
  '서호동': 'ZONE_SEOGWIPO',
  '서홍동': 'ZONE_SEOGWIPO',
  '송산동': 'ZONE_SEOGWIPO',
  '정방동': 'ZONE_SEOGWIPO',
  '중앙동': 'ZONE_SEOGWIPO',
  '천지동': 'ZONE_SEOGWIPO',
  '효돈동': 'ZONE_SEOGWIPO',
  '영천동': 'ZONE_SEOGWIPO',
  '도순동': 'ZONE_SEOGWIPO',
  '중문동': 'ZONE_SEOGWIPO',
  '예래동': 'ZONE_SEOGWIPO',
  '하원동': 'ZONE_SEOGWIPO',
  '토평동': 'ZONE_SEOGWIPO',
  '하효동': 'ZONE_SEOGWIPO',
  '회수동': 'ZONE_SEOGWIPO',
  '강정동': 'ZONE_SEOGWIPO',
  '법환동': 'ZONE_SEOGWIPO',
  '색달동': 'ZONE_SEOGWIPO',
  '상예동': 'ZONE_SEOGWIPO',
  '하예동': 'ZONE_SEOGWIPO',
  '남원읍': 'ZONE_SEOGWIPO',
  '성산읍': 'ZONE_SEOGWIPO',
  '표선면': 'ZONE_SEOGWIPO',
  '안덕면': 'ZONE_SEOGWIPO',
};

// 주소에서 동/읍/면 추출
function extractDong(address: string): string | null {
  // 패턴: "제주 제주시 노형동 ..." 또는 "제주 서귀포시 동홍동 ..."
  const parts = address.split(' ');
  if (parts.length >= 3) {
    // parts[0] = "제주"
    // parts[1] = "제주시" or "서귀포시"
    // parts[2] = "노형동", "애월읍", "한경면" 등
    return parts[2];
  }
  return null;
}

async function updateMerchantRegions() {
  console.log('=== Starting Merchant Region Update ===\n');
  
  try {
    // 1. Fetch all regions
    console.log('Step 1: Fetching regions...');
    const allRegions = await db.select().from(regions);
    const regionMap = new Map(allRegions.map(r => [r.code, r.id]));
    console.log(`Found ${allRegions.length} regions\n`);
    
    // 2. Fetch all merchants
    console.log('Step 2: Fetching merchants...');
    const allMerchants = await db.select({
      id: merchants.id,
      name: merchants.name,
      address: merchants.address,
      regionId: merchants.regionId,
    }).from(merchants);
    console.log(`Found ${allMerchants.length} merchants\n`);
    
    // 3. Update merchants with region
    console.log('Step 3: Updating merchant regions...');
    let updated = 0;
    let notFound = 0;
    let alreadySet = 0;
    
    const dongStats: Record<string, number> = {};
    
    for (const merchant of allMerchants) {
      if (merchant.regionId) {
        alreadySet++;
        continue;
      }
      
      const dong = extractDong(merchant.address);
      if (!dong) {
        notFound++;
        continue;
      }
      
      dongStats[dong] = (dongStats[dong] || 0) + 1;
      
      const regionCode = DONG_TO_REGION_MAP[dong];
      if (!regionCode) {
        notFound++;
        continue;
      }
      
      const regionId = regionMap.get(regionCode);
      if (!regionId) {
        console.error(`  ⚠️  Region not found for code: ${regionCode}`);
        notFound++;
        continue;
      }
      
      // Update merchant
      await db.update(merchants)
        .set({ regionId })
        .where(eq(merchants.id, merchant.id));
      
      updated++;
      
      if (updated % 100 === 0) {
        console.log(`  Updated ${updated} merchants...`);
      }
    }
    
    console.log('\n=== Update Complete ===');
    console.log(`Total merchants: ${allMerchants.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`⏭️  Already set: ${alreadySet}`);
    console.log(`❌ Not found/mapped: ${notFound}`);
    
    console.log('\n=== Dong Distribution ===');
    const sortedDongs = Object.entries(dongStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    
    sortedDongs.forEach(([dong, count]) => {
      const regionCode = DONG_TO_REGION_MAP[dong];
      const status = regionCode ? '✅' : '❌';
      console.log(`${status} ${dong}: ${count}개 -> ${regionCode || '매핑 없음'}`);
    });
    
    // 4. Verify update
    console.log('\n=== Verification ===');
    const stats = await db.select({
      total: sql<number>`COUNT(*)`,
      withRegion: sql<number>`COUNT(region_id)`,
    }).from(merchants);
    
    console.log(`Total merchants: ${stats[0].total}`);
    console.log(`With region: ${stats[0].withRegion}`);
    console.log(`Without region: ${Number(stats[0].total) - Number(stats[0].withRegion)}`);
    
  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  }
}

updateMerchantRegions();
