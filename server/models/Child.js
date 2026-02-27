const mongoose = require('mongoose');
const ChildSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  classe: { type: String }, // Optionnel, pratique
  active: { type: Boolean, default: true },
  category: { type: String, default: 'Maternelle' } // NOUVEAU
}, { timestamps: true });
module.exports = mongoose.model('Child', ChildSchema);