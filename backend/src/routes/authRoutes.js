import crypto from 'crypto';
import express from 'express';
import Otp from '../models/Otp.js';
import User from '../models/User.js';
import { sendSms } from '../services/messageService.js';
import { signToken } from '../utils/token.js';

const router = express.Router();

function hashOtp(phone, code) {
  return crypto.createHash('sha256').update(`${phone}:${code}:${process.env.TOKEN_SECRET || 'dev-secret-change-me'}`).digest('hex');
}

router.post('/request-otp', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    if (phone.length < 10) return res.status(400).json({ message: 'Valid mobile number is required' });

    const code = process.env.DEV_OTP || String(Math.floor(100000 + Math.random() * 900000));
    const expires = Number(process.env.OTP_EXPIRY_MINUTES || 5);
    await Otp.deleteMany({ phone });
    await Otp.create({
      phone,
      codeHash: hashOtp(phone, code),
      expiresAt: new Date(Date.now() + expires * 60 * 1000)
    });

    const sms = await sendSms(phone, `Your Udhar Tracker OTP is ${code}`);
    console.log(`OTP for ${phone}: ${code}`);
    res.json({
      message: sms.sent ? 'OTP sent to your phone' : 'OTP generated. Check the backend console if SMS is not configured.'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const otp = String(req.body.otp || '').trim();
    const record = await Otp.findOne({ phone });
    if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: 'OTP expired or invalid' });
    if (record.attempts >= 5) return res.status(429).json({ message: 'Too many OTP attempts' });

    if (record.codeHash !== hashOtp(phone, otp)) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    const user = await User.findOneAndUpdate(
      { phone },
      { phone, lastLoginAt: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    await Otp.deleteMany({ phone });

    const token = signToken({ id: user._id.toString(), phone: user.phone, iat: Date.now() });
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

export default router;
