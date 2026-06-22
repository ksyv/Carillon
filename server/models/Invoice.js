const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
    family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
    payeur: { type: String, required: true }, // Le nom affiché sur la facture au moment de la génération
    periodStart: { type: String, required: true }, // ex: "2026-06-01"
    periodEnd: { type: String, required: true },   // ex: "2026-06-30"
    reference: { type: String }, // ex: "2026-CA-00-0001"
    items: [{
        code: String,
        label: String,
        count: Number,
        unitPrice: Number,
        total: Number
    }],
    totalGlobal: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);