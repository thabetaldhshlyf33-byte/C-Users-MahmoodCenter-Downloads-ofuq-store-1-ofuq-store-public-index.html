const jwt = require('jsonwebtoken');

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.ofuq_token || null;
}

function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ message: 'يرجى تسجيل الدخول أولاً.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'انتهت الجلسة، سجل الدخول مرة أخرى.' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'هذه الصفحة مخصصة للإدارة.' });
  next();
}

module.exports = { requireAuth, requireAdmin };
