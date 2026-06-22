const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    payeur: { type: String, required: true },
    periodStart: { type: String, required: true },
    periodEnd: { type: String, required: true },
    reference: { type: String },
    items: [{
        childName: String, 
        code: String,
        label: String,
        count: Number,
        unitPrice: Number,
        total: Number,
        dates: [{ type: String }] 
    }],
    totalGlobal: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);