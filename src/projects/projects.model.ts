import { Schema } from 'mongoose';
import { IProject } from './projects.types';

export const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
