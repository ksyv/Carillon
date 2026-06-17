const express = require('express');
const router = express.Router();
const Child = require('../models/Child');
const Attendance = require('../models/Attendance');
const PlannedNote = require('../models/PlannedNote');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
    const children = await Child.find().sort({ lastName: 1, firstName: 1 }).populate('families').populate('classGroup'); 
    res.json(children);
});

router.post('/', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

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

router.post('/:id/attach', auth(['admin']), async (req, res) => {
    try {
        const updated = await Child.findByIdAndUpdate(req.params.id, { $addToSet: { families: req.body.familyId } }, { new: true }).populate('families');
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur attachement'); }
});

router.post('/:id/detach', auth(['admin']), async (req, res) => {
    try {
        const updated = await Child.findByIdAndUpdate(req.params.id, { $pull: { families: req.body.familyId } }, { new: true }).populate('families');
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur détachement'); }
});

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