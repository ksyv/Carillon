const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  child: { type: mongoose.Schema.Types.ObjectId, ref: 'Child', required: true },
  billToFamily: { type: mongoose.Schema.Types.ObjectId, ref: 'Family' }, // NOUVEAU: Le lien vers le vrai dossier
  billTo: { type: String }, // Ancien champ texte (conservé pour compatibilité temporaire)
  dates: [{ type: String }] // Tableau des dates sélectionnées
}, { timestamps: true });

// Verrouiller et publier les factures d'une période (rend visible aux parents)
router.put('/publish', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.body;
    
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");

    try {
        // On met à jour toutes les factures 'draft' de la période pour les passer en 'published'
        const result = await Invoice.updateMany(
            { periodStart: startDate, periodEnd: endDate, status: 'draft' },
            { $set: { status: 'published' } }
        );

        res.json({ 
            success: true, 
            message: `${result.modifiedCount} factures publiées avec succès.`,
            modifiedCount: result.modifiedCount
        });
    } catch (e) { 
        console.error("Erreur lors de la publication:", e);
        res.status(500).send("Erreur lors de la publication des factures."); 
    }
});

module.exports = mongoose.model('Billing', BillingSchema);