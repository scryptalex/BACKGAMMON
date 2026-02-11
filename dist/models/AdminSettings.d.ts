import mongoose, { Document, Types } from 'mongoose';
export interface IAdminSettings extends Document {
    _id: Types.ObjectId;
    commission: number;
    totalGames: number;
    totalVolume: number;
    totalCommission: number;
    lastUpdated: Date;
    updatedBy?: Types.ObjectId;
}
declare const _default: mongoose.Model<IAdminSettings, {}, {}, {}, mongoose.Document<unknown, {}, IAdminSettings, {}, mongoose.DefaultSchemaOptions> & IAdminSettings & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAdminSettings>;
export default _default;
//# sourceMappingURL=AdminSettings.d.ts.map