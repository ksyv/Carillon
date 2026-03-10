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
const Billing = require('./models/Billing');
const Family = require('./models/Family');

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

app.put('/api/users/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(
            req.params.id, 
            { 
                role: req.body.role, 
                categoryAccess: req.body.categoryAccess 
            }, 
            { new: true }
        );
        res.json(updated);
    } catch (e) {
        res.status(400).send('Erreur modification utilisateur');
    }
});

app.delete('/api/users/:id', auth(['admin']), async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- Routes Enfants ---
// Tous les connectés peuvent lire la base (indispensable pour l'appli hors-ligne des animateurs)
app.get('/api/children', auth(), async (req, res) => {
    const children = await Child.find({ active: true }).sort({ lastName: 1, firstName: 1 });
    res.json(children);
});

// Seul l'admin peut créer ou supprimer
app.post('/api/children', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

// MODIFIÉ : On laisse passer tout le monde, mais on filtre ce qu'ils ont le droit de faire
app.put('/api/children/:id', auth(), async (req, res) => {
    try {
        // Si ce n'est pas un admin, on vérifie qu'il n'essaie de modifier QUE la note persistante
        if (req.user.role !== 'admin') {
            const keys = Object.keys(req.body);
            if (keys.length === 1 && keys.includes('persistentNote')) {
                const updated = await Child.findByIdAndUpdate(req.params.id, { persistentNote: req.body.persistentNote }, { new: true });
                return res.json(updated);
            }
            return res.status(403).send("Seul un admin peut modifier la fiche complète de l'enfant.");
        }

        // Si c'est un admin, on met à jour toute la fiche sans restriction
        const updated = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(400).send('Erreur modification enfant');
    }
});

app.delete('/api/children/:id', auth(['admin']), async (req, res) => {
    await Child.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true });
});

// --- Routes Familles ---

// Lire toutes les familles (pour la liste admin)
app.get('/api/families', auth(['admin', 'responsable']), async (req, res) => {
    try {
        const families = await Family.find().sort({ name: 1 });
        res.json(families);
    } catch (e) {
        res.status(500).send('Erreur lors de la récupération des familles');
    }
});

// Créer une nouvelle coquille vide (Dossier Famille)
app.post('/api/families', auth(['admin']), async (req, res) => {
    try {
        const family = new Family(req.body);
        await family.save();
        res.json(family);
    } catch (e) {
        res.status(400).send('Erreur lors de la création de la famille');
    }
});

// Mettre à jour un dossier (quand Charline remplit les infos CAF, adresse, etc.)
app.put('/api/families/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(400).send('Erreur lors de la modification de la famille');
    }
});

// Supprimer une famille
app.delete('/api/families/:id', auth(['admin']), async (req, res) => {
    try {
        await Family.findByIdAndDelete(req.params.id);
        // SÉCURITÉ : Si on supprime une famille, on "rend orphelins" les enfants rattachés (sans les supprimer de la base !)
        await Child.updateMany({ family: req.params.id }, { $set: { family: null } });
        res.json({ success: true });
    } catch (e) {
        res.status(400).send('Erreur lors de la suppression de la famille');
    }
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
    
    // On ne calcule le retard de 18h35 QUE si c'est la session du SOIR
    if (attRecord && attRecord.sessionType === 'SOIR') {
        const limit = new Date();
        limit.setHours(18, 35, 0, 0);
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
    const updated = await Attendance.findByIdAndUpdate(req.params.id, { 
        checkOut: null, 
        isLate: false,
        lastUpdated: Date.now()
    }, { new: true }).populate('child');
    res.json(updated);
});

app.delete('/api/attendance/:id', auth(), async (req, res) => {
    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// --- ROUTE DE SYNCHRONISATION (Mode Hors-Ligne) ---
app.post('/api/attendance/sync', auth(), async (req, res) => {
    const { actions } = req.body;
    let successCount = 0;
    let ignoredCount = 0;

    for (const action of actions) {
        try {
            let att = await Attendance.findOne({ 
                child: action.childId, 
                date: action.date, 
                sessionType: action.sessionType 
            });

            if (att && att.lastUpdated >= action.timestamp) {
                ignoredCount++; 
                continue; 
            }

            if (action.type === 'CHECK_IN') {
                if (!att) {
                    att = new Attendance({ 
                        child: action.childId, 
                        date: action.date, 
                        sessionType: action.sessionType,
                        checkIn: new Date(action.timestamp),
                        lastUpdated: action.timestamp
                    });
                    await att.save();
                    successCount++;
                } else {
                    att.checkOut = null;
                    att.isLate = false;
                    att.lastUpdated = action.timestamp;
                    await att.save();
                    successCount++;
                }
            } 
            else if (action.type === 'CHECK_OUT') {
                if (att) {
                    att.checkOut = new Date(action.timestamp);
                    att.lastUpdated = action.timestamp;
                    
                    // Calcul retard uniquement le SOIR
                    if (att.sessionType === 'SOIR') {
                        const limit = new Date(action.timestamp);
                        limit.setHours(18, 35, 0, 0);
                        att.isLate = limit < new Date(action.timestamp);
                    }
                    
                    await att.save();
                    successCount++;
                }
            }
            else if (action.type === 'DELETE') {
                if (att) {
                    await Attendance.findByIdAndDelete(att._id);
                    successCount++;
                }
            }
            else if (action.type === 'ADD_NOTE') {
                if (att) {
                    att.note = action.note;
                    att.lastUpdated = action.timestamp;
                    await att.save();
                    successCount++;
                }
            }
        } catch (error) {
            console.error("Erreur synchro:", error);
        }
    }

    res.json({ message: "Synchronisation terminée", successCount, ignoredCount });
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


// --- Routes Facturation Alternée ---
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


// --- Route Rapport (Matin, Midi, Soir) ---
// Réservé aux admins
app.get('/api/report', auth(['admin']), async (req, res) => {
    const { date } = req.query;
    const children = await Child.find({ active: true }).sort({ lastName: 1 });
    const atts = await Attendance.find({ date });
    
    const billingsForDate = await Billing.find({ dates: date });
    
    // On construit le rapport global
    const report = children.map(c => {
        const am = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MATIN');
        const midi = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MIDI');
        const pm = atts.find(a => a.child.toString() == c._id && a.sessionType === 'SOIR');
        
        const billingRule = billingsForDate.find(b => b.child.toString() == c._id);
        
        return { 
            child: c, 
            matin: !!am, 
            midiAbsent: !!midi, // Logique inversée : présence d'une ligne = absent
            soir: !!pm, 
            checkOut: pm ? pm.checkOut : null,
            isLate: pm ? pm.isLate : false,
            pmId: pm ? pm._id : null,
            billTo: billingRule ? billingRule.billTo : '' 
        };
    });
    
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