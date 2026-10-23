require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pool = require('./src/db');
const api = require('./src/routes');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false }));
app.use('/api', api);
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: process.env.NODE_ENV === 'production' ? 'حدث خطأ في الخادم.' : (err.message || 'خطأ غير متوقع') });
});

pool.getConnection()
  .then(async conn => {
    console.log('تم الاتصال بقاعدة بيانات MySQL بنجاح.');
    conn.release();
    app.listen(PORT, () => console.log(`متجر أفق يعمل على http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('تعذر الاتصال بقاعدة البيانات. تحقق من إعدادات .env وتشغيل MySQL.', err.message);
    process.exit(1);
  });
