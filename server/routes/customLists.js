const express = require('express');
const router = express.Router();
const CustomList = require('../models/CustomList');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
    try {
        const lists = await CustomList.find().populate('items.child');
        res.json(lists);
    } catch (e) { res.status(500).send("Erreur"); }
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const list = new CustomList(req.body);
        await list.save();
        res.json(list);
    } catch (e) { res.status(500).send("Erreur"); }
});

router.put('/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await CustomList.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('items.child');
        res.json(updated);
    } catch (e) { res.status(500).send("Erreur"); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        await CustomList.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur"); }
});

router.put('/:id/toggle/:childId', auth(), async (req, res) => {
    try {
        const list = await CustomList.findById(req.params.id);
        if (!list) return res.status(404).send('Liste introuvable');
        
        const item = list.items.find(i => i.child.toString() === req.params.childId);
        if (item) item.isChecked = !item.isChecked;
        
        await list.save();
        await list.populate('items.child');
        res.json(list);
    } catch (e) { res.status(500).send("Erreur"); }
});

router.put('/:id/reset', auth(), async (req, res) => {
    try {
        const list = await CustomList.findById(req.params.id);
        if (!list) return res.status(404).send('Liste introuvable');
        
        list.items.forEach(i => i.isChecked = false);
        
        await list.save();
        await list.populate('items.child');
        res.json(list);
    } catch (e) { res.status(500).send("Erreur"); }
});

module.exports = router;