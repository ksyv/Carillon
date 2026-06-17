const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');

router.get('/', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    const list = await Attendance.find({ date, sessionType }).populate('child');
    res.json(list);
});

router.post('/checkin', auth(), async (req, res) => {
    const { childId, date, sessionType } = req.body;
    try {
        const att = new Attendance({ date, sessionType, child: childId, lastUpdated: Date.now() });
        await att.save();
        await att.populate('child');
        res.json(att);
    } catch (e) { res.status(400).send('Déjà pointé'); }
});

router.put('/checkout/:id', auth(), async (req, res) => {
    const attRecord = await Attendance.findById(req.params.id);
    const now = new Date();
    let isLate = false;
    if (attRecord && attRecord.sessionType === 'SOIR') {
        const limit = new Date(); limit.setHours(18, 35, 0, 0);
        isLate = now > limit;
    }
    const att = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: now, isLate, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(att);
});

router.put('/note/:id', auth(), async (req, res) => {
    const { note } = req.body;
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { note, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

router.put('/remove-late/:id', auth(['staff', 'responsable', 'admin']), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { isLate: false, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

router.put('/undo-checkout/:id', auth(), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: null, isLate: false, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

router.delete('/:id', auth(), async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

router.post('/sync', auth(), async (req, res) => {
    const { actions } = req.body;
    let successCount = 0; let ignoredCount = 0;
    for (const action of actions) {
        try {
            let att = await Attendance.findOne({ child: action.childId, date: action.date, sessionType: action.sessionType });
            if (att && att.lastUpdated >= action.timestamp) { ignoredCount++; continue; }
            if (action.type === 'CHECK_IN') {
                if (!att) {
                    att = new Attendance({ child: action.childId, date: action.date, sessionType: action.sessionType, checkIn: new Date(action.timestamp), lastUpdated: action.timestamp });
                    await att.save(); successCount++;
                } else {
                    att.checkOut = null; att.isLate = false; att.lastUpdated = action.timestamp; await att.save(); successCount++;
                }
            } else if (action.type === 'CHECK_OUT') {
                if (att) {
                    att.checkOut = new Date(action.timestamp); att.lastUpdated = action.timestamp;
                    if (att.sessionType === 'SOIR') {
                        const limit = new Date(action.timestamp); limit.setHours(18, 35, 0, 0);
                        att.isLate = limit < new Date(action.timestamp);
                    }
                    await att.save(); successCount++;
                }
            } else if (action.type === 'DELETE') {
                if (att) { await Attendance.findByIdAndDelete(att._id); successCount++; }
            } else if (action.type === 'ADD_NOTE') {
                if (att) { att.note = action.note; att.lastUpdated = action.timestamp; await att.save(); successCount++; }
            }
        } catch (error) { console.error("Erreur synchro:", error); }
    }
    res.json({ message: "Synchronisation terminée", successCount, ignoredCount });
});

module.exports = router;