import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = Number(payload.sub);
    if (!Number.isSafeInteger(req.userId) || req.userId < 1) throw new Error('Invalid subject');
    next();
  } catch {
    return res.status(401).json({ error: 'Session is invalid or expired.' });
  }
}
