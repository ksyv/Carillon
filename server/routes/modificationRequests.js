const express = require('express');
const router = express.Router();
const ModificationRequest = require('../models/ModificationRequest');
const Child = require('../models/Child');
const Family = require('../models/Family');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');

// 1. [PARENTS] Soumettre une demande de modification
router.post('/', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send("Accès refusé");
        
        const { targetType, targetId, fields } = req.body;
        
        const newRequest = new ModificationRequest({
            family: req.user.familyId,
            parent: req.user.id,
            targetType,
            targetId,
            fields
        });

        await newRequest.save();
        res.status(201).json({ success: true, message: "Demande envoyée pour validation." });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la soumission de la demande." });
    }
});

// 2. [STAFF] Récupérer toutes les demandes en attente
router.get('/pending', auth(['admin', 'director', 'manager']), async (req, res) => {
    try {
        const requests = await ModificationRequest.find({ globalStatus: 'pending' })
            .populate('family', 'name')
            .populate('parent', 'email')
            .populate('targetId') // Récupère les infos de l'enfant ou de la famille cible
            .sort({ createdAt: -1 });
            
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des demandes." });
    }
});

// 3. [STAFF] Traiter une demande (Validation champ par champ)
router.post('/:id/process', auth(['admin', 'director', 'manager']), async (req, res) => {
    try {
        const { processedFields } = req.body; // Tableau avec { fieldId, status, rejectionReason }
        const request = await ModificationRequest.findById(req.params.id)
            .populate('targetId')
            .populate('parent');

        if (!request) return res.status(404).send("Demande introuvable.");

        let targetDoc;
        if (request.targetType === 'Child') targetDoc = await Child.findById(request.targetId);
        if (request.targetType === 'Family') targetDoc = await Family.findById(request.targetId);

        let emailContentHtml = `<h3>Suite donnée à votre demande de modification</h3><ul>`;
        let allApproved = true;

        // On boucle sur chaque champ validé par le staff
        for (const reqField of request.fields) {
            const staffDecision = processedFields.find(pf => pf.fieldId === reqField._id.toString());
            
            if (staffDecision) {
                reqField.status = staffDecision.status;
                reqField.rejectionReason = staffDecision.rejectionReason || '';

                if (staffDecision.status === 'approved') {
                    // Si approuvé, on met à jour la vraie BDD
                    targetDoc[reqField.fieldKey] = reqField.newValue;
                    emailContentHtml += `<li>✅ <b>${reqField.fieldNameFr}</b> : Modification acceptée.</li>`;
                } else if (staffDecision.status === 'rejected') {
                    allApproved = false;
                    emailContentHtml += `<li>❌ <b>${reqField.fieldNameFr}</b> : Refusé. <i>Motif : ${staffDecision.rejectionReason}</i></li>`;
                }
            }
        }

        emailContentHtml += `</ul>`;
        if (allApproved) {
            emailContentHtml = `<h3>Toutes vos modifications ont été acceptées !</h3><p>Votre dossier est désormais à jour.</p>`;
        }

        request.globalStatus = 'processed';
        await targetDoc.save(); 
        await request.save();  

        // ENVOI DE L'EMAIL AU PARENT
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
            to: request.parent.email,
            subject: "Mise à jour de votre dossier Carillon",
            html: emailContentHtml
        });

        res.json({ success: true, message: "Demande traitée et email envoyé au parent." });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors du traitement de la demande." });
    }
});

module.exports = router;