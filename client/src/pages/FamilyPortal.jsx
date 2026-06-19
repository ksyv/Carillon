import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, FolderHeart, FileEdit, Banknote, LogOut, Info, AlertTriangle, CheckCircle, Newspaper, Calendar, Send, Loader, User, Lock, KeyRound, Mail } from 'lucide-react';
import LogoTexte from '../components/LogoTexte';
import api from '../api';

const FamilyPortal = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activationToken = searchParams.get('token');

    // --- ÉTATS D'ACTIVATION ---
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState(false);

    // --- ÉTATS DE CONNEXION PARENT ---
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // --- ÉTATS DU PORTAIL ---
    const [activeTab, setActiveTab] = useState('HUB');
    const [parentData, setParentData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [demarcheText, setDemarcheText] = useState('');
    const [isSendingDemarche, setIsSendingDemarche] = useState(false);

    useEffect(() => {
        // 1. Si on a un token dans l'URL, on stoppe tout : on est en mode "Activation"
        if (activationToken) {
            setIsLoading(false);
            return;
        }
        // 2. Sinon, on charge le portail normalement
        loadParentData();
    }, [activationToken]);

    const loadParentData = async () => {
        // Si aucun token n'est présent dans le navigateur, on ne tente même pas la requête
        if (!localStorage.getItem('token')) {
            setIsLoading(false);
            return;
        }
        
        try {
            const { data } = await api.get('/parent/me');
            setParentData(data);
        } catch (e) {
            // Si le token est expiré ou invalide, on le supprime (mais on reste sur la page Famille)
            if (e.response?.status === 401 || e.response?.status === 403) {
                localStorage.removeItem('token');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            // On appelle la route de connexion parent (à vérifier selon ton backend)
            const { data } = await api.post('/parent/login', { email: loginEmail, password: loginPassword });
            localStorage.setItem('token', data.token);
            // On recharge la page pour bien appliquer le token
            window.location.href = '/parent/portal';
        } catch (e) {
            alert("Email ou mot de passe incorrect.");
        }
        setIsLoggingIn(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/parent/portal';
    };

    const handleActivateAccount = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return alert("Les mots de passe ne correspondent pas.");
        }
        if (newPassword.length < 6) {
            return alert("Le mot de passe doit contenir au moins 6 caractères.");
        }

        setIsActivating(true);
        try {
            await api.post('/parent/activate', { token: activationToken, password: newPassword });
            setActivationSuccess(true);
        } catch (e) {
            alert("Erreur lors de l'activation. Le lien est peut-être expiré ou invalide.");
        }
        setIsActivating(false);
    };

    const handleSendDemarche = async (e) => {
        e.preventDefault();
        if (!demarcheText.trim()) return;
        
        setIsSendingDemarche(true);
        try {
            await api.post('/parent/requests/family', {
                portalCode: 'PORTAIL',
                changeSummary: `[Message Parent] : ${demarcheText}`,
                newData: {} 
            });
            alert("Votre demande a bien été transmise au service de la Mairie.");
            setDemarcheText('');
        } catch (e) {
            alert("Erreur lors de l'envoi de la demande.");
        }
        setIsSendingDemarche(false);
    };

    // ==========================================
    // ÉCRANS D'ACTIVATION (Si ?token= est présent)
    // ==========================================
    if (activationToken) {
        if (activationSuccess) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100">
                        <div className="bg-car-green/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-car-green">
                            <CheckCircle size={48} />
                        </div>
                        <h1 className="text-2xl font-black text-car-dark mb-2">Compte Activé !</h1>
                        <p className="text-slate-500 font-medium mb-8">Votre mot de passe a bien été enregistré. Vous pouvez maintenant vous connecter à votre Espace Famille.</p>
                        <button onClick={() => window.location.href = '/parent/portal'} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-colors uppercase tracking-widest">
                            Aller à la connexion
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-blue"></div>
                    <div className="flex justify-center mb-6 text-car-blue"><KeyRound size={48} strokeWidth={1.5} /></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Activation du compte</h1>
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Veuillez définir un mot de passe sécurisé pour accéder à votre portail Carillon.</p>

                    <form onSubmit={handleActivateAccount} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nouveau mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="password" 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" 
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Confirmer le mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="password" 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" 
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isActivating || !newPassword} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-colors uppercase tracking-widest mt-4 flex justify-center items-center gap-2">
                            {isActivating ? <Loader className="animate-spin" size={20}/> : "Activer mon espace"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader className="animate-spin text-car-blue" size={48} />
            </div>
        );
    }

    // ==========================================
    // ÉCRAN DE CONNEXION PARENT (Si pas de parentData)
    // ==========================================
    if (!parentData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8"><LogoTexte className="text-3xl" /></div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-blue"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Espace Famille</h1>
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Connectez-vous pour gérer votre dossier et vos démarches.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email parent</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="email" 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" 
                                    placeholder="votre.email@exemple.fr"
                                    value={loginEmail}
                                    onChange={e => setLoginEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="password" 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" 
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" disabled={isLoggingIn || !loginEmail || !loginPassword} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-colors uppercase tracking-widest mt-4 flex justify-center items-center gap-2">
                            {isLoggingIn ? <Loader className="animate-spin" size={20}/> : "Se connecter"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ==========================================
    // COMPOSANTS DES ONGLETS (Portail Connecté)
    // ==========================================

    const TabHub = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-car-blue text-white p-8 rounded-[2rem] shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-sm font-bold tracking-widest opacity-80 uppercase mb-2">Bienvenue sur votre espace</h2>
                    <h1 className="text-3xl font-black mb-2">Service Périscolaire</h1>
                    <p className="text-sm font-medium opacity-90 max-w-md">Retrouvez ici toutes les actualités de la structure, vos factures et les informations de votre dossier.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none">
                    <Newspaper size={200} />
                </div>
            </div>

            <div className="flex items-center gap-3 mb-4 mt-8">
                <div className="h-2 w-2 rounded-full bg-car-yellow"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Dernières Actualités</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-car-yellow/10 p-3 rounded-2xl text-car-yellow"><Calendar size={20} /></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Information Mairie</span>
                            <h4 className="font-black text-car-dark text-lg">Inscriptions Vacances</h4>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Les inscriptions pour l'accueil de loisirs des prochaines vacances scolaires seront ouvertes à partir du lundi 15. Pensez à vérifier que votre dossier est complet.
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-car-teal/10 p-3 rounded-2xl text-car-teal"><Info size={20} /></div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Vie Pratique</span>
                            <h4 className="font-black text-car-dark text-lg">Menus de la Cantine</h4>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">
                        Le menu de la restauration scolaire pour le mois en cours est disponible. Vous pouvez le consulter en format PDF directement depuis le site de la Mairie.
                    </p>
                    <button className="mt-4 text-xs font-bold text-car-teal bg-car-teal/10 px-4 py-2 rounded-xl hover:bg-car-teal hover:text-white transition-colors">
                        Voir le menu
                    </button>
                </div>
            </div>
        </div>
    );

    const TabDossier = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-green"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mon Dossier Famille</h3>
            </div>

            {parentData?.family && (
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h4 className="text-2xl font-black text-car-dark uppercase">{parentData.family.name}</h4>
                            <p className="text-sm font-medium text-slate-500">{parentData.email}</p>
                        </div>
                        {parentData.family.dossierComplet ? (
                            <span className="bg-car-green/10 text-car-green px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><CheckCircle size={16}/> DOSSIER COMPLET</span>
                        ) : (
                            <span className="bg-car-pink/10 text-car-pink px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><AlertTriangle size={16}/> DOSSIER INCOMPLET</span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Code Famille</span>
                            <p className="font-black text-car-dark">{parentData.family.portalCode || '-'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Quotient Familial</span>
                            <p className="font-black text-car-dark">{parentData.family.quotientFamilial ? `${parentData.family.quotientFamilial} €` : 'Non calculé'}</p>
                        </div>
                        <div className="col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Responsables légaux</span>
                            <p className="font-bold text-car-dark text-sm">
                                {parentData.family.responsables?.filter(r => r.lastName).map(r => `${r.firstName} ${r.lastName}`).join(' & ') || '-'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center py-12">
                <User size={48} className="text-slate-200 mb-4" />
                <h4 className="font-black text-car-dark text-lg mb-2">Fiches Enfants</h4>
                <p className="text-sm font-medium text-slate-500 max-w-md">
                    Pour des raisons de sécurité, les modifications sur les fiches de vos enfants se font uniquement via l'onglet "Mes Démarches" ou en contactant le secrétariat.
                </p>
            </div>
        </div>
    );

    const TabDemarches = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mes Démarches</h3>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-start gap-4 mb-6">
                    <div className="bg-car-purple/10 p-4 rounded-2xl text-car-purple shrink-0"><FileEdit size={24} /></div>
                    <div>
                        <h4 className="font-black text-car-dark text-xl">Signaler un changement</h4>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Utilisez ce formulaire pour signaler une nouvelle adresse, un changement de numéro de téléphone, ou pour mettre à jour les autorisations (personnes autorisées à récupérer l'enfant, droit à l'image, etc.).
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSendDemarche} className="space-y-4">
                    <textarea 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-car-purple font-medium text-car-dark resize-none min-h-[150px] text-sm"
                        placeholder="Exemple : Bonjour, suite à notre déménagement, voici notre nouvelle adresse postale..."
                        value={demarcheText}
                        onChange={e => setDemarcheText(e.target.value)}
                        required
                    ></textarea>
                    
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSendingDemarche || !demarcheText.trim()} 
                            className="bg-car-purple text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-purple-700 transition-all flex items-center gap-3 shadow-lg shadow-car-purple/20 disabled:opacity-50"
                        >
                            {isSendingDemarche ? <Loader className="animate-spin" size={20}/> : <Send size={20}/>}
                            TRANSMETTRE À LA MAIRIE
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    const TabFactures = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-dark"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mes Factures</h3>
            </div>

            <div className="bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Banknote size={64} className="text-slate-300 mb-4" />
                <h4 className="font-black text-slate-400 text-xl mb-2">Module de paiement en construction</h4>
                <p className="text-sm font-medium text-slate-400 max-w-sm">
                    L'historique de vos factures et le paiement en ligne seront très prochainement disponibles sur cet espace.
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* HEADER */}
            <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
                <LogoTexte className="text-xl md:text-2xl" />
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-car-pink transition-colors font-bold text-sm bg-slate-50 px-4 py-2 rounded-xl">
                    <span className="hidden sm:inline">Déconnexion</span>
                    <LogOut size={18} />
                </button>
            </header>

            {/* CONTENU PRINCIPAL */}
            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 pb-32 md:pb-8">
                {activeTab === 'HUB' && <TabHub />}
                {activeTab === 'DOSSIER' && <TabDossier />}
                {activeTab === 'DEMARCHES' && <TabDemarches />}
                {activeTab === 'FACTURES' && <TabFactures />}
            </main>

            {/* BARRE DE NAVIGATION (BOTTOM BAR MOBILE & DESKTOP) */}
            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 pb-safe">
                <div className="max-w-md md:max-w-2xl mx-auto flex justify-between items-center px-4 py-3">
                    
                    <button onClick={() => setActiveTab('HUB')} className={`flex flex-col items-center gap-1 p-2 transition-colors w-16 ${activeTab === 'HUB' ? 'text-car-blue' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-2 rounded-xl transition-all ${activeTab === 'HUB' ? 'bg-car-blue/10' : ''}`}><Home size={22} strokeWidth={activeTab === 'HUB' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Accueil</span>
                    </button>

                    <button onClick={() => setActiveTab('DOSSIER')} className={`flex flex-col items-center gap-1 p-2 transition-colors w-16 ${activeTab === 'DOSSIER' ? 'text-car-green' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-2 rounded-xl transition-all ${activeTab === 'DOSSIER' ? 'bg-car-green/10' : ''}`}><FolderHeart size={22} strokeWidth={activeTab === 'DOSSIER' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Dossier</span>
                    </button>

                    <button onClick={() => setActiveTab('DEMARCHES')} className={`flex flex-col items-center gap-1 p-2 transition-colors w-16 ${activeTab === 'DEMARCHES' ? 'text-car-purple' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-2 rounded-xl transition-all ${activeTab === 'DEMARCHES' ? 'bg-car-purple/10' : ''}`}><FileEdit size={22} strokeWidth={activeTab === 'DEMARCHES' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Démarches</span>
                    </button>

                    <button onClick={() => setActiveTab('FACTURES')} className={`flex flex-col items-center gap-1 p-2 transition-colors w-16 ${activeTab === 'FACTURES' ? 'text-car-dark' : 'text-slate-400 hover:text-slate-600'}`}>
                        <div className={`p-2 rounded-xl transition-all ${activeTab === 'FACTURES' ? 'bg-slate-100' : ''}`}><Banknote size={22} strokeWidth={activeTab === 'FACTURES' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Factures</span>
                    </button>

                </div>
            </nav>
        </div>
    );
};

export default FamilyPortal;