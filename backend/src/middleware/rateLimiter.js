import rateLimit from 'express-rate-limit';

// 20 AI calls per hour per user (identified by user ID from JWT or IP)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    return req.user ? `user_${req.user.id}` : req.ip;
  },
  message: { error: 'Too many AI analysis requests. Limit is 20 per hour. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
