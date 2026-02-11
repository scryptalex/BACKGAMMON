"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const MoveSchema = new mongoose_1.Schema({
    from: { type: Number, required: true },
    to: { type: Number, required: true },
    player: { type: Number, enum: [1, 2], required: true },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });
const BoardStateSchema = new mongoose_1.Schema({
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
}, { _id: false });
const GameSchema = new mongoose_1.Schema({
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
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    player2: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed', 'cancelled'],
        default: 'waiting',
    },
    winner: {
        type: mongoose_1.Schema.Types.ObjectId,
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
exports.default = mongoose_1.default.model('Game', GameSchema);
//# sourceMappingURL=Game.js.map