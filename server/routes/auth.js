const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Trop de tentatives de connexion échouées. Réessayez dans 15 minutes."
});

router.post('/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) 
        return res.status(400).send('Identifiants incorrects');
    
    const token = jwt.sign({ _id: user._id, role: user.role, categoryAccess: user.categoryAccess || 'Tous' }, process.env.JWT_SECRET);
    res.json({ token, role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
});

router.get('/users', auth(['admin']), async (req, res) => {
    const users = await User.find({}, '-password');
    res.json(users);
});

router.post('/users', auth(['admin']), async (req, res) => {
    try {
        const hash = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hash, role: req.body.role, categoryAccess: req.body.categoryAccess || 'Tous' });
        await user.save();
        res.json({ _id: user._id, username: user.username, role: user.role, categoryAccess: user.categoryAccess });
    } catch (e) { res.status(400).send('Nom déjà pris ?'); }
});

router.put('/users/:id', auth(['admin']), async (req, res) => {
    try {
        const updated = await User.findByIdAndUpdate(req.params.id, { role: req.body.role, categoryAccess: req.body.categoryAccess }, { new: true });
        res.json(updated);
    } catch (e) { res.status(400).send('Erreur modification utilisateur'); }
});

router.delete('/users/:id', auth(['admin']), async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

module.exports = router;