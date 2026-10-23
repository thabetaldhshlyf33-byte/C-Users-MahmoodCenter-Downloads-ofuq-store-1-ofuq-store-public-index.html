const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { requireAuth, requireAdmin } = require('./middleware/auth');

const router = express.Router();
const safeUser = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });
const signToken = user => jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '2h' });
const emailValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.get('/health', (req, res) => res.json({ status: 'ok', app: 'Ofuq Store' }));

router.get('/categories', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY name');
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/products', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim().slice(0, 100);
    const category = Number(req.query.category || 0);
    const params = [];
    let sql = `SELECT p.id, p.name, p.description, p.image_url, p.price_yer, p.stock, p.category_id, c.name AS category_name
      FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.is_active=1`;
    if (search) { sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (category > 0) { sql += ' AND p.category_id=?'; params.push(category); }
    sql += ' ORDER BY p.created_at DESC LIMIT 100';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim().slice(0, 30) || null;
    if (name.length < 2 || name.length > 120 || !emailValid(email) || password.length < 8) {
      return res.status(400).json({ message: 'أدخل اسمًا صحيحًا وبريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل.' });
    }
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) return res.status(409).json({ message: 'هذا البريد مسجل مسبقًا.' });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute('INSERT INTO users (name,email,password_hash,phone) VALUES (?,?,?,?)', [name,email,hash,phone]);
    const user = { id: result.insertId, name, email, phone, role: 'customer' };
    res.status(201).json({ message: 'تم إنشاء الحساب.', token: signToken(user), user });
  } catch (e) { next(e); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? LIMIT 1', [email]);
    if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' });
    }
    const user = safeUser(rows[0]);
    res.json({ message: 'تم تسجيل الدخول.', token: signToken(user), user });
  } catch (e) { next(e); }
});

router.get('/auth/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id,name,email,phone,role FROM users WHERE id=? LIMIT 1', [req.user.id]);
    if (!rows.length) return res.status(401).json({ message: 'الحساب غير موجود.' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.post('/orders', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const name = String(req.body.customerName || '').trim();
    const email = String(req.body.customerEmail || '').trim().toLowerCase() || null;
    const phone = String(req.body.customerPhone || '').trim();
    const address = String(req.body.address || '').trim();
    const notes = String(req.body.notes || '').trim().slice(0, 1000) || null;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (name.length < 2 || phone.length < 5 || address.length < 5 || items.length < 1 || items.length > 30) {
      return res.status(400).json({ message: 'أكمل الاسم ورقم الهاتف والعنوان وأضف منتجًا واحدًا على الأقل.' });
    }
    const normalized = new Map();
    for (const item of items) {
      const id = Number(item.id), qty = Number(item.quantity);
      if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ message: 'بيانات أحد المنتجات غير صحيحة.' });
      }
      normalized.set(id, (normalized.get(id) || 0) + qty);
    }
    await conn.beginTransaction();
    let total = 0;
    const orderItems = [];
    for (const [id, qty] of normalized.entries()) {
      const [products] = await conn.query('SELECT id,name,price_yer,stock FROM products WHERE id=? AND is_active=1 FOR UPDATE', [id]);
      if (!products.length) throw Object.assign(new Error('أحد المنتجات لم يعد متوفرًا.'), { status: 400 });
      const p = products[0];
      if (p.stock < qty) throw Object.assign(new Error(`الكمية المتوفرة من ${p.name} غير كافية.`), { status: 400 });
      const line = Number(p.price_yer) * qty;
      total += line;
      orderItems.push({ p, qty, line });
    }
    const userId = null;
    const [order] = await conn.execute(
      'INSERT INTO orders (user_id,customer_name,customer_email,customer_phone,shipping_address,notes,total_yer) VALUES (?,?,?,?,?,?,?)',
      [userId,name,email,phone,address,notes,total]
    );
    for (const item of orderItems) {
      await conn.execute('INSERT INTO order_items (order_id,product_id,product_name,unit_price_yer,quantity,line_total_yer) VALUES (?,?,?,?,?,?)',
        [order.insertId,item.p.id,item.p.name,item.p.price_yer,item.qty,item.line]);
      await conn.execute('UPDATE products SET stock=stock-? WHERE id=?', [item.qty,item.p.id]);
    }
    await conn.commit();
    res.status(201).json({ message: 'تم استلام طلبك بنجاح.', orderId: order.insertId, totalYER: total });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally { conn.release(); }
});

router.get('/admin/summary', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [[products]] = await pool.query('SELECT COUNT(*) AS count FROM products');
    const [[orders]] = await pool.query('SELECT COUNT(*) AS count FROM orders');
    const [[sales]] = await pool.query("SELECT COALESCE(SUM(total_yer),0) AS total FROM orders WHERE status IN ('confirmed','processing','shipped','completed')");
    const [[customers]] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role='customer'");
    res.json({ products: products.count, orders: orders.count, salesYER: sales.total, customers: customers.count });
  } catch (e) { next(e); }
});

router.get('/admin/products', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id,name,description,image_url,price_yer,stock,category_id,is_active FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/admin/products', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const p = validateProduct(req.body);
    if (p.error) return res.status(400).json({ message: p.error });
    const [r] = await pool.execute('INSERT INTO products (category_id,name,description,image_url,price_yer,stock,is_active) VALUES (?,?,?,?,?,?,?)',
      [p.category_id,p.name,p.description,p.image_url,p.price_yer,p.stock,p.is_active]);
    res.status(201).json({ message: 'تمت إضافة المنتج.', id: r.insertId });
  } catch (e) { next(e); }
});

router.put('/admin/products/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ message: 'رقم المنتج غير صحيح.' });
    const p = validateProduct(req.body);
    if (p.error) return res.status(400).json({ message: p.error });
    const [r] = await pool.execute('UPDATE products SET category_id=?,name=?,description=?,image_url=?,price_yer=?,stock=?,is_active=? WHERE id=?',
      [p.category_id,p.name,p.description,p.image_url,p.price_yer,p.stock,p.is_active,id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'المنتج غير موجود.' });
    res.json({ message: 'تم تحديث المنتج.' });
  } catch (e) { next(e); }
});

router.delete('/admin/products/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.execute('UPDATE products SET is_active=0 WHERE id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'المنتج غير موجود.' });
    res.json({ message: 'تم إخفاء المنتج من المتجر.' });
  } catch (e) { next(e); }
});

router.get('/admin/orders', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [rows] = await pool.query(`SELECT id,customer_name,customer_email,customer_phone,shipping_address,total_yer,status,created_at
      FROM orders ORDER BY created_at DESC LIMIT 200`);
    res.json(rows);
  } catch (e) { next(e); }
});

router.patch('/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const allowed = ['pending','confirmed','processing','shipped','completed','cancelled'];
    const status = String(req.body.status || '');
    if (!allowed.includes(status)) return res.status(400).json({ message: 'حالة الطلب غير صحيحة.' });
    const [r] = await pool.execute('UPDATE orders SET status=? WHERE id=?', [status,Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: 'الطلب غير موجود.' });
    res.json({ message: 'تم تحديث حالة الطلب.' });
  } catch (e) { next(e); }
});

function validateProduct(body) {
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim().slice(0,5000) || null;
  const image_url = String(body.image_url || '').trim().slice(0,1000) || null;
  const category_id = body.category_id ? Number(body.category_id) : null;
  const price_yer = Number(body.price_yer);
  const stock = Number(body.stock);
  const is_active = body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1;
  if (name.length < 2 || name.length > 180) return { error: 'اسم المنتج مطلوب (من حرفين إلى 180 حرفًا).' };
  if (!Number.isFinite(price_yer) || price_yer < 0 || !Number.isInteger(stock) || stock < 0 || stock > 1000000) return { error: 'السعر أو المخزون غير صحيح.' };
  if (category_id !== null && (!Number.isInteger(category_id) || category_id < 1)) return { error: 'التصنيف غير صحيح.' };
  if (image_url && !/^https?:\/\//i.test(image_url)) return { error: 'رابط الصورة يجب أن يبدأ بـ http:// أو https://.' };
  return { name,description,image_url,category_id,price_yer,stock,is_active };
}

module.exports = router;
