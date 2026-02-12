import mongoose, { Schema, Document, Types } from 'mongoose';

export type GameType = 'short' | 'long';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface Move {
  from: number;
  to: number;
  player: 1 | 2;
  timestamp: Date;
}

export interface BoardState {
  // 24 points + bar (25) + off (26) for each player
  // Positive = player1 checkers, Negative = player2 checkers
  positions: number[];
  currentPlayer: 1 | 2;
  dice: [number, number];
  remainingMoves: number[];
  moveHistory: Move[];
  player1Bar: number;
  player2Bar: number;
  player1Off: number;
  player2Off: number;
  // Initial roll phase
  initialRollPhase: boolean;
  player1InitialRoll: number;
  player2InitialRoll: number;
}

export interface IGame extends Document {
  _id: Types.ObjectId;
  type: GameType;
  stake: number;
  player1: Types.ObjectId;
  player2?: Types.ObjectId;
  status: GameStatus;
  winner?: Types.ObjectId;
  boardState: BoardState;
  escrowTxHash?: string;
  contractGameId?: number;
  private: boolean;
  inviteCode?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MoveSchema = new Schema({
  from: { type: Number, required: true },
  to: { type: Number, required: true },
  player: { type: Number, enum: [1, 2], required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const BoardStateSchema = new Schema({
  positions: {
    type: [Number],
    default: () => new Array(24).fill(0),
  },
  currentPlayer: {
    type: Number,
    enum: [1, 2],
    default: 1,
  },
  dice: {
    type: [Number],
    default: [0, 0],
  },
  remainingMoves: {
    type: [Number],
    default: [],
  },
  moveHistory: {
    type: [MoveSchema],
    default: [],
  },
  player1Bar: { type: Number, default: 0 },
  player2Bar: { type: Number, default: 0 },
  player1Off: { type: Number, default: 0 },
  player2Off: { type: Number, default: 0 },
  // Initial roll phase
  initialRollPhase: { type: Boolean, default: true },
  player1InitialRoll: { type: Number, default: 0 },
  player2InitialRoll: { type: Number, default: 0 },
}, { _id: false });

const GameSchema: Schema = new Schema({
  type: {
    type: String,
    enum: ['short', 'long'],
    required: true,
  },
  stake: {
    type: Number,
    required: true,
    min: 1,
  },
  player1: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  player2: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'cancelled'],
    default: 'waiting',
  },
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  boardState: {
    type: BoardStateSchema,
    default: () => ({}),
  },
  escrowTxHash: {
    type: String,
    default: null,
  },
  contractGameId: {
    type: Number,
    default: null,
  },
  private: {
    type: Boolean,
    default: false,
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes
GameSchema.index({ status: 1 });
GameSchema.index({ player1: 1 });
GameSchema.index({ player2: 1 });
GameSchema.index({ type: 1 });
GameSchema.index({ inviteCode: 1 });
GameSchema.index({ createdAt: -1 });

export default mongoose.model<IGame>('Game', GameSchema);
