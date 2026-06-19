const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.post('/login', async (req, res) => {
    try {
        // 1. On récupère le mot de passe
        const password = req.body.password;
        
        // 2. On récupère l'identifiant, peu importe comment le Front l'appelle (email, username, pseudo...)
        const loginIdentifier = req.body.username || req.body.email || req.body.pseudo;

        if (!loginIdentifier || !password) {
            return res.status(400).send("Identifiant ou mot de passe manquant.");
        }

        // 3. On cherche l'utilisateur dans la base de données (soit par email, soit par username)
        const user = await User.findOne({
            $or: [
                { username: loginIdentifier },
                { email: loginIdentifier }
            ]
        });

        if (!user) {
            return res.status(400).send("Utilisateur introuvable.");
        }

        // 4. On vérifie le mot de passe
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send("Mot de passe incorrect.");
        }

        // 5. On génère le token d'accès
        const token = jwt.sign(
            { id: user._id, role: user.role, categoryAccess: user.categoryAccess }, 
            process.env.JWT_SECRET || 'SECRET', 
            { expiresIn: '24h' }
        );
        
        res.json({ token, role: user.role, categoryAccess: user.categoryAccess });

    } catch (err) {
        console.error("Erreur login:", err);
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