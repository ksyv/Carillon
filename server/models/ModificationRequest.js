const mongoose = require('mongoose');

const ModificationRequestSchema = new mongoose.Schema({
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    portalCode: { type: String, required: true },
    type: { type: String, default: 'FAMILY_UPDATE' },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
    dateRequest: { type: String, default: () => new Date().toLocaleTimeString('fr-FR') },
    newData: { type: mongoose.Schema.Types.Mixed, required: true },
    originalData: { type: mongoose.Schema.Types.Mixed, default: {} },
    oldData: { type: mongoose.Schema.Types.Mixed, default: {} },
    changeSummary: { type: String, default: '' },
    refusalMessage: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ModificationRequest', ModificationRequestSchema);