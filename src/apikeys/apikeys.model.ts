import { Schema } from 'mongoose';
import { IApiKey } from './apikeys.types';

export const apiKeySchema = new Schema<IApiKey>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    publicPart: { type: String, required: true },
    secretHash: { type: String, required: true },
    label: { type: String, default: '', trim: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

apiKeySchema.index({ secretHash: 1 });
apiKeySchema.index({ projectId: 1 });
