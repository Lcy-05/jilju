import * as fs from 'fs';
import { db } from '../server/db';
import { merchants, benefits } from '../shared/schema';

async function generateInsertSQL() {
  console.log('Generating SQL INSERT statements...\n');
  
  // Fetch all merchants
  const allMerchants = await db.select().from(merchants);
  const allBenefits = await db.select().from(benefits);
  
  console.log(`Found ${allMerchants.length} merchants and ${allBenefits.length} benefits\n`);
  
  let sql = '-- Production Database Import Script\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
  
  // Generate merchant inserts in batches of 50
  sql += '-- Insert Merchants\n';
  for (let i = 0; i < allMerchants.length; i += 50) {
    const batch = allMerchants.slice(i, i + 50);
    sql += 'INSERT INTO merchants (id, name, description, address, phone, location, images, closed_days, category_id, region_id, status, created_at, updated_at) VALUES\n';
    
    const values = batch.map((m, idx) => {
      const location = JSON.stringify(m.location).replace(/'/g, "''");
      const images = JSON.stringify(m.images).replace(/'/g, "''");
      const description = (m.description || '').replace(/'/g, "''");
      const name = m.name.replace(/'/g, "''");
      const address = m.address.replace(/'/g, "''");
      const phone = m.phone?.replace(/'/g, "''") || null;
      const closedDays = m.closedDays?.replace(/'/g, "''") || null;
      
      return `  ('${m.id}', '${name}', ${description ? `'${description}'` : 'NULL'}, '${address}', ${phone ? `'${phone}'` : 'NULL'}, '${location}', '${images}', ${closedDays ? `'${closedDays}'` : 'NULL'}, '${m.categoryId}', ${m.regionId ? `'${m.regionId}'` : 'NULL'}, '${m.status}', '${m.createdAt?.toISOString()}', '${m.updatedAt?.toISOString()}')`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
  }
  
  // Generate benefit inserts in batches of 50
  sql += '-- Insert Benefits\n';
  for (let i = 0; i < allBenefits.length; i += 50) {
    const batch = allBenefits.slice(i, i + 50);
    sql += 'INSERT INTO benefits (id, merchant_id, title, description, type, discount_value, valid_from, valid_to, terms, status, created_at, updated_at) VALUES\n';
    
    const values = batch.map((b) => {
      const title = b.title.replace(/'/g, "''");
      const description = (b.description || '').replace(/'/g, "''");
      const terms = (b.terms || '').replace(/'/g, "''");
      
      return `  ('${b.id}', '${b.merchantId}', '${title}', ${description ? `'${description}'` : 'NULL'}, '${b.type}', ${b.discountValue || 'NULL'}, '${b.validFrom?.toISOString()}', '${b.validTo?.toISOString()}', ${terms ? `'${terms}'` : 'NULL'}, '${b.status}', '${b.createdAt?.toISOString()}', '${b.updatedAt?.toISOString()}')`;
    });
    
    sql += values.join(',\n');
    sql += ';\n\n';
  }
  
  // Write to file
  fs.writeFileSync('/tmp/production-import.sql', sql);
  console.log('✅ SQL file generated: /tmp/production-import.sql');
  console.log(`Total size: ${(sql.length / 1024).toFixed(2)} KB\n`);
}

generateInsertSQL().catch(console.error);
