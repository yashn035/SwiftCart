const rateLimit = {};

const loginLimiter = (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  
  if (!rateLimit[ip]) {
    rateLimit[ip] = [];
  }
  
  // Filter out timestamps older than 1 minute
  rateLimit[ip] = rateLimit[ip].filter(timestamp => now - timestamp < 60000);
  
  if (rateLimit[ip].length >= 15) {
    return res.status(429).json({ message: 'Too many requests from this IP. Please try again in a minute.' });
  }
  
  rateLimit[ip].push(now);
  next();
};

module.exports = { loginLimiter };
