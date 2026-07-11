// Fonction extraite/simulée de ton billing.js pour le calcul du tarif
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

describe('Moteur de facturation : calculateUnitPrice', () => {
    
    test('✔️ Devrait appliquer le tarif FIXE (ex: PAI ou Repas Adulte)', () => {
        const rule = { pricingMode: 'FIXED', fixedPrice: 3.50 };
        const price = calculateUnitPrice(rule, 1, 1000);
        expect(price).toBe(3.50);
    });

    test('✔️ Devrait appliquer la bonne TRANCHE DE QF (Cantine)', () => {
        const rule = { 
            pricingMode: 'QF_BRACKETS', 
            qfBrackets: [
                { min: 0, max: 500, price: 0.85 },
                { min: 501, max: 1000, price: 1.00 }
            ] 
        };
        // QF de 600 doit tomber dans la tranche 2 (1.00€)
        expect(calculateUnitPrice(rule, 1, 600)).toBe(1.00);
    });

    test('✔️ Devrait appliquer le TAUX D EFFORT avec Plafond MAX de la CAF', () => {
        const rule = { 
            pricingMode: 'TAUX_EFFORT', 
            effortRates: [
                { childrenCount: 1, rate: 0.001, min: 1.00, max: 5.00 } // Max est 5€
            ] 
        };
        // QF de 6000 * 0.001 = 6.00€. Mais le plafond max est 5.00€ !
        const price = calculateUnitPrice(rule, 1, 6000);
        expect(price).toBe(5.00); // L'algorithme doit bloquer à 5.00
    });

    test('✔️ Devrait appliquer le TAUX D EFFORT avec Plancher MIN de la CAF', () => {
        const rule = { 
            pricingMode: 'TAUX_EFFORT', 
            effortRates: [
                { childrenCount: 1, rate: 0.001, min: 1.00, max: 5.00 } // Min est 1€
            ] 
        };
        // QF de 100 * 0.001 = 0.10€. Mais le plancher min est 1.00€ !
        const price = calculateUnitPrice(rule, 1, 100);
        expect(price).toBe(1.00); // L'algorithme doit bloquer à 1.00
    });
});