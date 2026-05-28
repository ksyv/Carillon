import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FolderHeart, AlertTriangle, CheckCircle, Search, Plus, Trash2, 
    Download, Save, Users, Info, Pencil, X, Banknote, FileText, 
    Phone, Check, Copy, LogOut, Lock, UploadCloud 
} from 'lucide-react';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ChildInfoModal from '../components/ChildInfoModal';

const FamilyPortal = () => {
    const navigate = useNavigate();

    // --- STATES D'AUTHENTIFICATION & DONNÉES ---
    const [portalCodeInput, setPortalCodeInput] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [editFamily, setEditFamily] = useState(null); 
    
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [editingChild, setEditingChild] = useState(null);

    // Chargement initial de la base de données globale
    const loadData = async () => {
        try {
            const [kidsRes, famRes] = await Promise.all([
                api.get(`/children`),
                api.get(`/families`)
            ]);
            setChildren(kidsRes.data);
            setFamilies(famRes.data);
            
            // Si une famille est déjà ouverte, on rafraîchit ses données
            if (selectedFamily) {
                const updatedFam = famRes.data.find(f => f._id === selectedFamily._id);
                setSelectedFamily(updatedFam || null);
            }
        } catch (e) {
            console.error("Erreur chargement des données portail", e);
        }
    };

    // Connexion automatique au dossier famille via le Code Portail
    const handlePortalLogin = (e) => {
        e.preventDefault();
        const code = portalCodeInput.trim().toUpperCase();
        if (!code) return;

        const targetFamily = families.find(f => f.portalCode === code);
        if (targetFamily) {
            setSelectedFamily(targetFamily);
            setIsAuthenticated(true);
        } else {
            alert("❌ Aucun dossier famille ne correspond à ce code portail. Veuillez vérifier ou contacter la mairie.");
        }
    };

    // Synchronisation du formulaire d'édition dès que la famille est chargée
    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedFamily) {
            const resps = [...(selectedFamily.responsables || [])];
            while (resps.length < 2) resps.push({ firstName: '', lastName: '', qualite: '', phoneMobile: '', email: '', profession: '', employeur: '', couvertureSociale: 'CPAM', numAllocataireCAF: '' });
            const docs = selectedFamily.documents || { assuranceRC: {}, vaccins: {}, avisImposition: {}, attestationCAF: {} };
            setEditFamily({ ...selectedFamily, responsables: resps, documents: docs });
        } else {
            setEditFamily(null);
        }
    }, [selectedFamily]);

    // --- FONCTIONS DE SAUVEGARDE ET INTERACTION (IDENTIQUES AU STAFF) ---
    
    const handleSaveFamily = async () => {
        try {
            const res = await api.put(`/families/${selectedFamily._id}`, editFamily);
            setSelectedFamily(res.data);
            setFamilies(families.map(f => f._id === res.data._id ? res.data : f));
            alert("Félicitations ! Votre dossier famille a été mis à jour avec succès.");
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

    // --- GESTION DES ENFANTS (ÉDITION DE FICHE COMPLETE PARENT) ---
    
    const startEditChild = (child) => {
        setEditingChild({
            _id: child._id,
            active: child.active !== false,
            firstName: child.firstName, lastName: child.lastName, category: child.category || 'Maternelle', sexe: child.sexe || '',
            birthDate: child.birthDate ? child.birthDate.split('T')[0] : '', 
            droitImage: child.droitImage || false, autorisationSortieSeul: child.autorisationSortieSeul || false,
            medical: child.medical || { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '', autresInfos: '' },
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
            await api.put(`/children/${editingChild._id}`, editingChild);
            setEditingChild(null);
            loadData();
        } catch (err) { alert("Erreur lors de la mise à jour de la fiche enfant."); }
    };

    // --- EXPORT PDF IDENTIQUE AU PANNEAU ADMIN ---
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
        doc.text(`Edité par le parent le ${new Date().toLocaleDateString('fr-FR')}`, 14, yPos); yPos += 12;

        const facturationData = [
            ['Code Portail Parent', editFamily.portalCode || 'Non renseigné'],
            ['Payeur désigné', editFamily.payeur || '-'],
            ['Revenu de Référence', editFamily.revenuReference ? `${editFamily.revenuReference} €` : '-'],
            ['Nombre de parts', editFamily.nombreParts || '-'],
            ['Quotient Familial (Calculé)', editFamily.quotientFamilial || '-'],
            ['Justificatif CAF', `${editFamily.documents?.attestationCAF?.status || 'Manquant'}`]
        ];

        autoTable(doc, { startY: yPos, head: [['Facturation & Informations Logistiques', 'Valeur']], body: facturationData, theme: 'grid', headStyles: { fillColor: [30, 58, 138] } });
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
                    autoTable(doc, { startY: yPos, head: [['Personnes Autorisées au Retrait', 'Téléphone', 'Urgence']], body: authBody, theme: 'grid', headStyles: { fillColor: [156, 163, 175] } });
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

        doc.save(`Recapitulatif_Dossier_${editFamily.name.toUpperCase()}.pdf`);
    };

    const attachedChildren = selectedFamily ? children.filter(c => c.family === selectedFamily._id || c.family?._id === selectedFamily._id) : [];

    // --- RENDU ÉCRAN 1 : FORMULAIRE DE CONNEXION PARENT ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 max-w-md w-full text-center space-y-6">
                    <div className="bg-car-blue/10 p-5 rounded-2xl w-fit mx-auto text-car-blue">
                        <Lock size={36} strokeWidth={2.5}/>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-car-dark">Espace Parent</h1>
                        <p className="text-slate-400 text-sm font-medium mt-1">Saisissez votre code confidentiel pour ouvrir votre dossier</p>
                    </div>
                    <form onSubmit={handlePortalLogin} className="space-y-4">
                        <input 
                            type="text" 
                            className="w-full text-center p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-car-dark uppercase tracking-widest outline-none focus:border-car-blue focus:ring-4 focus:ring-car-blue/10 transition-all placeholder:text-slate-300"
                            placeholder="CODE PORTAIL" 
                            value={portalCodeInput}
                            onChange={e => setPortalCodeInput(e.target.value)}
                            required
                        />
                        <button type="submit" className="w-full bg-car-blue text-white font-black tracking-widest p-4 rounded-2xl shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-all uppercase text-sm">
                            Ouvrir mon espace
                        </button>
                    </form>
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold text-xs transition-colors">← Retour Portail Communal</button>
                </div>
            </div>
        );
    }

    // --- RENDU ÉCRAN 2 : LE VRAI PORTAIL PARENT INTERACTIF COMPLET ---
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-10 relative">
            <div className="max-w-7xl mx-auto pb-20">
                
                {/* HEADER SQUELETTE EN-TÊTE FAMILLE */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4 border-b border-slate-200 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl text-car-blue"><FolderHeart size={32}/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark uppercase">Mon Espace : <span className="text-car-blue">{selectedFamily.name}</span></h1>
                            <p className="text-slate-500 font-medium mt-1">Mise à jour de vos fiches, personnes autorisées & justificatifs</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button onClick={exportFamilyPDF} className="text-slate-400 hover:text-car-dark bg-white border border-slate-200 p-4 rounded-2xl transition-colors" title="Télécharger mon récapitulatif complet"><Download size={24}/></button>
                        <button onClick={handleSaveFamily} className="bg-car-blue text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-car-blue/20"><Save size={20}/> ENREGISTRER MES MODIFICATIONS</button>
                        <button onClick={() => setIsAuthenticated(false)} className="text-slate-400 hover:text-car-pink bg-white border border-slate-200 p-4 rounded-2xl transition-colors" title="Se déconnecter"><LogOut size={24}/></button>
                    </div>
                </div>

                {/* ZONE DE CONFIGURATION PARENT (IDENTIQUE AU LAYOUT DU STAFF) */}
                {editFamily && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        
                        {/* COMPOSANT DE GAUCHE : LISTE DES ENFANTS DE LA FRATRIE */}
                        <div className="xl:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Users size={18}/> Les enfants du foyer</h3>
                                <div className="space-y-2">
                                    {attachedChildren.map(c => (
                                        <div key={c._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                                            <div onClick={() => setChildInfoToView(c)} className="flex items-center gap-3 cursor-pointer flex-1" title="Voir ma fiche">
                                                <div className="bg-white p-2 rounded-full text-slate-400 group-hover:text-car-blue transition-colors"><Info size={18}/></div>
                                                <span className="font-bold text-car-dark uppercase group-hover:text-car-blue transition-colors">{c.lastName} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span></span>
                                            </div>
                                            <button onClick={() => startEditChild(c)} className="text-slate-400 hover:text-car-blue p-2 bg-white rounded-lg border border-slate-100 transition-colors" title="Modifier ma fiche"><Pencil size={18}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* BLOC FACTURATION & JUSTIFICATIF CAF FAMILLE */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-black text-car-dark text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Facturation & QF</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Revenu Réf. (€)</label>
                                        <input type="number" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none font-bold text-car-dark text-sm" value={editFamily.revenuReference || ''} onChange={e => handleQFChange('revenuReference', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Parts fiscales</label>
                                        <input type="number" step="0.5" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none font-bold text-car-dark text-sm" value={editFamily.nombreParts || ''} onChange={e => handleQFChange('nombreParts', e.target.value)} />
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase">Quotient Familial</span>
                                    <span className="font-black text-car-blue text-lg">{editFamily.quotientFamilial || '-'} €</span>
                                </div>

                                {/* DROPZONE DU RECAP CAF PARENT */}
                                <div className="bg-slate-50/50 p-4 rounded-2xl border-2 border-dashed border-slate-200 mt-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><FileText size={14}/> Attestation CAF</span>
                                        {editFamily.documents?.attestationCAF?.fileUrl && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded">Transmis</span>
                                        )}
                                    </div>
                                    <input type="file" accept=".pdf, image/*" onChange={(e) => handleFileUpload('attestationCAF', e)} className="text-xs text-slate-400 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:font-bold file:shadow-sm cursor-pointer"/>
                                </div>
                            </div>
                        </div>

                        {/* COMPOSANT DE DROITE : LES DEUX RESPONSABLES DU FOYER COMPLETS (2 COLONNES) */}
                        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* RESPONSABLE 1 */}
                            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
                                <h3 className="font-black text-car-blue text-sm tracking-widest uppercase border-b border-slate-100 pb-2">Parent / Responsable 1</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[0].lastName} onChange={e => handleRespChange(0, 'lastName', e.target.value.toUpperCase())}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[0].firstName} onChange={e => handleRespChange(0, 'firstName', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Qualité (Mère, Père...)" value={editFamily.responsables[0].qualite} onChange={e => handleRespChange(0, 'qualite', e.target.value)}/>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Téléphone Mobile" value={editFamily.responsables[0].phoneMobile} onChange={e => handleRespChange(0, 'phoneMobile', e.target.value)}/>
                                        <input type="email" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Email" value={editFamily.responsables[0].email} onChange={e => handleRespChange(0, 'email', e.target.value)}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Profession" value={editFamily.responsables[0].profession} onChange={e => handleRespChange(0, 'profession', e.target.value)}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Employeur" value={editFamily.responsables[0].employeur} onChange={e => handleRespChange(0, 'employeur', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="N° Allocataire CAF" value={editFamily.responsables[0].numAllocataireCAF} onChange={e => handleRespChange(0, 'numAllocataireCAF', e.target.value)}/>
                                </div>
                            </div>

                            {/* RESPONSABLE 2 */}
                            <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm space-y-4">
                                <h3 className="font-black text-car-teal text-sm tracking-widest uppercase border-b border-slate-100 pb-2">Parent / Responsable 2</h3>
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold uppercase" placeholder="NOM" value={editFamily.responsables[1].lastName} onChange={e => handleRespChange(1, 'lastName', e.target.value.toUpperCase())}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-bold capitalize" placeholder="Prénom" value={editFamily.responsables[1].firstName} onChange={e => handleRespChange(1, 'firstName', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Qualité (Père, Mère...)" value={editFamily.responsables[1].qualite} onChange={e => handleRespChange(1, 'qualite', e.target.value)}/>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Téléphone Mobile" value={editFamily.responsables[1].phoneMobile} onChange={e => handleRespChange(1, 'phoneMobile', e.target.value)}/>
                                        <input type="email" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Email" value={editFamily.responsables[1].email} onChange={e => handleRespChange(1, 'email', e.target.value)}/>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Profession" value={editFamily.responsables[1].profession} onChange={e => handleRespChange(1, 'profession', e.target.value)}/>
                                        <input type="text" className="w-1/2 bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Employeur" value={editFamily.responsables[1].employeur} onChange={e => handleRespChange(1, 'employeur', e.target.value)}/>
                                    </div>
                                    <input type="text" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none text-sm font-medium" placeholder="N° Allocataire CAF" value={editFamily.responsables[1].numAllocataireCAF} onChange={e => handleRespChange(1, 'numAllocataireCAF', e.target.value)}/>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* MODALS D'ÉDITION ENFANT ET VUE DÉTAILLÉE COMPLETES ET IDENTIQUES AU RESTE DU SITE */}
            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />

            {editingChild && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-3xl font-black text-car-dark">Mettre à jour la fiche de {editingChild.firstName}</h3>
                            <button type="button" onClick={() => setEditingChild(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>

                        <form onSubmit={saveChild} className="space-y-8">
                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Identité</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-black text-car-dark" placeholder="NOM" value={editingChild.lastName} readOnly/>
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" placeholder="Prénom" value={editingChild.firstName} readOnly/>
                                    <input type="date" className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-medium text-car-dark" value={editingChild.birthDate} readOnly/>
                                    <select className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" value={editingChild.category} onChange={e => setEditingChild({...editingChild, category: e.target.value})}>
                                        <option value="Maternelle">Maternelle</option><option value="Élémentaire">Élémentaire</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Documents Administratifs Enfant</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Page Vaccins Carnet de Santé</span>
                                        <input type="file" accept=".pdf, image/*" onChange={e => handleChildDocUpload('vaccins', e)} className="text-xs text-slate-500 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 cursor-pointer"/>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <span className="text-xs font-bold text-slate-500 uppercase block mb-2">Assurance Responsabilité Civile</span>
                                        <div className="flex gap-2 mb-2">
                                            <input type="date" title="Expiration Assurance" className="w-full p-2 rounded-lg text-sm border border-slate-200 outline-none" value={editingChild.documents?.assurance?.expiryDate ? editingChild.documents.assurance.expiryDate.split('T')[0] : ''} onChange={e => handleChildDocChange('assurance', 'expiryDate', e.target.value)}/>
                                        </div>
                                        <input type="file" accept=".pdf, image/*" onChange={e => handleChildDocUpload('assurance', e)} className="text-xs text-slate-500 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 cursor-pointer"/>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase">Personnes Autorisées au Retrait (Sécurité)</h4>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={handleCopyContacts} className="text-xs font-bold text-car-purple bg-car-purple/10 px-3 py-1.5 rounded-lg flex items-center gap-1"><Copy size={14}/> Dupliquer de la Fratrie</button>
                                        <button type="button" onClick={() => setEditingChild({...editingChild, personnesAutorisees: [...editingChild.personnesAutorisees, {firstName:'', lastName:'', phone:'', isEmergency: false}]})} className="text-xs font-bold text-car-blue bg-car-blue/10 px-3 py-1.5 rounded-lg">+ AJOUTER UN ADULTE</button>
                                    </div>
                                </div>
                                <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {editingChild.personnesAutorisees.map((c, i) => (
                                        <div key={i} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold uppercase outline-none" placeholder="NOM" value={c.lastName} onChange={e => handleChildContactChange(i, 'lastName', e.target.value.toUpperCase())}/>
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold capitalize outline-none" placeholder="Prénom" value={c.firstName} onChange={e => handleChildContactChange(i, 'firstName', e.target.value)}/>
                                            <input className="flex-1 bg-slate-50 border-none p-2 rounded-lg text-sm font-bold outline-none" placeholder="Téléphone direct" value={c.phone} onChange={e => handleChildContactChange(i, 'phone', e.target.value)}/>
                                            <label className="flex items-center gap-1 text-[10px] font-bold text-car-pink cursor-pointer px-2">
                                                <input type="checkbox" className="accent-car-pink" checked={c.isEmergency} onChange={e => handleChildContactChange(i, 'isEmergency', e.target.checked)}/> Contact d'Urgence
                                            </label>
                                            <button type="button" onClick={() => {
                                                const newArr = editingChild.personnesAutorisees.filter((_, idx) => idx !== i);
                                                setEditingChild({...editingChild, personnesAutorisees: newArr});
                                            }} className="text-slate-400 hover:text-car-pink p-2"><X size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Autorisations Parents & Mairie</h4>
                                <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editingChild.droitImage} onChange={e => setEditingChild({...editingChild, droitImage: e.target.checked})} />
                                        <span className="font-bold text-car-dark">J'autorise la mairie à photographier mon enfant dans le cadre des activités d'animation</span>
                                    </label>
                                    {editingChild.category === 'Élémentaire' && (
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-car-blue" checked={editingChild.autorisationSortieSeul} onChange={e => setEditingChild({...editingChild, autorisationSortieSeul: e.target.checked})} />
                                            <span className="font-bold text-car-blue">J'autorise mon enfant à quitter l'accueil périscolaire du soir de manière autonome</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Santé & Restauration</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-car-pink/5 border border-car-pink/20 p-4 rounded-2xl flex flex-col gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.hasPAI} onChange={e => setEditingChild({...editingChild, hasPAI: e.target.checked})} /> L'enfant a un protocole PAI actif</label>
                                        {editingChild.hasPAI && (
                                            <>
                                                <input className="bg-white border border-car-pink/30 p-3 rounded-xl outline-none text-sm font-medium" placeholder="Précisions PAI (Allergies...)" value={editingChild.paiDetails} onChange={e => setEditingChild({...editingChild, paiDetails: e.target.value})}/>
                                                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink"><input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editingChild.isPAIAlimentaire} onChange={e => {
                                                    const isAlim = e.target.checked;
                                                    setEditingChild({...editingChild, isPAIAlimentaire: isAlim, regimeAlimentaire: isAlim ? 'PAI' : 'Standard'});
                                                }} /> C'est un PAI de type Alimentaire (Panier repas fourni)</label>
                                                <div className="mt-2 bg-white p-3 rounded-xl border border-car-pink/30 flex items-center justify-between">
                                                    <input type="file" accept=".pdf, image/*" onChange={handleChildFileUpload} className="text-xs text-slate-400 cursor-pointer"/>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                                        <label className="text-xs font-bold text-slate-500 block mb-2">Régime Alimentaire Cantine</label>
                                        <select className="w-full bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold text-car-dark" value={editingChild.regimeAlimentaire} onChange={e => setEditingChild({...editingChild, regimeAlimentaire: e.target.value})} disabled={editingChild.isPAIAlimentaire}>
                                            <option value="Standard">Standard</option><option value="Sans-porc">Sans-porc</option><option value="Végétarien">Végétarien</option><option value="PAI">PAI</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setEditingChild(null)} className="px-6 py-4 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl">Fermer sans enregistrer</button>
                                <button type="submit" className="px-8 py-4 font-black text-white bg-car-blue hover:bg-blue-600 rounded-2xl flex items-center gap-2 shadow-lg shadow-car-blue/10">
                                    <Check size={20}/> CONFIRMER LES MODIFICATIONS ENFANT
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyPortal;