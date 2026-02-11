import mongoose, { Document, Types } from 'mongoose';
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
declare const _default: mongoose.Model<ITransaction, {}, {}, {}, mongoose.Document<unknown, {}, ITransaction, {}, mongoose.DefaultSchemaOptions> & ITransaction & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITransaction>;
export default _default;
//# sourceMappingURL=Transaction.d.ts.map