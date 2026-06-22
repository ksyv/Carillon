const express = require('express');
const router = express.Router();
const Child = require('../models/Child');
const Attendance = require('../models/Attendance');
const PlannedNote = require('../models/PlannedNote');
const auth = require('../middleware/auth');

// 1. LISTE ALLÉGÉE (Pour l'écran de pointage : rapide et sans les fichiers de 2 Mo)
router.get('/', auth(), async (req, res) => {
    // Le .select('-documents -paiDocument') est la clé : il exclut les Base64 !
    const children = await Child.find()
        .select('-documents -paiDocument') 
        .sort({ lastName: 1, firstName: 1 })
        .populate('families')
        .populate('classGroup')
        .lean(); 
    res.json(children);
});

// 2. NOUVEAU : BASE D'URGENCE (Uniquement les enfants avec PAI + leurs documents, pour le hors-ligne)
// Attention : Cette route doit toujours être AVANT le get('/:id')
router.get('/emergency-database', auth(), async (req, res) => {
    try {
        const emergencyKids = await Child.find({ active: true, hasPAI: true })
            .select('firstName lastName paiDocument medicalDetails category persistentNote hasPAI')
            .lean();
        res.json(emergencyKids);
    } catch (err) {
        res.status(500).send("Erreur de récupération de la base d'urgence");
    }
});

// 3. NOUVEAU : FICHE COMPLÈTE À LA DEMANDE (Quand on clique sur "Info" en ligne)
router.get('/:id', auth(), async (req, res) => {
    try {
        // Ici on n'exclut rien, on renvoie tout (y compris les PAI et documents)
        const child = await Child.findById(req.params.id)
            .populate('families')
            .populate('classGroup')
            .lean();
        if (!child) return res.status(404).send('Enfant introuvable');
        res.json(child);
    } catch (e) { 
        res.status(500).send("Erreur serveur"); 
    }
});

// 4. CRÉATION D'UN ENFANT
router.post('/', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

// 5. MISE À JOUR
router.put('/:id', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            const keys = Object.keys(req.body);
            if (keys.length === 1 && keys.includes('persistentNote')) {
                const updated = await Child.findByIdAndUpdate(req.params.id, { persistentNote: req.body.persistentNote }, { new: true });
                return res.json(updated);
            }
            return res.status(403).send("Seul un admin peut modifier la fiche complète.");
        }
        const updated = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification enfant'); }
});

// 6. ATTACHER UNE FAMILLE
router.post('/:id/attach', auth(['admin']), async (req, res) => {
    try {
        const updated = await Child.findByIdAndUpdate(req.params.id, { $addToSet: { families: req.body.familyId } }, { new: true }).populate('families');
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur attachement'); }
});

// 7. DÉTACHER UNE FAMILLE
router.post('/:id/detach', auth(['admin']), async (req, res) => {
    try {
        const updated = await Child.findByIdAndUpdate(req.params.id, { $pull: { families: req.body.familyId } }, { new: true }).populate('families');
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur détachement'); }
});

// 8. SUPPRESSION
router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        const childId = req.params.id;
        await Child.findByIdAndDelete(childId);
        await Attendance.deleteMany({ child: childId });
        await PlannedNote.deleteMany({ child: childId });
        res.json({ success: true });
    } catch (e) { res.status(500).send('Erreur suppression'); }
});

module.exports = router;