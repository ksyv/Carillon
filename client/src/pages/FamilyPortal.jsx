import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, AlertTriangle, CheckCircle, Save, Users, Info, Pencil, Banknote, FileText, LogOut, Lock, UploadCloud, Bell, RefreshCw, X, Check, Copy } from 'lucide-react';
import api from '../api';
import ChildInfoModal from '../components/ChildInfoModal';

const FamilyPortal = () => {
    const navigate = useNavigate();

    const [portalCodeInput, setPortalCodeInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [editFamily, setEditFamily] = useState(null); 
    
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [editingChild, setEditingChild] = useState(null);

    const [serverRequest, setServerRequest] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const loadData = async () => {
        try {
            const [kidsRes, famRes] = await Promise.all([api.get(`/children`), api.get(`/families`)]);
            setChildren(kidsRes.data);
            setFamilies(famRes.data);
        } catch (e) { console.error(e); }
    };

    const checkFamilyRequestStatus = async (familyId) => {
        try {
            const { data } = await api.get(`/requests/family/${familyId}`);
            setServerRequest(data);
        } catch (e) { console.error(e); }
    };

    const handlePortalLogin = async (e) => {
        e.preventDefault();
        const code = portalCodeInput.trim().toUpperCase();
        if (!code) return;

        const targetFamily = families.find(f => f.portalCode === code);
        if (targetFamily) {
            setSelectedFamily(targetFamily);
            await checkFamilyRequestStatus(targetFamily._id);
            setIsAuthenticated(true);
        } else { alert("❌ Code portail erroné."); }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (selectedFamily) {
            const resps = [...(selectedFamily.responsables || [])];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            const docs = selectedFamily.documents || { assuranceRC: {}, vaccins: {}, avisImposition: {}, attestationCAF: {} };
            setEditFamily({ ...selectedFamily, responsables: resps, documents: docs });
        } else { setEditFamily(null); }
    }, [selectedFamily]);

    const handleParentSubmitRequest = async () => {
        setIsProcessing(true);
        try {
            const { data } = await api.post('/requests', {
                familyId: selectedFamily._id,
                portalCode: selectedFamily.portalCode,
                newData: editFamily
            });
            setServerRequest(data);
            alert("✓ Votre demande a bien été envoyée à la mairie !");
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

    const attachedChildren = selectedFamily ? children.filter(c => c.family === selectedFamily._id || c.family?._id === selectedFamily._id) : [];

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                    <div className="bg-car-blue/10 p-5 rounded-2xl w-fit mx-auto text-car-blue"><Lock size={36} strokeWidth={2.5}/></div>
                    <div><h1 className="text-3xl font-black text-car-dark">Espace Parent</h1><p className="text-slate-400 text-sm font-medium mt-1">Authentification usager</p></div>
                    <form onSubmit={handlePortalLogin} className="space-y-4">
                        <input type="text" className="w-full text-center p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-car-dark uppercase tracking-widest outline-none focus:border-car-blue tracking-widest" placeholder="CODE PORTAIL" value={portalCodeInput} onChange={e => setPortalCodeInput(e.target.value)} required />
                        <button type="submit" className="w-full bg-car-blue text-white font-black tracking-widest p-4 rounded-2xl shadow-md uppercase text-sm">Ouvrir mon espace</button>
                    </form>
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold text-xs transition-colors">← Quitter</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                
                {/* HEADER PARENT */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl text-car-blue"><FolderHeart size={32}/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark uppercase">Mon Espace : <span className="text-car-blue">{selectedFamily.name}</span></h1>
                            <p className="text-slate-500 font-medium mt-1">Dossier Famille Connecté</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleParentSubmitRequest} disabled={isProcessing || (serverRequest && serverRequest.status === 'PENDING')} className="bg-car-blue text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg disabled:opacity-40">
                            {isProcessing ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>}
                            SOUMETTRE À LA MAIRIE
                        </button>
                        <button onClick={() => setIsAuthenticated(false)} className="text-slate-400 hover:text-car-pink bg-white border border-slate-200 p-4 rounded-2xl transition-colors"><LogOut size={24}/></button>
                    </div>
                </div>

                {/* LES BANNIÈRES DE STATUTS SYNCHRONISÉES EN BDD */}
                {serverRequest && serverRequest.status === 'PENDING' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-amber-500/10 text-amber-700 border-amber-500/20"><Bell size={20}/> ⏳ Demande en attente de validation par le service scolaire. Votre dossier est gelé.</div>
                )}
                {serverRequest && serverRequest.status === 'APPROVED' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-emerald-500/10 text-emerald-700 border-emerald-500/20"><CheckCircle size={20}/> ✅ Vos dernières modifications ont été validées et enregistrées par la Mairie.</div>
                )}
                {serverRequest && serverRequest.status === 'REJECTED' && (
                    <div className="p-4 rounded-2xl border mb-6 text-sm font-bold flex items-center gap-3 bg-car-pink/10 text-car-pink border-car-pink/20"><AlertTriangle size={20}/> ❌ Modifications refusées par le service scolaire. Motif : "{serverRequest.refusalMessage}"</div>
                )}

                {editFamily && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Users size={18}/> Les enfants de mon foyer</h3>
                                <div className="space-y-2">
                                    {attachedChildren.map(c => (
                                        <div key={c._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <span className="font-bold text-car-dark uppercase">{c.lastName} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-black text-car-dark text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Ma tarification (QF)</h3>
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
                                    <span className="text-xs font-bold text-slate-500 uppercase block"><UploadCloud size={14} className="inline mr-1"/> Transmettre Attestation CAF</span>
                                    <input type="file" accept=".pdf, image/*" onChange={(e) => handleFileUpload('attestationCAF', e)} className="text-xs text-slate-400 cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
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

                            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
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
            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />
        </div>
    );
};

export default FamilyPortal;