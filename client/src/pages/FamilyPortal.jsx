import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FolderHeart, AlertTriangle, CheckCircle, Save, Users, Info, Pencil, Banknote, FileText, LogOut, Lock, UploadCloud, Bell, RefreshCw, Mail, Eye, Key } from 'lucide-react';
import api from '../api';
import ChildInfoModal from '../components/ChildInfoModal';

const FamilyPortal = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const activationToken = searchParams.get('token'); // Intercepte le ?token= de l'email

    // --- FORM STATES ---
    const [emailInput, setEmailInput] = useState('');
    const [passwordInput, setPasswordInput] = useState('');
    const [newPasswordInput, setNewPasswordInput] = useState('');
    
    // --- AUTH & DATA STATES ---
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isActivationMode, setIsActivationMode] = useState(!!activationToken);
    const [isProcessing, setIsProcessing] = useState(false);

    const [children, setChildren] = useState([]);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [editFamily, setEditFamily] = useState(null); 
    const [serverRequest, setServerRequest] = useState(null);
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [editingChild, setEditingChild] = useState(null);

    // Chargement des données de la famille connectée (via son Token JWT Parent)
    const loadParentDossier = async (familyId) => {
        try {
            const [kidsRes, reqRes] = await Promise.all([
                api.get(`/children`),
                api.get(`/requests/family/${familyId}`)
            ]);
            // On filtre les enfants rattachés à cette famille uniquement
            setChildren(kidsRes.data.filter(c => c.family === familyId || c.family?._id === familyId));
            setServerRequest(reqRes.data);
        } catch (e) { console.error(e); }
    };

    // Soumission du formulaire de connexion standard
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setIsProcessing(true);
        try {
            const { data } = await api.post('/parent/login', { email: emailInput, password: passwordInput });
            localStorage.setItem('parent_token', data.token);
            localStorage.setItem('parent_family_id', data.family._id);
            
            // Configuration du header pour les appels suivants
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            
            setSelectedFamily(data.family);
            await loadParentDossier(data.family._id);
            setIsAuthenticated(true);
        } catch (e) {
            alert("❌ Email ou mot de passe incorrect.");
        }
        setIsProcessing(false);
    };

    // Soumission de la création du mot de passe (Lien d'activation du mail)
    const handleActivationSubmit = async (e) => {
        e.preventDefault();
        if (newPasswordInput.length < 6) return alert("Le mot de passe doit contenir au moins 6 caractères.");
        setIsProcessing(true);
        try {
            await api.post('/parent/activate', { token: activationToken, password: newPasswordInput });
            alert("🔑 Votre mot de passe a été enregistré avec succès ! Vous pouvez maintenant vous connecter.");
            setIsActivationMode(false);
            navigate('/parent/portal'); // Nettoie l'URL
        } catch (e) {
            alert("❌ Ce lien d'activation est invalide ou a déjà été utilisé.");
        }
        setIsProcessing(false);
    };

    const [isLoading, setIsLoading] = useState(true);
    // Restauration de la session au rechargement de la page
    useEffect(() => {
        const storedToken = localStorage.getItem('parent_token');
        if (storedToken && !activationToken) {
            api.get('/parent/me')
                .then(({ data }) => {
                    if (data?.family?._id) {
                        localStorage.setItem('parent_family_id', data.family._id);
                        setSelectedFamily(data.family);
                        loadParentDossier(data.family._id);
                        setIsAuthenticated(true);
                    } else {
                        handleLogout();
                    }
                })
                .catch(() => handleLogout());
        }
    }, [activationToken]);


    const handleLogout = () => {
        localStorage.removeItem('parent_token');
        localStorage.removeItem('parent_family_id');
        delete api.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
    };

    const startEditChild = (child) => {
        setEditingChild({
            _id: child._id,
            firstName: child.firstName || '',
            lastName: child.lastName || '',
            birthDate: child.birthDate ? child.birthDate.split('T')[0] : '',
            category: child.category || 'Maternelle',
            sexe: child.sexe || '',
            droitImage: !!child.droitImage,
            autorisationSortieSeul: !!child.autorisationSortieSeul,
            regimeAlimentaire: child.regimeAlimentaire || 'Standard',
            persistentNote: child.persistentNote || '',
            medical: {
                autresInfos: child.medical?.autresInfos || ''
            }
        });
    };

    const handleChildEditChange = (field, value) => {
        setEditingChild(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const handleChildMedicalChange = (field, value) => {
        setEditingChild(prev => prev ? { ...prev, medical: { ...(prev.medical || {}), [field]: value } } : prev);
    };

    const handleChildEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingChild) return;
        setIsProcessing(true);
        try {
            const payload = {
                firstName: editingChild.firstName,
                lastName: editingChild.lastName,
                birthDate: editingChild.birthDate || null,
                category: editingChild.category,
                sexe: editingChild.sexe,
                droitImage: editingChild.droitImage,
                autorisationSortieSeul: editingChild.autorisationSortieSeul,
                regimeAlimentaire: editingChild.regimeAlimentaire,
                persistentNote: editingChild.persistentNote,
                medical: { autresInfos: editingChild.medical?.autresInfos || '' }
            };
            const { data } = await api.post('/requests', {
                familyId: selectedFamily._id,
                childId: editingChild._id,
                portalCode: 'PORTAIL',
                newData: payload
            });
            setServerRequest(data);
            setEditingChild(null);
            alert('✓ Votre demande de modification enfant a été envoyée au staff pour validation.');
        } catch (e) {
            alert("Erreur lors de la sauvegarde de la fiche enfant.");
        }
        setIsProcessing(false);
    };

    useEffect(() => {
        if (selectedFamily) {
            const resps = [...(selectedFamily.responsables || [])];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            const docs = selectedFamily.documents || { assuranceRC: {}, vaccins: {}, avisImposition: {}, attestationCAF: {} };
            setEditFamily({ ...selectedFamily, responsables: resps, documents: docs });
        }
    }, [selectedFamily]);

    const handleParentSubmitRequest = async () => {
        setIsProcessing(true);
        try {
            const { data } = await api.post('/requests', { familyId: selectedFamily._id, portalCode: "PORTAIL", newData: editFamily });
            setServerRequest(data);
            alert("✓ Vos modifications ont été soumises à la validation de la mairie.");
        } catch (e) { alert("Erreur."); }
        setIsProcessing(false);
    };

    const handleRespChange = (index, field, value) => {
        const newResps = [...editFamily.responsables];
        newResps[index] = { ...newResps[index], [field]: value };
        setEditFamily({ ...editFamily, responsables: newResps });
    };

    const handleQFChange = (field, value) => {
        const numValue = value === '' ? null : Number(value);
        const updated = { ...editFamily, [field]: numValue };
        if (updated.revenuReference && updated.nombreParts) {
            updated.quotientFamilial = Math.round((updated.revenuReference / 12) / updated.nombreParts);
        } else { updated.quotientFamilial = null; }
        setEditFamily(updated);
    };

    const handleDocChange = (docType, field, value) => {
        const updatedDocs = { ...editFamily.documents };
        if (!updatedDocs[docType]) updatedDocs[docType] = {};
        updatedDocs[docType][field] = value;
        setEditFamily({ ...editFamily, documents: updatedDocs });
    };

    const handleFileUpload = (docType, e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { handleDocChange(docType, 'fileUrl', reader.result); };
        reader.readAsDataURL(file);
    };

    // --- INTERFACE 1 : MODE CHOIX DU MOT DE PASSE (PREMIÈRE ACTIVATION) ---
    if (isActivationMode) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border max-w-md w-full text-center space-y-6">
                    <div className="bg-car-green/10 p-5 rounded-2xl w-fit mx-auto text-car-green"><Key size={36} strokeWidth={2.5}/></div>
                    <div><h1 className="text-2xl font-black text-car-dark">Première Activation</h1><p className="text-slate-400 text-sm font-medium mt-1">Choisissez le mot de passe confidentiel de votre espace famille</p></div>
                    <form onSubmit={handleActivationSubmit} className="space-y-4">
                        <input type="password" className="w-full text-center p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-base outline-none focus:border-car-green transition-all" placeholder="Nouveau mot de passe" value={newPasswordInput} onChange={e => setNewPasswordInput(e.target.value)} required minLength={6} />
                        <button type="submit" disabled={isProcessing} className="w-full bg-car-green text-white font-black tracking-widest p-4 rounded-2xl shadow-lg shadow-car-green/20 uppercase text-sm">{isProcessing ? "Configuration..." : "Activer mon compte"}</button>
                    </form>
                </div>
            </div>
        );
    }

    // --- INTERFACE 2 : FORMULAIRE DE CONNEXION STANDARD (EMAIL + MDP) ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                    <div className="bg-car-blue/10 p-5 rounded-2xl w-fit mx-auto text-car-blue"><Lock size={36} strokeWidth={2.5}/></div>
                    <div><h1 className="text-3xl font-black text-car-dark">Espace Parent</h1><p className="text-slate-400 text-sm font-medium mt-1">Connectez-vous à votre espace Carillon</p></div>
                    <form onSubmit={handleLoginSubmit} className="space-y-4 text-left">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Adresse Email :</label>
                            <input type="email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-car-dark outline-none focus:bg-white focus:border-car-blue transition-all" placeholder="parents@email.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Mot de passe :</label>
                            <input type="password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-car-dark outline-none focus:bg-white focus:border-car-blue transition-all" placeholder="••••••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} required />
                        </div>
                        <button type="submit" disabled={isProcessing} className="w-full bg-car-blue text-white font-black tracking-widest p-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all uppercase text-sm mt-2">{isProcessing ? "Connexion..." : "Se connecter"}</button>
                    </form>
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold text-xs transition-colors">← Retour Communal</button>
                </div>
            </div>
        );
    }

    // --- INTERFACE 3 : DOSSIER PARENT CONNECTÉ ---
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl text-car-blue"><FolderHeart size={32}/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark uppercase">Mon Espace : <span className="text-car-blue">{selectedFamily.name}</span></h1>
                            <p className="text-slate-500 font-medium mt-1">Espace Famille Sécurisé ({emailInput})</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleParentSubmitRequest} disabled={isProcessing || (serverRequest && serverRequest.status === 'PENDING')} className="bg-car-blue text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-40">
                            {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
                            SOUMETTRE À LA MAIRIE
                        </button>
                        <button onClick={handleLogout} className="text-slate-400 hover:text-car-pink bg-white border border-slate-200 p-4 rounded-2xl transition-colors"><LogOut size={24}/></button>
                    </div>
                </div>

                {serverRequest && serverRequest.status === 'PENDING' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-amber-500/10 text-amber-700 border-amber-500/20"><Bell size={20}/> ⏳ Modifications transmises. Dossier temporairement gelé en attente de vérification par la Mairie.</div>
                )}
                {serverRequest && serverRequest.status === 'APPROVED' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-emerald-500/10 text-emerald-700 border-emerald-500/20"><CheckCircle size={20}/> ✅ Vos modifications ont été vérifiées et approuvées par le service scolaire.</div>
                )}
                {serverRequest && serverRequest.status === 'REJECTED' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-car-pink/10 text-car-pink border-car-pink/20"><AlertTriangle size={20}/> ❌ Modifications refusées par le service scolaire. Motif : "{serverRequest.refusalMessage}"</div>
                )}

                {editFamily && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-4xl shadow-sm border border-slate-100">
                                <h3 className="font-black mb-4 text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Users size={18}/> Les enfants de mon foyer</h3>
                                <div className="space-y-2">
                                    {children.map(c => (
                                        <div key={c._id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 font-bold text-car-dark uppercase flex items-center justify-between gap-3">
                                            <div>
                                                {c.lastName} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span>
                                            </div>
                                            <button type="button" onClick={() => startEditChild(c)} className="text-xs font-black uppercase tracking-widest bg-white border border-slate-200 px-3 py-2 rounded-xl text-car-blue hover:bg-car-blue hover:text-white transition-colors">
                                                Modifier
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-4xl shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-black text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Ma tarification (QF)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Revenu Réf. (€)</label>
                                        <input type="number" className="w-full bg-slate-50 border p-3 rounded-xl font-bold text-car-dark text-sm focus:bg-white" value={editFamily.revenuReference || ''} onChange={e => handleQFChange('revenuReference', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Parts fiscales</label>
                                        <input type="number" step="0.5" className="w-full bg-slate-50 border p-3 rounded-xl font-bold text-car-dark text-sm focus:bg-white" value={editFamily.nombreParts || ''} onChange={e => handleQFChange('nombreParts', e.target.value)} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Quotient Familial Estimé</span>
                                    <span className="font-black text-car-blue text-lg">{editFamily.quotientFamilial || '-'} €</span>
                                </div>
                                <div className="bg-slate-50/50 p-4 rounded-2xl border-2 border-dashed border-slate-200 mt-4 space-y-3">
                                    <span className="text-xs font-bold text-slate-500 uppercase block"><UploadCloud size={14} className="inline mr-1"/> Déposer l'Attestation CAF</span>
                                    <input type="file" accept=".pdf, image/*" onChange={(e) => handleFileUpload('attestationCAF', e)} className="text-xs text-slate-400 cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-100 p-6 rounded-4xl shadow-sm space-y-4">
                                <h3 className="font-black text-car-blue text-sm tracking-widest uppercase border-b pb-2">Responsable Légal 1</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[0].lastName} onChange={e => handleRespChange(0, 'lastName', e.target.value.toUpperCase())}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[0].firstName} onChange={e => handleRespChange(0, 'firstName', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Qualité" value={editFamily.responsables[0].qualite} onChange={e => handleRespChange(0, 'qualite', e.target.value)}/>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Téléphone" value={editFamily.responsables[0].phoneMobile} onChange={e => handleRespChange(0, 'phoneMobile', e.target.value)}/>
                                        <input type="email" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Email" value={editFamily.responsables[0].email} onChange={e => handleRespChange(0, 'email', e.target.value)}/>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-100 p-6 rounded-4xl shadow-sm space-y-4">
                                <h3 className="font-black text-car-teal text-sm tracking-widest uppercase border-b pb-2">Responsable Légal 2</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[1].lastName} onChange={e => handleRespChange(1, 'lastName', e.target.value.toUpperCase())}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[1].firstName} onChange={e => handleRespChange(1, 'firstName', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Qualité" value={editFamily.responsables[1].qualite} onChange={e => handleRespChange(1, 'qualite', e.target.value)}/>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Téléphone" value={editFamily.responsables[1].phoneMobile} onChange={e => handleRespChange(1, 'phoneMobile', e.target.value)}/>
                                        <input type="email" className="w-1/2 bg-slate-50 border p-3 rounded-xl outline-none text-sm font-medium" placeholder="Email" value={editFamily.responsables[1].email} onChange={e => handleRespChange(1, 'email', e.target.value)}/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {editingChild && (
                <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <form onSubmit={handleChildEditSubmit} className="bg-white w-full max-w-3xl rounded-4xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto space-y-6">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="text-3xl font-black text-car-dark">Modifier la fiche enfant</h3>
                                <p className="text-slate-400 text-sm font-medium mt-1">Les champs ouverts ici sont ceux que le portail famille peut modifier.</p>
                            </div>
                            <button type="button" onClick={() => setEditingChild(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-car-dark px-4 py-2 rounded-xl font-black text-sm transition-colors">
                                Fermer
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Prénom</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue" value={editingChild.firstName} onChange={e => handleChildEditChange('firstName', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Nom</label>
                                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue uppercase" value={editingChild.lastName} onChange={e => handleChildEditChange('lastName', e.target.value.toUpperCase())} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Date de naissance</label>
                                <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue" value={editingChild.birthDate} onChange={e => handleChildEditChange('birthDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Catégorie</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue" value={editingChild.category} onChange={e => handleChildEditChange('category', e.target.value)}>
                                    <option value="Maternelle">Maternelle</option>
                                    <option value="Élémentaire">Élémentaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Régime alimentaire</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue" value={editingChild.regimeAlimentaire} onChange={e => handleChildEditChange('regimeAlimentaire', e.target.value)}>
                                    <option value="Standard">Standard</option>
                                    <option value="Sans-porc">Sans-porc</option>
                                    <option value="Végétarien">Végétarien</option>
                                    <option value="PAI">PAI</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Sexe</label>
                                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-car-dark outline-none focus:border-car-blue" value={editingChild.sexe} onChange={e => handleChildEditChange('sexe', e.target.value)}>
                                    <option value="">Non renseigné</option>
                                    <option value="Masculin">Masculin</option>
                                    <option value="Féminin">Féminin</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${editingChild.droitImage ? 'border-car-green bg-car-green/5' : 'border-slate-200 bg-slate-50'}`}>
                                <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.droitImage} onChange={e => handleChildEditChange('droitImage', e.target.checked)} />
                                <span className="font-bold text-car-dark">Droit à l'image</span>
                            </label>
                            <label className={`flex items-center gap-3 p-4 rounded-2xl border ${editingChild.autorisationSortieSeul ? 'border-car-blue bg-car-blue/5' : 'border-slate-200 bg-slate-50'}`}>
                                <input type="checkbox" className="w-5 h-5 accent-car-blue" checked={editingChild.autorisationSortieSeul} onChange={e => handleChildEditChange('autorisationSortieSeul', e.target.checked)} />
                                <span className="font-bold text-car-dark">Autorisé à sortir seul</span>
                            </label>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Informations médicales / remarques</label>
                            <textarea className="w-full min-h-35 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-car-dark outline-none focus:border-car-blue resize-y" value={editingChild.medical?.autresInfos || ''} onChange={e => handleChildMedicalChange('autresInfos', e.target.value)} />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1 block">Note permanente</label>
                            <textarea className="w-full min-h-30 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-car-dark outline-none focus:border-car-blue resize-y" value={editingChild.persistentNote} onChange={e => handleChildEditChange('persistentNote', e.target.value)} />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                            <button type="button" onClick={() => setEditingChild(null)} className="px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-500 font-black tracking-widest uppercase text-sm hover:bg-slate-50">
                                Annuler
                            </button>
                            <button type="submit" disabled={isProcessing} className="px-6 py-4 rounded-2xl bg-car-blue text-white font-black tracking-widest uppercase text-sm shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-colors disabled:opacity-40">
                                {isProcessing ? 'Sauvegarde...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />
        </div>
    );
};

export default FamilyPortal;