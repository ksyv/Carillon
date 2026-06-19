const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Récupérer toute l'équipe
router.get('/', auth(), async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).send("Erreur serveur");
    }
});

// Ajouter un membre
router.post('/', auth(), async (req, res) => {
    try {
        const { username, email, password, role, categoryAccess } = req.body;
        const user = new User({ username, email, role, categoryAccess });
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).send("Erreur serveur");
    }
});

// Modifier un membre
router.put('/:id', auth(), async (req, res) => {
    try {
        const { username, email, role, categoryAccess, password } = req.body;
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'Utilisateur non trouvé' });

        if (username) user.username = username;
        if (email) user.email = email;
        if (role) user.role = role;
        if (categoryAccess) user.categoryAccess = categoryAccess;
        if (password) {
            user.password = await bcrypt.hash(password, 10);
        }

        await user.save();
        res.json(user);
    } catch (err) {
        res.status(500).send("Erreur serveur");
    }
});

// Supprimer un membre
router.delete('/:id', auth(), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Utilisateur supprimé' });
    } catch (err) {
        res.status(500).send("Erreur serveur");
    }
});

module.exports = router;
