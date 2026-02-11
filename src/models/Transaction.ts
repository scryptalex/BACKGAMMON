import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType = 'deposit' | 'withdraw' | 'game_win' | 'game_loss' | 'commission';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface ITransaction extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  txHash?: string;
  game?: Types.ObjectId;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdraw', 'game_win', 'game_loss', 'commission'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
  },
  txHash: {
    type: String,
    default: null,
  },
  game: {
    type: Schema.Types.ObjectId,
    ref: 'Game',
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
TransactionSchema.index({ user: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ txHash: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
