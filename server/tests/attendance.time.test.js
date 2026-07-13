// Logique extraite de server/routes/attendance.js
const checkIfLate = (checkoutTimestamp) => {
    const checkoutDate = new Date(checkoutTimestamp);
    const limit = new Date(checkoutTimestamp);
    limit.setHours(18, 35, 0, 0); 
    return checkoutDate > limit;
};

describe('⏱️ Logique de Pointage & Pénalités de retard', () => {
    
    test('✔️ Un départ à 17h30 ne doit pas être marqué en retard', () => {
        const departureTime = new Date('2024-03-10T17:30:00').getTime();
        expect(checkIfLate(departureTime)).toBe(false);
    });

    test('✔️ Un départ à 18h30 (Pile à l\'heure) ne doit pas être marqué en retard', () => {
        const departureTime = new Date('2024-03-10T18:30:00').getTime();
        expect(checkIfLate(departureTime)).toBe(false);
    });

    test('✔️ Un départ à 18h34 (Marge de tolérance) ne doit pas être marqué en retard', () => {
        const departureTime = new Date('2024-03-10T18:34:59').getTime();
        expect(checkIfLate(departureTime)).toBe(false);
    });

    test('✔️ Un départ à 18h36 doit déclencher la pénalité de retard', () => {
        const departureTime = new Date('2024-03-10T18:36:00').getTime();
        expect(checkIfLate(departureTime)).toBe(true);
    });

    test('✔️ Un départ à 19h15 (Fermeture structure) doit déclencher la pénalité', () => {
        const departureTime = new Date('2024-03-10T19:15:00').getTime();
        expect(checkIfLate(departureTime)).toBe(true);
    });
});