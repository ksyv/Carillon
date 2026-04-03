const mongoose = require('mongoose');

// Sous-schéma pour un Parent/Responsable
const ParentSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  qualite: { type: String, default: '' }, // Père, Mère, Tuteur...
  address: { type: String, default: '' },
  phoneMobile: { type: String, default: '' },
  phoneFixe: { type: String, default: '' },
  email: { type: String, default: '' },
  profession: { type: String, default: '' },
  employeur: { type: String, default: '' },
  couvertureSociale: { type: String, default: 'CPAM' }, // CPAM, MSA, Autre
  numAllocataireCAF: { type: String, default: '' }
});

// Sous-schéma pour les Personnes Autorisées
const ContactSchema = new mongoose.Schema({
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  phone: { type: String, default: '' },
  relation: { type: String, default: '' },
  isEmergency: { type: Boolean, default: false } // Case "A contacter en cas d'urgence"
});

// Sous-schéma pour la gestion documentaire (avec tes fameuses dates de validité !)
const DocumentSchema = new mongoose.Schema({
  status: { type: String, enum: ['Manquant', 'Valide', 'Expiré', 'Non concerné'], default: 'Manquant' },
  expiryDate: { type: Date, default: null },
  fileUrl: { type: String, default: '' } // Prêt pour le futur Portail Famille
});

const FamilySchema = new mongoose.Schema({
  name: { type: String, required: true }, // Le nom de la famille (ex: DUPONT)
  
  responsables: [ParentSchema],
  personnesAutorisees: [ContactSchema],

  // Facturation et QF
  payeur: { type: String, enum: ['Responsable 1', 'Responsable 2', 'Autre'], default: 'Responsable 1' },
  enfantsACharge: { type: Number, default: 0 },
  revenuReference: { type: Number, default: null },
  nombreParts: { type: Number, default: null },
  quotientFamilial: { type: Number, default: null },

  // Tarifs spécifiques appliqués à la famille (calculés plus tard selon le QF)
  tarifs: {
    matin: { type: Number, default: null },
    soir: { type: Number, default: null },
    midi: { type: Number, default: null },
    retard: { type: Number, default: null }
  },

  // Gestion des documents (pour tes futures alertes)
  documents: {
    assuranceRC: { type: DocumentSchema, default: () => ({}) },
    vaccins: { type: DocumentSchema, default: () => ({}) },
    avisImposition: { type: DocumentSchema, default: () => ({}) },
    attestationCAF: { type: DocumentSchema, default: () => ({}) }
  },

  // Statut global pour filtrer facilement les dossiers "en rouge"
  dossierComplet: { type: Boolean, default: false },

  // NOUVEAU : Code d'accès au portail de l'école
  portalCode: { type: String, default: '' }
});

module.exports = mongoose.model('Family', FamilySchema);