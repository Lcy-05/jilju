import { db } from '../server/db';
import { merchants, benefits, categories, merchantHours } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const CATEGORY_MAPPING: Record<string, string> = {
  '레저/스포츠': '헬스',
  '문화생활/복지': '기타',
  '미용/뷰티/패션': '뷰티',
  '음식점': '음식',
  '카페': '카페'
};

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const clientId = process.env.VITE_NAVER_MAPS_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAPS_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.warn('Naver Maps API credentials not found');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodedAddress}`,
      {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': clientId,
          'X-NCP-APIGW-API-KEY': clientSecret,
        },
      }
    );

    const data = await response.json();
    
    if (data.addresses && data.addresses.length > 0) {
      return {
        lat: parseFloat(data.addresses[0].y),
        lng: parseFloat(data.addresses[0].x)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function importData() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('attached_assets/협의_완료_1차_1760359489303.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log(`Found ${data.length} rows in Excel file`);

    // Get all categories
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map(c => [c.name, c.id]));

    console.log('Deleting existing data...');
    // Delete in correct order to avoid foreign key constraints
    await db.delete(merchantHours);
    await db.delete(benefits);
    // Delete user_roles with merchant associations first
    await db.execute(sql`DELETE FROM user_roles WHERE merchant_id IS NOT NULL`);
    await db.delete(merchants);

    console.log('Importing new data...');
    let imported = 0;
    let skipped = 0;

    for (const row of data) {
      try {
        const categoryName = CATEGORY_MAPPING[row['업종']] || '기타';
        const categoryId = categoryMap.get(categoryName);

        if (!categoryId) {
          console.warn(`Category not found: ${categoryName}, skipping ${row['상호명']}`);
          skipped++;
          continue;
        }

        // Get coordinates
        let location = null;
        if (row['경도'] && row['위도']) {
          location = { lat: row['위도'], lng: row['경도'] };
        } else if (row['지역']) {
          // Try to geocode using region name
          const address = `제주시 ${row['지역']}`;
          console.log(`Geocoding ${row['상호명']} at ${address}...`);
          location = await geocodeAddress(address);
          
          // Add small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!location) {
          // Default to Jeju City center if no coordinates
          location = { lat: 33.4996, lng: 126.5312 };
          console.warn(`No coordinates for ${row['상호명']}, using default location`);
        }

        // Create merchant
        const [merchant] = await db.insert(merchants).values({
          name: row['상호명'],
          description: row['제휴 내용'] || '',
          categoryId: categoryId,
          address: row['지역'] ? `제주시 ${row['지역']}` : '제주시',
          phone: row['전화번호'] || '',
          location: location,
          status: 'ACTIVE'
        }).returning();

        // Parse benefit content
        let benefitType = 'PERCENT';
        let percent: string | null = null;
        let amount: number | null = null;
        let gift: string | null = null;
        let benefitDescription = row['제휴 내용'] || '';

        // Helper function to parse Korean currency amounts
        const parseKoreanCurrency = (text: string): number | null => {
          // Helper to convert Korean currency unit to number
          const convertToKRW = (value: string, unit: string): number => {
            const num = parseFloat(value.replace(/,/g, ''));
            switch(unit) {
              case '만원': return Math.floor(num * 10000);
              case '천원': return Math.floor(num * 1000);
              case '백원': return Math.floor(num * 100);
              case '원': return Math.floor(num);
              default: return 0;
            }
          };
          
          // Check for price reduction patterns: "16만원→10만원" or "3만원->2만원"
          const reductionPattern = /([\d,.]+)(만원|천원|백원|원)\s*[-→>]+\s*([\d,.]+)(만원|천원|백원|원)/;
          const reductionMatch = text.match(reductionPattern);
          if (reductionMatch) {
            const original = convertToKRW(reductionMatch[1], reductionMatch[2]);
            const discounted = convertToKRW(reductionMatch[3], reductionMatch[4]);
            return original - discounted; // Calculate discount amount
          }
          
          // Match patterns like "2만원", "3천원", "500원", "1.5만원"
          const currencyPattern = /([\d,.]+)(만원|천원|백원|원)/;
          const currencyMatch = text.match(currencyPattern);
          if (currencyMatch) {
            return convertToKRW(currencyMatch[1], currencyMatch[2]);
          }
          
          return null;
        };

        // Priority order: Amount discount > Percent discount > Gift
        // Check for amount discount first (e.g., "3,000원 할인", "2만원 할인")
        const parsedAmount = parseKoreanCurrency(benefitDescription);
        if (parsedAmount !== null) {
          benefitType = 'AMOUNT';
          amount = parsedAmount;
        }
        // Check for percent discount (e.g., "10% 할인")
        else if (benefitDescription.includes('%')) {
          benefitType = 'PERCENT';
          const percentMatch = benefitDescription.match(/(\d+)%/);
          if (percentMatch) {
            percent = percentMatch[1];
          } else {
            percent = '10'; // Default if percent symbol exists but no number
          }
        }
        // Check for gift/free items
        else if (
          benefitDescription.includes('추가') || 
          benefitDescription.includes('+') ||
          benefitDescription.includes('증정') ||
          benefitDescription.includes('무료') ||
          benefitDescription.includes('서비스')
        ) {
          benefitType = 'GIFT';
          gift = benefitDescription;
        }
        // Check for general discount without specific value
        else if (benefitDescription.includes('할인')) {
          benefitType = 'PERCENT';
          percent = '10'; // Default discount
        }
        // If nothing matched, default to general benefit
        else {
          benefitType = 'GIFT';
          gift = benefitDescription || `${row['상호명']} 혜택`;
        }

        // Set valid date range (from now to 1 year later)
        const validFrom = new Date();
        const validTo = new Date();
        validTo.setFullYear(validTo.getFullYear() + 1);

        // Create benefit
        await db.insert(benefits).values({
          merchantId: merchant.id,
          categoryId: categoryId,
          title: benefitDescription || `${row['상호명']} 혜택`,
          description: benefitDescription,
          type: benefitType,
          percent: percent,
          amount: amount,
          gift: gift,
          validFrom: validFrom,
          validTo: validTo,
          status: 'ACTIVE',
          terms: ['제주도민 또는 거주자 대상', '1인 1일 1회 사용 가능']
        });

        // Create empty merchant hours (to be filled later)
        // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
          await db.insert(merchantHours).values({
            merchantId: merchant.id,
            dayOfWeek: dayOfWeek,
            openTime: null,
            closeTime: null,
            isOpen: true  // Default to open, can be updated later
          });
        }

        imported++;
        console.log(`Imported: ${row['상호명']} (${imported}/${data.length})`);
      } catch (error) {
        console.error(`Error importing ${row['상호명']}:`, error);
        skipped++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${data.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importData();
