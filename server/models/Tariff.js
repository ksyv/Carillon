const mongoose = require('mongoose');

const QFBracketSchema = new mongoose.Schema({
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    price: { type: Number, required: true }
}, { _id: false });

const TariffSchema = new mongoose.Schema({
    activityCode: { type: String, required: true, unique: true }, // ex: 'CA1'
    name: { type: String, required: true }, // ex: 'Restauration Scolaire'
    
    pricingMode: { 
        type: String, 
        enum: ['QF_BRACKETS', 'TAUX_EFFORT', 'FIXED'], 
        default: 'FIXED' 
    },
    
    // Taux d'effort (ex: APS)
    tauxEffort: { type: Number, default: null },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },

    // Tranches (ex: Cantine)
    qfBrackets: [QFBracketSchema],

    // Fixe (ex: PAI ou Retard)
    fixedPrice: { type: Number, default: null }
});

module.exports = mongoose.model('Tariff', TariffSchema);