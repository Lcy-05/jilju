import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 제주시 동별 좌표 매핑
const dongCoordinates: Record<string, { lat: number; lng: number; region: string }> = {
  '노형동': { lat: 33.4897, lng: 126.4787, region: '노형권' },
  '아라일동': { lat: 33.4636, lng: 126.5579, region: '아라권' },
  '아라이동': { lat: 33.4636, lng: 126.5579, region: '아라권' },
  '일도일동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '일도이동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '이도일동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '이도이동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '삼도일동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '삼도이동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '연동': { lat: 33.4897, lng: 126.4787, region: '노형권' },
  '오라동': { lat: 33.4897, lng: 126.4787, region: '노형권' },
  '용담일동': { lat: 33.5063, lng: 126.4933, region: '공항연안권' },
  '용담이동': { lat: 33.5063, lng: 126.4933, region: '공항연안권' },
  '건입동': { lat: 33.5102, lng: 126.5219, region: '시청권' },
  '화북일동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '화북이동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '삼양일동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '삼양이동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '삼양삼동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '봉개동': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '애월읍': { lat: 33.4672, lng: 126.3311, region: '서부권' },
  '구좌읍': { lat: 33.5389, lng: 126.8030, region: '동부권' },
  '조천읍': { lat: 33.5246, lng: 126.5650, region: '삼화권' },
  '한림읍': { lat: 33.4155, lng: 126.2691, region: '서부권' },
  '한경면': { lat: 33.3511, lng: 126.2084, region: '서부권' },
  '추자면': { lat: 33.9611, lng: 126.3000, region: '북부권' },
  '우도면': { lat: 33.5006, lng: 126.9544, region: '동부권' },
  '서귀포시': { lat: 33.2541, lng: 126.5599, region: '서귀포권' },
  '표선면': { lat: 33.3261, lng: 126.7928, region: '동부권' },
  '성산읍': { lat: 33.4547, lng: 126.8806, region: '동부권' },
  '남원읍': { lat: 33.2869, lng: 126.7136, region: '서귀포권' },
  '안덕면': { lat: 33.2617, lng: 126.3992, region: '서부권' },
  '대정읍': { lat: 33.2172, lng: 126.2481, region: '서부권' },
};

// 카테고리 매핑
const categoryMapping: Record<string, string[]> = {
  '레저/스포츠': ['레저/스포츠', '운동'],
  '음식점': ['음식', '식당'],
  '카페': ['카페', '음료'],
  '뷰티/미용': ['뷰티', '미용'],
  '쇼핑': ['쇼핑', '상점'],
  '숙박': ['숙박', '호텔'],
  '문화/여가': ['문화', '여가'],
  '생활편의': ['생활', '편의'],
  '교육': ['교육', '학원'],
  '기타': ['기타']
};

// 혜택 타입 파싱 함수
function parseBenefitType(benefit: string): { 
  type: string; 
  percent?: number; 
  amount?: number; 
  gift?: string; 
} {
  // % 할인 패턴
  const percentMatch = benefit.match(/(\d+)%/);
  if (percentMatch) {
    return {
      type: 'PERCENT',
      percent: parseInt(percentMatch[1])
    };
  }

  // 금액 할인 패턴 (원, 만원 등)
  const amountMatch = benefit.match(/(\d+)(,\d+)?\s*(원|만원)/);
  if (amountMatch) {
    let amount = parseInt(amountMatch[1].replace(',', ''));
    if (amountMatch[3] === '만원') {
      amount *= 10000;
    }
    return {
      type: 'AMOUNT',
      amount: amount
    };
  }

  // 그 외는 GIFT로 처리
  return {
    type: 'GIFT',
    gift: benefit
  };
}

async function main() {
  // Read Excel file
  const filePath = path.join(__dirname, '..', 'attached_assets', '협의 완료 업체_1759578775630.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet) as Array<{
    '업종': string;
    '상호명': string;
    '지역': string;
    '전화번호': string;
    '협의상태': string;
    '제휴 내용': string;
  }>;

  console.log(`Found ${data.length} rows in Excel file`);

  // Filter only completed merchants
  const completedData = data.filter(row => row['협의상태'] === '완료');
  console.log(`${completedData.length} merchants with completed status`);

  // Connect to database
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  // Clear existing data (except test data)
  console.log('\nClearing existing merchants and benefits...');
  await db.delete(schema.benefits);
  await db.delete(schema.merchants);

  // Insert merchants and benefits
  let successCount = 0;
  let skipCount = 0;

  for (const row of completedData) {
    try {
      const dong = row['지역'];
      const coords = dongCoordinates[dong];

      if (!coords) {
        console.log(`⚠️  Skipping ${row['상호명']} - Unknown location: ${dong}`);
        skipCount++;
        continue;
      }

      // Determine category
      const category = categoryMapping[row['업종']] || categoryMapping['기타'];

      // Insert merchant
      const [merchant] = await db.insert(schema.merchants).values({
        name: row['상호명'],
        description: `${row['업종']} - ${dong}`,
        categoryPath: category,
        address: `제주특별자치도 제주시 ${dong}`,
        phone: row['전화번호'],
        location: { lat: coords.lat, lng: coords.lng },
        status: 'ACTIVE'
      }).returning();

      // Parse benefit
      const benefitText = row['제휴 내용'];
      if (benefitText && benefitText !== '추후협의') {
        const benefitInfo = parseBenefitType(benefitText);
        
        await db.insert(schema.benefits).values({
          merchantId: merchant.id,
          title: benefitText,
          description: benefitText,
          type: benefitInfo.type,
          percent: benefitInfo.percent?.toString(),
          amount: benefitInfo.amount,
          gift: benefitInfo.gift,
          validFrom: new Date(),
          validTo: new Date('2025-12-31'),
          status: 'ACTIVE',
          publishedAt: new Date()
        });
      }

      successCount++;
      console.log(`✓ ${row['상호명']} (${dong})`);

    } catch (error) {
      console.error(`✗ Error processing ${row['상호명']}:`, error);
      skipCount++;
    }
  }

  console.log(`\n✅ Import completed!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped: ${skipCount}`);
  console.log(`   Total: ${completedData.length}`);

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
