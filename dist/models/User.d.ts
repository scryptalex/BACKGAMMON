import mongoose, { Document } from 'mongoose';
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
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map