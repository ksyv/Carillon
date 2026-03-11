const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Nom du modèle (ex: "Relance PAI")
    subject: { type: String, required: true },
    content: { type: String, required: true }, // Contenu HTML de l'éditeur
    category: { type: String } // Optionnel (ex: "Administratif", "Vacances")
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);