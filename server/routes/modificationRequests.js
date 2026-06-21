const express = require('express');
const router = express.Router();
const ModificationRequest = require('../models/ModificationRequest');
const Child = require('../models/Child');
const Family = require('../models/Family');
const Parent = require('../models/Parent');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// 1. [PARENTS] Soumettre une demande de modification
router.post('/', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send("Accès refusé");
        
        // CORRECTION 500 : On va chercher le parent en base pour être 100% sûr d'avoir son familyId
        // Cela évite les crashs si le parent utilise un vieux token de connexion
        const parentUser = await Parent.findById(req.user.id);
        if (!parentUser || !parentUser.family) {
            return res.status(404).send("Parent ou famille introuvable.");
        }

        const { targetType, targetId, fields } = req.body;
        
        const newRequest = new ModificationRequest({
            family: parentUser.family,
            parent: parentUser._id,
            targetType,
            targetId,
            fields
        });

        await newRequest.save();
        res.status(201).json({ success: true, message: "Demande envoyée pour validation." });
    } catch (error) {
        console.error("ERREUR CRÉATION DEMANDE :", error);
        res.status(500).json({ error: "Erreur lors de la soumission de la demande : " + error.message });
    }
});

// 2. [STAFF] Compteur (utilisé par le Dashboard)
router.get('/pending-count', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const count = await ModificationRequest.countDocuments({ globalStatus: 'pending' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du comptage des demandes." });
    }
});

// 3. [STAFF] Récupérer les demandes pour UNE famille spécifique (utilisé par FamilyManager)
router.get('/family/:familyId', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const requests = await ModificationRequest.find({ family: req.params.familyId, globalStatus: 'pending' })
            .populate('targetId')
            .populate('parent', 'email');
        
        // Formatage pour correspondre aux attentes de ton composant FamilyManager
        const formattedRequests = requests.map(req => {
            let summaryArray = [];
            req.fields.forEach(f => {
                // On crée le résumé lisible pour l'équipe
                summaryArray.push(`${f.fieldNameFr} modifié`);
            });

            return {
                ...req.toObject(),
                childId: req.targetType === 'Child' ? req.targetId._id : null,
                changeSummary: summaryArray.join(' | ')
            };
        });

        res.json(formattedRequests);
    } catch (error) {
        console.error("ERREUR FETCH FAMILY REQUESTS:", error);
        res.status(500).json({ error: "Erreur lors de la récupération des demandes." });
    }
});

// 4. [STAFF] Approuver une demande globale (utilisé par FamilyManager)
router.post('/:id/approve', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const request = await ModificationRequest.findById(req.params.id).populate('targetId').populate('parent');
        if (!request) return res.status(404).send("Demande introuvable.");

        let targetDoc = request.targetType === 'Child' 
            ? await Child.findById(request.targetId) 
            : await Family.findById(request.targetId);

        let emailHtml = `<h3>Vos modifications ont été acceptées !</h3><ul>`;
        
        // On applique toutes les modifications de la demande d'un seul coup
        request.fields.forEach(field => {
            field.status = 'approved';
            targetDoc[field.fieldKey] = field.newValue; 
            emailHtml += `<li>✅ <b>${field.fieldNameFr}</b> a bien été mis à jour.</li>`;
        });
        emailHtml += `</ul><p>Votre dossier est maintenant à jour.</p>`;

        request.globalStatus = 'processed';
        await targetDoc.save(); 
        await request.save();  

        // Envoi de la notification au parent
        const transporter = nodemailer.createTransport({
            service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
            to: request.parent.email,
            subject: "Modifications validées - Portail Famille",
            html: emailHtml
        }).catch(e => console.log("Erreur mail:", e));

        // On renvoie les données mises à jour pour que le Front se rafraîchisse instantanément
        res.json({ 
            success: true, 
            family: request.targetType === 'Family' ? targetDoc : null, 
            child: request.targetType === 'Child' ? targetDoc : null 
        });
    } catch (error) {
        console.error("ERREUR APPROBATION :", error);
        res.status(500).json({ error: "Erreur lors de l'approbation." });
    }
});

// 5. [STAFF] Rejeter une demande globale (utilisé par FamilyManager)
router.post('/:id/reject', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const { message } = req.body;
        const request = await ModificationRequest.findById(req.params.id).populate('parent');
        if (!request) return res.status(404).send("Demande introuvable.");

        request.globalStatus = 'processed';
        request.fields.forEach(f => {
            f.status = 'rejected';
            f.rejectionReason = message;
        });
        await request.save();

        const emailHtml = `
            <h3>Refus de modification</h3>
            <p>Bonjour,</p>
            <p>Le secrétariat n'a pas pu valider les modifications demandées sur votre dossier.</p>
            <p><b>Motif du refus :</b> ${message}</p>
            <p>Merci de contacter la mairie pour plus de détails.</p>
        `;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });
        await transporter.sendMail({
            from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
            to: request.parent.email,
            subject: "Refus de modification - Portail Famille",
            html: emailHtml
        }).catch(e => console.log("Erreur mail:", e));

        res.json({ success: true });
    } catch (error) {
        console.error("ERREUR REJET :", error);
        res.status(500).json({ error: "Erreur lors du rejet." });
    }
});

module.exports = router;