import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log('Creating test accounts...\n');

  // Test accounts
  const accounts = [
    {
      name: '관리자',
      email: 'admin@jilju.com',
      password: 'admin123',
      role: 'ADMIN',
    },
    {
      name: '일반사용자',
      email: 'user@jilju.com',
      password: 'user123',
      role: 'USER',
    },
    {
      name: '김사장',
      email: 'merchant@jilju.com',
      password: 'merchant123',
      role: 'MERCHANT_OWNER',
    },
  ];

  for (const account of accounts) {
    try {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, account.email),
      });

      if (existingUser) {
        console.log(`✓ ${account.name} (${account.email}) - 이미 존재함`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, SALT_ROUNDS);

      // Create user
      const [user] = await db.insert(schema.users).values({
        name: account.name,
        email: account.email,
        password: hashedPassword,
      }).returning();

      // Assign role
      await db.insert(schema.userRoles).values({
        userId: user.id,
        roleId: account.role,
        merchantId: null,
      });

      console.log(`✓ ${account.name} (${account.email}) - 생성 완료`);
    } catch (error) {
      console.error(`✗ ${account.name} (${account.email}) - 실패:`, error);
    }
  }

  console.log('\n=== 테스트 계정 정보 ===\n');
  console.log('관리자 계정:');
  console.log('  이메일: admin@jilju.com');
  console.log('  비밀번호: admin123\n');
  
  console.log('일반 사용자 계정:');
  console.log('  이메일: user@jilju.com');
  console.log('  비밀번호: user123\n');
  
  console.log('사장님 계정:');
  console.log('  이메일: merchant@jilju.com');
  console.log('  비밀번호: merchant123\n');

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
