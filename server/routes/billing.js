const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
const Invoice = require('../models/Invoice'); 
const Tariff = require('../models/Tariff');
const Family = require('../models/Family');
const Child = require('../models/Child');
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');


router.get('/child/:childId', auth(['admin']), async (req, res) => {
    const rules = await Billing.find({ child: req.params.childId }).populate('billToFamily');
    res.json(rules);
});

router.post('/', auth(['admin']), async (req, res) => {
    try {
        const { childId, billToFamily, dates } = req.body;
        const rule = new Billing({ child: childId, billToFamily, dates });
        await rule.save();
        res.json(rule);
    } catch (e) { res.status(500).send("Erreur enregistrement règle."); }
});

router.delete('/:id', auth(['admin']), async (req, res) => {
    await Billing.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});


// NOUVEAU : Récupérer les factures sauvegardées pour une période
router.get('/invoices', auth(['admin']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const invoices = await Invoice.find({ periodStart: startDate, periodEnd: endDate }).sort({ payeur: 1 });
        res.json(invoices);
    } catch (e) { res.status(500).send("Erreur lecture factures."); }
});


// MODIFIÉ : Générer ET sauvegarder la facturation
router.post('/generate', auth(['admin']), async (req, res) => {
    const { startDate, endDate, forceOverwrite } = req.body;
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");

    try {
        // 1. VÉRIFICATION ANTI-DOUBLON
        const existingInvoices = await Invoice.find({ periodStart: startDate, periodEnd: endDate });
        
        if (existingInvoices.length > 0) {
            // Si on a des factures publiées, on bloque totalement l'écrasement (Sécurité niveau 2 pour plus tard)
            if (existingInvoices.some(inv => inv.status === 'published')) {
                return res.status(403).json({ error: 'PUBLISHED_EXISTS', message: "Des factures sont déjà publiées/verrouillées sur cette période." });
            }
            // Si brouillons mais pas de confirmation d'écrasement
            if (!forceOverwrite) {
                return res.status(409).json({ error: 'ALREADY_EXISTS', message: "Une facturation existe déjà pour cette période." });
            }
            // Si confirmation : on supprime les anciens brouillons
            await Invoice.deleteMany({ periodStart: startDate, periodEnd: endDate, status: 'draft' });
        }

        // 2. LE CALCUL (Ton moteur d'origine optimisé pour garder l'ID Famille)
        const tariffs = await Tariff.find();
        const families = await Family.find();
        const children = await Child.find({ active: true });
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } });
        const alternateBillings = await Billing.find({ dates: { $elemMatch: { $gte: startDate, $lte: endDate } } });
        const closedDaysSetting = await Settings.findOne({ key: 'closed_days' });
        const closedDays = closedDaysSetting ? JSON.parse(closedDaysSetting.value) : [];

        const tariffMap = tariffs.reduce((acc, t) => ({ ...acc, [t.activityCode]: t }), {});
        const childrenInFamily = children.reduce((acc, c) => {
            if (!c.families) return acc;
            c.families.forEach(fId => { const id = fId.toString(); acc[id] = (acc[id] || 0) + 1; });
            return acc;
        }, {});

        const daysWithRealActivity = [...new Set(attendances.map(a => a.date))];
        let schoolDays = [];
        let start = new Date(startDate);
        let end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if ([1, 2, 4, 5].includes(d.getDay()) && !closedDays.includes(dateStr) && daysWithRealActivity.includes(dateStr)) schoolDays.push(dateStr);
        }

        let invoiceDrafts = {};
        
        // NOUVEAU: on structure le brouillon pour la BDD (avec l'ID family)
        const initInvoice = (familyId, pNom) => { 
            if (!invoiceDrafts[familyId]) {
                invoiceDrafts[familyId] = { 
                    family: familyId, 
                    payeur: pNom, 
                    periodStart: startDate, 
                    periodEnd: endDate,
                    items: {}, 
                    totalGlobal: 0 
                }; 
            } 
        };
        
        const calculateUnitPrice = (rule, fratrieCount, qf) => {
            if (rule.pricingMode === 'FIXED') return rule.fixedPrice || 0;
            if (rule.pricingMode === 'QF_BRACKETS') {
                const b = rule.qfBrackets.find(x => qf >= x.min && qf <= x.max); return b ? b.price : 0;
            }
            if (rule.pricingMode === 'TAUX_EFFORT') {
                const rateRule = rule.effortRates.find(r => r.childrenCount === fratrieCount) || rule.effortRates[0];
                if (rateRule) return Math.max(rateRule.min, Math.min(rateRule.max, qf * rateRule.rate));
            }
            return 0;
        };

        // ... CANTINE ...
        children.forEach(child => {
            if (!child.families || child.families.length === 0) return;
            let targetCode = child.regimeAlimentaire === 'PAI' ? 'CA1_PAI' : 'CA1';
            let label = child.regimeAlimentaire === 'PAI' ? 'Cantine (Tarif PAI)' : 'Cantine (Repas Enfant)';
            if (child.category === 'Adulte') { targetCode = 'REPAS_ADULTE'; label = 'Cantine (Repas Enseignant)'; }

            const rule = tariffMap[targetCode]; if (!rule) return;

            schoolDays.forEach(date => {
                let shouldBill = false;
                if (child.category === 'Adulte') {
                    shouldBill = attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI_ADULTE');
                } else {
                    shouldBill = !attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI');
                }

                if (shouldBill) {
                    const alt = alternateBillings.find(b => b.child.toString() === child._id.toString() && b.dates.includes(date));
                    let billedFamilyId = child.families[0].toString();
                    if (alt && alt.billToFamily) billedFamilyId = alt.billToFamily.toString();
                    
                    const targetFamily = families.find(f => f._id.toString() === billedFamilyId);
                    if (!targetFamily) return;

                    const fratrieCount = childrenInFamily[targetFamily._id.toString()] || 1;
                    const qf = targetFamily.quotientFamilial || 0;
                    let pNom = `${targetFamily.name} (Dossier n°${targetFamily.cafNumber || 'Sans'})`;
                    if (alt) pNom = `Garde Alternée : ${targetFamily.name} (Enfant: ${child.firstName})`;
                    
                    initInvoice(targetFamily._id.toString(), pNom);
                    const price = calculateUnitPrice(rule, fratrieCount, qf);
                    
                    if (!invoiceDrafts[targetFamily._id].items[targetCode]) invoiceDrafts[targetFamily._id].items[targetCode] = { code: targetCode, label, unitPrice: price, count: 0, total: 0 };
                    invoiceDrafts[targetFamily._id].items[targetCode].count += 1;
                    invoiceDrafts[targetFamily._id].items[targetCode].total += price;
                    invoiceDrafts[targetFamily._id].totalGlobal += price;
                }
            });
        });

        // ... APS ...
        attendances.forEach(att => {
            if (att.sessionType === 'MIDI' || att.sessionType === 'MIDI_ADULTE' || closedDays.includes(att.date)) return;
            const child = children.find(c => c._id.toString() === att.child.toString());
            if (!child || child.category === 'Adulte' || !child.families || child.families.length === 0) return;

            const alt = alternateBillings.find(b => b.child.toString() === child._id.toString() && b.dates.includes(att.date));
            let billedFamilyId = child.families[0].toString();
            if (alt && alt.billToFamily) billedFamilyId = alt.billToFamily.toString();

            const targetFamily = families.find(f => f._id.toString() === billedFamilyId);
            if (!targetFamily) return;

            const fratrieCount = childrenInFamily[targetFamily._id.toString()] || 1;
            const qf = targetFamily.quotientFamilial || 0;

            let pNom = `${targetFamily.name} (Dossier n°${targetFamily.cafNumber || 'Sans'})`;
            if (alt) pNom = `Garde Alternée : ${targetFamily.name} (Enfant: ${child.firstName})`;

            initInvoice(targetFamily._id.toString(), pNom);
            let targetCode = att.sessionType === 'MATIN' ? 'CA2_MATIN' : (att.isLate ? 'CA2_SUPP' : 'CA2_SOIR');
            let label = att.sessionType === 'MATIN' ? 'APS Matin' : (att.isLate ? 'Supplément Fin de Soirée' : 'APS Soir (16h30-18h30)');
            const rule = tariffMap[targetCode]; if (!rule) return;

            const price = calculateUnitPrice(rule, fratrieCount, qf);
            if (!invoiceDrafts[targetFamily._id].items[targetCode]) invoiceDrafts[targetFamily._id].items[targetCode] = { code: targetCode, label, unitPrice: price, count: 0, total: 0 };
            invoiceDrafts[targetFamily._id].items[targetCode].count += 1;
            invoiceDrafts[targetFamily._id].items[targetCode].total += price;
            invoiceDrafts[targetFamily._id].totalGlobal += price;
        });

        // 3. PRÉPARATION ET SAUVEGARDE EN BDD
        const exercice = startDate.split('-')[0];
        let refCounter = 1;
        
        const finalInvoices = Object.values(invoiceDrafts)
            .filter(d => d.totalGlobal > 0)
            .map(d => {
                const invoiceDoc = {
                    ...d,
                    reference: `${exercice}21000${String(refCounter++).padStart(4, '0')}`,
                    items: Object.values(d.items),
                    totalGlobal: Number(d.totalGlobal.toFixed(2))
                };
                return invoiceDoc;
            });

        // On sauvegarde tout en bloc !
        const savedInvoices = await Invoice.insertMany(finalInvoices);
        res.json(savedInvoices);

    } catch (e) { 
        console.error(e);
        res.status(500).send("Erreur génération facturation."); 
    }
});

module.exports = router;