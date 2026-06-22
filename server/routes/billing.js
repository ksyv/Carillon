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

// 1. RÉCUPÉRER LES RÈGLES DE GARDE ALTERNÉE D'UN ENFANT
router.get('/child/:childId', auth(['admin']), async (req, res) => {
    try {
        const rules = await Billing.find({ child: req.params.childId }).populate('billToFamily').lean();
        res.json(rules);
    } catch (e) {
        res.status(500).send("Erreur de récupération des règles.");
    }
});

// 2. CRÉER UNE RÈGLE DE GARDE ALTERNÉE
router.post('/', auth(['admin']), async (req, res) => {
    try {
        const { childId, billToFamily, dates } = req.body;
        const rule = new Billing({ child: childId, billToFamily, dates });
        await rule.save();
        res.json(rule);
    } catch (e) { 
        res.status(500).send("Erreur enregistrement règle."); 
    }
});

// 3. SUPPRIMER UNE RÈGLE DE GARDE ALTERNÉE
router.delete('/:id', auth(['admin']), async (req, res) => {
    try {
        await Billing.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).send("Erreur de suppression.");
    }
});

// 4. RÉCUPÉRER LES FACTURES SAUVEGARDÉES POUR UNE PÉRIODE DONNÉE
router.get('/invoices', auth(['admin']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const invoices = await Invoice.find({ 
            periodStart: startDate, 
            periodEnd: endDate 
        }).sort({ payeur: 1 }).lean();
        res.json(invoices);
    } catch (e) { 
        res.status(500).send("Erreur lecture factures."); 
    }
});

// 5. GÉNÉRER, CALCULER ET SAUVEGARDER LA FACTURATION MENSUELLE
router.post('/generate', auth(['admin']), async (req, res) => {
    const { startDate, endDate, forceOverwrite } = req.body;
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");

    try {
        // A. Contrôle anti-doublon et verrouillage de sécurité
        const existingInvoices = await Invoice.find({ periodStart: startDate, periodEnd: endDate }).lean();
        
        if (existingInvoices.length > 0) {
            if (existingInvoices.some(inv => inv.status === 'published')) {
                return res.status(403).json({ 
                    error: 'PUBLISHED_EXISTS', 
                    message: "Des factures sont déjà publiées/verrouillées sur cette période." 
                });
            }
            if (!forceOverwrite) {
                return res.status(409).json({ 
                    error: 'ALREADY_EXISTS', 
                    message: "Une facturation existe déjà pour cette période." 
                });
            }
            await Invoice.deleteMany({ periodStart: startDate, periodEnd: endDate, status: 'draft' });
        }

        // B. Chargement des données nécessaires au calcul (.lean() pour casser les instances MongoDB)
        const tariffs = await Tariff.find().lean();
        const families = await Family.find().lean();
        const children = await Child.find({ active: true }).lean();
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } }).lean();
        const alternateBillings = await Billing.find({ dates: { $elemMatch: { $gte: startDate, $lte: endDate } } }).lean();
        const closedDaysSetting = await Settings.findOne({ key: 'closed_days' }).lean();
        const closedDays = closedDaysSetting ? JSON.parse(closedDaysSetting.value) : [];

        const tariffMap = tariffs.reduce((acc, t) => ({ ...acc, [t.activityCode]: t }), {});
        
        // Calcul du nombre d'enfants par fratrie active dans chaque famille
        const childrenInFamily = children.reduce((acc, c) => {
            if (!c.families) return acc;
            c.families.forEach(fId => { 
                const id = fId.toString(); 
                acc[id] = (acc[id] || 0) + 1; 
            });
            return acc;
        }, {});

        // Extraction des jours réels d'activité scolaire
        const daysWithRealActivity = [...new Set(attendances.map(a => a.date))];
        let schoolDays = [];
        let start = new Date(startDate);
        let end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if ([1, 2, 4, 5].includes(d.getDay()) && !closedDays.includes(dateStr) && daysWithRealActivity.includes(dateStr)) {
                schoolDays.push(dateStr);
            }
        }

        let invoiceDrafts = {};
        
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
                const b = rule.qfBrackets.find(x => qf >= x.min && qf <= x.max); 
                return b ? b.price : 0;
            }
            if (rule.pricingMode === 'TAUX_EFFORT') {
                const rateRule = rule.effortRates.find(r => r.childrenCount === fratrieCount) || rule.effortRates[0];
                if (rateRule) return Math.max(rateRule.min, Math.min(rateRule.max, qf * rateRule.rate));
            }
            return 0;
        };

        // --- SECTION 1 : RESTAURATION SCOLAIRE (CANTINE) ---
        children.forEach(child => {
            if (!child.families || child.families.length === 0) return;
            
            let targetCode = child.regimeAlimentaire === 'PAI' ? 'CA1_PAI' : 'CA1';
            let label = child.regimeAlimentaire === 'PAI' ? 'Cantine (Tarif PAI)' : 'Cantine (Repas Enfant)';
            if (child.category === 'Adulte') { 
                targetCode = 'REPAS_ADULTE'; 
                label = 'Cantine (Repas Enseignant)'; 
            }

            const rule = tariffMap[targetCode]; 
            if (!rule) return;

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

                    const famIdStr = targetFamily._id.toString();
                    const fratrieCount = childrenInFamily[famIdStr] || 1;
                    const qf = targetFamily.quotientFamilial || 0;
                    
                    let pNom = targetFamily.name;
                    if (alt) pNom = `Garde Alternée : ${targetFamily.name} (Enfant: ${child.firstName})`;
                    
                    initInvoice(famIdStr, pNom);
                    const price = calculateUnitPrice(rule, fratrieCount, qf);
                    
                    const childIdStr = child._id.toString();
                    const itemKey = `${childIdStr}_${targetCode}`;
                    const formattedDate = date.split('-')[2] + '/' + date.split('-')[1];
                    
                    if (!invoiceDrafts[famIdStr].items[itemKey]) {
                        invoiceDrafts[famIdStr].items[itemKey] = { 
                            childName: `${child.firstName} ${child.lastName.toUpperCase()}`,
                            code: targetCode, 
                            label, 
                            unitPrice: price, 
                            count: 0, 
                            total: 0,
                            dates: [] 
                        };
                    }
                    
                    if (!invoiceDrafts[famIdStr].items[itemKey].dates.includes(formattedDate)) {
                        invoiceDrafts[famIdStr].items[itemKey].count += 1;
                        invoiceDrafts[famIdStr].items[itemKey].total += price;
                        invoiceDrafts[famIdStr].items[itemKey].dates.push(formattedDate);
                        invoiceDrafts[famIdStr].totalGlobal += price;
                    }
                }
            });
        });

        // --- SECTION 2 : ACCUEIL PÉRISCOLAIRE (APS MATIN & SOIR + 19H) ---
        attendances.forEach(att => {
            if (att.sessionType === 'MIDI' || att.sessionType === 'MIDI_ADULTE' || closedDays.includes(att.date)) return;
            
            const childIdStr = att.child.toString();
            const child = children.find(c => c._id.toString() === childIdStr);
            if (!child || child.category === 'Adulte' || !child.families || child.families.length === 0) return;

            const alt = alternateBillings.find(b => b.child.toString() === childIdStr && b.dates.includes(att.date));
            
            let billedFamilyId = child.families[0].toString();
            if (alt && alt.billToFamily) billedFamilyId = alt.billToFamily.toString();
            
            const targetFamily = families.find(f => f._id.toString() === billedFamilyId);
            if (!targetFamily) return;

            const famIdStr = targetFamily._id.toString(); 
            const fratrieCount = childrenInFamily[famIdStr] || 1;
            const qf = targetFamily.quotientFamilial || 0;
            
            let pNom = targetFamily.name;
            if (alt) pNom = `Garde Alternée : ${targetFamily.name} (Enfant: ${child.firstName})`;
            
            initInvoice(famIdStr, pNom);

            // GESTION DU CUMUL : On liste les prestations déclenchées par ce pointage
            let activitiesToBill = [];
            if (att.sessionType === 'MATIN') {
                activitiesToBill.push({ code: 'CA2_MATIN', label: 'APS Matin' });
            } else if (att.sessionType === 'SOIR') {
                activitiesToBill.push({ code: 'CA2_SOIR', label: 'APS Soir (16h30-18h30)' });
                if (att.isLate) {
                    activitiesToBill.push({ code: 'CA2_SUPP', label: 'Supplément 19h' });
                }
            }

            activitiesToBill.forEach(act => {
                const rule = tariffMap[act.code];
                if (!rule) return;

                const price = calculateUnitPrice(rule, fratrieCount, qf);
                
                // Clé de groupement 100% String-safe par Enfant et par Prestation
                const itemKey = `${childIdStr}_${act.code}`; 
                const formattedDate = att.date.split('-')[2] + '/' + att.date.split('-')[1];

                if (!invoiceDrafts[famIdStr].items[itemKey]) {
                    invoiceDrafts[famIdStr].items[itemKey] = { 
                        childName: `${child.firstName} ${child.lastName.toUpperCase()}`,
                        code: act.code, 
                        label: act.label, 
                        unitPrice: price, 
                        count: 0, 
                        total: 0,
                        dates: [] 
                    };
                }
                
                // On incrémente uniquement si la date n'est pas déjà dans le tableau de cet enfant
                if (!invoiceDrafts[famIdStr].items[itemKey].dates.includes(formattedDate)) {
                    invoiceDrafts[famIdStr].items[itemKey].count += 1;
                    invoiceDrafts[famIdStr].items[itemKey].total += price;
                    invoiceDrafts[famIdStr].items[itemKey].dates.push(formattedDate);
                    invoiceDrafts[famIdStr].totalGlobal += price;
                }
            });
        });

        // C. Aplatissement des dictionnaires et insertion finale en BDD
        const exercice = startDate.split('-')[0];
        let refCounter = 1;
        
        const finalInvoices = Object.values(invoiceDrafts)
            .filter(d => d.totalGlobal > 0)
            .map(d => {
                return {
                    ...d,
                    reference: `${exercice}21000${String(refCounter++).padStart(4, '0')}`,
                    items: Object.values(d.items),
                    totalGlobal: Number(d.totalGlobal.toFixed(2))
                };
            });

        const savedInvoices = await Invoice.insertMany(finalInvoices);
        res.json(savedInvoices);

    } catch (e) { 
        console.error(e);
        res.status(500).send("Erreur génération facturation."); 
    }
});

// 6. VERROUILLER ET PUBLIER LES FACTURES D'UNE PÉRIODE (REND VISIBLE AUX PARENTS)
router.put('/publish', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");

    try {
        const result = await Invoice.updateMany(
            { periodStart: startDate, periodEnd: endDate, status: 'draft' },
            { $set: { status: 'published' } }
        );

        res.json({ 
            success: true, 
            message: `${result.modifiedCount} factures publiées avec succès.`,
            modifiedCount: result.modifiedCount
        });
    } catch (e) { 
        console.error("Erreur lors de la publication:", e);
        res.status(500).send("Erreur lors de la publication des factures."); 
    }
});

module.exports = router;