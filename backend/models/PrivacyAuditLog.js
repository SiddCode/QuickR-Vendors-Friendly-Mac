import mongoose from 'mongoose';

const privacyAuditLogSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    shopId: { type: String, required: false, index: true },
    action: { 
      type: String, 
      required: true,
      enum: [
        'CONSENT_GRANTED',
        'CONSENT_WITHDRAWN',
        'DATA_EXPORT_REQUESTED',
        'DATA_EXPORT_COMPLETED',
        'DATA_CORRECTION_REQUESTED',
        'ACCOUNT_DELETION_REQUESTED',
        'ACCOUNT_DELETED',
        'PRIVACY_REQUEST_CREATED',
        'PRIVACY_REQUEST_UPDATED'
      ]
    },
    resourceType: { type: String, default: 'User' },
    resourceId: { type: String },
    ipAddress: { type: String, default: '127.0.0.1' },
    userAgent: { type: String, default: 'QuickR-Client' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

privacyAuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

export const PrivacyAuditLog = mongoose.model('PrivacyAuditLog', privacyAuditLogSchema);
