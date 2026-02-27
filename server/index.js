const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Child = require('./models/Child');
const Attendance = require('./models/Attendance');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
      console.log('MongoDB Connected');
      // MIGRATION AUTOMATIQUE : Met à jour les enfants existants
      await Child.updateMany({ category: { $exists: false } }, { $set: { category: 'Maternelle' } });
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
    
    // NOUVEAU : On inclut l'accès aux catégories
    const token = jwt.sign({ _id: user._id, role: user.role, categoryAccess: user.categoryAccess || 'Tous' }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
});

// Route Initiale pour créer l'admin (A supprimer ou sécuriser après usage)
app.post('/api/admin-init', async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hash, role: 'admin', categoryAccess: 'Tous' });
    await user.save();
    res.json(user);
});

// --- Routes Utilisateurs (Admin) ---
app.get('/api/users', auth(['admin']), async (req, res) => {
    // On renvoie les utilisateurs sans les mots de passe
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
            categoryAccess: req.body.categoryAccess || 'Tous' // NOUVEAU
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

// Modifier un enfant (Correction de nom/prénom)
app.put('/api/children/:id', auth(['admin']), async (req, res) => {
    // NOUVEAU : On récupère aussi la category
    const { firstName, lastName, category } = req.body;
    const updated = await Child.findByIdAndUpdate(req.params.id, { firstName, lastName, category }, { new: true });
    res.json(updated);
});

// Supprimer un enfant (Soft Delete = on le rend inactif pour garder l'historique)
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
    // Logique 18h35
    const limit = new Date();
    limit.setHours(18, 35, 0, 0);
    const isLate = now > limit;

    const att = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: now, isLate }, { new: true }).populate('child');
    res.json(att);
});

// Retirer manuellement le supplément de retard
app.put('/api/attendance/remove-late/:id', auth(['staff', 'admin']), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { isLate: false }, { new: true }).populate('child');
    res.json(updated);
});

// Annuler un départ (missclick "DÉPART")
app.put('/api/attendance/undo-checkout/:id', auth(), async (req, res) => {
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { 
        checkOut: null, 
        isLate: false 
    }, { new: true }).populate('child');
    res.json(updated);
});

// Supprimer totalement un pointage (missclick "Ajouter un enfant")
app.delete('/api/attendance/:id', auth(), async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- Route Rapport ---
app.get('/api/report', auth(['admin']), async (req, res) => {
    const { date } = req.query;
    const children = await Child.find({ active: true }).sort({ lastName: 1 });
    const atts = await Attendance.find({ date });
    
    const report = children.map(c => {
        const am = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MATIN');
        const pm = atts.find(a => a.child.toString() == c._id && a.sessionType === 'SOIR');
        
        return { 
            child: c, 
            matin: !!am, 
            soir: !!pm, 
            checkOut: pm ? pm.checkOut : null,
            isLate: pm ? pm.isLate : false,
            pmId: pm ? pm._id : null // Indispensable pour que le bouton d'annulation marche
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