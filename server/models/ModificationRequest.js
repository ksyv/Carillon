const mongoose = require('mongoose');

const requestedFieldSchema = new mongoose.Schema({
    fieldKey: { type: String, required: true }, 
    fieldNameFr: { type: String, required: true }, 
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' } 
});

const modificationRequestSchema = new mongoose.Schema({
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
    
    // Savoir si on modifie la famille ou un enfant en particulier
    targetType: { type: String, enum: ['Family', 'Child'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetType' },
    
    // La liste des champs modifiés
    fields: [requestedFieldSchema],
    
    // Pour les documents uploadés plus tard
    documents: [{ 
        name: String, 
        path: String, 
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        rejectionReason: String
    }],

    // Statut global de la demande
    globalStatus: { type: String, enum: ['pending', 'processed'], default: 'pending' },
    
}, { timestamps: true });

module.exports = mongoose.model('ModificationRequest', modificationRequestSchema);