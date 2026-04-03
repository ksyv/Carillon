import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search, X, Info, AlertTriangle, Pencil, Trash2, Check, Copy } from 'lucide-react';
import ChildInfoModal from '../components/ChildInfoModal';

const ChildrenManager = () => {
    const [children, setChildren] = useState([]);
    const role = localStorage.getItem('role');
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const isReadOnly = role !== 'admin'; 
    
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkCategory, setBulkCategory] = useState('Élémentaire');
    const [isImporting, setIsImporting] = useState(false);

    const [editingChild, setEditingChild] = useState(null);
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();

    useEffect(() => { loadChildren(); }, []);
    const loadChildren = () => api.get(`/children`).then(res => setChildren(res.data));

    // --- CALCUL DU TOTAL DES ENFANTS ACTIFS ---
    const activeChildrenCount = useMemo(() => {
        return children.filter(c => c.active !== false && (access === 'Tous' || c.category === access)).length;
    }, [children, access]);

    const filteredChildren = useMemo(() => {
        let result = children;
        if (access !== 'Tous') {
            result = result.filter(c => c.category === access);
        }
        if (searchTerm) {
            result = result.filter(c => 
                c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.firstName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return result;
    }, [children, searchTerm, access]);

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (isReadOnly || !bulkText.trim()) return;
        setIsImporting(true);
        const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let count = 0;
        for (const line of lines) {
            const cleanLine = line.replace(/\t/g, ' ');
            const parts = cleanLine.split(/\s+/);
            if (parts.length >= 2) {
                const lastName = parts[0].toUpperCase();
                const firstName = parts.slice(1).join(' '); 
                try {
                    await api.post(`/children`, { firstName, lastName, category: bulkCategory, active: true });
                    count++;
                } catch (error) { console.error("Erreur", line); }
            }
        }
        setIsImporting(false);
        alert(`${count} enfant(s) importé(s) !`);
        setBulkText(''); setIsBulkMode(false); loadChildren();
    };

    const handleDelete = async (id, nom) => {
        if(isReadOnly) return;
        const confirmWord = window.prompt(`🛑 ATTENTION DANGER 🛑\n\nVous êtes sur le point de SUPPRIMER DÉFINITIVEMENT ${nom}.\nCette action est irréversible.\n(Rappel : préférez le statut "Inactif" dans la fiche pour garder l'historique CAF).\n\nPour confirmer la suppression totale, tapez : SUPPRIMER`);
        
        if (confirmWord === "SUPPRIMER") {
            try {
                await api.delete(`/children/${id}`);
                loadChildren();
            } catch (e) { alert("Erreur lors de la suppression."); }
        } else if (confirmWord !== null) {
            alert("Suppression annulée : le mot de sécurité est incorrect.");
        }
    };

    const startAddChild = () => {
        if(isReadOnly) return;
        setEditingChild({
            _id: null,
            active: true,
            firstName: '', lastName: '', category: 'Maternelle', sexe: '', birthDate: '', droitImage: false, autorisationSortieSeul: false,
            medical: { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '' },
            hasPAI: false, paiDetails: '', isPAIAlimentaire: false, paiDocument: '', regimeAlimentaire: 'Standard',
            personnesAutorisees: [], documents: { vaccins: {}, assurance: {} }
        });
    };

    const startEditChild = (child) => {
        if(isReadOnly) return;
        setEditingChild({
            _id: child._id,
            active: child.active !== false,
            firstName: child.firstName, lastName: child.lastName, category: child.category || 'Maternelle', sexe: child.sexe || '',
            birthDate: child.birthDate ? child.birthDate.split('T')[0] : '', 
            droitImage: child.droitImage || false, autorisationSortieSeul: child.autorisationSortieSeul || false,
            medical: child.medical || { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '' },
            hasPAI: child.hasPAI || false, paiDetails: child.paiDetails || '', isPAIAlimentaire: child.isPAIAlimentaire || false, paiDocument: child.paiDocument || '', regimeAlimentaire: child.regimeAlimentaire || 'Standard',
            personnesAutorisees: child.personnesAutorisees || [],
            documents: child.documents || { vaccins: {}, assurance: {} },
            family: child.family
        });
    };

    const handleChildFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { setEditingChild({...editingChild, paiDocument: reader.result}); };
        reader.readAsDataURL(file);
    };

    const handleChildDocChange = (docType, field, value) => {
        const updatedDocs = { ...(editingChild.documents || {}) };
        if (!updatedDocs[docType]) updatedDocs[docType] = {};
        updatedDocs[docType][field] = value;
        setEditingChild({ ...editingChild, documents: updatedDocs });
    };

    const handleChildDocUpload = (docType, e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => { handleChildDocChange(docType, 'fileUrl', reader.result); };
        reader.readAsDataURL(file);
    };

    const handleChildContactChange = (index, field, value) => {
        const newContacts = [...editingChild.personnesAutorisees];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setEditingChild({ ...editingChild, personnesAutorisees: newContacts });
    };

    const handleCopyContacts = () => {
        if (!editingChild.family) return alert("Cet enfant n'est rattaché à aucune famille. Remplissez d'abord son dossier famille.");
        const familyId = editingChild.family._id || editingChild.family;
        const siblings = children.filter(c => (c.family?._id === familyId || c.family === familyId) && c._id !== editingChild._id && c.personnesAutorisees?.length > 0);
        
        if (siblings.length > 0) {
            setEditingChild({ ...editingChild, personnesAutorisees: [...siblings[0].personnesAutorisees] });
        } else { alert("Aucun frère ou sœur n'a de personnes autorisées renseignées pour le moment !"); }
    };

    const saveChild = async (e) => {
        e.preventDefault();
        if (editingChild.hasPAI && !editingChild.paiDocument) {
            if(!window.confirm("Aucun document PAI n'a été joint. Voulez-vous quand même sauvegarder ?")) return;
        }
        try {
            if (editingChild._id) {
                await api.put(`/children/${editingChild._id}`, editingChild);
            } else {
                await api.post(`/children`, editingChild);
            }
            setEditingChild(null);
            loadChildren();
        } catch (err) { alert("Erreur sauvegarde enfant."); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-4xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-green/10 p-4 rounded-2xl"><Users className="text-car-green w-8 h-8"/></div>
                        <div>
                            {/* AJOUT DU COMPTEUR ICI */}
                            <div className="flex items-center gap-4 mb-1">
                                <h1 className="text-4xl font-black text-car-dark">Base Enfants</h1>
                                <span className="bg-car-green text-white text-sm font-black px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                                    {activeChildrenCount} <span className="font-bold opacity-80 uppercase text-[10px] tracking-wider">actifs</span>
                                </span>
                            </div>
                            {isReadOnly && <p className="text-car-pink font-bold text-sm mt-1">Mode Lecture Seule</p>}
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className="flex gap-2">
                            <button onClick={() => setIsBulkMode(!isBulkMode)} className={`font-bold px-4 py-2 rounded-xl transition-all ${isBulkMode ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                {isBulkMode ? "Fermer Import" : "Importer une liste"}
                            </button>
                            <button onClick={startAddChild} className="bg-car-green text-white font-bold px-4 py-2 rounded-xl shadow-md shadow-car-green/20 flex items-center gap-2 hover:bg-green-600 transition-colors">
                                <Plus size={18}/> Créer Enfant
                            </button>
                        </div>
                    )}
                </div>

                {!isReadOnly && isBulkMode && (
                    <form onSubmit={handleBulkSubmit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 flex flex-col gap-4">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-black text-car-dark text-lg">Importer une liste</h3>
                                <p className="text-slate-400 text-sm font-medium">Format attendu : 1 enfant par ligne (ex: DUPONT Jean)</p>
                            </div>
                            <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-green/20" value={bulkCategory} onChange={e => setBulkCategory(e.target.value)}>
                                <option value="Maternelle">Tous en Maternelle</option>
                                <option value="Élémentaire">Tous en Élémentaire</option>
                            </select>
                        </div>
                        <textarea className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-medium text-car-dark placeholder:font-bold placeholder:text-slate-400 min-h-[200px] resize-y" placeholder={`DUPONT Jean\nMARTIN Sophie\nBERNARD Leo`} value={bulkText} onChange={e => setBulkText(e.target.value)} required disabled={isImporting} />
                        <button type="submit" disabled={isImporting} className="bg-car-dark text-white px-8 py-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isImporting ? "IMPORTATION EN COURS..." : "IMPORTER LA LISTE"}
                        </button>
                    </form>
                )}

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 flex items-center gap-4 relative">
                    <Search className="text-slate-400 ml-2" size={24} />
                    <input type="text" className="bg-transparent border-none outline-none font-bold text-car-dark placeholder:text-slate-400 w-full text-lg" placeholder="Rechercher un enfant pour voir ou modifier sa fiche..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-car-pink transition-colors"><X size={20}/></button>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredChildren.map(child => (
                        <div key={child._id} className={`bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${child.active === false ? 'border-dashed border-slate-300 opacity-60' : 'border-slate-100'}`}>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-full gap-4">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setChildInfoToView(child)} className="text-slate-300 hover:text-car-blue bg-slate-50 p-3 rounded-full transition-colors flex-shrink-0"><Info size={24}/></button>
                                    <div>
                                        <span className="font-black text-car-dark text-xl block leading-tight">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {child.active === false && <span className="text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-slate-200 text-slate-500">INACTIF</span>}
                                            <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-widest ${child.category === 'Élémentaire' ? 'bg-car-blue/10 text-car-blue' : 'bg-car-yellow/10 text-car-yellow'}`}>
                                                {child.category || 'Maternelle'}
                                            </span>
                                            {child.hasPAI && <span className="text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-car-pink/10 text-car-pink flex items-center gap-1"><AlertTriangle size={12}/> PAI</span>}
                                        </div>
                                    </div>
                                </div>
                                {!isReadOnly && (
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button onClick={() => startEditChild(child)} className="text-slate-400 hover:text-car-blue p-3 bg-slate-50 rounded-xl transition-colors"><Pencil size={20}/></button>
                                        <button onClick={() => handleDelete(child._id, `${child.firstName} ${child.lastName}`)} className="text-slate-400 hover:text-car-pink p-3 bg-slate-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />

            {editingChild && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-3xl font-black text-car-dark">{editingChild._id ? 'Modifier' : 'Créer'} la fiche enfant</h3>
                                <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl transition-colors ${editingChild.active !== false ? 'bg-car-green/10 text-car-green' : 'bg-slate-100 text-slate-500'}`}>
                                    <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.active !== false} onChange={e => setEditingChild({...editingChild, active: e.target.checked})} />
                                    <span className="font-bold text-sm">{editingChild.active !== false ? 'DOSSIER ACTIF' : 'DOSSIER INACTIF'}</span>
                                </label>
                            </div>
                            <button type="button" onClick={() => setEditingChild(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        
                        {editingChild.active === false && (
                            <div className="bg-slate-100 p-4 rounded-xl mb-6 text-sm font-bold text-slate-500 text-center">
                                ℹ️ Cet enfant est marqué comme INACTIF. Il n'apparaîtra plus dans les pointages ni dans les compteurs de la cantine. Ses historiques sont conservés.
                            </div>
                        )}

                        <form onSubmit={saveChild} className="space-y-8">
                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Identité</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-black uppercase text-car-dark" placeholder="NOM" value={editingChild.lastName} onChange={e => setEditingChild({...editingChild, lastName: e.target.value.toUpperCase()})} required/>
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-bold text-car-dark capitalize" placeholder="Prénom" value={editingChild.firstName} onChange={e => setEditingChild({...editingChild, firstName: e.target.value})} required/>
                                    <select className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" value={editingChild.sexe} onChange={e => setEditingChild({...editingChild, sexe: e.target.value})}>
                                        <option value="">Sexe...</option><option value="Féminin">Féminin</option><option value="Masculin">Masculin</option>
                                    </select>
                                    <input type="date" className="col-span-2 sm:col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-medium text-car-dark" value={editingChild.birthDate} onChange={e => setEditingChild({...editingChild, birthDate: e.target.value})} required/>
                                    <select className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" value={editingChild.category} onChange={e => setEditingChild({...editingChild, category: e.target.value})}>
                                        <option value="Maternelle">Maternelle</option><option value="Élémentaire">Élémentaire</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Documents Administratifs</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Carnet de Vaccins</span>
                                        <div className="flex gap-2 mb-2">
                                            <select className="flex-1 p-2 rounded-lg text-sm font-bold border border-slate-200 outline-none" value={editingChild.documents?.vaccins?.status || 'Manquant'} onChange={e => handleChildDocChange('vaccins', 'status', e.target.value)}>
                                                <option value="Manquant">Manquant</option><option value="Valide">Valide</option>
                                            </select>
                                        </div>
                                        <input type="file" accept=".pdf, image/*" onChange={e => handleChildDocUpload('vaccins', e)} className="text-xs text-slate-500 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 cursor-pointer"/>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Assurance Resp. Civile</span>
                                        <div className="flex gap-2 mb-2">
                                            <select className="w-1/2 p-2 rounded-lg text-sm font-bold border border-slate-200 outline-none" value={editingChild.documents?.assurance?.status || 'Manquant'} onChange={e => handleChildDocChange('assurance', 'status', e.target.value)}>
                                                <option value="Manquant">Manquant</option><option value="Valide">Valide</option><option value="Expiré">Expiré</option>
                                            </select>
                                            <input type="date" title="Expiration RC" className="w-1/2 p-2 rounded-lg text-sm border border-slate-200 outline-none" value={editingChild.documents?.assurance?.expiryDate ? editingChild.documents.assurance.expiryDate.split('T')[0] : ''} onChange={e => handleChildDocChange('assurance', 'expiryDate', e.target.value)}/>
                                        </div>
                                        <input type="file" accept=".pdf, image/*" onChange={e => handleChildDocUpload('assurance', e)} className="text-xs text-slate-500 file:rounded-lg file:border-0 file:bg-slate-200 file:px-2 file:py-1 cursor-pointer"/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase">Personnes Autorisées</h4>
                                    <div className="flex gap-2">
                                        {editingChild.family && (
                                            <button type="button" onClick={handleCopyContacts} className="text-xs font-bold text-car-purple bg-car-purple/10 px-3 py-1.5 rounded-lg flex items-center gap-1"><Copy size={14}/> Copier (Fratrie)</button>
                                        )}
                                        <button type="button" onClick={() => setEditingChild({...editingChild, personnesAutorisees: [...editingChild.personnesAutorisees, {firstName:'', lastName:'', phone:'', isEmergency: false}]})} className="text-xs font-bold text-car-blue bg-car-blue/10 px-3 py-1.5 rounded-lg">+ AJOUTER</button>
                                    </div>
                                </div>
                                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {editingChild.personnesAutorisees.map((c, i) => (
                                        <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold uppercase outline-none" placeholder="NOM" value={c.lastName} onChange={e => handleChildContactChange(i, 'lastName', e.target.value.toUpperCase())}/>
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold capitalize outline-none" placeholder="Prénom" value={c.firstName} onChange={e => handleChildContactChange(i, 'firstName', e.target.value)}/>
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold outline-none" placeholder="Téléphone" value={c.phone} onChange={e => handleChildContactChange(i, 'phone', e.target.value)}/>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-car-pink cursor-pointer px-2">
                                                <input type="checkbox" className="accent-car-pink" checked={c.isEmergency} onChange={e => handleChildContactChange(i, 'isEmergency', e.target.checked)}/> Urgence
                                            </label>
                                            <button type="button" onClick={() => {
                                                const newArr = editingChild.personnesAutorisees.filter((_, idx) => idx !== i);
                                                setEditingChild({...editingChild, personnesAutorisees: newArr});
                                            }} className="text-slate-400 hover:text-car-pink p-2"><X size={16}/></button>
                                        </div>
                                    ))}
                                    {editingChild.personnesAutorisees.length === 0 && <p className="text-xs text-slate-400 italic text-center">Aucune personne autorisée renseignée.</p>}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Autorisations Mairie</h4>
                                <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.droitImage} onChange={e => setEditingChild({...editingChild, droitImage: e.target.checked})} />
                                        <span className="font-bold text-car-dark">Droit à l'image accordé</span>
                                    </label>
                                    {editingChild.category === 'Élémentaire' && (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-car-blue" checked={editingChild.autorisationSortieSeul} onChange={e => setEditingChild({...editingChild, autorisationSortieSeul: e.target.checked})} />
                                            <span className="font-bold text-car-blue">Autorisation de quitter l'APS seul (Élémentaire)</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Santé & Médical</h4>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.lunettes} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, lunettes: e.target.checked}})} /> Lunettes</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.appareilAuditif} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, appareilAuditif: e.target.checked}})} /> Appareil Auditif</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-yellow" checked={editingChild.medical.appareilDentaire} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, appareilDentaire: e.target.checked}})} /> Appareil Dentaire</label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-dark"><input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.medical.activitesPhysiques} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, activitesPhysiques: e.target.checked}})} /> Apte activités physiques</label>
                                    </div>
                                    <div className="flex gap-4 border-t border-slate-200 pt-4">
                                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow text-sm font-medium" placeholder="Nom du médecin traitant" value={editingChild.medical.medecinNom} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, medecinNom: e.target.value}})}/>
                                        <input className="flex-1 bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow text-sm font-medium" placeholder="Téléphone du médecin" value={editingChild.medical.medecinPhone} onChange={e => setEditingChild({...editingChild, medical: {...editingChild.medical, medecinPhone: e.target.value}})}/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">PAI & Cantine</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-car-pink/5 border border-car-pink/20 p-4 rounded-2xl flex flex-col gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.hasPAI} onChange={e => setEditingChild({...editingChild, hasPAI: e.target.checked})} /> L'enfant a un PAI</label>
                                        {editingChild.hasPAI && (
                                            <>
                                                <input className="bg-white border border-car-pink/30 p-3 rounded-xl outline-none focus:border-car-pink text-sm font-medium" placeholder="Motif du PAI" value={editingChild.paiDetails} onChange={e => setEditingChild({...editingChild, paiDetails: e.target.value})}/>
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.isPAIAlimentaire} onChange={e => {
                                                    const isAlim = e.target.checked;
                                                    setEditingChild({...editingChild, isPAIAlimentaire: isAlim, regimeAlimentaire: isAlim ? 'PAI' : 'Standard'});
                                                }} /> C'est un PAI Alimentaire</label>
                                                <div className="mt-2 bg-white p-3 rounded-xl border border-car-pink/30 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-car-pink uppercase">Joindre le document PAI</span>
                                                        {editingChild.paiDocument ? (
                                                            <span className="text-xs font-bold text-car-green flex items-center gap-1 mt-1"><Check size={14}/> Fichier chargé</span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 mt-1">Aucun fichier (requis)</span>
                                                        )}
                                                    </div>
                                                    <input type="file" accept=".pdf, image/*" onChange={handleChildFileUpload} className="text-xs w-28 text-slate-400 file:rounded-lg file:border-0 file:bg-slate-100 file:text-[10px] file:font-bold hover:file:bg-slate-200 cursor-pointer"/>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                        <label className="text-xs font-bold text-slate-500 block mb-2">Régime Alimentaire</label>
                                        <select className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold text-car-dark" value={editingChild.regimeAlimentaire} onChange={e => setEditingChild({...editingChild, regimeAlimentaire: e.target.value})} disabled={editingChild.isPAIAlimentaire}>
                                            <option value="Standard">Standard</option><option value="Sans-porc">Sans-porc</option><option value="Végétarien">Végétarien</option><option value="PAI">PAI</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setEditingChild(null)} className="px-6 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">Annuler</button>
                                <button type="submit" className="px-8 py-4 font-black text-white bg-car-green hover:bg-green-600 rounded-2xl flex items-center gap-2">
                                    <Check size={20}/> ENREGISTRER LA FICHE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildrenManager;