import mongoose, { Document, Types } from 'mongoose';
export type GameType = 'short' | 'long';
export type GameStatus = 'waiting' | 'active' | 'completed' | 'cancelled';
export interface Move {
    from: number;
    to: number;
    player: 1 | 2;
    timestamp: Date;
}
export interface BoardState {
    positions: number[];
    currentPlayer: 1 | 2;
    dice: [number, number];
    remainingMoves: number[];
    moveHistory: Move[];
    player1Bar: number;
    player2Bar: number;
    player1Off: number;
    player2Off: number;
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
declare const _default: mongoose.Model<IGame, {}, {}, {}, mongoose.Document<unknown, {}, IGame, {}, mongoose.DefaultSchemaOptions> & IGame & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IGame>;
export default _default;
//# sourceMappingURL=Game.d.ts.map