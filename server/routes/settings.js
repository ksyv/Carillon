const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/closed-days', auth(), async (req, res) => {
    const setting = await Settings.findOne({ key: 'closed_days' });
    res.json(setting ? JSON.parse(setting.value) : []);
});

router.post('/closed-days', auth(['admin']), async (req, res) => {
    let setting = await Settings.findOne({ key: 'closed_days' });
    if (!setting) setting = new Settings({ key: 'closed_days', value: JSON.stringify(req.body.dates) });
    else setting.value = JSON.stringify(req.body.dates);
    await setting.save(); res.json({ success: true });
});

router.get('/signature', auth(), async (req, res) => {
    const user = await User.findById(req.user._id); 
    res.json({ signature: user ? user.signature : '' });
});

router.post('/signature', auth(), async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { signature: req.body.signature }); 
    res.send("Signature enregistrée");
});

router.get('/structure-info', auth(), async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: 'structure_info' });
        res.json(setting ? JSON.parse(setting.value) : []);
    } catch (e) { res.status(500).send("Erreur."); }
});

router.put('/structure-info', auth(['admin']), async (req, res) => {
    try {
        let setting = await Settings.findOne({ key: 'structure_info' });
        if (!setting) {
            setting = new Settings({ key: 'structure_info', value: JSON.stringify(req.body) });
        } else {
            setting.value = JSON.stringify(req.body);
        }
        await setting.save();
        res.json(JSON.parse(setting.value));
    } catch (e) { res.status(500).send("Erreur."); }
});

module.exports = router;