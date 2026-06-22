const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Parent = require('../models/Parent');
const Child = require('../models/Child'); // <-- AJOUT DU MODÈLE ENFANT
const auth = require('../middleware/auth');

router.post('/invite', auth(['admin']), async (req, res) => {
    try {
        const { email, familyId } = req.body;
        if (!email || !familyId) return res.status(400).send("Champs requis.");

        const activationToken = crypto.randomBytes(20).toString('hex');
        const temporaryPassword = crypto.randomBytes(8).toString('hex');
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
        
        let parent = await Parent.findOne({ email });

        if (parent) {
            parent.activationToken = activationToken;
            parent.password = hashedPassword; 
            await parent.save();
        } else {
            parent = new Parent({ email, family: familyId, password: hashedPassword, activationToken });
            await parent.save();
        }

        const activationLink = `https://carillon.demo-ksyv.com/parent/portal?token=${activationToken}`;

        const transporter = nodemailer.createTransport({ 
            service: 'gmail', 
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } 
        });

        const mailHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 12px;">
                <h2 style="color: #1e3a8a;">Bienvenue sur Carillon</h2>
                <p>Le service périscolaire de la Ville de Carignan-de-Bordeaux vient de configurer vos accès personnels.</p>
                <p>Veuillez cliquer sur le lien ci-dessous pour configurer votre mot de passe et activer votre espace famille :</p>
                <div style="margin: 25px 0; text-align: center;">
                    <a href="${activationLink}" style="background-color: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">ACTIVER MON COMPTE PARENT</a>
                </div>
                <p style="font-size: 11px; color: #666;">Si le bouton ne fonctionne pas, copiez-collez ce lien : <br/> ${activationLink}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 10px; color: #888;"><i>Ceci est un envoi officiel automatisé de la Mairie. Ne pas répondre.</i></p>
            </div>
        `;

        await transporter.sendMail({
            from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Configuration de votre compte Portail Famille Carillon",
            html: mailHtml
        });

        res.json({ success: true, link: activationLink });
    } catch (e) { res.status(500).send(`Erreur : ${e.message}`); }
});

router.post('/activate', async (req, res) => {
    try {
        const { token, password } = req.body;
        const parent = await Parent.findOne({ activationToken: token });
        if (!parent) return res.status(404).send("Lien invalide.");

        const hashedPassword = await bcrypt.hash(password, 10);
        parent.password = hashedPassword; 
        parent.isFirstConnection = false;
        parent.activationToken = null;
        await parent.save(); 
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur lors de l'activation."); }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const parent = await Parent.findOne({ email }).populate('family');
        if (!parent || !(await parent.comparePassword(password))) return res.status(401).send("Erreurs identifiants.");

        const token = jwt.sign({ id: parent._id, familyId: parent.family._id, role: 'parent' }, process.env.JWT_SECRET || 'SECRET', { expiresIn: '24h' });
        res.json({ token, family: parent.family, email: parent.email });
    } catch (e) { res.status(500).send("Erreur."); }
});

router.get('/me', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send('Interdit');
        const parent = await Parent.findById(req.user.id).populate('family');
        if (!parent || !parent.family) return res.status(404).send('Parent introuvable');

        const children = await Child.find({ families: parent.family._id }).populate('classGroup');

        res.json({ 
            email: parent.email, 
            family: parent.family,
            children: children 
        });
    } catch (e) { res.status(500).send('Erreur.'); }
});

router.put('/children/:id', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send('Interdit');
        return res.status(403).send('Les modifications enfant passent par une demande de validation.');
    } catch (e) { res.status(500).send('Erreur modification enfant'); }
});

// Récupérer les factures validées de la famille connectée
router.get('/my-invoices', auth(['parent']), async (req, res) => {
    try {
        // On récupère l'ID de la famille depuis le token de l'utilisateur connecté
        const familyId = req.user.familyId; 

        const invoices = await Invoice.find({ 
            family: familyId, 
            status: 'published' // SÉCURITÉ : Uniquement les factures validées par le staff
        }).sort({ periodStart: -1 }); // Les plus récentes en premier

        res.json(invoices);
    } catch (e) {
        res.status(500).send("Erreur de récupération des factures.");
    }
});

module.exports = router;