const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  billToFamily: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // NOUVEAU: Le lien vers le vrai dossier
  billTo: { type: String }, // Ancien champ texte (conservé pour compatibilité temporaire)
  dates: [{ type: String }] // Tableau des dates sélectionnées
}, { timestamps: true });

module.exports = mongoose.model('Billing', BillingSchema);