const mongoose = require('mongoose');

const NewsSchema = new mongoose.Schema({
    title: { type: String, required: true, default: 'Nouvelle Information' },
    content: { type: String, default: '' }, // Contiendra le HTML généré par l'éditeur
    borderColor: { type: String, default: '#0ea5e9' }, // Couleur par défaut (Bleu)
    order: { type: Number, default: 0 }, // Pour le Drag & Drop
    isActive: { type: Boolean, default: true } // Brouillon ou Publié
}, { timestamps: true });

module.exports = mongoose.model('News', NewsSchema);