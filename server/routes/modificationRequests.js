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

// 3. [STAFF] Récupérer TOUTES les demandes en attente (Sas de validation global)
router.get('/pending', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const requests = await ModificationRequest.find({ globalStatus: 'pending' })
            .populate('family', 'name')
            .populate('parent', 'email')
            .populate('targetId')
            .sort({ createdAt: -1 });
            
        res.json(requests);
    } catch (error) {
        console.error("ERREUR FETCH PENDING GLOBAL :", error);
        res.status(500).json({ error: "Erreur lors de la récupération globale des demandes." });
    }
});

// 4. [STAFF] Récupérer les demandes pour UNE famille spécifique
router.get('/family/:familyId', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const requests = await ModificationRequest.find({ family: req.params.familyId, globalStatus: 'pending' })
            .populate('targetId')
            .populate('parent', 'email');
        
        const formattedRequests = requests.map(req => {
            let summaryArray = [];
            req.fields.forEach(f => {
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

// 5. [STAFF] Traiter une demande CHAMP PAR CHAMP
router.post('/:id/process', auth(['admin', 'director', 'manager', 'responsable']), async (req, res) => {
    try {
        const { fieldId, status, rejectionReason } = req.body;
        
        const request = await ModificationRequest.findById(req.params.id).populate('targetId').populate('parent');
        if (!request) return res.status(404).send("Demande introuvable.");

        // Trouver le document cible (Enfant ou Famille)
        let targetDoc = request.targetType === 'Child' 
            ? await Child.findById(request.targetId) 
            : await Family.findById(request.targetId);

        // Trouver le champ spécifique dans la demande
        const field = request.fields.find(f => f._id.toString() === fieldId);
        if (!field) return res.status(404).send("Champ introuvable.");

        // 1. Mise à jour du statut du champ
        field.status = status;
        if (status === 'rejected') {
            field.rejectionReason = rejectionReason;
        } else if (status === 'approved') {
            // 2. Si approuvé, on met à jour la base de données
            targetDoc[field.fieldKey] = field.newValue;
            await targetDoc.save();
        }

        // 3. Vérifier si TOUS les champs de cette demande ont été traités
        const allFieldsProcessed = request.fields.every(f => f.status !== 'pending');

        if (allFieldsProcessed) {
            request.globalStatus = 'processed';
            
            // Préparation de l'email récapitulatif
            let emailHtml = `<h3>Bilan de vos demandes de modifications</h3><ul>`;
            request.fields.forEach(f => {
                if (f.status === 'approved') {
                    emailHtml += `<li>✅ <b>${f.fieldNameFr}</b> : Mise à jour acceptée.</li>`;
                } else if (f.status === 'rejected') {
                    emailHtml += `<li>❌ <b>${f.fieldNameFr}</b> : Refusée. <i>Motif : ${f.rejectionReason}</i></li>`;
                }
            });
            emailHtml += `</ul><p>Merci pour votre collaboration.</p>`;

            // Envoi de l'email
            const transporter = nodemailer.createTransport({
                service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
            });
            await transporter.sendMail({
                from: `"Portail Carillon" <${process.env.EMAIL_USER}>`,
                to: request.parent.email,
                subject: "Bilan de vos demandes de modification - Portail Famille",
                html: emailHtml
            }).catch(e => console.log("Erreur mail:", e));
        }

        await request.save();

        res.json({ success: true, allProcessed: allFieldsProcessed });
    } catch (error) {
        console.error("ERREUR PROCESS :", error);
        res.status(500).json({ error: "Erreur lors du traitement." });
    }
});

module.exports = router;