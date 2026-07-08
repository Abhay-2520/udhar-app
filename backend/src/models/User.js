import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true, default: '' },
    lastLoginAt: Date
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
