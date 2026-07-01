import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, FolderHeart, Banknote, LogOut, Loader, Mail, Lock, KeyRound, X, CheckCircle, Newspaper } from 'lucide-react';
import LogoTexte from '../components/LogoTexte';
import api from '../api';

// Imports de nos sous-composants extraits
import TabHub from '../components/FamilyPortal/TabHub';
import TabDossier from '../components/FamilyPortal/TabDossier';
import TabFactures from '../components/FamilyPortal/TabFactures';
import ChildRequestModal from '../components/FamilyPortal/ChildRequestModal';

// Modales internes au portail pour la lecture fluide de l'accueil
const NewsViewModal = ({ news, onClose, onImageClick }) => {
    if (!news) return null;
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-y-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="h-4 w-full shrink-0" style={{ backgroundColor: news.borderColor || '#0ea5e9' }}></div>
                <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
                    <div className="flex justify-between items-start mb-6 gap-4">
                        <h2 className="text-2xl sm:text-3xl font-black text-car-dark">{news.title}</h2>
                        <button onClick={onClose} aria-label="Fermer l'actualité" className="bg-slate-100 p-2 rounded-full text-slate-500 hover:text-car-pink transition-colors shrink-0"><X size={24}/></button>
                    </div>
                    <div 
                        onClick={(e) => { if (e.target.tagName === 'IMG') onImageClick(e.target.src); }}
                        className="prose prose-sm sm:prose-base max-w-none text-slate-600 prose-headings:font-black prose-a:text-car-blue prose-img:rounded-xl prose-img:shadow-sm prose-img:cursor-zoom-in"
                        dangerouslySetInnerHTML={{ __html: news.content }} 
                    />
                </div>
            </div>
        </div>
    );
};

const ImageLightbox = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div onClick={onClose} className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200">
            <button onClick={onClose} aria-label="Fermer le zoom" className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 p-3 rounded-full text-white"><X size={24}/></button>
            <img src={src} alt="Zoom" className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};

const FamilyPortal = () => {
    const [searchParams] = useSearchParams();
    const activationToken = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationSuccess, setActivationSuccess] = useState(false);

    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeTab, setActiveTab] = useState('HUB');
    const [parentData, setParentData] = useState(null);
    const [newsList, setNewsList] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    
    const [editFamily, setEditFamily] = useState(null);
    const [childToEdit, setChildToEdit] = useState(null);

    const [newsToView, setNewsToView] = useState(null);
    const [zoomedImage, setZoomedImage] = useState(null);

    useEffect(() => {
        if (activationToken) { setIsLoading(false); return; }
        loadParentData();
    }, [activationToken]);

    const loadParentData = async () => {
        if (!localStorage.getItem('token')) { setIsLoading(false); return; }
        try {
            const [meRes, newsRes] = await Promise.all([api.get('/parent/me'), api.get('/news')]);
            const data = meRes.data;
            setParentData(data);
            setNewsList(newsRes.data || []);
            
            const resps = data.family.responsables ? JSON.parse(JSON.stringify(data.family.responsables)) : [];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', birthDate: '', adressePostale: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            setEditFamily({ ...data.family, responsables: resps, documents: data.family.documents || {} });
        } catch (e) {
            if (e.response?.status === 401 || e.response?.status === 403) localStorage.removeItem('token');
        } finally { setIsLoading(false); }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoggingIn(true);
        try {
            const { data } = await api.post('/parent/login', { email: loginEmail, password: loginPassword });
            localStorage.setItem('token', data.token);
            window.location.href = '/parent/portal';
        } catch (e) { alert("Email ou mot de passe incorrect."); }
        setIsLoggingIn(false);
    };

    const handleActivation = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) return alert("Les mots de passe ne correspondent pas.");
        setIsActivating(true);
        try {
            await api.post('/parent/activate', { token: activationToken, password: newPassword });
            setActivationSuccess(true);
        } catch (error) { alert("Erreur d'activation. Le lien a expiré."); }
        setIsActivating(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/parent/portal';
    };

    const handleRespChange = (index, field, value) => {
        const newResps = [...editFamily.responsables];
        newResps[index] = { ...newResps[index], [field]: value };
        setEditFamily({ ...editFamily, responsables: newResps });
    };

    const handleFamilyDocUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setEditFamily(prev => {
                const updatedDocs = JSON.parse(JSON.stringify(prev.documents || {}));
                if (!updatedDocs.attestationCAF) updatedDocs.attestationCAF = {};
                updatedDocs.attestationCAF.fileUrl = reader.result;
                updatedDocs.attestationCAF.status = 'En attente de validation';
                return { ...prev, documents: updatedDocs };
            });
        };
        reader.readAsDataURL(file);
    };

    const submitFamilyChanges = async () => {
        const changes = [];
        if (JSON.stringify(editFamily.responsables) !== JSON.stringify(parentData.family.responsables)) {
            changes.push({ fieldKey: 'responsables', fieldNameFr: 'Informations des responsables', oldValue: parentData.family.responsables, newValue: editFamily.responsables });
        }
        if (JSON.stringify(editFamily.documents) !== JSON.stringify(parentData.family.documents)) {
            changes.push({ fieldKey: 'documents', fieldNameFr: 'Justificatif (CAF/Impôts)', oldValue: parentData.family.documents, newValue: editFamily.documents });
        }
        if (changes.length === 0) return alert("Aucune modification détectée.");
        try {
            await api.post('/requests', { targetType: 'Family', targetId: parentData.family._id, fields: changes });
            alert("✅ Vos demandes de modifications ont été envoyées !");
            loadParentData(); 
        } catch (e) { alert("Erreur d'envoi."); }
    };

    if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader className="animate-spin text-car-blue" size={48} /></div>;

    if (!parentData && activationToken) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8 flex items-center justify-center gap-4 sm:gap-6">
                    <img src="/logo-mairie.png" alt="Mairie" className="h-12 sm:h-16 object-contain" />
                    <div className="w-px h-10 sm:h-12 bg-slate-300"></div>
                    <LogoTexte className="text-3xl sm:text-4xl" />
                </div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-purple"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-2">Activation de compte</h1>
                    {activationSuccess ? (
                        <div className="text-center space-y-4 pt-4">
                            <div className="bg-car-green/10 p-4 rounded-full text-car-green w-16 h-16 mx-auto flex items-center justify-center"><CheckCircle size={32} /></div>
                            <p className="font-bold text-car-dark">Compte activé !</p>
                            <button onClick={() => window.location.href = '/parent/portal'} className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg">Se connecter</button>
                        </div>
                    ) : (
                        <form onSubmit={handleActivation} className="space-y-4 mt-4">
                            <input type="password" aria-label="Nouveau mot de passe" placeholder="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none font-bold" required />
                            <input type="password" aria-label="Confirmer mot de passe" placeholder="Confirmer mot de passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none font-bold" required />
                            <button type="submit" className="w-full bg-car-purple text-white font-black py-4 rounded-2xl shadow-lg">Activer mon compte</button>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    if (!parentData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="mb-8 flex items-center justify-center gap-4 sm:gap-6">
                    <img src="/logo-mairie.png" alt="Mairie" className="h-12 sm:h-16 object-contain" />
                    <div className="w-px h-10 sm:h-12 bg-slate-300"></div>
                    <LogoTexte className="text-3xl sm:text-4xl" />
                </div>
                <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-car-blue"></div>
                    <h1 className="text-2xl font-black text-car-dark text-center mb-6">Espace Famille</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="email" aria-label="Email parent" placeholder="Email parent" value={loginEmail} onChange={e => loginEmail === '' ? setLoginEmail(e.target.value) : setLoginEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none font-bold text-car-dark" required />
                        <input type="password" aria-label="Mot de passe" placeholder="Mot de passe" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none font-bold text-car-dark" required />
                        <button type="submit" className="w-full bg-car-blue text-white font-black py-4 rounded-2xl shadow-lg">Se connecter</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white px-4 sm:px-6 py-3 sm:py-4 shadow-sm flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-3 sm:gap-5">
                    <img src="/logo-mairie.png" alt="Mairie" className="h-8 sm:h-10 object-contain" />
                    <div className="w-px h-6 sm:h-8 bg-slate-200"></div>
                    <LogoTexte className="text-lg sm:text-xl md:text-2xl" />
                </div>
                <button onClick={handleLogout} aria-label="Déconnexion" className="flex items-center gap-2 text-slate-500 hover:text-car-pink transition-colors font-bold text-sm bg-slate-50 px-3 py-2 rounded-xl"><LogOut size={18} /></button>
            </header>

            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 pb-40 md:pb-32">
                {activeTab === 'HUB' && <TabHub newsList={newsList} setNewsToView={setNewsToView} />}
                {activeTab === 'DOSSIER' && <TabDossier parentData={parentData} editFamily={editFamily} handleRespChange={handleRespChange} handleFamilyDocUpload={handleFamilyDocUpload} submitFamilyChanges={submitFamilyChanges} setChildToEdit={setChildToEdit} />}
                {activeTab === 'FACTURES' && <TabFactures />}
            </main>

            {childToEdit && <ChildRequestModal child={childToEdit} onClose={() => setChildToEdit(null)} onRefresh={loadParentData} />}
            {newsToView && <NewsViewModal news={newsToView} onClose={() => setNewsToView(null)} onImageClick={setZoomedImage} />}
            {zoomedImage && <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} />}

            <nav className="fixed bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-30 pb-safe">
                <div className="max-w-md md:max-w-2xl mx-auto flex justify-around items-center px-4 py-3">
                    <button onClick={() => setActiveTab('HUB')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'HUB' ? 'text-car-blue' : 'text-slate-500'}`}><div className={`p-2 rounded-xl ${activeTab === 'HUB' ? 'bg-car-blue/10' : ''}`}><Home size={22} /></div><span className="text-[10px] font-black uppercase">Accueil</span></button>
                    <button onClick={() => setActiveTab('DOSSIER')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'DOSSIER' ? 'text-car-green' : 'text-slate-500'}`}><div className={`p-2 rounded-xl ${activeTab === 'DOSSIER' ? 'bg-car-green/10' : ''}`}><FolderHeart size={22} /></div><span className="text-[10px] font-black uppercase">Dossier</span></button>
                    <button onClick={() => setActiveTab('FACTURES')} className={`flex flex-col items-center gap-1 p-2 w-20 ${activeTab === 'FACTURES' ? 'text-car-dark' : 'text-slate-500'}`}><div className={`p-2 rounded-xl ${activeTab === 'FACTURES' ? 'bg-slate-100' : ''}`}><Banknote size={22} /></div><span className="text-[10px] font-black uppercase">Factures</span></button>
                </div>
            </nav>
        </div>
    );
};

export default FamilyPortal;