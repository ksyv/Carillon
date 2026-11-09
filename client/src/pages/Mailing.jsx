import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Mail, Send, Filter, Users, AlertTriangle, 
    CheckCircle, Loader, Paperclip, X, 
    FileText as FileIcon, Save, Bookmark, PenTool, Check, Search, GraduationCap, UsersRound, Plus, Trash2 
} from 'lucide-react';
import api from '../api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const Mailing = () => {
    const navigate = useNavigate();
    
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [classes, setClasses] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [signature, setSignature] = useState('');
    
    // 👉 ÉTATS POUR LES GROUPES DE MAILING
    const [mailingGroups, setMailingGroups] = useState([]);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [managingGroup, setManagingGroup] = useState(null); // Groupe en cours d'édition
    const [newGroupName, setNewGroupName] = useState('');
    const [searchStudent, setSearchStudent] = useState('');

    const [isEditingSignature, setIsEditingSignature] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    
    const [filter, setFilter] = useState('TOUS');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState('');
    
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const fileInputRef = useRef(null);

    const quillModules = {
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'header': '1' }, { 'header': '2' }, 'blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    const signatureModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    useEffect(() => { 
        loadData(); 
        loadTemplates(); 
        loadSignature();
    }, []);

    const loadData = async () => {
        try {
            const [kidsRes, famRes, classRes, groupsRes] = await Promise.all([
                api.get('/children'), 
                api.get('/families'),
                api.get('/classes'),
                api.get('/mail/groups') // Récupération des groupes
            ]);
            setChildren(kidsRes.data);
            setFamilies(famRes.data);
            setClasses(classRes.data);
            setMailingGroups(groupsRes.data);
        } catch (e) { console.error(e); }
    };

    const loadTemplates = async () => {
        try {
            const res = await api.get('/mail/templates');
            setTemplates(res.data);
        } catch (e) { console.error(e); }
    };

    const loadSignature = async () => {
        try {
            const res = await api.get('/settings/signature');
            setSignature(res.data.signature);
        } catch (e) { console.error(e); }
    };

    const handleSaveSignature = async () => {
        try {
            await api.post('/settings/signature', { signature });
            setIsEditingSignature(false);
            alert("Signature enregistrée !");
        } catch (e) { alert("Erreur lors de l'enregistrement"); }
    };

    const saveAsTemplate = async () => {
        const name = window.prompt("Sous quel nom voulez-vous enregistrer ce modèle ?");
        if (!name) return;
        try {
            await api.post('/mail/templates', { name, subject, content: message });
            loadTemplates();
            alert("Modèle enregistré !");
        } catch (e) { alert("Erreur"); }
    };

    const applyTemplate = (t) => {
        if (message && !window.confirm("Remplacer le message actuel ?")) return;
        setSubject(t.subject);
        setMessage(t.content);
    };

    // --- GESTION DES GROUPES DE MAILING (CRUD) ---
    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        try {
            const res = await api.post('/mail/groups', { name: newGroupName, children: [] });
            setMailingGroups([...mailingGroups, res.data]);
            setNewGroupName('');
            setManagingGroup(res.data);
        } catch (e) { alert("Erreur de création"); }
    };

    const handleDeleteGroup = async (id) => {
        if (!window.confirm("Supprimer ce groupe ?")) return;
        try {
            await api.delete(`/mail/groups/${id}`);
            setMailingGroups(mailingGroups.filter(g => g._id !== id));
            if (managingGroup?._id === id) setManagingGroup(null);
            if (selectedGroupId === id) setSelectedGroupId('');
        } catch (e) { alert("Erreur de suppression"); }
    };

    const handleAddChildToGroup = async (childId) => {
        if (!managingGroup) return;
        const newChildrenIds = [...managingGroup.children.map(c => c._id), childId];
        try {
            const res = await api.put(`/mail/groups/${managingGroup._id}`, { children: newChildrenIds });
            setManagingGroup(res.data);
            setMailingGroups(mailingGroups.map(g => g._id === res.data._id ? res.data : g));
            setSearchStudent('');
        } catch (e) { alert("Erreur d'ajout"); }
    };

    const handleRemoveChildFromGroup = async (childId) => {
        if (!managingGroup) return;
        const newChildrenIds = managingGroup.children.filter(c => c._id !== childId).map(c => c._id);
        try {
            const res = await api.put(`/mail/groups/${managingGroup._id}`, { children: newChildrenIds });
            setManagingGroup(res.data);
            setMailingGroups(mailingGroups.map(g => g._id === res.data._id ? res.data : g));
        } catch (e) { alert("Erreur de suppression"); }
    };

    // --- MOTEUR DE CIBLAGE MULTI-FILTRES ---
    const targetData = useMemo(() => {
        let matchingFamilyIds = new Set();
        
        families.forEach(f => {
            let isIncluded = false;
            const hasNoIncome = !f.revenuReference || !f.nombreParts;
            const hasNoContact = !f.responsables || f.responsables.length === 0 || !f.responsables.some(r => r.email);
            const isIncomplete = hasNoIncome || hasNoContact || f.dossierComplet === false;

            if (filter === 'TOUS') isIncluded = true;
            else if (filter === 'INCOMPLET' && isIncomplete) isIncluded = true;
            
            if (isIncluded) matchingFamilyIds.add(f._id);
        });

        children.forEach(c => {
            if (c.active === false) return;
            const famIds = c.families ? c.families.map(f => typeof f === 'object' ? f._id : f) : [];
            
            famIds.forEach(famId => {
                if (!famId) return;
                if (filter === 'MATERNELLE' && c.category === 'Maternelle') matchingFamilyIds.add(famId);
                if (filter === 'ELEMENTAIRE' && c.category === 'Élémentaire') matchingFamilyIds.add(famId);
                if (filter === 'PAI' && c.hasPAI) matchingFamilyIds.add(famId);
            });
        });

        let finalFamilyIds = new Set();
        
        Array.from(matchingFamilyIds).forEach(famId => {
            const family = families.find(f => f._id === famId);
            if (!family) return;

            const familyChildren = children.filter(c => {
                const fIds = c.families ? c.families.map(f => typeof f === 'object' ? f._id : f) : [];
                return fIds.includes(famId);
            });

            let keepFamily = true;

            if (selectedClassId) {
                const hasChildInClass = familyChildren.some(c => (c.classGroup?._id || c.classGroup) === selectedClassId);
                if (!hasChildInClass) keepFamily = false;
            }

            // 👉 NOUVEAU : Application du filtre par groupe de diffusion
            if (keepFamily && selectedGroupId) {
                const group = mailingGroups.find(g => g._id === selectedGroupId);
                if (group) {
                    const kidsInGroupIds = group.children.map(c => c._id || c);
                    const hasChildInGroup = familyChildren.some(c => kidsInGroupIds.includes(c._id));
                    if (!hasChildInGroup) keepFamily = false;
                }
            }

            if (keepFamily && searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const matchFamilyName = family.name?.toLowerCase().includes(query);
                const matchChildName = familyChildren.some(c => 
                    c.firstName?.toLowerCase().includes(query) || 
                    c.lastName?.toLowerCase().includes(query)
                );
                if (!matchFamilyName && !matchChildName) keepFamily = false;
            }

            if (keepFamily) finalFamilyIds.add(famId);
        });

        const emails = new Set();
        families.filter(f => finalFamilyIds.has(f._id)).forEach(f => {
            f.responsables?.forEach(r => {
                if (r.email && r.email.includes('@')) emails.add(r.email.trim());
            });
        });
        
        return { emails: Array.from(emails) };
    }, [families, children, filter, selectedClassId, searchQuery, mailingGroups, selectedGroupId]);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) return alert("Max 5 Mo");
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => [...prev, { filename: file.name, path: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (targetData.emails.length === 0) return;
        if (!window.confirm(`Confirmer l'envoi à ${targetData.emails.length} destinataires ?`)) return;

        setIsSending(true);
        try {
            const finalMessage = `${message}<br><br><div style="margin-top:20px;">${signature}</div>`;
            await api.post('/mail/send', { 
                subject, 
                message: finalMessage, 
                recipients: targetData.emails, 
                attachments 
            });
            setSendResult({ type: 'success', msg: "Message envoyé avec succès !" });
            setSubject(''); setMessage(''); setAttachments([]);
        } catch (error) { setSendResult({ type: 'error', msg: "Erreur lors de l'envoi." }); }
        setIsSending(false);
    };

    // Filtre des élèves pour l'ajout au groupe (exclut ceux déjà présents)
    const availableStudentsForGroup = searchStudent.length >= 2 
        ? children.filter(c => 
            c.active !== false &&
            !managingGroup?.children.some(gChild => gChild._id === c._id) &&
            (c.lastName.toLowerCase().includes(searchStudent.toLowerCase()) || c.firstName.toLowerCase().includes(searchStudent.toLowerCase()))
          )
        : [];

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* COLONNE GAUCHE - OUTILS DE CIBLAGE */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-car-dark uppercase tracking-widest mb-4 flex items-center gap-2"><Search size={18}/> Recherche ciblée</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Nom famille ou enfant..." 
                                    className="w-full bg-slate-50 border border-slate-200 py-3 pl-10 pr-4 rounded-xl text-sm font-bold outline-none focus:border-car-blue transition-colors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 👉 NOUVEAU : BLOC DE GESTION DES GROUPES */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-sm font-black text-car-dark uppercase tracking-widest flex items-center gap-2"><UsersRound size={18}/> Groupes</h2>
                                <button onClick={() => setShowGroupModal(true)} className="text-[10px] bg-car-purple/10 text-car-purple px-2 py-1 rounded-md font-bold hover:bg-car-purple hover:text-white transition-colors">
                                    GÉRER
                                </button>
                            </div>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-car-purple text-slate-600 cursor-pointer"
                                value={selectedGroupId}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                            >
                                <option value="">Tous les groupes</option>
                                {mailingGroups.map(g => (
                                    <option key={g._id} value={g._id}>📍 {g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-car-dark uppercase tracking-widest mb-4 flex items-center gap-2"><GraduationCap size={18}/> Filtre par Classe</h2>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-car-blue text-slate-600"
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                            >
                                <option value="">Toutes les classes</option>
                                {classes.map(c => (
                                    <option key={c._id} value={c._id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-car-dark uppercase tracking-widest mb-4 flex items-center gap-2"><Filter size={18}/> Ciblage global</h2>
                            <div className="space-y-2">
                                {['TOUS', 'MATERNELLE', 'ELEMENTAIRE', 'INCOMPLET', 'PAI'].map(f => (
                                    <button 
                                        key={f} 
                                        onClick={() => setFilter(f)} 
                                        className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-car-blue text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {f === 'TOUS' ? 'Toutes les familles' : f === 'INCOMPLET' ? 'Dossiers incomplets' : f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-car-dark text-white p-6 rounded-[2rem] shadow-lg text-center">
                            <Users size={32} className="mx-auto mb-2 opacity-30"/>
                            <span className="block text-4xl font-black">{targetData.emails.length}</span>
                            <span className="text-xs font-bold uppercase opacity-70 tracking-widest">Destinataires</span>
                        </div>
                        
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-car-dark uppercase tracking-widest mb-4 flex items-center gap-2"><Bookmark size={18}/> Modèles rapides</h2>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 mb-4">
                                {templates.map(t => (
                                    <button key={t._id} onClick={() => applyTemplate(t)} className="w-full text-left p-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-car-blue/10 transition-all truncate">📄 {t.name}</button>
                                ))}
                            </div>
                            <div className="border-t border-slate-100 pt-4 text-center">
                                <button 
                                    onClick={() => setIsEditingSignature(!isEditingSignature)} 
                                    className="text-car-blue font-bold text-xs flex items-center justify-center gap-2 mx-auto hover:underline"
                                >
                                    <PenTool size={16}/> {isEditingSignature ? "Fermer signature" : "Paramétrer signature"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COLONNE DROITE - ÉDITEUR MESSAGE */}
                    <div className="lg:col-span-3 space-y-6">
                        {isEditingSignature && (
                            <div className="bg-car-blue/5 p-6 rounded-[2rem] border-2 border-dashed border-car-blue/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-car-blue font-black uppercase text-sm tracking-widest flex items-center gap-2"><PenTool size={18}/> Éditeur de Signature</h2>
                                    <button onClick={handleSaveSignature} className="bg-car-blue text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-car-dark transition-colors"><Check size={16}/> Enregistrer</button>
                                </div>
                                <div className="bg-white rounded-xl overflow-hidden border border-car-blue/20">
                                    <ReactQuill theme="snow" value={signature} onChange={setSignature} modules={signatureModules} />
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSend} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black text-car-dark uppercase tracking-widest">Rédaction du message</h2>
                                <button type="button" onClick={saveAsTemplate} className="text-car-blue font-bold text-sm flex items-center gap-2 hover:underline"><Save size={18}/> Modèle</button>
                            </div>

                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 font-black outline-none focus:border-car-blue text-lg" placeholder="Objet de l'email..." value={subject} onChange={e => setSubject(e.target.value)} />

                            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
                                <ReactQuill theme="snow" value={message} onChange={setMessage} modules={quillModules} className="h-[350px] mb-12" placeholder="Rédigez votre email..." />
                            </div>

                            <div className="mb-6">
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                <button type="button" onClick={() => fileInputRef.current.click()} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200"><Paperclip size={18}/> Joindre un fichier</button>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {attachments.map((f, i) => (
                                        <div key={i} className="bg-car-blue/10 text-car-blue px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><FileIcon size={14}/><span className="truncate max-w-[150px]">{f.filename}</span><X size={16} className="cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}/></div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isSending || targetData.emails.length === 0} className="w-full bg-car-blue text-white p-5 rounded-2xl font-black shadow-lg shadow-car-blue/20 hover:-translate-y-1 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSending ? <Loader className="animate-spin"/> : <><Send size={24}/> ENVOYER AUX {targetData.emails.length} FAMILLES</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* 👉 NOUVEAU : MODALE GESTION DES GROUPES DE MAILING */}
            {showGroupModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
                            <h3 className="text-2xl font-black text-car-purple flex items-center gap-2"><UsersRound size={24}/> Groupes de Diffusion (Mailing)</h3>
                            <button onClick={() => {setShowGroupModal(false); setManagingGroup(null);}} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0 overflow-hidden">
                            {/* Liste des groupes à gauche */}
                            <div className="lg:w-1/3 flex flex-col border-r border-slate-100 pr-6">
                                <form onSubmit={handleCreateGroup} className="flex gap-2 mb-4 shrink-0">
                                    <input type="text" className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none focus:border-car-purple" placeholder="Nom du groupe..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                                    <button type="submit" className="bg-car-purple text-white p-3 rounded-xl hover:bg-purple-700 transition-colors"><Plus size={20}/></button>
                                </form>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                    {mailingGroups.map(g => (
                                        <div key={g._id} onClick={() => setManagingGroup(g)} className={`p-4 rounded-xl cursor-pointer flex justify-between items-center transition-colors border ${managingGroup?._id === g._id ? 'bg-car-purple/10 border-car-purple text-car-purple' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                            <div>
                                                <span className="font-bold block text-sm">{g.name}</span>
                                                <span className="text-xs font-bold opacity-60">{g.children.length} enfant(s)</span>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g._id); }} className="text-slate-400 hover:text-car-pink p-2"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Édition du groupe sélectionné à droite */}
                            <div className="lg:w-2/3 flex flex-col bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                {managingGroup ? (
                                    <>
                                        <h4 className="font-black text-car-dark text-lg mb-4 uppercase">{managingGroup.name}</h4>
                                        <div className="relative mb-6 shrink-0">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 focus-within:border-car-purple transition-colors">
                                                <Search className="text-slate-400 mr-2" size={18} />
                                                <input type="text" className="w-full bg-transparent p-3 font-bold text-car-dark outline-none text-sm" placeholder="Ajouter un enfant par nom/prénom..." value={searchStudent} onChange={e => setSearchStudent(e.target.value)} />
                                            </div>
                                            {searchStudent.length >= 2 && (
                                                <div className="absolute w-full mt-2 bg-white shadow-xl rounded-2xl border border-slate-100 max-h-60 overflow-y-auto z-20">
                                                    {availableStudentsForGroup.map(c => (
                                                        <div key={c._id} className="p-3 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                            <span className="font-bold uppercase text-sm text-car-dark">{c.lastName} <span className="font-medium capitalize text-slate-500">{c.firstName}</span></span>
                                                            <button onClick={() => handleAddChildToGroup(c._id)} className="bg-car-purple text-white text-xs font-bold px-3 py-1.5 rounded-lg">+ Ajouter</button>
                                                        </div>
                                                    ))}
                                                    {availableStudentsForGroup.length === 0 && <div className="p-3 text-center text-xs font-bold text-slate-400">Aucun enfant correspondant</div>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-2">
                                            {managingGroup.children.map(c => (
                                                <div key={c._id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                    <span className="font-bold uppercase text-sm text-car-dark">{c.lastName} <span className="font-medium capitalize text-slate-500">{c.firstName}</span></span>
                                                    <button onClick={() => handleRemoveChildFromGroup(c._id)} className="text-slate-400 hover:text-car-pink p-2 bg-slate-50 rounded-lg transition-colors"><X size={16}/></button>
                                                </div>
                                            ))}
                                            {managingGroup.children.length === 0 && <div className="text-center p-8 text-slate-400 font-bold italic">Ce groupe est vide.</div>}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                        <UsersRound size={48} className="mb-2"/>
                                        <p className="font-bold">Sélectionnez un groupe à modifier</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mailing;