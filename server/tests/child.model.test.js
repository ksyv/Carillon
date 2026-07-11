// On importe ton vrai modèle BDD !
const Child = require('../models/Child');

describe('🛡️ Validation du Modèle MongoDB (Child Schema)', () => {
    
    test('✔️ Devrait valider un modèle Enfant correctement formaté', () => {
        const validChild = new Child({
            firstName: 'Léo',
            lastName: 'DUPONT',
            category: 'Maternelle',
            active: true
        });
        const err = validChild.validateSync();
        expect(err).toBeUndefined(); // Aucune erreur attendue
    });

    test('❌ Devrait rejeter la création si le Prénom est manquant', () => {
        const invalidChild = new Child({ lastName: 'DUPONT' }); // firstName manquant
        const err = invalidChild.validateSync();
        expect(err.errors.firstName).toBeDefined(); // L'erreur "firstName is required" doit se déclencher
    });

    test('❌ Devrait rejeter la création si le Nom est manquant', () => {
        const invalidChild = new Child({ firstName: 'Léo' }); // lastName manquant
        const err = invalidChild.validateSync();
        expect(err.errors.lastName).toBeDefined();
    });

    test('❌ Devrait rejeter une catégorie non autorisée (Enum validation)', () => {
        const invalidChild = new Child({
            firstName: 'Léo',
            lastName: 'DUPONT',
            category: 'Lycée' // Invalide, doit être Maternelle ou Élémentaire
        });
        const err = invalidChild.validateSync();
        expect(err.errors.category).toBeDefined();
    });

    test('❌ Devrait rejeter un sexe non autorisé', () => {
        const invalidChild = new Child({
            firstName: 'Léo',
            lastName: 'DUPONT',
            sexe: 'Autre' // Invalide, schéma autorise ['Masculin', 'Féminin', '']
        });
        const err = invalidChild.validateSync();
        expect(err.errors.sexe).toBeDefined();
    });
});