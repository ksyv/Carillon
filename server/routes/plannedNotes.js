const express = require('express');
const router = express.Router();
const PlannedNote = require('../models/PlannedNote');
const auth = require('../middleware/auth');

router.get('/date', auth(), async (req, res) => {
    const { date } = req.query;
    if (!date) return res.json([]);
    const notes = await PlannedNote.find({ dates: date });
    res.json(notes);
});

router.get('/child/:childId', auth(['admin']), async (req, res) => {
    const notes = await PlannedNote.find({ child: req.params.childId });
    res.json(notes);
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const { childId, note, dates } = req.body;
        const plannedNote = new PlannedNote({ child: childId, note, dates });
        await plannedNote.save();
        res.json(plannedNote);
    } catch (e) { res.status(500).send("Erreur serveur création note."); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    await PlannedNote.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

module.exports = router;