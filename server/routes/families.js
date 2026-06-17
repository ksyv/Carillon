const express = require('express');
const router = express.Router();
const Family = require('../models/Family');
const Child = require('../models/Child');
const auth = require('../middleware/auth');

router.get('/', auth(['admin', 'responsable']), async (req, res) => {
    try {
        const families = await Family.find().sort({ name: 1 });
        res.json(families);
    } catch (e) { res.status(500).send('Erreur récupération familles'); }
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const family = new Family(req.body);
        await family.save();
        res.json(family);
    } catch (e) { res.status(400).send('Erreur création famille'); }
});

router.put('/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification famille'); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        await Family.findByIdAndDelete(req.params.id);
        await Child.updateMany({ families: req.params.id }, { $pull: { families: req.params.id } });
        res.json({ success: true });
    } catch (e) { res.status(400).send('Erreur suppression famille'); }
});

module.exports = router;