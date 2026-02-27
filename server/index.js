const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');
const PlannedNote = require('./models/PlannedNote');
const Billing = require('./models/Billing'); // NOUVEAU MODÈLE FACTURATION

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
      console.log('MongoDB Connected');
  })
  .catch(err => console.log(err));

// Middleware Auth
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

// --- Routes Auth ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return res.status(400).send('Identifiants incorrects');
    
    const token = jwt.sign({ _id: user._id, role: user.role, categoryAccess: user.categoryAccess || 'Tous' }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
});

// --- Routes Utilisateurs (Admin) ---
app.get('/api/users', auth(['admin']), async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/users', auth(['admin']), async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = new User({ 
            username: req.body.username, 
            password: hash, 
            role: req.body.role,
            categoryAccess: req.body.categoryAccess || 'Tous'
        });
        await user.save();
        res.json({ _id: user._id, username: user.username, role: user.role, categoryAccess: user.categoryAccess });
    } catch (e) {
        res.status(400).send('Erreur création utilisateur (nom déjà pris ?)');
    }
});

app.delete('/api/users/:id', auth(['admin']), async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- Routes Enfants ---
app.get('/api/children', auth(), async (req, res) => {
    const children = await Child.find({ active: true }).sort({ lastName: 1, firstName: 1 });
    res.json(children);
});

app.post('/api/children', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

app.put('/api/children/:id', auth(['admin']), async (req, res) => {
    const { firstName, lastName, category } = req.body;
    const updated = await Child.findByIdAndUpdate(req.params.id, { firstName, lastName, category }, { new: true });
    res.json(updated);
});

app.delete('/api/children/:id', auth(['admin']), async (req, res) => {
    await Child.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true });
});

// --- Routes Pointage ---
app.get('/api/attendance', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    const list = await Attendance.find({ date, sessionType }).populate('child');
    res.json(list);
});

app.post('/api/attendance/checkin', auth(), async (req, res) => {
    const { childId, date, sessionType } = req.body;
    try {
        const att = new Attendance({ date, sessionType, child: childId });
        await att.save();
        await att.populate('child');
        res.json(att);
    } catch (e) { res.status(400).send('Déjà pointé'); }
});

app.put('/api/attendance/checkout/:id', auth(), async (req, res) => {
    const now = new Date();
    const limit = new Date();
    limit.setHours(18, 35, 0, 0);
    const isLate = now > limit;

    const att = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: now, isLate }, { new: true }).populate('child');
    res.json(att);
});

app.put('/api/attendance/note/:id', auth(), async (req, res) => {
    const { note } = req.body;
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { note }, { new: true }).populate('child');
    res.json(updated);
});

app.put('/api/attendance/remove-late/:id', auth(['staff', 'admin']), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { isLate: false }, { new: true }).populate('child');
    res.json(updated);
});

app.put('/api/attendance/undo-checkout/:id', auth(), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { 
        checkOut: null, 
        isLate: false 
    }, { new: true }).populate('child');
    res.json(updated);
});

app.delete('/api/attendance/:id', auth(), async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- Routes Notes Planifiées ---
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
    const { childId, note, dates } = req.body;
    const plannedNote = new PlannedNote({ child: childId, note, dates });
    await plannedNote.save();
    res.json(plannedNote);
});

app.delete('/api/planned-notes/:id', auth(['admin']), async (req, res) => {
    await PlannedNote.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});


// --- NOUVEAU : Routes Facturation Alternée ---
app.get('/api/billing/child/:childId', auth(['admin']), async (req, res) => {
    const rules = await Billing.find({ child: req.params.childId });
    res.json(rules);
});

app.post('/api/billing', auth(['admin']), async (req, res) => {
    const { childId, billTo, dates } = req.body;
    const rule = new Billing({ child: childId, billTo, dates });
    await rule.save();
    res.json(rule);
});

app.delete('/api/billing/:id', auth(['admin']), async (req, res) => {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});


// --- Route Rapport (MODIFIÉE POUR INCLURE LA FACTURATION) ---
app.get('/api/report', auth(['admin']), async (req, res) => {
    const { date } = req.query;
    const children = await Child.find({ active: true }).sort({ lastName: 1 });
    const atts = await Attendance.find({ date });
    
    // On va chercher toutes les règles de facturation qui tombent sur cette date
    const billingsForDate = await Billing.find({ dates: date });
    
    const report = children.map(c => {
        const am = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MATIN');
        const pm = atts.find(a => a.child.toString() == c._id && a.sessionType === 'SOIR');
        
        // Est-ce qu'on a une instruction de facturation pour cet enfant aujourd'hui ?
        const billingRule = billingsForDate.find(b => b.child.toString() == c._id);
        
        return { 
            child: c, 
            matin: !!am, 
            soir: !!pm, 
            checkOut: pm ? pm.checkOut : null,
            isLate: pm ? pm.isLate : false,
            pmId: pm ? pm._id : null,
            billTo: billingRule ? billingRule.billTo : '' // L'info remonte toute seule !
        };
    }).filter(r => r.matin || r.soir);
    
    res.json(report);
});

// --- DEPLOIEMENT PRODUCTION ---
const path = require('path');
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html'));
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));