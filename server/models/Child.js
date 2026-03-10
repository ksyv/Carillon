const mongoose = require('mongoose');

// On garde l'ancien ContactSchema provisoirement le temps que la moulinette de migration fasse son travail
const OldContactSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' }
});

const ChildSchema = new mongoose.Schema({
  // --- NOUVEAU : Lien avec le dossier Famille ---
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  category: { type: String, enum: ['Maternelle', 'Élémentaire'], default: 'Maternelle' },
  active: { type: Boolean, default: true },
  
  // NOUVEAU : Données d'inscription
  sexe: { type: String, enum: ['Masculin', 'Féminin', ''], default: '' },
  birthDate: { type: Date, default: null }, // VITAL pour les stats PSO CAF
  droitImage: { type: Boolean, default: false },
  autorisationSortieSeul: { type: Boolean, default: false },
  
  // Note de terrain
  persistentNote: { type: String, default: '' },

  // NOUVEAU : Précisions médicales tirées du dossier
  medical: {
      lunettes: { type: Boolean, default: false },
      appareilAuditif: { type: Boolean, default: false },
      appareilDentaire: { type: Boolean, default: false },
      activitesPhysiques: { type: Boolean, default: true },
      medecinNom: { type: String, default: '' },
      medecinPhone: { type: String, default: '' }
  },

  // PAI
  hasPAI: { type: Boolean, default: false },
  paiDetails: { type: String, default: '' },
  isPAIAlimentaire: { type: Boolean, default: false },
  regimeAlimentaire: { 
      type: String, 
      enum: ['Standard', 'Sans-porc', 'Végétarien', 'PAI'], 
      default: 'Standard' 
  },

  // --- CHAMPS EN VOIE DE SUPPRESSION (Conservés pour la migration) ---
  responsablesLegaux: [OldContactSchema],
  personnesAutorisees: [OldContactSchema]
});

module.exports = mongoose.model('Child', ChildSchema);