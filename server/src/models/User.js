const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String }, // Optional to support OAuth users
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    
    // OAuth configuration
    googleId: { type: String },
    githubId: { type: String },
    
    // Email / OTP Verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    otpCode: { type: String },
    otpExpires: { type: Date },
    
    // Loyalty and Rewards System
    rewardPoints: { type: Number, default: 0 },
    userLevel: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    
    // Store Relationships
    followedStores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Advanced Authentication & 2FA
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshTokens: [{ type: String }],

    // Wallet System
    walletBalance: { type: Number, default: 0 },

    // Affiliate System
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralEarnings: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.passwordHash || !this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

userSchema.methods.matchPassword = async function (password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);

