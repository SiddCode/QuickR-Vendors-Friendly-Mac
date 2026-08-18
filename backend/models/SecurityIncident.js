import mongoose from 'mongoose';

const securityIncidentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    severity: { 
      type: String, 
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
      default: 'MEDIUM',
      required: true 
    },
    status: { 
      type: String, 
      enum: ['open', 'investigating', 'contained', 'resolved', 'closed'], 
      default: 'open',
      required: true 
    },
    detectedAt: { type: Date, default: Date.now },
    description: { type: String, required: true },
    affectedSystem: { type: String, default: 'QuickR Core Application' },
    affectedDataCategories: { type: [String], default: ['User Metadata'] },
    containmentAction: { type: String, default: '' },
    resolution: { type: String, default: '' }
  },
  { timestamps: true }
);

securityIncidentSchema.index({ status: 1, severity: 1, createdAt: -1 });

export const SecurityIncident = mongoose.model('SecurityIncident', securityIncidentSchema);
