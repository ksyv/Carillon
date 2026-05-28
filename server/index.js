const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');

const User = require('./models/User');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');
const PlannedNote = require('./models/PlannedNote');
const Billing = require('./models/Billing');
const Family = require('./models/Family');
const EmailTemplate = require('./models/EmailTemplate');
const Tariff = require('./models/Tariff');
const ModificationRequest = require('./models/ModificationRequest');
const Parent = require('./models/Parent');

const SettingsSchema = new mongoose.Schema({ key: String, value: String });
const Settings = mongoose.model('Settings', SettingsSchema);

const EvacuationSchema = new mongoose.Schema({
    date: String,
    sessionType: String,
    safeChildren: [{ type: String }]
});
const Evacuation = mongoose.model('Evacuation', EvacuationSchema);

const app = express();

app.use(helmet({
    contentSecurityPolicy: false // Évite les blocages d'iFrames pour l'aperçu des PDF Justificatifs
}));
app.set('trust proxy', 1);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000,
    message: "Trop de requêtes depuis cette IP, veuillez réessayer later."
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Trop de tentatives de connexion échouées. Réessayez dans 15 minutes."
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(async () => { console.log('MongoDB Connected'); })
  .catch(err => console.log(err));

// --- MIDDLEWARE D'AUTHENTIFICATION UNIFIÉ ---
const auth = (roles = []) => (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send('Accès refusé');
    try {
        const v = jwt.verify(token, process.env.JWT_SECRET);
        req.user = v;
        if (roles.length && !roles.includes(v.role)) return res.status(403).send('Interdit');
        next();
    } catch (e) { res.status(400).send('Token invalide'); }
};

// --- ROUTES AUTHENTIFICATION STAFF ---
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return res.status(400).send('Identifiants incorrects');
    
    const token = jwt.sign({ _id: user._id, role: user.role, categoryAccess: user.categoryAccess || 'Tous' }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
});

app.get('/api/users', auth(['admin']), async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/users', auth(['admin']), async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hash, role: req.body.role, categoryAccess: req.body.categoryAccess || 'Tous' });
        await user.save();
        res.json({ _id: user._id, username: user.username, role: user.role, categoryAccess: user.categoryAccess });
    } catch (e) { res.status(400).send('Nom déjà pris ?'); }
});

app.put('/api/users/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, { role: req.body.role, categoryAccess: req.body.categoryAccess }, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification utilisateur'); }
});

app.delete('/api/users/:id', auth(['admin']), async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- ROUTES BASE ENFANTS ---
app.get('/api/children', auth(), async (req, res) => {
    const children = await Child.find().sort({ lastName: 1, firstName: 1 }).populate('family'); 
    res.json(children);
});

app.post('/api/children', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

app.put('/api/children/:id', auth(), async (req, res) => {
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

app.delete('/api/children/:id', auth(['admin']), async (req, res) => {
    try {
        const childId = req.params.id;
        await Child.findByIdAndDelete(childId);
        await Attendance.deleteMany({ child: childId });
        await PlannedNote.deleteMany({ child: childId });
        res.json({ success: true });
    } catch (e) { res.status(500).send('Erreur suppression'); }
});

// --- ROUTES DOSSIERS FAMILLES ---
app.get('/api/families', auth(['admin', 'responsable']), async (req, res) => {
    try {
        const families = await Family.find().sort({ name: 1 });
        res.json(families);
    } catch (e) { res.status(500).send('Erreur récupération familles'); }
});

app.post('/api/families', auth(['admin']), async (req, res) => {
    try {
        const family = new Family(req.body);
        await family.save();
        res.json(family);
    } catch (e) { res.status(400).send('Erreur création famille'); }
});

app.put('/api/families/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification famille'); }
});

app.delete('/api/families/:id', auth(['admin']), async (req, res) => {
    try {
        await Family.findByIdAndDelete(req.params.id);
        await Child.updateMany({ family: req.params.id }, { $set: { family: null } });
        res.json({ success: true });
    } catch (e) { res.status(400).send('Erreur suppression famille'); }
});

// --- ROUTES POINTAGES & SYNCHRO ---
app.get('/api/attendance', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    const list = await Attendance.find({ date, sessionType }).populate('child');
    res.json(list);
});

app.post('/api/attendance/checkin', auth(), async (req, res) => {
    const { childId, date, sessionType } = req.body;
    try {
        const att = new Attendance({ date, sessionType, child: childId, lastUpdated: Date.now() });
        await att.save();
        await att.populate('child');
        res.json(att);
    } catch (e) { res.status(400).send('Déjà pointé'); }
});

app.put('/api/attendance/checkout/:id', auth(), async (req, res) => {
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

app.put('/api/attendance/note/:id', auth(), async (req, res) => {
    const { note } = req.body;
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { note, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

app.put('/api/attendance/remove-late/:id', auth(['staff', 'responsable', 'admin']), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { isLate: false, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

app.put('/api/attendance/undo-checkout/:id', auth(), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: null, isLate: false, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(updated);
});

app.delete('/api/attendance/:id', auth(), async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.post('/api/attendance/sync', auth(), async (req, res) => {
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

// --- ROUTES NOTES PLANIFIÉES ---
app.get('/api/planned-notes/date', auth(), async (req, res) => {
    const { date } = req.query;
    if (!date) return res.json([]);
    const notes = await PlannedNote.find({ dates: date });
    res.json(notes);
});

app.get('/api/planned-notes/child/:childId', auth(['admin']), async (req, res) => {
    const notes = await PlannedNote.find({ child: req.params.childId });
    res.json(notes);
});

app.post('/api/planned-notes', auth(['admin']), async (req, res) => {
    try {
        const { childId, note, dates } = req.body;
        const plannedNote = new PlannedNote({ child: childId, note, dates });
        await plannedNote.save();
        res.json(plannedNote);
    } catch (e) { res.status(500).send("Erreur serveur création note."); }
});

app.delete('/api/planned-notes/:id', auth(['admin']), async (req, res) => {
    await PlannedNote.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- COMPOSANTS DE FACTURATION EXCEPTION ---
app.get('/api/billing/child/:childId', auth(['admin']), async (req, res) => {
    const rules = await Billing.find({ child: req.params.childId });
    res.json(rules);
});

app.post('/api/billing', auth(['admin']), async (req, res) => {
    try {
        const { childId, billTo, dates } = req.body;
        const rule = new Billing({ child: childId, billTo, dates });
        await rule.save();
        res.json(rule);
    } catch (e) { res.status(500).send("Erreur enregistrement règle."); }
});

app.delete('/api/billing/:id', auth(['admin']), async (req, res) => {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

app.get('/api/report', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate || req.query.date;
    const end = endDate || req.query.date;

    const children = await Child.find().sort({ lastName: 1, firstName: 1 });
    const atts = await Attendance.find({ date: { $gte: start, $lte: end } });
    const billings = await Billing.find();

    const attendanceMap = {};
    atts.forEach(a => {
        const childObj = children.find(c => c._id.toString() === a.child.toString());
        if (!childObj) return; 
        
        const key = `${a.date}_${a.child.toString()}`;
        if (!attendanceMap[key]) {
            attendanceMap[key] = {
                type: 'ATTENDANCE', date: a.date, child: childObj,
                matin: false, midiAbsent: false, soir: false, checkOut: null, isLate: false, pmId: null, billTo: ''
            };
        }
        if (a.sessionType === 'MATIN') attendanceMap[key].matin = true;
        if (a.sessionType === 'MIDI') attendanceMap[key].midiAbsent = true;
        if (a.sessionType === 'SOIR') {
            attendanceMap[key].soir = true; attendanceMap[key].checkOut = a.checkOut;
            attendanceMap[key].isLate = a.isLate; attendanceMap[key].pmId = a._id;
        }
    });

    billings.forEach(b => {
        b.dates.forEach(d => {
            if (d >= start && d <= end) {
                const key = `${d}_${b.child.toString()}`;
                if (attendanceMap[key]) attendanceMap[key].billTo = b.billTo;
            }
        });
    });

    res.json({ children: children.map(c => ({ child: c })), attendances: Object.values(attendanceMap) });
});

app.get('/api/stats/caf', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } }).populate('child');
        let globalStats = { 
            matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            supplement: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            total: { acts: 0, hours: 0 } 
        };
        let dailyStats = {};

        const uniqueTotal = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueMatin = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueSoir = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueSupplement = { all: new Set(), under6: new Set(), over6: new Set() };

        attendances.forEach(att => {
            if (!att.child || !att.child.birthDate) return; 
            const sessionDate = new Date(att.date);
            const birthDate = new Date(att.child.birthDate);
            let age = sessionDate.getFullYear() - birthDate.getFullYear();
            const m = sessionDate.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && sessionDate.getDate() < birthDate.getDate())) age--;
            const ageGroup = age < 6 ? 'under6' : 'over6';
            
            if (!dailyStats[att.date]) {
                dailyStats[att.date] = { 
                    date: att.date, 
                    matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
                    soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } },
                    supplement: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }
                };
            }
            const childId = att.child._id.toString();

            if (att.sessionType === 'MATIN') {
                uniqueTotal.all.add(childId); uniqueTotal[ageGroup].add(childId);
                uniqueMatin.all.add(childId); uniqueMatin[ageGroup].add(childId);
                globalStats.matin[ageGroup].acts += 1; globalStats.matin[ageGroup].hours += 1;
                globalStats.total.acts += 1; globalStats.total.hours += 1;
                dailyStats[att.date].matin[ageGroup].acts += 1; dailyStats[att.date].matin[ageGroup].hours += 1;
            } else if (att.sessionType === 'SOIR' && (att.checkOut || att.isLate)) {
                uniqueTotal.all.add(childId); uniqueTotal[ageGroup].add(childId);
                uniqueSoir.all.add(childId); uniqueSoir[ageGroup].add(childId);
                globalStats.soir[ageGroup].acts += 1; globalStats.soir[ageGroup].hours += 2;
                globalStats.total.acts += 1; globalStats.total.hours += 2;
                dailyStats[att.date].soir[ageGroup].acts += 1; dailyStats[att.date].soir[ageGroup].hours += 2;
                
                if (att.isLate) {
                    uniqueSupplement.all.add(childId); uniqueSupplement[ageGroup].add(childId);
                    globalStats.supplement[ageGroup].acts += 1; globalStats.supplement[ageGroup].hours += 0.5;
                    globalStats.total.acts += 1; globalStats.total.hours += 0.5;
                    dailyStats[att.date].supplement[ageGroup].acts += 1; dailyStats[att.date].supplement[ageGroup].hours += 0.5;
                }
            }
        });

        globalStats.uniqueChildren = {
            total: { all: uniqueTotal.all.size, under6: uniqueTotal.under6.size, over6: uniqueTotal.over6.size },
            matin: { all: uniqueMatin.all.size, under6: uniqueMatin.under6.size, over6: uniqueMatin.over6.size },
            soir: { all: uniqueSoir.all.size, under6: uniqueSoir.under6.size, over6: uniqueSoir.over6.size },
            supplement: { all: uniqueSupplement.all.size, under6: uniqueSupplement.under6.size, over6: uniqueSupplement.over6.size }
        };
        res.json({ global: globalStats, daily: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)) });
    } catch (e) { res.status(500).send('Erreur Stats CAF'); }
});

// --- ROUTES ÉVACUATION ---
app.get('/api/evacuation', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    let evac = await Evacuation.findOne({ date, sessionType });
    if (!evac) { evac = new Evacuation({ date, sessionType, safeChildren: [] }); await evac.save(); }
    res.json(evac);
});

app.post('/api/evacuation/toggle', auth(), async (req, res) => {
    const { date, sessionType, childId } = req.body;
    let evac = await Evacuation.findOne({ date, sessionType });
    if (!evac) evac = new Evacuation({ date, sessionType, safeChildren: [] });
    const index = evac.safeChildren.indexOf(childId);
    if (index > -1) evac.safeChildren.splice(index, 1);
    else evac.safeChildren.push(childId);
    await evac.save();
    res.json(evac);
});

app.post('/api/evacuation/clear', auth(['admin', 'responsable']), async (req, res) => {
    const { date, sessionType } = req.body;
    await Evacuation.findOneAndDelete({ date, sessionType });
    res.json({ success: true });
});

// --- ROUTES GRILLES TARIFAIRES ---
app.get('/api/tariffs', auth(['admin']), async (req, res) => {
    try {
        const tariffs = await Tariff.find().sort({ displayOrder: 1 });
        res.json(tariffs);
    } catch (err) { res.status(500).json({ message: "Erreur", error: err }); }
});

app.post('/api/tariffs', auth(['admin']), async (req, res) => {
    try {
        const newTariff = new Tariff(req.body);
        await newTariff.save();
        res.status(201).json(newTariff);
    } catch (err) { res.status(400).json({ error: err }); }
});

app.post('/api/tariffs/reorder', auth(['admin']), async (req, res) => {
    try {
        const { orderedIds } = req.body;
        for (let i = 0; i < orderedIds.length; i++) {
            await Tariff.findByIdAndUpdate(orderedIds[i], { displayOrder: i });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur réorganisation"); }
});

app.put('/api/tariffs/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await Tariff.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) { res.status(400).json({ error: err }); }
});

app.delete('/api/tariffs/:id', auth(['admin']), async (req, res) => {
    try { await Tariff.findByIdAndDelete(req.params.id); res.json({ success: true }); } catch (err) { res.status(500).send("Erreur"); }
});

// --- MOTEUR DE CALCUL AVEC DOUBLE SÉCURITÉ & LOGIQUE CANTINE INVERSÉE ---
app.get('/api/billing/calculate', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");
    try {
        const tariffs = await Tariff.find();
        const families = await Family.find();
        const children = await Child.find({ active: true });
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } });
        const alternateBillings = await Billing.find({ dates: { $elemMatch: { $gte: startDate, $lte: endDate } } });
        const closedDaysSetting = await Settings.findOne({ key: 'closed_days' });
        const closedDays = closedDaysSetting ? JSON.parse(closedDaysSetting.value) : [];

        const tariffMap = tariffs.reduce((acc, t) => ({ ...acc, [t.activityCode]: t }), {});
        const childrenInFamily = children.reduce((acc, c) => {
            if (!c.family) return acc;
            acc[c.family.toString()] = (acc[c.family.toString()] || 0) + 1;
            return acc;
        }, {});

        const daysWithRealActivity = [...new Set(attendances.map(a => a.date))];
        let schoolDays = [];
        let start = new Date(startDate);
        let end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if ([1, 2, 4, 5].includes(d.getDay()) && !closedDays.includes(dateStr) && daysWithRealActivity.includes(dateStr)) {
                schoolDays.push(dateStr);
            }
        }

        let invoiceDrafts = {};
        const initInvoice = (p) => { if (!invoiceDrafts[p]) invoiceDrafts[p] = { payeur: p, items: {}, totalGlobal: 0 }; };
        
        const calculateUnitPrice = (rule, fratrieCount, qf) => {
            if (rule.pricingMode === 'FIXED') return rule.fixedPrice || 0;
            if (rule.pricingMode === 'QF_BRACKETS') {
                const b = rule.qfBrackets.find(x => qf >= x.min && qf <= x.max); return b ? b.price : 0;
            }
            if (rule.pricingMode === 'TAUX_EFFORT') {
                const rateRule = rule.effortRates.find(r => r.childrenCount === fratrieCount) || rule.effortRates[0];
                if (rateRule) return Math.max(rateRule.min, Math.min(rateRule.max, qf * rateRule.rate));
            }
            return 0;
        };

        // Restauration scolaire (Midi)
        children.forEach(child => {
            if (!child.family) return;
            const family = families.find(f => f._id.toString() === child.family.toString());
            if (!family) return;
            const fratrieCount = childrenInFamily[family._id.toString()] || 1;
            const qf = family.quotientFamilial || 0;
            const targetCode = child.regimeAlimentaire === 'PAI' ? 'CA1_PAI' : 'CA1';
            const label = child.regimeAlimentaire === 'PAI' ? 'Cantine (Tarif PAI)' : 'Cantine (Repas Enfant)';
            const rule = tariffMap[targetCode]; if (!rule) return;

            schoolDays.forEach(date => {
                const isAbsent = attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI');
                if (!isAbsent) {
                    let pNom = `${family.name} (Dossier n°${family.cafNumber || 'Sans'})`;
                    const alt = alternateBillings.find(b => b.child.toString() === child._id.toString() && b.dates.includes(date));
                    if (alt) pNom = `Garde Alternée : ${alt.billTo} (Enfant: ${child.firstName})`;
                    
                    initInvoice(pNom);
                    const price = calculateUnitPrice(rule, fratrieCount, qf);
                    if (!invoiceDrafts[pNom].items[targetCode]) invoiceDrafts[pNom].items[targetCode] = { label, unitPrice: price, count: 0, total: 0 };
                    invoiceDrafts[pNom].items[targetCode].count += 1;
                    invoiceDrafts[pNom].items[targetCode].total += price;
                    invoiceDrafts[pNom].totalGlobal += price;
                }
            });
        });

        // APS Matin et Soir
        attendances.forEach(att => {
            if (att.sessionType === 'MIDI' || closedDays.includes(att.date)) return;
            const child = children.find(c => c._id.toString() === att.child.toString());
            if (!child || !child.family) return;
            const family = families.find(f => f._id.toString() === child.family.toString()); if (!family) return;
            const fratrieCount = childrenInFamily[family._id.toString()] || 1;
            const qf = family.quotientFamilial || 0;

            let pNom = `${family.name} (Dossier n°${family.cafNumber || 'Sans'})`;
            const alt = alternateBillings.find(b => b.child.toString() === child._id.toString() && b.dates.includes(att.date));
            if (alt) pNom = `Garde Alternée : ${alt.billTo} (Enfant: ${child.firstName})`;

            initInvoice(pNom);
            let targetCode = att.sessionType === 'MATIN' ? 'CA2_MATIN' : (att.isLate ? 'CA2_SUPP' : 'CA2_SOIR');
            let label = att.sessionType === 'MATIN' ? 'APS Matin' : (att.isLate ? 'Supplément Fin de Soirée' : 'APS Soir (16h30-18h30)');
            const rule = tariffMap[targetCode]; if (!rule) return;

            const price = calculateUnitPrice(rule, fratrieCount, qf);
            if (!invoiceDrafts[pNom].items[targetCode]) invoiceDrafts[pNom].items[targetCode] = { label, unitPrice: price, count: 0, total: 0 };
            invoiceDrafts[pNom].items[targetCode].count += 1;
            invoiceDrafts[pNom].items[targetCode].total += price;
            invoiceDrafts[pNom].totalGlobal += price;
        });

        const result = Object.values(invoiceDrafts).map(d => ({ ...d, items: Object.values(d.items), totalGlobal: Number(d.totalGlobal.toFixed(2)) })).filter(d => d.totalGlobal > 0);
        res.json(result);
    } catch (e) { res.status(500).send("Erreur calcul."); }
});

// --- CALENDRIER DE FERMETURE SETTINGS ---
app.get('/api/settings/closed-days', auth(), async (req, res) => {
    const setting = await Settings.findOne({ key: 'closed_days' });
    res.json(setting ? JSON.parse(setting.value) : []);
});

app.post('/api/settings/closed-days', auth(['admin']), async (req, res) => {
    let setting = await Settings.findOne({ key: 'closed_days' });
    if (!setting) setting = new Settings({ key: 'closed_days', value: JSON.stringify(req.body.dates) });
    else setting.value = JSON.stringify(req.body.dates);
    await setting.save(); res.json({ success: true });
});

// --- WORKFLOW D'INVITATION PARENT AVEC ENVOI DE MAIL REEL ---
app.post('/api/parent/invite', async (req, res) => {
    try {
        const { email, familyId } = req.body;
        if (!email || !familyId) return res.status(400).send("Champs requis.");

        const activationToken = crypto.randomBytes(20).toString('hex');
        
        // --- LOGIQUE INTELLIGENTE : RÉCUPÉRER OU CRÉER ---
        let parent = await Parent.findOne({ email });

        if (parent) {
            // Si le parent existe, on met juste à jour son token
            parent.activationToken = activationToken;
            await parent.save(); 
        } else {
            // S'il n'existe pas, on le crée
            const temporaryPassword = crypto.randomBytes(8).toString('hex');
            parent = new Parent({ 
                email, 
                family: familyId, 
                password: temporaryPassword, 
                activationToken 
            });
            await parent.save();
        }

        const activationLink = `${req.headers.referer || 'https://carillon.demo-ksyv.com'}/parent/portal?token=${activationToken}`;

        // --- ENVOI DE L'EMAIL ---
        const transporter = nodemailer.createTransport({ 
            service: 'gmail', 
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } 
        });

        await transporter.sendMail({
            from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Configuration de votre compte Portail Famille Carillon",
            html: `<p>Cliquez ici pour activer votre espace : <a href="${activationLink}">Activer mon compte</a></p>`
        });

        res.json({ success: true, link: activationLink });
    } catch (e) { 
        console.error(e);
        res.status(500).send(`Erreur : ${e.message}`); 
    }
});

// --- WORKFLOW PORTAIL PARENT CORE ---
app.post('/api/parent/activate', async (req, res) => {
    try {
        const { token, password } = req.body;
        const parent = await Parent.findOne({ activationToken: token });
        if (!parent) return res.status(404).send("Lien invalide.");
        parent.password = password; parent.isFirstConnection = false; parent.activationToken = null;
        await parent.save(); res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur."); }
});

app.post('/api/parent/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const parent = await Parent.findOne({ email }).populate('family');
        if (!parent || !(await parent.comparePassword(password))) return res.status(401).send("Erreurs identifiants.");

        const token = jwt.sign({ id: parent._id, familyId: parent.family._id, role: 'parent' }, process.env.JWT_SECRET || 'SECRET', { expiresIn: '24h' });
        res.json({ token, family: parent.family, email: parent.email });
    } catch (e) { res.status(500).send("Erreur."); }
});

// --- MANAGEMENT ROUTE SYSTEM VALIDATION (PORTAIL <=> STAFF) ---
app.post('/api/requests', auth(), async (req, res) => {
    try {
        const { familyId, portalCode, newData } = req.body;
        await ModificationRequest.updateMany({ familyId, status: 'PENDING' }, { status: 'REJECTED', refusalMessage: 'Remplacée.' });
        const request = new ModificationRequest({ familyId, portalCode, newData, status: 'PENDING' });
        await request.save(); res.status(201).json(request);
    } catch (e) { res.status(500).send("Erreur."); }
});

app.get('/api/requests/family/:familyId', auth(), async (req, res) => {
    const request = await ModificationRequest.findOne({ familyId: req.params.familyId }).sort({ createdAt: -1 });
    res.json(request);
});

app.post('/api/requests/:id/approve', auth(['admin']), async (req, res) => {
    try {
        const request = await ModificationRequest.findById(req.params.id);
        const updated = await Family.findByIdAndUpdate(request.familyId, request.newData, { new: true });
        request.status = 'APPROVED'; await request.save();
        res.json({ success: true, family: updated });
    } catch (e) { res.status(500).send("Erreur."); }
});

app.post('/api/requests/:id/reject', auth(['admin']), async (req, res) => {
    try {
        await ModificationRequest.findByIdAndUpdate(req.params.id, { status: 'REJECTED', refusalMessage: req.body.message });
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur."); }
});

// --- MODULE CENTRAL MAILING ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
app.post('/api/mail/send', auth(['admin', 'responsable']), async (req, res) => {
    const { subject, message, recipients, attachments } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        let finalHtml = message; let inlineAttachments = [...(attachments || [])];
        const imageRegex = /<img src="data:(image\/[a-zA-Z]*);base64,([^"]*)"/g;
        let match; let imageCount = 0;
        while ((match = imageRegex.exec(message)) !== null) {
            imageCount++; const base64Data = match[2]; const cid = `inlineimg${imageCount}`;
            finalHtml = finalHtml.replace(match[0], `<img src="cid:${cid}"`);
            inlineAttachments.push({ filename: `image${imageCount}`, content: base64Data, encoding: 'base64', cid: cid });
        }
        const htmlMessage = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">${finalHtml}<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"><p style="font-size: 10px; color: #888;"><i>Message automatique Carillon. Ne pas répondre directement.</i></p></div>`;
        const BATCH_SIZE = 40;
        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);
            await transporter.sendMail({ from: `"Périscolaire Carignan" <${process.env.EMAIL_USER}>`, bcc: batch, replyTo: 'servicescolaire@carignandebordeaux.fr', subject: subject, html: htmlMessage, attachments: inlineAttachments });
            if (i + BATCH_SIZE < recipients.length) await sleep(2000); 
        }
        res.status(200).send("Emails envoyés avec succès");
    } catch (error) { res.status(500).send("Erreur lors de l'envoi."); }
});

app.get('/api/mail/templates', auth(['admin', 'responsable']), async (req, res) => {
    res.json(await EmailTemplate.find());
});

app.post('/api/mail/templates', auth(['admin', 'responsable']), async (req, res) => {
    const newTemplate = new EmailTemplate(req.body); await newTemplate.save(); res.json(newTemplate);
});

app.get('/api/settings/signature', auth(), async (req, res) => {
    const user = await User.findById(req.user._id); res.json({ signature: user ? user.signature : '' });
});

app.post('/api/settings/signature', auth(), async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { signature: req.body.signature }); res.send("Signature personnelle enregistrée");
});

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html')));
}

app.listen(process.env.PORT || 5000, () => console.log('Server running'));