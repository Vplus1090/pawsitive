import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pawsitive-super-secret-key-jiit-2026';

export function signToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // ignore
    }
  }
  next();
}
