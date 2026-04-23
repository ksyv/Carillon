const mongoose = require('mongoose');

const QFBracketSchema = new mongoose.Schema({
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    price: { type: Number, required: true }
}, { _id: false });

// NOUVEAU : Sous-schéma pour la dégressivité familiale (1 enfant, 2 enfants...)
const EffortRateSchema = new mongoose.Schema({
    childrenCount: { type: Number, required: true }, // ex: 1, 2, 3...
    rate: { type: Number, required: true }, // ex: 0.000827
    min: { type: Number, required: true },
    max: { type: Number, required: true }
}, { _id: false });

const TariffSchema = new mongoose.Schema({
    activityCode: { type: String, required: true, unique: true }, 
    name: { type: String, required: true }, 
    
    pricingMode: { 
        type: String, 
        enum: ['QF_BRACKETS', 'TAUX_EFFORT', 'FIXED'], 
        default: 'FIXED' 
    },
    
    // NOUVEAU : Tableau des taux d'effort par fratrie
    effortRates: [EffortRateSchema],

    // Tranches (ex: Cantine)
    qfBrackets: [QFBracketSchema],

    // Fixe (ex: PAI)
    fixedPrice: { type: Number, default: null },

    displayOrder: { type: Number, default: 0 }
});

module.exports = mongoose.model('Tariff', TariffSchema);