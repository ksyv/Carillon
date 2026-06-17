const express = require('express');
const router = express.Router();
const Child = require('../models/Child');
const Attendance = require('../models/Attendance');
const Billing = require('../models/Billing');
const Family = require('../models/Family');
const auth = require('../middleware/auth');

router.get('/report', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate || req.query.date;
    const end = endDate || req.query.date;
    const children = await Child.find()
        .sort({ lastName: 1, firstName: 1 })
        .populate('families')
        .populate('classGroup'); 

    const atts = await Attendance.find({ date: { $gte: start, $lte: end } });
    const billings = await Billing.find();

    const attendanceMap = {};
    atts.forEach(a => {
        const childObj = children.find(c => c._id.toString() === a.child.toString());
        if (!childObj) return; 
        
        const key = `${a.date}_${a.child.toString()}`;
        if (!attendanceMap[key]) {
            attendanceMap[key] = {
                type: 'ATTENDANCE', date: a.date, child: childObj,
                matin: false, midiAbsent: false, soir: false, checkOut: null, isLate: false, 
                matinId: null, midiId: null, pmId: null, 
                billTo: ''
            };
        }
        if (a.sessionType === 'MATIN') {
            attendanceMap[key].matin = true;
            attendanceMap[key].matinId = a._id; 
        }
        if (a.sessionType === 'MIDI') {
            attendanceMap[key].midiAbsent = true;
            attendanceMap[key].midiId = a._id; 
        }
        if (a.sessionType === 'SOIR') {
            attendanceMap[key].soir = true; 
            attendanceMap[key].checkOut = a.checkOut;
            attendanceMap[key].isLate = a.isLate; 
            attendanceMap[key].pmId = a._id;
        }
    });

    billings.forEach(b => {
        b.dates.forEach(d => {
            if (d >= start && d <= end) {
                const key = `${d}_${b.child.toString()}`;
                if (attendanceMap[key]) attendanceMap[key].billTo = b.billTo;
            }
        });
    });

    res.json({ children: children.map(c => ({ child: c })), attendances: Object.values(attendanceMap) });
});

router.get('/caf', auth(['admin']), async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } }).populate('child');
        let globalStats = { 
            matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            supplement: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
            total: { acts: 0, hours: 0 } 
        };
        let dailyStats = {};

        const uniqueTotal = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueMatin = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueSoir = { all: new Set(), under6: new Set(), over6: new Set() };
        const uniqueSupplement = { all: new Set(), under6: new Set(), over6: new Set() };

        attendances.forEach(att => {
            if (!att.child || !att.child.birthDate || att.child.category === 'Adulte') return; 
            const sessionDate = new Date(att.date);
            const birthDate = new Date(att.child.birthDate);
            let age = sessionDate.getFullYear() - birthDate.getFullYear();
            const m = sessionDate.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && sessionDate.getDate() < birthDate.getDate())) age--;
            const ageGroup = age < 6 ? 'under6' : 'over6';
            
            if (!dailyStats[att.date]) {
                dailyStats[att.date] = { 
                    date: att.date, 
                    matin: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }, 
                    soir: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } },
                    supplement: { under6: { acts: 0, hours: 0 }, over6: { acts: 0, hours: 0 } }
                };
            }
            const childId = att.child._id.toString();

            if (att.sessionType === 'MATIN') {
                uniqueTotal.all.add(childId); uniqueTotal[ageGroup].add(childId);
                uniqueMatin.all.add(childId); uniqueMatin[ageGroup].add(childId);
                globalStats.matin[ageGroup].acts += 1; globalStats.matin[ageGroup].hours += 1;
                globalStats.total.acts += 1; globalStats.total.hours += 1;
                dailyStats[att.date].matin[ageGroup].acts += 1; dailyStats[att.date].matin[ageGroup].hours += 1;
            } else if (att.sessionType === 'SOIR' && (att.checkOut || att.isLate)) {
                uniqueTotal.all.add(childId); uniqueTotal[ageGroup].add(childId);
                uniqueSoir.all.add(childId); uniqueSoir[ageGroup].add(childId);
                globalStats.soir[ageGroup].acts += 1; globalStats.soir[ageGroup].hours += 2;
                globalStats.total.acts += 1; globalStats.total.hours += 2;
                dailyStats[att.date].soir[ageGroup].acts += 1; dailyStats[att.date].soir[ageGroup].hours += 2;
                
                if (att.isLate) {
                    uniqueSupplement.all.add(childId); uniqueSupplement[ageGroup].add(childId);
                    globalStats.supplement[ageGroup].acts += 1; globalStats.supplement[ageGroup].hours += 0.5;
                    globalStats.total.acts += 1; globalStats.total.hours += 0.5;
                    dailyStats[att.date].supplement[ageGroup].acts += 1; dailyStats[att.date].supplement[ageGroup].hours += 0.5;
                }
            }
        });

        globalStats.uniqueChildren = {
            total: { all: uniqueTotal.all.size, under6: uniqueTotal.under6.size, over6: uniqueTotal.over6.size },
            matin: { all: uniqueMatin.all.size, under6: uniqueMatin.under6.size, over6: uniqueMatin.over6.size },
            soir: { all: uniqueSoir.all.size, under6: uniqueSoir.under6.size, over6: uniqueSoir.over6.size },
            supplement: { all: uniqueSupplement.all.size, under6: uniqueSupplement.under6.size, over6: uniqueSupplement.over6.size }
        };
        res.json({ global: globalStats, daily: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)) });
    } catch (e) { res.status(500).send('Erreur Stats CAF'); }
});

router.get('/cantine-1-euro', auth(['admin']), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 1. Récupération des enfants T1 et T2 (QF <= 1000) et hors Adultes
        const children = await Child.find({ active: true, category: { $ne: 'Adulte' } }).populate('families');
        const Settings = require('../models/Settings'); // On importe les settings pour les jours fermés
        
        const eligibleChildren = children.filter(c => {
            if (!c.families || c.families.length === 0) return false;
            const fam = c.families[0]; // On se base sur le dossier principal
            if (!fam.revenuReference || !fam.nombreParts) return false;
            const qf = Math.round((fam.revenuReference / 12) / fam.nombreParts);
            return qf >= 0 && qf <= 1000;
        });

        // 2. Détermination des jours d'école réels sur la période
        const closedDaysSetting = await Settings.findOne({ key: 'closed_days' });
        const closedDays = closedDaysSetting ? JSON.parse(closedDaysSetting.value) : [];
        const attendances = await Attendance.find({ date: { $gte: startDate, $lte: endDate } });
        const daysWithRealActivity = [...new Set(attendances.map(a => a.date))];
        
        let schoolDays = [];
        let start = new Date(startDate);
        let end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            // Lundi, Mardi, Jeudi, Vendredi + non fermé + activité détectée
            if ([1, 2, 4, 5].includes(d.getDay()) && !closedDays.includes(dateStr) && daysWithRealActivity.includes(dateStr)) {
                schoolDays.push(dateStr);
            }
        }

        const eligibleChildrenMap = new Map();
        const dailyMap = new Map();
        let totalMeals = 0;

        // 3. Croisement : Jours d'école vs Absences Midi
        eligibleChildren.forEach(child => {
            const fam = child.families[0];
            const qf = Math.round((fam.revenuReference / 12) / fam.nombreParts);
            
            schoolDays.forEach(date => {
                // S'il y a un pointage MIDI, l'enfant était ABSENT
                const isAbsent = attendances.some(a => a.child.toString() === child._id.toString() && a.date === date && a.sessionType === 'MIDI');
                
                if (!isAbsent) {
                    totalMeals++;
                    const childId = child._id.toString();
                    
                    if (!eligibleChildrenMap.has(childId)) {
                        eligibleChildrenMap.set(childId, {
                            _id: childId, firstName: child.firstName, lastName: child.lastName,
                            qf: qf, mealsCount: 0
                        });
                    }
                    eligibleChildrenMap.get(childId).mealsCount++;

                    if (!dailyMap.has(date)) dailyMap.set(date, 0);
                    dailyMap.set(date, dailyMap.get(date) + 1);
                }
            });
        });

        const childrenArray = Array.from(eligibleChildrenMap.values()).sort((a, b) => a.lastName.localeCompare(b.lastName));
        const dailyArray = Array.from(dailyMap.entries()).map(([date, meals]) => ({ date, meals })).sort((a, b) => a.date.localeCompare(b.date));

        res.json({ global: { totalMeals: totalMeals, uniqueChildrenCount: childrenArray.length }, children: childrenArray, daily: dailyArray });
    } catch (e) { 
        console.error("Erreur Stats Cantine 1€:", e);
        res.status(500).send("Erreur Stats Cantine 1€"); 
    }
});

router.post('/advanced', auth(['admin']), async (req, res) => {
    try {
        const { startDate, endDate, filters } = req.body;
        let attMatch = {};
        if (startDate && endDate) attMatch.date = { $gte: startDate, $lte: endDate };
        if (filters.sessions && filters.sessions.length > 0) attMatch.sessionType = { $in: filters.sessions };

        const pipeline = [
            { $match: attMatch },
            { $lookup: { from: 'children', localField: 'child', foreignField: '_id', as: 'childDoc' } },
            { $unwind: '$childDoc' },
            { $lookup: { from: 'families', localField: 'childDoc.families', foreignField: '_id', as: 'familyDocs' } },
            { $addFields: { primaryFamily: { $arrayElemAt: ['$familyDocs', 0] } } },
            { $addFields: {
                calcQf: {
                    $cond: {
                        if: { $and: ['$primaryFamily.revenuReference', '$primaryFamily.nombreParts'] },
                        then: { $round: [ { $divide: [ { $divide: ['$primaryFamily.revenuReference', 12] }, '$primaryFamily.nombreParts' ] }, 0 ] },
                        else: 0
                    }
                }
            }},
        ];

        let childMatch = {};
        if (filters.categories && filters.categories.length > 0) childMatch['childDoc.category'] = { $in: filters.categories };
        if (filters.regimes && filters.regimes.length > 0) childMatch['childDoc.regimeAlimentaire'] = { $in: filters.regimes };
        if (filters.hasPAI !== '') childMatch['childDoc.hasPAI'] = filters.hasPAI === 'true';
        if (filters.minQf !== '' || filters.maxQf !== '') {
            childMatch.calcQf = {};
            if (filters.minQf !== '') childMatch.calcQf.$gte = Number(filters.minQf);
            if (filters.maxQf !== '') childMatch.calcQf.$lte = Number(filters.maxQf);
        }
        if (filters.minAge !== '' || filters.maxAge !== '') {
            childMatch['childDoc.birthDate'] = {};
            const today = new Date();
            if (filters.minAge !== '') {
                const maxDate = new Date(today.getFullYear() - Number(filters.minAge), today.getMonth(), today.getDate());
                childMatch['childDoc.birthDate'].$lte = maxDate; 
            }
            if (filters.maxAge !== '') {
                const minDate = new Date(today.getFullYear() - Number(filters.maxAge) - 1, today.getMonth(), today.getDate() + 1);
                childMatch['childDoc.birthDate'].$gte = minDate; 
            }
        }
        if (filters.droitImage !== '') childMatch['childDoc.droitImage'] = filters.droitImage === 'true';
        if (filters.autorisationSortieSeul !== '') childMatch['childDoc.autorisationSortieSeul'] = filters.autorisationSortieSeul === 'true';
        if (filters.lunettes !== '') childMatch['childDoc.medical.lunettes'] = filters.lunettes === 'true';

        if (Object.keys(childMatch).length > 0) pipeline.push({ $match: childMatch });

        pipeline.push({
            $facet: {
                totals: [{ $count: "count" }],
                byDay: [{ $group: { _id: "$date", count: { $sum: 1 } } }, { $sort: { _id: 1 } }],
                bySession: [{ $group: { _id: "$sessionType", count: { $sum: 1 } } }, { $sort: { count: -1 } }],
                byCategory: [{ $group: { _id: "$childDoc.category", count: { $sum: 1 } } }],
                byRegime: [{ $match: { sessionType: 'MIDI' } }, { $group: { _id: "$childDoc.regimeAlimentaire", count: { $sum: 1 } } }],
                rawDetails: [
                    { $project: {
                        _id: 1, date: 1, sessionType: 1, lastName: "$childDoc.lastName", firstName: "$childDoc.firstName", category: "$childDoc.category",
                        birthDate: "$childDoc.birthDate", regimeAlimentaire: "$childDoc.regimeAlimentaire", hasPAI: "$childDoc.hasPAI", droitImage: "$childDoc.droitImage",
                        autorisationSortieSeul: "$childDoc.autorisationSortieSeul", medical: "$childDoc.medical", qf: "$calcQf", familyName: "$primaryFamily.name"
                    }},
                    { $sort: { date: -1, lastName: 1 } }
                ]
            }
        });

        const result = await Attendance.aggregate(pipeline);
        res.json(result[0]);
    } catch (e) { res.status(500).send("Erreur Stats"); }
});

module.exports = router;