import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, AlertTriangle, CheckCircle, Search, Plus, Trash2, Download, Save, Users, Info, Pencil, X, Banknote, FileText, Phone, Check, Copy, CornerDownRight, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ChildInfoModal from '../components/ChildInfoModal';

const FamilyManager = () => {
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    
    const [searchFamilyText, setSearchFamilyText] = useState('');
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [editFamily, setEditFamily] = useState(null); 
    const [searchOrphan, setSearchOrphan] = useState('');
    
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [editingChild, setEditingChild] = useState(null);

    // --- STATES DU WORKFLOW DE VALIDATION REEL ---
    const [activeRequest, setActiveRequest] = useState(null);
    const [refusalText, setRefusalText] = useState('');
    const [showRefusalInput, setShowRefusalInput] = useState(false);

    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [kidsRes, famRes] = await Promise.all([
            api.get(`/children`),
            api.get(`/families`)
        ]);
        setChildren(kidsRes.data);
        setFamilies(famRes.data);
        
        if (selectedFamily) {
            const updatedFam = famRes.data.find(f => f._id === selectedFamily._id);
            setSelectedFamily(updatedFam || null);
        }
    };

    useEffect(() => {
        if (selectedFamily) {
            const resps = [...(selectedFamily.responsables || [])];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            const docs = selectedFamily.documents || { assuranceRC: {}, vaccins: {}, avisImposition: {}, attestationCAF: {} };
            setEditFamily({ ...selectedFamily, responsables: resps, documents: docs });
            
            api.get(`/requests/family/${selectedFamily._id}`).then(res => {
                setActiveRequest(res.data && res.data.status === 'PENDING' ? res.data : null);
            }).catch(() => setActiveRequest(null));
        } else {
            setEditFamily(null);
            setActiveRequest(null);
        }
    }, [selectedFamily]);

    const handleApproveRequest = async () => {
        try {
            const { data } = await api.post(`/requests/${activeRequest._id}/approve`);
            if (data.success) {
                alert("✓ Modifications acceptées et appliquées sur le dossier de production !");
                setSelectedFamily(data.family);
                setActiveRequest(null);
                loadData();
            }
        } catch (e) { alert("Erreur lors de l'approbation de la demande."); }
    };

    const handleRejectRequest = async (e) => {
        e.preventDefault();
        if (!refusalText.trim()) return alert("Veuillez saisir un motif.");
        try {
            await api.post(`/requests/${activeRequest._id}/reject`, { message: refusalText });
            alert("Rejet enregistré. L'usager a été notifié sur son portail.");
            setActiveRequest(null);
            setShowRefusalInput(false);
            setRefusalText('');
        } catch (e) { alert("Erreur lors du rejet de la demande."); }
    };

    const handleSearchOrCreateFamily = async (e) => {
        e.preventDefault();
        const searchName = searchFamilyText.trim().toUpperCase();
        if (!searchName) return;

        const existingFamilies = families.filter(f => f.name === searchName);
        if (existingFamilies.length > 0) {
            const wantsToCreateDuplicate = window.confirm(`⚠️ Une ou plusieurs familles nommées "${searchName}" existent déjà !\n\nVoulez-vous vraiment en créer une NOUVELLE ?\n\n(Cliquez sur "Annuler" pour simplement ouvrir le dossier existant)`);
            if (!wantsToCreateDuplicate) {
                setSelectedFamily(existingFamilies[0]);
                setSearchFamilyText('');
                return;
            }
        }
        try {
            const res = await api.post(`/families`, { name: searchName });
            setSearchFamilyText('');
            loadData();
            setSelectedFamily(res.data);
        } catch (e) { alert("Erreur à la création."); }
    };

    const handleDeleteFamily = async (id) => {
        const confirmWord = window.prompt(`🛑 DANGER 🛑\n\nVous allez SUPPRIMER DÉFINITIVEMENT ce dossier famille.\nLes enfants ne seront pas effacés mais perdront leurs parents et deviendront "sans dossier".\n\nPour confirmer, tapez : SUPPRIMER`);
        if (confirmWord === "SUPPRIMER") {
            await api.delete(`/families/${id}`);
            setSelectedFamily(null);
            loadData();
        } else if (confirmWord !== null) {
            alert("Suppression annulée.");
        }
    };

    const handleAttachChild = async (childId, familyId) => {
        await api.put(`/children/${childId}`, { family: familyId });
        loadData();
        setSearchOrphan('');
    };

    const handleDetachChild = async (childId) => {
        if (window.confirm("Détacher cet enfant de la famille ?")) {
            await api.put(`/children/${childId}`, { family: null });
            loadData();
        }
    };

    const handleSaveFamily = async () => {
        try {
            const res = await api.put(`/families/${selectedFamily._id}`, editFamily);
            setSelectedFamily(res.data);
            setFamilies(families.map(f => f._id === res.data._id ? res.data : f));
            alert("Dossier sauvegardé avec succès !");
        } catch (e) { alert("Erreur lors de la sauvegarde."); }
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

    const startAddChild = () => {
        setEditingChild({
            _id: null, active: true, firstName: '', lastName: selectedFamily.name, category: 'Maternelle', sexe: '', birthDate: '', droitImage: false, autorisationSortieSeul: false,
            medical: { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '', autresInfos: '' },
            hasPAI: false, paiDetails: '', isPAIAlimentaire: false, paiDocument: '', regimeAlimentaire: 'Standard', personnesAutorisees: [], documents: { vaccins: {}, assurance: {} }
        });
    };

    const startEditChild = (child) => {
        setEditingChild({
            _id: child._id, active: child.active !== false, firstName: child.firstName, lastName: child.lastName, category: child.category || 'Maternelle', sexe: child.sexe || '',
            birthDate: child.birthDate ? child.birthDate.split('T')[0] : '', droitImage: child.droitImage || false, autorisationSortieSeul: child.autorisationSortieSeul || false,
            medical: child.medical || { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '', autresInfos: '' },
            hasPAI: child.hasPAI || false, paiDetails: child.paiDetails || '', isPAIAlimentaire: child.isPAIAlimentaire || false, paiDocument: child.paiDocument || '', regimeAlimentaire: child.regimeAlimentaire || 'Standard',
            personnesAutorisees: child.personnesAutorisees || [], documents: child.documents || { vaccins: {}, assurance: {} }
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
        const sibling = attachedChildren.find(c => c._id !== editingChild._id && c.personnesAutorisees?.length > 0);
        if (sibling) {
            setEditingChild({ ...editingChild, personnesAutorisees: [...sibling.personnesAutorisees] });
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
                await api.post(`/children`, { ...editingChild, family: selectedFamily._id });
            }
            setEditingChild(null);
            loadData();
        } catch (err) { alert("Erreur sauvegarde enfant."); }
    };

    const exportFamilyPDF = () => {
        if (!editFamily) return;
        const doc = new jsPDF();
        let yPos = 20;

        const appendDocumentToPDF = (fileUrl, title) => {
            if (!fileUrl) return;
            if (fileUrl.startsWith('data:image')) {
                doc.addPage(); doc.setFontSize(16); doc.setTextColor(0);
                doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
                try { doc.addImage(fileUrl, 14, 30, 180, 0); } catch(e) { console.error(e); }
            } else if (fileUrl.startsWith('data:application/pdf')) {
                doc.addPage(); doc.setFontSize(16); doc.setTextColor(0);
                doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20); doc.setFontSize(12); doc.setTextColor(100);
                doc.text("Document au format PDF. Consultez-le sur le logiciel.", 14, 40);
            }
        };

        doc.setFontSize(18); doc.text(`DOSSIER FAMILLE : ${editFamily.name.toUpperCase()}`, 14, yPos);
        doc.setFontSize(10); doc.setTextColor(100); yPos += 8;
        doc.text(`Statut : ${editFamily.dossierComplet ? 'Complet' : 'Incomplet'} | Edité le ${new Date().toLocaleDateString('fr-FR')}`, 14, yPos); yPos += 12;

        const facturationData = [
            ['Code Portail', editFamily.portalCode || 'Non renseigné'],
            ['Payeur par défaut', editFamily.payeur || '-'],
            ['Revenu de Référence', editFamily.revenuReference ? `${editFamily.revenuReference} €` : '-'],
            ['Nombre de parts', editFamily.nombreParts || '-'],
            ['Quotient Familial (Calculé)', editFamily.quotientFamilial || '-'],
            ['Justificatif CAF', `${editFamily.documents?.attestationCAF?.status || 'Manquant'}`]
        ];

        autoTable(doc, { startY: yPos, head: [['Facturation & Administratif', 'Valeur']], body: facturationData, theme: 'grid', headStyles: { fillColor: [84, 132, 164] } });
        yPos = doc.lastAutoTable.finalY + 10;

        const respBody = [];
        editFamily.responsables.forEach((r, i) => {
            if(r.lastName || r.firstName) {
                respBody.push([{ content: `Responsable ${i+1} : ${r.qualite || ''}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);
                respBody.push(['Identité', `${r.lastName?.toUpperCase()} ${r.firstName}`]);
                respBody.push(['Téléphone', r.phoneMobile || '-']);
                respBody.push(['Email', r.email || '-']);
                respBody.push(['Profession', `${r.profession || '-'} chez ${r.employeur || '-'}`]);
                respBody.push(['Sécurité Sociale / CAF', `${r.couvertureSociale || '-'} - Allocataire N°: ${r.numAllocataireCAF || '-'}`]);
            }
        });

        if (respBody.length > 0) { autoTable(doc, { startY: yPos, body: respBody, theme: 'grid' }); yPos = doc.lastAutoTable.finalY + 15; }

        if (attachedChildren.length > 0) {
            doc.setFontSize(14); doc.setTextColor(20); doc.text("Enfants rattachés au foyer :", 14, yPos); yPos += 8;
            attachedChildren.forEach(child => {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                const childBody = [
                    ['Catégorie', child.category],
                    ['Date de naissance', child.birthDate ? new Date(child.birthDate).toLocaleDateString('fr-FR') : '-'],
                    ['Autorisations', `Image: ${child.droitImage?'OUI':'NON'} | Sortie Seul: ${child.autorisationSortieSeul?'OUI':'NON'}`],
                    ['Médical', `Médecin: ${child.medical?.medecinNom||'-'} | Sport: ${child.medical?.activitesPhysiques !== false ?'OUI':'NON'} | Autres: ${child.medical?.autresInfos ? 'OUI' : 'NON'}`],
                    ['Vaccins & Assurance', `Vaccins: ${child.documents?.vaccins?.status||'Manquant'} | Assurance RC: ${child.documents?.assurance?.status||'Manquant'}`]
                ];
                if (child.hasPAI) childBody.push(['PAI', `ACTIF - ${child.isPAIAlimentaire ? 'Alimentaire' : 'Médical'} (${child.paiDetails})`]);

                autoTable(doc, { startY: yPos, head: [[`${child.firstName} ${child.lastName.toUpperCase()}`, 'Détails']], body: childBody, theme: 'grid', headStyles: { fillColor: [13, 148, 136] } });
                yPos = doc.lastAutoTable.finalY + 5;

                if (child.personnesAutorisees && child.personnesAutorisees.length > 0) {
                    if (yPos > 260) { doc.addPage(); yPos = 20; }
                    const authBody = child.personnesAutorisees.map(p => [`${p.lastName?.toUpperCase()} ${p.firstName}`, p.phone || '-', p.isEmergency ? 'OUI' : 'NON']);
                    autoTable(doc, { startY: yPos, head: [['Personnes Autorisées', 'Téléphone', 'Urgence']], body: authBody, theme: 'grid', headStyles: { fillColor: [156, 163, 175] } });
                    yPos = doc.lastAutoTable.finalY + 10;
                } else { yPos += 5; }
            });
        }

        if (editFamily.documents?.attestationCAF?.fileUrl) appendDocumentToPDF(editFamily.documents.attestationCAF.fileUrl, "Justificatif CAF Famille");
        attachedChildren.forEach(child => {
            if (child.paiDocument) appendDocumentToPDF(child.paiDocument, `Protocole PAI - ${child.firstName}`);
            if (child.documents?.vaccins?.fileUrl) appendDocumentToPDF(child.documents.vaccins.fileUrl, `Vaccins - ${child.firstName}`);
            if (child.documents?.assurance?.fileUrl) appendDocumentToPDF(child.documents.assurance.fileUrl, `Assurance RC - ${child.firstName}`);
        });

        doc.save(`Dossier_Famille_${editFamily.name.toUpperCase()}.pdf`);
    };

    const handleSendParentInvite = async () => {
        const emailResp1 = editFamily.responsables[0]?.email;
        if (!emailResp1) {
            return alert("⚠️ Veuillez d'abord renseigner une adresse email valide pour le Responsable 1 afin de lui envoyer son accès.");
        }

        if (window.confirm(`Voulez-vous générer et envoyer un lien d'activation du Portail Famille à l'adresse : ${emailResp1} ?`)) {
            try {
                const { data } = await api.post('/parent/invite', {
                    email: emailResp1,
                    familyId: selectedFamily._id
                });
                if (data.success) {
                    window.prompt("✅ Compte parent créé ! Voici le lien unique d'activation généré :", data.link);
                }
            } catch (e) {
                alert(`Erreur : ${e.response?.data || "Impossible de générer l'invitation."}`);
            }
        }
    };

    const orphans = children.filter(c => !c.family);
    const filteredOrphans = searchOrphan.length >= 2 ? orphans.filter(c => c.lastName.toLowerCase().includes(searchOrphan.toLowerCase()) || c.firstName.toLowerCase().includes(searchOrphan.toLowerCase())) : [];
    const attachedChildren = selectedFamily ? children.filter(c => c.family === selectedFamily._id || c.family?._id === selectedFamily._id) : [];
    const filteredFamilies = searchFamilyText.trim() === '' ? families : families.filter(f => f.name.toLowerCase().includes(searchFamilyText.toLowerCase()));

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-7xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-yellow/10 p-4 rounded-2xl"><FolderHeart className="text-car-yellow w-8 h-8"/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Dossiers Familles</h1>
                            <p className="text-slate-500 font-medium mt-1">Gestion centralisée &amp; Rattachements</p>
                        </div>
                    </div>
                    
                    <div className={`px-6 py-4 rounded-2xl font-black text-lg flex items-center gap-3 shadow-sm ${orphans.length > 0 ? 'bg-car-pink text-white animate-pulse' : 'bg-car-green text-white'}`}>
                        {orphans.length > 0 ? <AlertTriangle size={24}/> : <CheckCircle size={24}/>}
                        {orphans.length} ENFANTS SANS DOSSIER
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <div className="xl:col-span-1 space-y-4">
                        <form onSubmit={handleSearchOrCreateFamily} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-2 items-center">
                            <Search className="text-slate-400 ml-2" size={20} />
                            <input className="bg-transparent border-none p-2 outline-none font-black text-car-dark placeholder:text-slate-300 flex-1 uppercase text-sm" placeholder="CHERCHER OU CRÉER..." value={searchFamilyText} onChange={e => setSearchFamilyText(e.target.value)} />
                            <button type="submit" title="Créer un nouveau dossier" className="bg-car-dark text-white p-3 rounded-xl hover:bg-black transition-colors shrink-0"><Plus size={20}/></button>
                        </form>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[800px]">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 font-black text-slate-400 text-xs tracking-widest uppercase flex justify-between">
                                <span>{filteredFamilies.length} Dossiers</span>
                                {searchFamilyText && <span className="text-car-yellow">Filtré</span>}
                            </div>
                            <div className="overflow-y-auto flex-1 p-2">
                                {filteredFamilies.map(fam => {
                                    const famChildrenCount = children.filter(c => c.family === fam._id || c.family?._id === fam._id).length;
                                    return (
                                        <button key={fam._id} onClick={() => setSelectedFamily(fam)} className={`w-full text-left p-4 rounded-2xl mb-1 flex items-center justify-between transition-all ${selectedFamily?._id === fam._id ? 'bg-car-yellow text-white shadow-md' : 'hover:bg-slate-50 text-car-dark'}`}>
                                            <div>
                                                <span className="font-black block text-lg uppercase">{fam.name}</span>
                                                <span className={`text-xs font-bold ${selectedFamily?._id === fam._id ? 'text-white/80' : 'text-slate-400'}`}>{famChildrenCount} enfant(s)</span>
                                            </div>
                                            {!fam.dossierComplet && <span className="w-3 h-3 rounded-full bg-car-pink" title="Dossier Incomplet"></span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-3">
                        {selectedFamily && editFamily ? (
                            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 min-h-[800px] flex flex-col gap-6">
                                
                                {/* HEADER ACTIONS DU DOSSIER RE-PAQUETÉ CORRECTEMENT AVEC FLEX-WRAP */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6 w-full">
                                    <div className="space-y-1">
                                        <h2 className="text-3xl font-black text-car-dark uppercase">Famille <span className="text-car-yellow">{selectedFamily.name}</span></h2>
                                        <div className="flex flex-wrap items-center gap-3 pt-2">
                                            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">🔑 Code :</span>
                                                <input type="text" className="bg-transparent border-none outline-none font-black text-car-dark text-sm w-24 uppercase placeholder:text-slate-300" value={editFamily.portalCode || ''} onChange={e => setEditFamily({...editFamily, portalCode: e.target.value.toUpperCase()})} placeholder="EX: 1234A" />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer group w-fit">
                                                <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editFamily.dossierComplet} onChange={e => setEditFamily({...editFamily, dossierComplet: e.target.checked})} />
                                                <span className={`font-bold text-sm ${editFamily.dossierComplet ? 'text-car-green' : 'text-car-pink group-hover:text-car-dark transition-colors'}`}>
                                                    {editFamily.dossierComplet ? 'Dossier complet' : 'Dossier incomplet'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                    
                                    {/* CONTENEUR FIXE DES BOUTONS D'ACTIONS ACTIONS */}
                                    <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
                                        <button type="button" onClick={() => handleDeleteFamily(selectedFamily._id)} className="text-slate-400 hover:text-car-pink bg-slate-50 p-4 rounded-2xl transition-colors" title="Supprimer la famille"><Trash2 size={24}/></button>
                                        <button type="button" onClick={exportFamilyPDF} className="text-slate-400 hover:text-car-blue bg-slate-50 p-4 rounded-2xl transition-colors" title="Télécharger le dossier complet"><Download size={24}/></button>
                                        <button type="button" onClick={handleSendParentInvite} className="bg-car-blue text-white px-5 py-4 rounded-2xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-car-blue/15 text-xs"><Mail size={18}/> INVITER PARENT</button>
                                        <button type="button" onClick={handleSaveFamily} className="bg-car-green text-white px-5 py-4 rounded-2xl font-black tracking-widest hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-car-green/15 text-xs"><Save size={18}/> SAUVEGARDER</button>
                                    </div>
                                </div>

                                {/* --- WORKFLOW LIVE PARENT MODERATION ENCART --- */}
                                {activeRequest && (
                                    <div className="bg-orange-500/10 border-2 border-dashed border-orange-500/30 p-5 rounded-2xl flex flex-col gap-4 animate-in fade-in duration-300">
                                        <div className="flex items-start gap-3 text-orange-600">
                                            <AlertTriangle className="shrink-0 mt-0.5" size={20}/>
                                            <div>
                                                <h4 className="font-black text-sm uppercase tracking-wide">Demande de modification soumise par l'usager</h4>
                                                <p className="text-xs text-slate-600 font-medium mt-0.5">Le parent a demandé à appliquer de nouvelles données. Traitez la demande ci-dessous avant d'écrire définitivement.</p>
                                                <div className="mt-2 text-xs bg-white p-2.5 rounded-xl border inline-block font-mono text-slate-600">
                                                    <CornerDownRight size={12} className="inline mr-1 text-slate-400"/>
                                                    Nouveau revenu transmis : <span className="line-through text-car-pink">{activeRequest.originalData?.revenuReference || '0'} €</span> → <span className="text-car-green font-black">{activeRequest.newData?.revenuReference || '0'} €</span>
                                                </div>
                                            </div>
                                        </div>
                                        {!showRefusalInput ? (
                                            <div className="flex gap-2 self-end text-xs font-black uppercase tracking-wider">
                                                <button type="button" onClick={() => setShowRefusalInput(true)} className="bg-car-pink text-white px-4 py-2 rounded-xl hover:bg-pink-600 transition-all">Rejeter</button>
                                                <button type="button" onClick={handleApproveRequest} className="bg-car-green text-white px-4 py-2 rounded-xl hover:bg-green-600 transition-all shadow-md">✓ Accepter et Écrire en BDD</button>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleRejectRequest} className="space-y-3 bg-white p-4 rounded-xl border">
                                                <label className="text-[10px] font-bold text-slate-400 block uppercase">Motif du refus (Sera affiché aux parents) :</label>
                                                <input type="text" className="w-full bg-slate-50 border p-2.5 rounded-lg text-xs font-medium outline-none focus:border-car-pink" placeholder="Ex: Pièce jointe illisible. Merci de ré-uploader..." value={refusalText} onChange={e => setRefusalText(e.target.value)} required />
                                                <div className="flex justify-end gap-2 text-[10px] font-bold uppercase">
                                                    <button type="button" onClick={() => setShowRefusalInput(false)} className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded-md">Annuler</button>
                                                    <button type="submit" className="bg-car-pink text-white px-3 py-1.5 rounded-md">Envoyer le refus</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col">
                                        <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Users size={18}/> Enfants du foyer</h3>
                                        {attachedChildren.length > 0 ? (
                                            <div className="space-y-2 mb-6">
                                                {attachedChildren.map(c => (
                                                    <div key={c._id} className="flex justify-between items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100 group">
                                                        <div onClick={() => setChildInfoToView(c)} className="flex items-center gap-3 cursor-pointer flex-1" title="Voir la fiche">
                                                            <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:text-car-blue transition-colors"><Info size={18}/></div>
                                                            <span className="font-bold text-car-dark uppercase group-hover:text-car-blue transition-colors">{c.lastName} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span></span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button type="button" onClick={() => startEditChild(c)} className="text-slate-400 hover:text-car-yellow p-2 bg-slate-50 rounded-lg transition-colors" title="Modifier"><Pencil size={18}/></button>
                                                            <button type="button" onClick={() => handleDetachChild(c._id)} className="text-slate-400 hover:text-car-pink p-2 bg-slate-50 rounded-lg transition-colors" title="Détacher"><X size={18}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : ( <p className="text-slate-400 font-medium mb-6 italic text-sm">Aucun enfant rattaché.</p> )}
                                        <div className="mt-auto pt-4 border-t border-slate-200">
                                            <div className="relative mb-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Search className="text-slate-400" size={16}/>
                                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rattacher un enfant existant :</label>
                                                </div>
                                                <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-car-yellow outline-none font-bold text-car-dark text-sm" placeholder="Rechercher par prénom..." value={searchOrphan} onChange={e => setSearchOrphan(e.target.value)} />
                                                {searchOrphan.length >= 2 && (
                                                    <div className="absolute w-full mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 max-h-60 overflow-y-auto z-20">
                                                        {filteredOrphans.map(c => (
                                                            <div key={c._id} className="p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                                <span className="font-bold text-car-dark uppercase">{c.lastName} <span className="font-medium capitalize text-slate-500">{c.firstName}</span></span>
                                                                <button type="button" onClick={() => handleAttachChild(c._id, selectedFamily._id)} className="bg-car-green text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform">+ Lier</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <button type="button" onClick={startAddChild} className="w-full bg-car-yellow/10 text-car-yellow font-bold p-3 rounded-xl hover:bg-car-yellow hover:text-white transition-colors text-sm flex justify-center items-center gap-2">
                                                <Plus size={18}/> Créer et ajouter un enfant complet
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                            <h3 className="font-black text-car-dark text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Facturation &amp; QF</h3>
                                            <select className="bg-white border border-slate-200 p-2 rounded-lg outline-none font-bold text-car-dark text-xs" value={editFamily.payeur} onChange={e => setEditFamily({...editFamily, payeur: e.target.value})}>
                                                <option value="Responsable 1">Facture à Resp. 1</option>
                                                <option value="Responsable 2">Facture à Resp. 2</option>
                                                <option value="Autre">Facturation Alternée</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Revenu Réf. (€)</label>
                                                <input type="number" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow font-bold text-car-dark text-sm" value={editFamily.revenuReference || ''} onChange={e => handleQFChange('revenuReference', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Nb Parts</label>
                                                <input type="number" step="0.5" className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none focus:border-car-yellow font-bold text-car-dark text-sm" value={editFamily.nombreParts || ''} onChange={e => handleQFChange('nombreParts', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase text-car-blue">QF Calculé</label>
                                                <div className="w-full bg-car-blue/10 border border-car-blue/20 p-3 rounded-xl font-black text-car-blue text-center text-sm">{editFamily.quotientFamilial || '-'}</div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 mt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><FileText size={14}/> Justificatif CAF/Impot</h4>
                                                {editFamily.documents?.attestationCAF?.fileUrl && (
                                                    <button type="button" onClick={() => {
                                                        const win = window.open();
                                                        win.document.write(`<iframe src="${editFamily.documents.attestationCAF.fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                    }} className="text-car-blue bg-car-blue/10 px-3 py-1 rounded-lg font-bold text-[10px] hover:bg-car-blue hover:text-white transition-colors">👀 VOIR DOC</button>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <select className={`flex-1 p-2 rounded-lg text-sm font-bold border outline-none ${editFamily.documents?.attestationCAF?.status === 'Valide' ? 'bg-car-green/10 text-car-green border-car-green/20' : 'bg-slate-50 text-slate-600 border-slate-100'}`} value={editFamily.documents?.attestationCAF?.status || 'Manquant'} onChange={e => handleDocChange('attestationCAF', 'status', e.target.value)}>
                                                        <option value="Manquant">Manquant</option><option value="Valide">Valide</option><option value="Expiré">Expiré</option>
                                                    </select>
                                                    <input type="date" className="flex-1 bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none focus:border-car-yellow font-medium text-car-dark text-sm" value={editFamily.documents?.attestationCAF?.expiryDate ? editFamily.documents.attestationCAF.expiryDate.split('T')[0] : ''} onChange={e => handleDocChange('attestationCAF', 'expiryDate', e.target.value)} />
                                                </div>
                                                <input type="file" accept=".pdf, image/jpeg, image/png" onChange={(e) => handleFileUpload('attestationCAF', e)} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                        <h3 className="font-black text-car-blue mb-4 text-sm tracking-widest uppercase border-b border-slate-100 pb-2">Responsable 1</h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[0].lastName} onChange={e => handleRespChange(0, 'lastName', e.target.value.toUpperCase())}/>
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[0].firstName} onChange={e => handleRespChange(0, 'firstName', e.target.value)}/>
                                            </div>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="Qualité (Père, Mère...)" value={editFamily.responsables[0].qualite} onChange={e => handleRespChange(0, 'qualite', e.target.value)}/>
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="Téléphone" value={editFamily.responsables[0].phoneMobile} onChange={e => handleRespChange(0, 'phoneMobile', e.target.value)}/>
                                                <input type="email" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="Email" value={editFamily.responsables[0].email} onChange={e => handleRespChange(0, 'email', e.target.value)}/>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="Profession" value={editFamily.responsables[0].profession} onChange={e => handleRespChange(0, 'profession', e.target.value)}/>
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="Employeur" value={editFamily.responsables[0].employeur} onChange={e => handleRespChange(0, 'employeur', e.target.value)}/>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <select className="w-1/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold text-slate-500" value={editFamily.responsables[0].couvertureSociale} onChange={e => handleRespChange(0, 'couvertureSociale', e.target.value)}>
                                                    <option value="CPAM">CPAM</option><option value="MSA">MSA</option><option value="AUTRE">Autre</option>
                                                </select>
                                                <input type="text" className="w-2/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-blue text-sm font-medium" placeholder="N° Allocataire" value={editFamily.responsables[0].numAllocataireCAF} onChange={e => handleRespChange(0, 'numAllocataireCAF', e.target.value)}/>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                        <h3 className="font-black text-car-teal mb-4 text-sm tracking-widest uppercase border-b border-slate-100 pb-2">Responsable 2</h3>
                                        <div className="space-y-3">
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[1].lastName} onChange={e => handleRespChange(1, 'lastName', e.target.value.toUpperCase())}/>
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[1].firstName} onChange={e => handleRespChange(1, 'firstName', e.target.value)}/>
                                            </div>
                                            <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="Qualité (Père, Mère...)" value={editFamily.responsables[1].qualite} onChange={e => handleRespChange(1, 'qualite', e.target.value)}/>
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="Téléphone" value={editFamily.responsables[1].phoneMobile} onChange={e => handleRespChange(1, 'phoneMobile', e.target.value)}/>
                                                <input type="email" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="Email" value={editFamily.responsables[1].email} onChange={e => handleRespChange(1, 'email', e.target.value)}/>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="Profession" value={editFamily.responsables[1].profession} onChange={e => handleRespChange(1, 'profession', e.target.value)}/>
                                                <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="Employeur" value={editFamily.responsables[1].employeur} onChange={e => handleRespChange(1, 'employeur', e.target.value)}/>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-100">
                                                <select className="w-1/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold text-slate-500" value={editFamily.responsables[1].couvertureSociale} onChange={e => handleRespChange(1, 'couvertureSociale', e.target.value)}>
                                                    <option value="CPAM">CPAM</option><option value="MSA">MSA</option><option value="AUTRE">Autre</option>
                                                </select>
                                                <input type="text" className="w-2/3 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none focus:border-car-teal text-sm font-medium" placeholder="N° Allocataire" value={editFamily.responsables[1].numAllocataireCAF} onChange={e => handleRespChange(1, 'numAllocataireCAF', e.target.value)}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-100/50 rounded-[2rem] h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 p-10 text-center">
                                <FolderHeart size={64} className="text-slate-300 mb-4"/>
                                <h3 className="font-black text-slate-400 text-2xl mb-2">Aucun dossier sélectionné</h3>
                            </div>
                        )}
                    </div>
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

export default FamilyManager;