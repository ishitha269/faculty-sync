const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

// Usage: router.post('/x', requireRole('faculty'), handler)
auth.requireRole = (role) => (req, res, next) => {
  if (req.role !== role) return res.status(403).json({ message: `Only ${role} accounts can do this` });
  next();
};

module.exports = auth;
