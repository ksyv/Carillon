const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' },
  isEmergency: { type: Boolean, default: false }
});

const ChildDocumentSchema = new mongoose.Schema({
  status: { type: String, enum: ['Manquant', 'Valide', 'Expiré'], default: 'Manquant' },
  expiryDate: { type: Date, default: null },
  fileUrl: { type: String, default: '' }
});

const ChildSchema = new mongoose.Schema({
  family: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  category: { type: String, enum: ['Maternelle', 'Élémentaire'], default: 'Maternelle' },
  active: { type: Boolean, default: true },
  
  sexe: { type: String, enum: ['Masculin', 'Féminin', ''], default: '' },
  birthDate: { type: Date, default: null },
  droitImage: { type: Boolean, default: false },
  autorisationSortieSeul: { type: Boolean, default: false },
  
  persistentNote: { type: String, default: '' },

  medical: {
      lunettes: { type: Boolean, default: false },
      appareilAuditif: { type: Boolean, default: false },
      appareilDentaire: { type: Boolean, default: false },
      activitesPhysiques: { type: Boolean, default: true },
      medecinNom: { type: String, default: '' },
      medecinPhone: { type: String, default: '' },
      autresInfos: { type: String, default: '' }
  },

  hasPAI: { type: Boolean, default: false },
  paiDetails: { type: String, default: '' },
  isPAIAlimentaire: { type: Boolean, default: false },
  paiDocument: { type: String, default: '' }, 
  
  regimeAlimentaire: { 
      type: String, 
      enum: ['Standard', 'Sans-porc', 'Végétarien', 'PAI'], 
      default: 'Standard' 
  },

  personnesAutorisees: [ContactSchema],

  // NOUVEAU : Documents spécifiques à l'enfant
  documents: {
      vaccins: { type: ChildDocumentSchema, default: () => ({}) },
      assurance: { type: ChildDocumentSchema, default: () => ({}) }
  }
});

module.exports = mongoose.model('Child', ChildSchema);