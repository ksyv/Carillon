// Simulation du middleware server/middleware/auth.js pour les tests unitaires
const mockAuthMiddleware = (allowedRoles = []) => (req, res, next) => {
    // Si pas de token
    if (!req.headers.authorization) return res.status(401).send('Accès refusé');
    
    // Simulation extraction JWT
    const token = req.headers.authorization.split(' ')[1];
    if (token === 'INVALID_TOKEN') return res.status(400).send('Token invalide');
    
    // Simulation d'un payload de Token décodé
    const userPayload = JSON.parse(token); 
    req.user = userPayload;

    if (allowedRoles.length && !allowedRoles.includes(userPayload.role)) {
        return res.status(403).send('Interdit');
    }
    next();
};

describe('🔒 Cybersécurité : Middleware d\'Autorisation (RBAC)', () => {
    let mockReq, mockRes, nextFunction;

    beforeEach(() => {
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        nextFunction = jest.fn();
    });

    test('❌ Refuse l\'accès (401) si aucun Token n\'est fourni', () => {
        const middleware = mockAuthMiddleware(['admin']);
        middleware(mockReq, mockRes, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('❌ Refuse l\'accès (403) si l\'utilisateur "staff" essaie d\'accéder à une route "admin"', () => {
        // CORRECTION ICI : Aucun espace dans le JSON pour simuler un vrai token
        mockReq.headers.authorization = `Bearer {"id":"123","role":"staff"}`;
        const middleware = mockAuthMiddleware(['admin', 'responsable']); // Route réservée direction
        
        middleware(mockReq, mockRes, nextFunction);
        
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.send).toHaveBeenCalledWith('Interdit');
        expect(nextFunction).not.toHaveBeenCalled();
    });

    test('✔️ Autorise l\'accès si le rôle est valide', () => {
        mockReq.headers.authorization = `Bearer {"id":"123","role":"admin"}`;
        const middleware = mockAuthMiddleware(['admin']); // Route réservée direction
        
        middleware(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled(); // La requête passe !
    });

    test('✔️ Autorise l\'accès à tout utilisateur connecté si aucun rôle n\'est spécifié', () => {
        mockReq.headers.authorization = `Bearer {"id":"123","role":"parent"}`;
        const middleware = mockAuthMiddleware([]); // Route publique (connectés uniquement)
        
        middleware(mockReq, mockRes, nextFunction);
        
        expect(nextFunction).toHaveBeenCalled();
    });
});