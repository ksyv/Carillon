const mongoose = require('mongoose');

// Le sous-modèle pour structurer les contacts proprement
const ContactSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' }
});

const ChildSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  category: { type: String, enum: ['Maternelle', 'Élémentaire'], default: 'Maternelle' },
  active: { type: Boolean, default: true },
  
  // Listes structurées des contacts
  responsablesLegaux: [ContactSchema],
  personnesAutorisees: [ContactSchema],
  
  // Autorisation de sortie (uniquement pertinent pour élémentaire)
  autorisationSortieSeul: { type: Boolean, default: false },

  // PAI et Santé
  hasPAI: { type: Boolean, default: false },
  paiDetails: { type: String, default: '' },
  isPAIAlimentaire: { type: Boolean, default: false },

  // Régime alimentaire
  regimeAlimentaire: { 
      type: String, 
      enum: ['Standard', 'Sans-porc', 'Végétarien', 'PAI'], 
      default: 'Standard' 
  }
});

module.exports = mongoose.model('Child', ChildSchema);