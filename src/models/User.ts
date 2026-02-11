import mongoose, { Schema, Document } from 'mongoose';

export type AuthProvider = 'metamask' | 'walletconnect' | 'google' | 'apple';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  walletAddress?: string;
  email?: string;
  name: string;
  balance: number;
  isAdmin: boolean;
  authProvider: AuthProvider;
  createdAt: Date;
  lastLogin: Date;
}

const UserSchema: Schema = new Schema({
  walletAddress: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  authProvider: {
    type: String,
    enum: ['metamask', 'walletconnect', 'google', 'apple'],
    required: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
UserSchema.index({ walletAddress: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ name: 1 });

export default mongoose.model<IUser>('User', UserSchema);
