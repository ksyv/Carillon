const express = require('express');
const router = express.Router();
const ModificationRequest = require('../models/ModificationRequest');
const Child = require('../models/Child');
const Family = require('../models/Family');
const Parent = require('../models/Parent');
const auth = require('../middleware/auth');

const createModificationRequest = async ({ familyId, childId = null, portalCode, newData, changeSummary = '' }) => {
    const effectiveFamilyId = familyId?.toString?.() || familyId;
    if (!effectiveFamilyId) throw new Error('Famille manquante');

    let oldData = null;
    let requestType = childId ? 'CHILD_UPDATE' : 'FAMILY_UPDATE';
    const changes = [];

    if (childId) {
        const child = await Child.findById(childId).lean();
        if (!child) throw new Error('Enfant introuvable');
        if (child.families && !child.families.some(f => f.toString() === effectiveFamilyId.toString())) {
            throw new Error('Cet enfant ne dépend pas de votre famille.');
        }
        oldData = child;

        const compare = (label, key) => {
            if (oldData?.[key] !== newData?.[key]) {
                changes.push(`${label} : ${oldData?.[key] ?? 'vide'} → ${newData?.[key] ?? 'vide'}`);
            }
        };

        compare('Prénom', 'firstName');
        compare('Nom', 'lastName');
        compare('Date de naissance', 'birthDate');
        compare('Catégorie', 'category');
        compare('Sexe', 'sexe');
        compare('Régime alimentaire', 'regimeAlimentaire');
        compare('Note permanente', 'persistentNote');
        if ((oldData.medical?.autresInfos || '') !== (newData.medical?.autresInfos || '')) {
            changes.push(`Autres infos médicales : ${oldData.medical?.autresInfos || 'vide'} → ${newData.medical?.autresInfos || 'vide'}`);
        }
    } else {
        oldData = await Family.findById(effectiveFamilyId).lean();
        if (!oldData) throw new Error('Famille introuvable');

        const compare = (label, key) => {
            if (oldData?.[key] !== newData?.[key]) {
                changes.push(`${label} : ${oldData?.[key] ?? 'vide'} → ${newData?.[key] ?? 'vide'}`);
            }
        };

        compare('Revenu', 'revenuReference');
        compare('Parts', 'nombreParts');
        compare('Payeur', 'payeur');

        if (newData.responsables && oldData.responsables) {
            newData.responsables.forEach((resp, i) => {
                const old = oldData.responsables[i] || {};
                if (resp.phoneMobile !== old.phoneMobile) changes.push(`Resp ${i+1} Tel : ${old.phoneMobile || 'vide'} → ${resp.phoneMobile || 'vide'}`);
                if (resp.email !== old.email) changes.push(`Resp ${i+1} Email : ${old.email || 'vide'} → ${resp.email || 'vide'}`);
            });
        }
    }

    const finalSummary = changeSummary && changeSummary.trim()
        ? changeSummary.trim()
        : (changes.length > 0 ? changes.join(' | ') : 'Modifications générales');

    const request = new ModificationRequest({
        familyId: effectiveFamilyId,
        childId,
        portalCode: portalCode || 'PORTAIL',
        newData,
        originalData: oldData,
        oldData,
        changeSummary: finalSummary,
        type: requestType,
        status: 'PENDING'
    });

    await request.save();
    return request;
};

router.post('/requests', auth(), async (req, res) => {
    try {
        const { familyId, childId, portalCode, newData, changeSummary } = req.body;
        const parent = req.user.role === 'parent' ? await Parent.findById(req.user.id) : null;
        const effectiveFamilyId = familyId || parent?.family?.toString?.() || parent?.family;

        if (!effectiveFamilyId) return res.status(400).send('Famille manquante');
        if (req.user.role === 'parent' && parent && parent.family && parent.family.toString() !== effectiveFamilyId.toString()) {
            return res.status(403).send('Interdit');
        }

        const request = await createModificationRequest({ familyId: effectiveFamilyId, childId, portalCode, newData, changeSummary });
        res.status(201).json(request);
    } catch (e) { res.status(500).send(e.message || 'Erreur serveur'); }
});

router.post('/parent/requests/family', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send('Interdit');
        const request = await createModificationRequest({
            familyId: req.user.familyId, portalCode: req.body.portalCode, newData: req.body.newData || {}, changeSummary: req.body.changeSummary || ''
        });
        res.status(201).json(request);
    } catch (e) { res.status(500).send(e.message || 'Erreur serveur'); }
});

router.post('/parent/requests/children/:id', auth(), async (req, res) => {
    try {
        if (req.user.role !== 'parent') return res.status(403).send('Interdit');
        const request = await createModificationRequest({
            familyId: req.user.familyId, childId: req.params.id, portalCode: req.body.portalCode, newData: req.body.newData || {}, changeSummary: req.body.changeSummary || ''
        });
        res.status(201).json(request);
    } catch (e) { res.status(500).send(e.message || 'Erreur serveur'); }
});

router.get('/requests/family/:familyId', auth(), async (req, res) => {
    const requests = await ModificationRequest.find({ familyId: req.params.familyId, status: 'PENDING' }).sort({ createdAt: -1 });
    res.json(requests);
});

router.post('/requests/:id/approve', auth(['admin']), async (req, res) => {
    try {
        const request = await ModificationRequest.findById(req.params.id);
        let updated = null;
        if (request.type === 'CHILD_UPDATE' && request.childId) {
            updated = await Child.findByIdAndUpdate(request.childId, request.newData, { new: true }).populate('families');
            request.status = 'APPROVED'; await request.save();
            return res.json({ success: true, child: updated });
        } else {
            updated = await Family.findByIdAndUpdate(request.familyId, request.newData, { new: true });
            request.status = 'APPROVED'; await request.save();
            return res.json({ success: true, family: updated });
        }
    } catch (e) { res.status(500).send("Erreur."); }
});

router.post('/requests/:id/reject', auth(['admin']), async (req, res) => {
    try {
        await ModificationRequest.findByIdAndUpdate(req.params.id, { status: 'REJECTED', refusalMessage: req.body.message });
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur."); }
});

router.get('/requests/pending-count', auth(['admin', 'responsable']), async (req, res) => {
    const count = await ModificationRequest.countDocuments({ status: 'PENDING' });
    res.json({ count });
});

module.exports = router;