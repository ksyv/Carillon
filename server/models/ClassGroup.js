const mongoose = require('mongoose');

const ClassGroupSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Ex: "CP 1", "CE2 Bleu", "Petite Section"
  category: { type: String, enum: ['Maternelle', 'Élémentaire'], required: true },
  teacher: { type: String, default: '' } // Pratique pour les plannings
});

module.exports = mongoose.model('ClassGroup', ClassGroupSchema);