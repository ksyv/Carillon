const express = require('express');
const router = express.Router();
const Tariff = require('../models/Tariff');
const auth = require('../middleware/auth');

router.get('/', auth(['admin']), async (req, res) => {
    try {
        const tariffs = await Tariff.find().sort({ displayOrder: 1 });
        res.json(tariffs);
    } catch (err) { res.status(500).json({ message: "Erreur", error: err }); }
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const newTariff = new Tariff(req.body);
        await newTariff.save();
        res.status(201).json(newTariff);
    } catch (err) { res.status(400).json({ error: err }); }
});

router.post('/reorder', auth(['admin']), async (req, res) => {
    try {
        const { orderedIds } = req.body;
        for (let i = 0; i < orderedIds.length; i++) {
            await Tariff.findByIdAndUpdate(orderedIds[i], { displayOrder: i });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur réorganisation"); }
});

router.put('/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await Tariff.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(400).json({ error: err }); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    try { await Tariff.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).send("Erreur"); }
});

module.exports = router;