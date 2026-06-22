const express = require('express');
const router = express.Router();
const News = require('../models/News');
const auth = require('../middleware/auth');

// [PUBLIC/PARENTS] Récupérer les actualités actives, triées par ordre
router.get('/', auth(), async (req, res) => {
    try {
        // Les parents ne voient que les actives, le staff voit tout
        const filter = req.user.role === 'parent' ? { isActive: true } : {};
        const news = await News.find(filter).sort({ order: 1, createdAt: -1 });
        res.json(news);
    } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

// [STAFF] Créer une nouvelle carte
router.post('/', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const count = await News.countDocuments();
        const newCard = new News({ ...req.body, order: count });
        await newCard.save();
        res.status(201).json(newCard);
    } catch (e) { res.status(500).json({ error: "Erreur de création" }); }
});

// [STAFF] Mettre à jour une carte
router.put('/:id', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const updated = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(500).json({ error: "Erreur de mise à jour" }); }
});

// [STAFF] Mettre à jour l'ordre (Drag & Drop)
router.post('/reorder', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const { orderedIds } = req.body;
        // On met à jour l'ordre de chaque carte selon sa position dans le tableau
        await Promise.all(orderedIds.map((id, index) => 
            News.findByIdAndUpdate(id, { order: index })
        ));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erreur de réorganisation" }); }
});

// [STAFF] Supprimer une carte
router.delete('/:id', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erreur de suppression" }); }
});

module.exports = router;