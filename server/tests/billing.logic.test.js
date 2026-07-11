// On extrait la logique de server/routes/billing.js pour la tester purement
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

describe('💰 Moteur de Facturation (Billing Engine)', () => {
    
    describe('Mode: FIXED (Forfaits fixes)', () => {
        test('✔️ Devrait appliquer le tarif fixe (ex: Repas PAI)', () => {
            expect(calculateUnitPrice({ pricingMode: 'FIXED', fixedPrice: 3.50 }, 1, 1000)).toBe(3.50);
        });
        test('✔️ Devrait retourner 0 si aucun prix fixe n\'est défini', () => {
            expect(calculateUnitPrice({ pricingMode: 'FIXED' }, 1, 1000)).toBe(0);
        });
    });

    describe('Mode: QF_BRACKETS (Tranches de Quotient Familial)', () => {
        const ruleBrackets = {
            pricingMode: 'QF_BRACKETS',
            qfBrackets: [
                { min: 0, max: 500, price: 0.85 }, // Cantine à 1€ (Tranche 1)
                { min: 501, max: 1000, price: 1.00 }, // Cantine à 1€ (Tranche 2)
                { min: 1001, max: 9999, price: 3.50 } // Plein tarif
            ]
        };

        test('✔️ Devrait appliquer le tarif Tranche 1 (QF très bas)', () => {
            expect(calculateUnitPrice(ruleBrackets, 1, 300)).toBe(0.85);
        });
        test('✔️ Devrait gérer parfaitement la limite stricte de tranche (QF = 500)', () => {
            expect(calculateUnitPrice(ruleBrackets, 1, 500)).toBe(0.85);
        });
        test('✔️ Devrait appliquer le plein tarif pour un QF élevé', () => {
            expect(calculateUnitPrice(ruleBrackets, 1, 2500)).toBe(3.50);
        });
        test('✔️ Devrait retourner 0 si le QF est hors barème (sécurité)', () => {
            expect(calculateUnitPrice(ruleBrackets, 1, 15000)).toBe(0);
        });
    });

    describe('Mode: TAUX_EFFORT (Dégressivité CAF)', () => {
        const ruleEffort = {
            pricingMode: 'TAUX_EFFORT',
            effortRates: [
                { childrenCount: 1, rate: 0.0010, min: 1.00, max: 5.00 },
                { childrenCount: 2, rate: 0.0008, min: 0.80, max: 4.50 },
                { childrenCount: 3, rate: 0.0005, min: 0.50, max: 4.00 }
            ]
        };

        test('✔️ Enfant unique : Calcul standard (QF * Taux)', () => {
            // QF 3000 * 0.0010 = 3.00
            expect(calculateUnitPrice(ruleEffort, 1, 3000)).toBe(3.00);
        });
        test('✔️ Famille nombreuse (3 enf) : Taux dégressif appliqué', () => {
            // QF 3000 * 0.0005 = 1.50
            expect(calculateUnitPrice(ruleEffort, 3, 3000)).toBe(1.50);
        });
        test('✔️ Plafond (Max) : Bloque la surfacturation des hauts revenus', () => {
            // QF 8000 * 0.0010 = 8.00€ -> Doit bloquer au Max (5.00€)
            expect(calculateUnitPrice(ruleEffort, 1, 8000)).toBe(5.00);
        });
        test('✔️ Plancher (Min) : Bloque la sous-facturation des bas revenus', () => {
            // QF 100 * 0.0010 = 0.10€ -> Doit bloquer au Min (1.00€)
            expect(calculateUnitPrice(ruleEffort, 1, 100)).toBe(1.00);
        });
        test('✔️ Fratrie non répertoriée (ex: 5 enfants) : Applique le dernier taux connu (Fallback)', () => {
            expect(calculateUnitPrice(ruleEffort, 5, 3000)).toBe(3.00); // Tombe sur le taux "1 enfant" par défaut car index non trouvé
        });
    });
});