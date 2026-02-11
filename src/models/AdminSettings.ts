import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAdminSettings extends Document {
  _id: Types.ObjectId;
  commission: number;
  totalGames: number;
  totalVolume: number;
  totalCommission: number;
  lastUpdated: Date;
  updatedBy?: Types.ObjectId;
}

const AdminSettingsSchema: Schema = new Schema({
  commission: {
    type: Number,
    default: 5,
    min: 0,
    max: 15,
  },
  totalGames: {
    type: Number,
    default: 0,
  },
  totalVolume: {
    type: Number,
    default: 0,
  },
  totalCommission: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Singleton pattern - only one settings document
AdminSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

export default mongoose.model<IAdminSettings>('AdminSettings', AdminSettingsSchema);
