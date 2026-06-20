const router = require('express').Router();
const {
  register,
  login,
  getMe,
  sendOTP,
  verifyOTP,
  verifyEmailToken,
  oauthLogin,
  forgotPassword,
  resetPassword,
  refreshToken,
  enable2FA,
  verify2FA,
  loginVerify2FA
} = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/verify-email/:token', verifyEmailToken);
router.post('/oauth-login', oauthLogin);

router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/verify', protect, verify2FA);
router.post('/2fa/login-verify', loginLimiter, loginVerify2FA);

module.exports = router;
