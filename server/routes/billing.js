const express = require('express');
const router = express.Router();
const Billing = require('../models/Billing');
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

router.get('/calculate', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.status(400).send("Dates manquantes");
    try {
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
            c.families.forEach(fId => {
                const id = fId.toString();
                acc[id] = (acc[id] || 0) + 1;
            });
            return acc;
        }, {});

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
        const initInvoice = (p) => { if (!invoiceDrafts[p]) invoiceDrafts[p] = { payeur: p, items: {}, totalGlobal: 0 }; };
        
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

        // Restauration scolaire (Midi)
        children.forEach(child => {
            if (!child.families || child.families.length === 0) return;
            
            let targetCode = child.regimeAlimentaire === 'PAI' ? 'CA1_PAI' : 'CA1';
            let label = child.regimeAlimentaire === 'PAI' ? 'Cantine (Tarif PAI)' : 'Cantine (Repas Enfant)';
            
            if (child.category === 'Adulte') {
                targetCode = 'REPAS_ADULTE'; 
                label = 'Cantine (Repas Enseignant/Personnel)';
            }

            const rule = tariffMap[targetCode]; if (!rule) return;

            schoolDays.forEach(date => {
                let shouldBill = false;

                if (child.category === 'Adulte') {
                    const isPresent = attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI_ADULTE');
                    shouldBill = isPresent;
                } else {
                    const isAbsent = attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI');
                    shouldBill = !isAbsent;
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
                    
                    initInvoice(pNom);
                    const price = calculateUnitPrice(rule, fratrieCount, qf);
                    if (!invoiceDrafts[pNom].items[targetCode]) invoiceDrafts[pNom].items[targetCode] = { label, unitPrice: price, count: 0, total: 0 };
                    invoiceDrafts[pNom].items[targetCode].count += 1;
                    invoiceDrafts[pNom].items[targetCode].total += price;
                    invoiceDrafts[pNom].totalGlobal += price;
                }
            });
        });

        // APS Matin et Soir
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

            initInvoice(pNom);
            let targetCode = att.sessionType === 'MATIN' ? 'CA2_MATIN' : (att.isLate ? 'CA2_SUPP' : 'CA2_SOIR');
            let label = att.sessionType === 'MATIN' ? 'APS Matin' : (att.isLate ? 'Supplément Fin de Soirée' : 'APS Soir (16h30-18h30)');
            const rule = tariffMap[targetCode]; if (!rule) return;

            const price = calculateUnitPrice(rule, fratrieCount, qf);
            if (!invoiceDrafts[pNom].items[targetCode]) invoiceDrafts[pNom].items[targetCode] = { label, unitPrice: price, count: 0, total: 0 };
            invoiceDrafts[pNom].items[targetCode].count += 1;
            invoiceDrafts[pNom].items[targetCode].total += price;
            invoiceDrafts[pNom].totalGlobal += price;
        });

        const result = Object.values(invoiceDrafts).map(d => ({ ...d, items: Object.values(d.items), totalGlobal: Number(d.totalGlobal.toFixed(2)) })).filter(d => d.totalGlobal > 0);
        res.json(result);
    } catch (e) { res.status(500).send("Erreur calcul."); }
});

module.exports = router;