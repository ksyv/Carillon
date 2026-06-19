import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, FolderHeart, FileEdit, Banknote, LogOut, Info, AlertTriangle, CheckCircle, Newspaper, Calendar, Send, Loader, User, Lock, KeyRound, Mail, Edit3, X, Check, Clock } from 'lucide-react';
import LogoTexte from '../components/LogoTexte';
import api from '../api';

// --- COMPOSANT RÉUTILISABLE POUR LES CHAMPS MODIFIABLES ---
const EditableField = ({ targetType, targetId, fieldKey, fieldNameFr, currentValue }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(currentValue || '');
    const [isPending, setIsPending] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const handleSave = async () => {
        if (value === currentValue) {
            setIsEditing(false);
            return;
        }
        setIsSending(true);
        try {
            await api.post('/requests', {
                targetType,
                targetId,
                fields: [{ fieldKey, fieldNameFr, oldValue: currentValue, newValue: value }]
            });
            setIsPending(true);
            setIsEditing(false);
        } catch (e) {
            alert("Erreur lors de l'envoi de la demande.");
        }
        setIsSending(false);
    };

    if (isPending) {
        return (
            <div className="flex items-center justify-between bg-orange-50 p-3 rounded-xl border border-orange-100">
                <div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase block mb-1">{fieldNameFr}</span>
                    <p className="font-medium text-orange-800 text-sm line-through opacity-70">{currentValue || 'Vide'}</p>
                    <p className="font-black text-orange-900 text-sm flex items-center gap-2 mt-1">
                        <Clock size={14} /> Demande : {value}
                    </p>
                </div>
                <span className="text-[10px] font-black text-orange-500 uppercase bg-orange-100 px-2 py-1 rounded-lg">En attente</span>
            </div>
        );
    }

    if (isEditing) {
        return (
            <div className="bg-slate-50 p-3 rounded-xl border border-car-blue shadow-inner">
                <label className="text-[10px] font-bold text-car-blue uppercase block mb-1">Modifier {fieldNameFr}</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={value} 
                        onChange={(e) => setValue(e.target.value)} 
                        className="flex-1 bg-white border border-slate-200 p-2 rounded-lg text-sm font-bold text-car-dark outline-none"
                    />
                    <button onClick={handleSave} disabled={isSending} className="bg-car-green text-white p-2 rounded-lg hover:bg-green-600 transition-colors">
                        {isSending ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                    <button onClick={() => { setIsEditing(false); setValue(currentValue); }} className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="group flex items-center justify-between hover:bg-slate-50 p-2 -mx-2 rounded-xl transition-colors">
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{fieldNameFr}</span>
                <p className="font-black text-car-dark text-sm">{currentValue || <span className="text-slate-300 italic font-medium">Non renseigné</span>}</p>
            </div>
            <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-car-blue opacity-0 group-hover:opacity-100 transition-all p-2 bg-white shadow-sm border border-slate-100 rounded-lg">
                <Edit3 size={16} />
            </button>
        </div>
    );
};
// -----------------------------------------------------------

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
        if (activationToken) {
            setIsLoading(false);
            return;
        }
        loadParentData();
    }, [activationToken]);

    const loadParentData = async () => {
        if (!localStorage.getItem('token')) {
            setIsLoading(false);
            return;
        }
        
        try {
            const { data } = await api.get('/parent/me');
            setParentData(data);
        } catch (e) {
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
            const { data } = await api.post('/parent/login', { email: loginEmail, password: loginPassword });
            localStorage.setItem('token', data.token);
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
        if (newPassword !== confirmPassword) return alert("Les mots de passe ne correspondent pas.");
        if (newPassword.length < 6) return alert("Le mot de passe doit contenir au moins 6 caractères.");

        setIsActivating(true);
        try {
            await api.post('/parent/activate', { token: activationToken, password: newPassword });
            setActivationSuccess(true);
        } catch (e) {
            alert("Erreur lors de l'activation.");
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
    // ÉCRANS D'ACTIVATION & CONNEXION
    // ==========================================
    if (activationToken) {
        if (activationSuccess) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100">
                        <div className="bg-car-green/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-car-green"><CheckCircle size={48} /></div>
                        <h1 className="text-2xl font-black text-car-dark mb-2">Compte Activé !</h1>
                        <p className="text-slate-500 font-medium mb-8">Votre mot de passe a été enregistré.</p>
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
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Définissez un mot de passe sécurisé.</p>

                    <form onSubmit={handleActivateAccount} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nouveau mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Confirmer</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <button type="submit" disabled={isActivating || !newPassword} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg mt-4 flex justify-center items-center gap-2">
                            {isActivating ? <Loader className="animate-spin" size={20}/> : "Activer mon espace"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader className="animate-spin text-car-blue" size={48} /></div>;

    if (!parentData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8"><LogoTexte className="text-3xl" /></div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-blue"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Espace Famille</h1>
                    <p className="text-slate-500 font-medium text-center mb-8 text-sm">Connectez-vous pour gérer votre dossier.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Email parent</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Mot de passe</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 pl-10 rounded-2xl outline-none focus:border-car-blue font-bold text-car-dark" required />
                            </div>
                        </div>
                        <button type="submit" disabled={isLoggingIn || !loginEmail || !loginPassword} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg mt-4 flex justify-center items-center gap-2">
                            {isLoggingIn ? <Loader className="animate-spin" size={20}/> : "Se connecter"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ==========================================
    // ONGLETS CONNECTÉS
    // ==========================================

    const TabHub = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-car-blue text-white p-8 rounded-[2rem] shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-sm font-bold tracking-widest opacity-80 uppercase mb-2">Bienvenue sur votre espace</h2>
                    <h1 className="text-3xl font-black mb-2">Service Périscolaire</h1>
                    <p className="text-sm font-medium opacity-90 max-w-md">Retrouvez ici toutes les actualités de la structure, vos factures et les informations de votre dossier.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none"><Newspaper size={200} /></div>
            </div>
        </div>
    );

    const TabDossier = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* EN-TÊTE FAMILLE */}
            <div>
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-2 w-2 rounded-full bg-car-green"></div>
                    <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mon Dossier Famille</h3>
                </div>

                {parentData?.family && (
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-6">
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
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {/* Champs non modifiables par les parents */}
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Code Famille (Non modifiable)</span>
                                <p className="font-black text-slate-500 mt-1">{parentData.family.portalCode || '-'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Quotient Familial (Contactez la mairie)</span>
                                <p className="font-black text-slate-500 mt-1">{parentData.family.quotientFamilial ? `${parentData.family.quotientFamilial} €` : 'Non calculé'}</p>
                            </div>

                            {/* Champs modifiables grâce à notre nouveau composant */}
                            <EditableField 
                                targetType="Family" 
                                targetId={parentData.family._id} 
                                fieldKey="address" 
                                fieldNameFr="Adresse Postale" 
                                currentValue={parentData.family.address} 
                            />
                            
                            {/* Exemple pour le téléphone d'un responsable (à adapter selon ta vraie structure BDD) */}
                            <EditableField 
                                targetType="Family" 
                                targetId={parentData.family._id} 
                                fieldKey="phone" 
                                fieldNameFr="Téléphone principal" 
                                currentValue={parentData.family.phone} 
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION ENFANTS */}
            <div>
                <div className="flex items-center gap-3 mb-6 mt-8">
                    <div className="h-2 w-2 rounded-full bg-car-blue"></div>
                    <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Enfants rattachés</h3>
                </div>

                {parentData?.children && parentData.children.length > 0 ? (
                    <div className="space-y-6">
                        {parentData.children.map(child => (
                            <div key={child._id} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                                    <div className="bg-car-blue/10 w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-car-blue font-black text-xl shrink-0">
                                        {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h5 className="font-black text-car-dark text-2xl">{child.firstName} {child.lastName}</h5>
                                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{child.classLevel || 'Classe non renseignée'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                    <EditableField 
                                        targetType="Child" 
                                        targetId={child._id} 
                                        fieldKey="allergies" 
                                        fieldNameFr="Allergies connues" 
                                        currentValue={child.allergies} 
                                    />
                                    <EditableField 
                                        targetType="Child" 
                                        targetId={child._id} 
                                        fieldKey="pai" 
                                        fieldNameFr="Protocole PAI" 
                                        currentValue={child.pai} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center py-12">
                        <User size={48} className="text-slate-200 mb-4" />
                        <h4 className="font-black text-car-dark text-lg mb-2">Aucun enfant trouvé</h4>
                        <p className="text-sm font-medium text-slate-500 max-w-md">Veuillez contacter le secrétariat pour vérifier les rattachements.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const TabDemarches = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mes Démarches Libres</h3>
            </div>
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                <form onSubmit={handleSendDemarche} className="space-y-4">
                    <textarea value={demarcheText} onChange={e => setDemarcheText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-car-purple font-medium text-car-dark resize-none min-h-[150px] text-sm" placeholder="Pour modifier un champ précis (adresse, allergies...), rendez-vous directement dans l'onglet DOSSIER. Utilisez ce formulaire uniquement pour une demande particulière (droit à l'image, question facturation...)" required></textarea>
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSendingDemarche || !demarcheText.trim()} className="bg-car-purple text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-purple-700 transition-all flex items-center gap-3">
                            {isSendingDemarche ? <Loader className="animate-spin" size={20}/> : <Send size={20}/>} TRANSMETTRE
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
                <h4 className="font-black text-slate-400 text-xl mb-2">Module en construction</h4>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
                <LogoTexte className="text-xl md:text-2xl" />
                <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-car-pink transition-colors font-bold text-sm bg-slate-50 px-4 py-2 rounded-xl">
                    <span className="hidden sm:inline">Déconnexion</span><LogOut size={18} />
                </button>
            </header>

            <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 pb-32 md:pb-8">
                {activeTab === 'HUB' && <TabHub />}
                {activeTab === 'DOSSIER' && <TabDossier />}
                {activeTab === 'DEMARCHES' && <TabDemarches />}
                {activeTab === 'FACTURES' && <TabFactures />}
            </main>

            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 pb-safe">
                <div className="max-w-md md:max-w-2xl mx-auto flex justify-between items-center px-4 py-3">
                    <button onClick={() => setActiveTab('HUB')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'HUB' ? 'text-car-blue' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'HUB' ? 'bg-car-blue/10' : ''}`}><Home size={22} strokeWidth={activeTab === 'HUB' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Accueil</span>
                    </button>
                    <button onClick={() => setActiveTab('DOSSIER')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'DOSSIER' ? 'text-car-green' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'DOSSIER' ? 'bg-car-green/10' : ''}`}><FolderHeart size={22} strokeWidth={activeTab === 'DOSSIER' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Dossier</span>
                    </button>
                    <button onClick={() => setActiveTab('DEMARCHES')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'DEMARCHES' ? 'text-car-purple' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'DEMARCHES' ? 'bg-car-purple/10' : ''}`}><FileEdit size={22} strokeWidth={activeTab === 'DEMARCHES' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Démarches</span>
                    </button>
                    <button onClick={() => setActiveTab('FACTURES')} className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === 'FACTURES' ? 'text-car-dark' : 'text-slate-400'}`}>
                        <div className={`p-2 rounded-xl ${activeTab === 'FACTURES' ? 'bg-slate-100' : ''}`}><Banknote size={22} strokeWidth={activeTab === 'FACTURES' ? 2.5 : 2} /></div>
                        <span className="text-[10px] font-black tracking-widest uppercase">Factures</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default FamilyPortal;