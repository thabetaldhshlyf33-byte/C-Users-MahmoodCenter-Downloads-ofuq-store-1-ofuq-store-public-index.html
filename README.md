# متجر أفق الإلكتروني — Ofuq Store

مشروع متجر عام باللغة العربية (RTL) باستخدام HTML وCSS وJavaScript وNode.js وExpress وMySQL.

## الوظائف الموجودة
- واجهة متجر متجاوبة مع البحث والتصنيفات.
- سلة مشتريات محفوظة في المتصفح.
- إرسال الطلبات مع التحقق من الكمية والسعر من الخادم وتحديث المخزون داخل معاملة MySQL.
- تسجيل مستخدمين وتسجيل دخول مع تشفير كلمات المرور بـ bcrypt.
- لوحة إدارة محمية لإضافة المنتجات وتعديلها وإخفائها.
- إدارة حالة الطلبات وعرض إحصاءات أساسية.
- استخدام استعلامات SQL مُعلّمة لتقليل مخاطر SQL injection.

> تنبيه: هذه نسخة تشغيل محلية/أساسية قابلة للتطوير. الدفع الإلكتروني، شركات الشحن، رسائل SMS والبريد، واستعادة كلمة المرور غير مفعّلة. قبل النشر العام أضف HTTPS، إدارة أسرار آمنة، سياسة خصوصية وشروط بيع، اختبارات، ومراجعة أمنية.

## المتطلبات
1. Node.js إصدار حديث (يفضّل LTS).
2. MySQL Server 8 أو متوافق معه.
3. Visual Studio Code.
4. إضافة SQL في VS Code اختيارية.

## تشغيل المشروع على Windows
### 1) فك الضغط وافتح المجلد
فك ضغط `ofuq-store.zip`، ثم من VS Code اختر **File > Open Folder** وافتح مجلد `ofuq-store`.

### 2) إنشاء قاعدة البيانات
- شغّل MySQL Server.
- افتح MySQL Workbench أو الطرفية.
- نفّذ محتوى الملف `database/schema.sql` كاملًا.
- ينشئ الملف قاعدة البيانات `ofuq_store` والجداول ويضيف بيانات تجريبية.

باستخدام الطرفية مثلًا:
```bash
mysql -u root -p < database/schema.sql
```
اكتب كلمة مرور MySQL عند الطلب. إذا لم يكن أمر `mysql` معروفًا، افتح Workbench ونفّذ الملف من هناك.

### 3) إعداد متغيرات البيئة
انسخ `.env.example` إلى ملف جديد اسمه `.env` داخل المجلد نفسه، ثم عدّل:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=ضع_هنا_سراً_طويلاً_وعشوائياً
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=كلمة_مرور_MySQL
DB_NAME=ofuq_store
ADMIN_NAME=مدير أفق
ADMIN_EMAIL=admin@ofuq.local
ADMIN_PASSWORD=كلمة_مرور_قوية_من_12_حرفاً_على_الأقل
```
لا ترفع ملف `.env` إلى GitHub ولا تشارك كلمات المرور.

### 4) تثبيت الحزم
افتح Terminal في VS Code (Terminal > New Terminal) وتأكد أن الطرفية داخل مجلد المشروع، ثم نفّذ:
```bash
npm install
```

### 5) إنشاء حساب الإدارة
بعد إعداد `.env` وإنشاء قاعدة البيانات، نفّذ:
```bash
npm run create-admin
```
يُنشأ أو يُحدّث حساب الإدارة باستخدام القيم الموجودة في `.env`. غيّر كلمة المرور التجريبية إلى كلمة قوية خاصة بك.

### 6) تشغيل الموقع
```bash
npm start
```
افتح:
- المتجر: http://localhost:3000
- لوحة الإدارة: http://localhost:3000/admin.html

لإيقاف الخادم اضغط `Ctrl + C` في الطرفية.

## إذا لم يعمل
- `ECONNREFUSED`: تأكد أن خدمة MySQL تعمل وأن المنفذ 3306 صحيح.
- `Access denied`: راجع `DB_USER` و`DB_PASSWORD` في `.env`.
- `Unknown database`: نفّذ `database/schema.sql` أولًا.
- `JWT_SECRET`: تأكد من وجود قيمة سرية في `.env`.
- `npm is not recognized`: ثبّت Node.js LTS ثم أغلق VS Code وافتحه مجددًا.
- المنفذ 3000 مستخدم: غيّر `PORT` في `.env` إلى 3001 مثلًا.

## هيكل المجلدات
```text
ofuq-store/
├── database/schema.sql
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── css/style.css
│   ├── css/admin.css
│   └── js/app.js
│   └── js/admin.js
├── scripts/create-admin.js
├── src/db.js
├── src/middleware/auth.js
├── src/routes.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## ملاحظات تطويرية
- المنتجات التجريبية تستخدم صورًا من Unsplash عبر الإنترنت؛ استبدلها بصورك أو بنظام رفع صور عند الحاجة.
- الأسعار بالريال اليمني (YER)، وتنسيق العرض تقريبي بدون كسور.
- لا تعتبر إخفاء المنتج حذفًا نهائيًا؛ يحتفظ النظام بالسجل حتى لا تتأثر تفاصيل الطلبات السابقة.
- هذا المشروع لا يفرض تسجيل الدخول لإرسال طلب العميل؛ ويمكن إضافة ربط الطلب بحساب المستخدم في إصدار لاحق.
