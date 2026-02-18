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
  .then(() => console.log('MongoDB Connected'))
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

// Routes Auth
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return res.status(400).send('Identifiants incorrects');
    const token = jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ token, role: user.role });
});

// Route Initiale pour créer l'admin (A supprimer ou sécuriser après usage)
app.post('/api/admin-init', async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hash, role: 'admin' });
    await user.save();
    res.json(user);
});

// Routes Enfants
app.get('/api/children', auth(), async (req, res) => {
    const children = await Child.find({ active: true }).sort({ lastName: 1, firstName: 1 });
    res.json(children);
});
app.post('/api/children', auth(['admin']), async (req, res) => {
    const child = new Child(req.body);
    await child.save();
    res.json(child);
});

// Routes Pointage
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
    // Logique 18h30
    const limit = new Date();
    limit.setHours(18, 30, 0, 0);
    const isLate = now > limit;

    const att = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: now, isLate }, { new: true });
    res.json(att);
});

// Route Rapport
app.get('/api/report', auth(['admin']), async (req, res) => {
    const { date } = req.query;
    const children = await Child.find({ active: true }).sort({ lastName: 1 });
    const atts = await Attendance.find({ date });
    
    const report = children.map(c => {
        const am = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MATIN');
        const pm = atts.find(a => a.child.toString() == c._id && a.sessionType === 'SOIR');
        
        let supplement = false;
        if (pm) {
             // Si marqué en retard OU checkOut > 18h30
             if (pm.isLate) supplement = true;
             if (pm.checkOut && new Date(pm.checkOut) > new Date(new Date(pm.checkOut).setHours(18,30,0,0))) supplement = true;
        }

        return { child: c, matin: !!am, soir: !!pm, supplement };
    }).filter(r => r.matin || r.soir);
    
    res.json(report);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));