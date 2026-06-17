const express = require('express');
const router = express.Router();
const ClassGroup = require('../models/ClassGroup');
const Child = require('../models/Child');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
    try {
        const classes = await ClassGroup.find().sort({ category: 1, name: 1 });
        res.json(classes);
    } catch (e) { res.status(500).send('Erreur récupération classes'); }
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const newClass = new ClassGroup(req.body);
        await newClass.save();
        res.json(newClass);
    } catch (e) { res.status(400).send('Erreur création classe'); }
});

router.put('/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await ClassGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification classe'); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        await ClassGroup.findByIdAndDelete(req.params.id);
        await Child.updateMany({ classGroup: req.params.id }, { $set: { classGroup: null } });
        res.json({ success: true });
    } catch (e) { res.status(400).send('Erreur suppression classe'); }
});

module.exports = router;