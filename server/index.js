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
const EmailTemplate = require('./models/EmailTemplate');
const nodemailer = require('nodemailer');

// On utilise un modèle simple pour stocker la signature (Settings)
const SettingsSchema = new mongoose.Schema({ key: String, value: String });
const Settings = mongoose.model('Settings', SettingsSchema);

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return res.status(400).send('Identifiants incorrects');
    const token = jwt.sign({ _id: user._id, role: user.role, categoryAccess: user.categoryAccess || 'Tous' }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
});

// --- USERS ---
app.get('/api/users', auth(['admin']), async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

app.post('/api/users', auth(['admin']), async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hash, role: req.body.role, categoryAccess: req.body.categoryAccess || 'Tous' });
        await user.save();
        res.json(user);
    } catch (e) { res.status(400).send('Erreur création'); }
});

// --- ENFANTS & FAMILLES ---
app.get('/api/children', auth(), async (req, res) => {
    const children = await Child.find().sort({ lastName: 1, firstName: 1 }).populate('family'); 
    res.json(children);
});

app.put('/api/children/:id', auth(), async (req, res) => {
    if (req.user.role !== 'admin') {
        const keys = Object.keys(req.body);
        if (keys.length === 1 && keys.includes('persistentNote')) {
            const updated = await Child.findByIdAndUpdate(req.params.id, { persistentNote: req.body.persistentNote }, { new: true });
            return res.json(updated);
        }
        return res.status(403).send("Admin requis");
    }
    const updated = await Child.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

app.get('/api/families', auth(['admin', 'responsable']), async (req, res) => {
    const families = await Family.find().sort({ name: 1 });
    res.json(families);
});

app.put('/api/families/:id', auth(['admin']), async (req, res) => {
    const updated = await Family.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

// --- POINTAGE & SYNC ---
app.get('/api/attendance', auth(), async (req, res) => {
    const { date, sessionType } = req.query;
    const list = await Attendance.find({ date, sessionType }).populate('child');
    res.json(list);
});

app.post('/api/attendance/checkin', auth(), async (req, res) => {
    const { childId, date, sessionType } = req.body;
    const att = new Attendance({ date, sessionType, child: childId, lastUpdated: Date.now() });
    await att.save();
    await att.populate('child');
    res.json(att);
});

app.put('/api/attendance/checkout/:id', auth(), async (req, res) => {
    const attRecord = await Attendance.findById(req.params.id);
    const now = new Date();
    let isLate = false;
    if (attRecord?.sessionType === 'SOIR') {
        const limit = new Date(); limit.setHours(18, 35, 0, 0);
        isLate = now > limit;
    }
    const att = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: now, isLate, lastUpdated: Date.now() }, { new: true }).populate('child');
    res.json(att);
});

// --- FACTURATION & NOTES ---
app.post('/api/billing', auth(['admin']), async (req, res) => {
    const rule = new Billing(req.body);
    await rule.save();
    res.json(rule);
});

app.get('/api/report', auth(['admin']), async (req, res) => {
    const { date } = req.query;
    const children = await Child.find().sort({ lastName: 1 });
    const atts = await Attendance.find({ date });
    const billings = await Billing.find({ dates: date });
    const report = children.map(c => {
        const am = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MATIN');
        const midi = atts.find(a => a.child.toString() == c._id && a.sessionType === 'MIDI');
        const pm = atts.find(a => a.child.toString() == c._id && a.sessionType === 'SOIR');
        const bill = billings.find(b => b.child.toString() == c._id);
        return { child: c, matin: !!am, midiAbsent: !!midi, soir: !!pm, checkOut: pm?.checkOut, isLate: !!pm?.isLate, billTo: bill?.billTo || '' };
    });
    res.json(report);
});

// --- STATS CAF ---
app.get('/api/stats/caf', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } }).populate('child');
    let global = { matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, total: { acts: 0, hours: 0 } };
    let daily = {};
    attendances.forEach(att => {
        if (!att.child?.birthDate) return;
        const sDate = new Date(att.date); const bDate = new Date(att.child.birthDate);
        let age = sDate.getFullYear() - bDate.getFullYear();
        if (sDate.getMonth() < bDate.getMonth() || (sDate.getMonth() === bDate.getMonth() && sDate.getDate() < bDate.getDate())) age--;
        const grp = age < 6 ? 'under6' : 'over6';
        if (!daily[att.date]) daily[att.date] = { date: att.date, matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } } };
        if (att.sessionType === 'MATIN') { global.matin[grp].acts++; global.matin[grp].hours++; global.total.acts++; global.total.hours++; daily[att.date].matin[grp].acts++; daily[att.date].matin[grp].hours++; }
        else if (att.sessionType === 'SOIR' && (att.checkOut || att.isLate)) { global.soir[grp].acts++; global.soir[grp].hours += 2.5; global.total.acts++; global.total.hours += 2.5; daily[att.date].soir[grp].acts++; daily[att.date].soir[grp].hours += 2.5; }
    });
    res.json({ global, daily: Object.values(daily).sort((a,b) => a.date.localeCompare(b.date)) });
});

// --- MAILING, TEMPLATES & SIGNATURE ---
app.post('/api/mail/send', auth(['admin', 'responsable']), async (req, res) => {
    const { subject, message, recipients, attachments } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
        await transporter.sendMail({
            from: `"Périscolaire Carignan" <${process.env.EMAIL_USER}>`,
            bcc: recipients,
            replyTo: 'servicescolaire@carignandebordeaux.fr',
            subject,
            html: `<div style="font-family: Arial;">${message}</div>`,
            attachments: attachments || []
        });
        res.status(200).send("OK");
    } catch (e) { res.status(500).send("Erreur"); }
});

app.get('/api/mail/templates', auth(), async (req, res) => { res.json(await EmailTemplate.find()); });
app.post('/api/mail/templates', auth(), async (req, res) => { const t = new EmailTemplate(req.body); await t.save(); res.json(t); });

app.get('/api/settings/signature', auth(), async (req, res) => {
    const s = await Settings.findOne({ key: 'mail_signature' });
    res.json({ signature: s ? s.value : '' });
});

app.post('/api/settings/signature', auth(['admin']), async (req, res) => {
    await Settings.findOneAndUpdate({ key: 'mail_signature' }, { value: req.body.signature }, { upsert: true });
    res.send("OK");
});

// --- PROD ---
const path = require('path');
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => res.sendFile(path.resolve(__dirname, '../client/dist', 'index.html')));
}
app.listen(process.env.PORT || 5000, () => console.log('Server running'));