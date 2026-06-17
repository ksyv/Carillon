const express = require('express');
const router = express.Router();
const Evacuation = require('../models/Evacuation');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    let evac = await Evacuation.findOne({ date, sessionType });
    if (!evac) { evac = new Evacuation({ date, sessionType, safeChildren: [] }); await evac.save(); }
    res.json(evac);
});

router.post('/toggle', auth(), async (req, res) => {
    const { date, sessionType, childId } = req.body;
    let evac = await Evacuation.findOne({ date, sessionType });
    if (!evac) evac = new Evacuation({ date, sessionType, safeChildren: [] });
    const index = evac.safeChildren.indexOf(childId);
    if (index > -1) evac.safeChildren.splice(index, 1);
    else evac.safeChildren.push(childId);
    await evac.save();
    res.json(evac);
});

router.post('/clear', auth(['admin', 'responsable']), async (req, res) => {
    const { date, sessionType } = req.body;
    await Evacuation.findOneAndDelete({ date, sessionType });
    res.json({ success: true });
});

module.exports = router;