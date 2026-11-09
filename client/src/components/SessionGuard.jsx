import React, { useState, useEffect } from 'react';
import { Lock, AlertTriangle, Loader } from 'lucide-react';
import api from '../api'; // Assure-toi que le chemin correspond bien à ton instance axios

const SessionGuard = () => {
    const [isLocked, setIsLocked] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasStoredUser, setHasStoredUser] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('carillon_username') || '';
        if (storedUser) {
            setUsername(storedUser);
            setHasStoredUser(true);
        }

        const checkTokenExpiration = () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const payloadStr = atob(token.split('.')[1]);
                const payload = JSON.parse(payloadStr);
                const expirationDate = payload.exp * 1000; 
                const timeRemaining = expirationDate - Date.now();

                if (timeRemaining <= 300000) { // 5 minutes
                    setIsLocked(true);
                } else {
                    setIsLocked(false);
                }
            } catch (e) {
                console.error("Erreur token");
                setIsLocked(true);
            }
        };

        checkTokenExpiration();
        const interval = setInterval(checkTokenExpiration, 60000);

        // 👉 NOUVEAU : On écoute l'alarme d'Axios pour verrouiller instantanément
        const lockInstantly = () => setIsLocked(true);
        window.addEventListener('session-expired', lockInstantly);

        return () => {
            clearInterval(interval);
            window.removeEventListener('session-expired', lockInstantly);
        };
    }, []);

    const handleUnlock = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Appel à ta route d'authentification existante
            const { data } = await api.post('/login', { username, password });
            
            // On met à jour le token fraîchement généré
            localStorage.setItem('token', data.token);
            
            // On déverrouille l'écran
            setIsLocked(false);
            setPassword(''); 
            
            // 🚀 LE HACK MAGIQUE : On simule un retour réseau
            // Cela va forcer le 'window.addEventListener("online")' de ton SessionView
            // à se déclencher et à vider la syncQueue automatiquement !
            window.dispatchEvent(new Event('online'));

        } catch (err) {
            setError("Mot de passe incorrect. Impossible de déverrouiller la session.");
        } finally {
            setIsLoading(false);
        }
    };

    // Le composant est invisible si la session est valide
    if (!isLocked) return null;

    // L'écran de verrouillage
    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border-t-8 border-car-blue relative overflow-hidden">
                <div className="flex justify-center mb-6">
                    <div className="bg-car-blue/10 p-4 rounded-full text-car-blue animate-pulse">
                        <Lock size={40} />
                    </div>
                </div>
                
                <h2 className="text-2xl font-black text-car-dark text-center mb-2">Session expirée</h2>
                <p className="text-slate-500 text-center text-sm font-medium mb-6">
                    Par mesure de sécurité, votre session a été verrouillée. 
                    <strong className="block mt-2 text-car-dark">Ne vous déconnectez pas, vos pointages en attente sont conservés !</strong>
                    Saisissez votre mot de passe pour reprendre votre travail.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-car-pink rounded-xl flex items-center gap-3 text-sm font-bold">
                        <AlertTriangle size={20} className="shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleUnlock} className="space-y-4">
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none font-bold text-slate-500"
                        readOnly={hasStoredUser} // L'ID est bloqué pour éviter qu'il change de compte
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Mot de passe" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white border-2 border-car-blue/30 focus:border-car-blue p-4 rounded-2xl outline-none font-bold text-car-dark transition-all"
                        autoFocus
                        required 
                    />
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-car-dark text-white font-black py-4 rounded-2xl shadow-lg hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                    >
                        {isLoading ? <Loader className="animate-spin" size={20} /> : 'Déverrouiller'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SessionGuard;