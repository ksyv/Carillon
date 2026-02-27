const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  billTo: { type: String, required: true }, // Ex: "Maman", "Papa", "Mairie"...
  dates: [{ type: String }] // Tableau des dates sélectionnées
}, { timestamps: true });

module.exports = mongoose.model('Billing', BillingSchema);