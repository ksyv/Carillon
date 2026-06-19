const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/login', async (req, res) => {
    try {
        const identifiant = req.body.username || req.body.email || req.body.pseudo;
        const password = req.body.password;

        console.log("👉 URGENCE LOGIN - BODY REÇU :", req.body);

        if (!identifiant || !password) {
            console.log("❌ ERREUR : Identifiant ou mot de passe vide");
            return res.status(400).send("Identifiant ou mot de passe manquant.");
        }

        // 1. Recherche exacte
        let user = await User.findOne({ username: identifiant });
        if (!user) user = await User.findOne({ email: identifiant });
        
        // 2. Recherche insensible à la casse (si tu as tapé Admin au lieu de admin)
        if (!user) {
            user = await User.findOne({ username: { $regex: new RegExp("^" + identifiant + "$", "i") } });
        }

        if (!user) {
            console.log("❌ ERREUR : Utilisateur non trouvé en base ->", identifiant);
            return res.status(400).send("Utilisateur introuvable.");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ ERREUR : Mauvais mot de passe pour ->", identifiant);
            return res.status(400).send("Mot de passe incorrect.");
        }

        console.log("✅ SUCCÈS : Connexion autorisée pour ->", identifiant);
        const token = jwt.sign(
            { id: user._id, role: user.role, categoryAccess: user.categoryAccess }, 
            process.env.JWT_SECRET || 'SECRET', 
            { expiresIn: '24h' }
        );
        
        res.json({ token, role: user.role, categoryAccess: user.categoryAccess });

    } catch (err) {
        console.error("❌ ERREUR SERVEUR LOGIN:", err);
        res.status(500).send("Erreur serveur lors de la connexion");
    }
});

router.get('/me', auth(), async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (e) {
        res.status(500).send("Erreur serveur");
    }
});

module.exports = router;