require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/db');

(async () => {
  const name = process.env.ADMIN_NAME || 'مدير أفق';
  const email = String(process.env.ADMIN_EMAIL || 'admin@ofuq.local').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (password.length < 12) {
    console.error('غيّر ADMIN_PASSWORD في ملف .env إلى كلمة مرور لا تقل عن 12 حرفًا ثم أعد المحاولة.');
    process.exit(1);
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.execute(
      `INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,'admin')
       ON DUPLICATE KEY UPDATE name=VALUES(name),password_hash=VALUES(password_hash),role='admin'`,
      [name,email,hash]
    );
    console.log(`تم إعداد حساب الإدارة: ${email}`);
  } catch (e) {
    console.error('فشل إنشاء حساب الإدارة:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
