import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Calendar, FileText, ShieldCheck, Download, LogOut, 
    Check, UploadCloud, File, AlertCircle, RefreshCw, Save, Info 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FamilyPortal = () => {
    const navigate = useNavigate();
    
    // 1. STATE DYNAMIQUE : LE DOSSIER DE LA FAMILLE
    const [familyData, setFamilyData] = useState({
        name: "DUPONT",
        firstName: "Jean & Marie",
        cafNumber: "1234567",
        quotientFamilial: 850,
        address: "12 Rue des Écoles",
        phone: "06 12 34 56 78",
        email: "famille.dupont@email.com",
        children: [
            { id: 1, firstName: "Lucas", lastName: "DUPONT", class: "CM1", regime: "Standard" },
            { id: 2, firstName: "Chloé", lastName: "DUPONT", class: "Grande Section", regime: "PAI" }
        ]
    });

    // States de gestion de l'interface
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    // Liste des documents transmis par la famille
    const [uploadedDocs, setUploadedDocs] = useState([
        { id: 1, name: "Attestation_Assurance_2026.pdf", date: "15/05/2026", status: "Validé" },
        { id: 2, name: "Justificatif_Impots_QF.pdf", date: "16/05/2026", status: "En cours de vérification" }
    ]);

    // Historique des factures de la famille
    const [invoices] = useState([
        { id: "FAC-2026-05", month: "Mai 2026", amount: 76.50, status: "À payer", dueDate: "15/06/2026" },
        { id: "FAC-2026-04", month: "Avril 2026", amount: 112.20, status: "Payé", dueDate: "15/05/2026" }
    ]);

    // --- ACTIONS INTERACTIVES ---

    // Modification des champs parents
    const handleParentChange = (field, value) => {
        setFamilyData({ ...familyData, [field]: value });
    };

    // Modification des infos d'un enfant (Régime ou Classe)
    const handleChildChange = (childId, field, value) => {
        const updatedChildren = familyData.children.map(c => 
            c.id === childId ? { ...c, [field]: value } : c
        );
        setFamilyData({ ...familyData, children: updatedChildren });
    };

    // Sauvegarde du dossier (Simulation d'appel API avec loader)
    const saveDossier = (e) => {
        e.preventDefault();
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            alert("Félicitations ! Votre dossier famille a été mis à jour et synchronisé avec le service périscolaire.");
        }, 1000);
    };

    // Simulation de téléversement de fichier (Barre de progression animée)
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingFile(true);
        setUploadProgress(10);

        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setUploadedDocs([
                            { id: Date.now(), name: file.name, date: new Date().toLocaleDateString('fr-FR'), status: "En cours de vérification" },
                            ...uploadedDocs
                        ]);
                        setUploadingFile(false);
                        setUploadProgress(0);
                    }, 500);
                    return 100;
                }
                return prev + 30;
            });
        }, 300);
    };

    // Génération et téléchargement de la facture PDF
    const downloadInvoicePDF = (inv) => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(30, 41, 59);
        doc.text("CARIGNAN", 14, 20); doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.text("DE BORDEAUX", 14, 25);
        
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text("MAIRIE DE CARIGNAN DE BORDEAUX", 14, 35);
        doc.text("24 RUE DE VERDUN 33360 CARIGNAN-DE-BORDEAUX", 14, 40);

        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 58, 138);
        doc.text(`Identifiant PAYFIP : 017556`, 120, 20);
        doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
        doc.text(`Référence : ${inv.id}`, 120, 26);
        doc.text(`Période : Rôle de ${inv.month}`, 120, 32);

        doc.rect(118, 42, 78, 25); doc.setFont("helvetica", "bold"); doc.text("DESTINATAIRE :", 122, 48);
        doc.setFont("helvetica", "normal"); doc.text(`M. ou Mme ${familyData.name}`, 122, 55);
        doc.text(`${familyData.address}, 33360 CARIGNAN`, 122, 61);

        doc.setFont("helvetica", "black"); doc.setFontSize(16); doc.setTextColor(30, 41, 59);
        doc.text(`FACTURE DU MOIS DE ${inv.month.toUpperCase()}`, 14, 78);

        // Simulation de lignes de facture selon les données dynamiques
        const bodyData = familyData.children.map(c => [
            `Restauration scolaire - ${c.firstName}`, "14", "3.10 €", "43.40 €"
        ]);
        bodyData.push(["Accueil Périscolaire (APS Matin/Soir)", "12", "Calcul QF", `${(inv.amount - 43.40).toFixed(2)} €`]);

        autoTable(doc, {
            startY: 85,
            head: [["Prestation", "Actes", "Tarif Unitaire", "Total"]],
            body: bodyData,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.rect(130, finalY, 66, 14, 'F', [241, 245, 249]);
        doc.setFont("helvetica", "bold"); doc.text("NET À PAYER :", 134, finalY + 9);
        doc.setTextColor(30, 58, 138); doc.text(`${inv.amount.toFixed(2)} €`, 166, finalY + 9);

        doc.save(`Facture_Carillon_${inv.id}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-10">
            {/* NAVIGATION HEADER */}
            <div className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-car-blue text-white p-2.5 rounded-xl font-black text-xl tracking-tighter">C</div>
                        <div>
                            <h1 className="font-black text-car-dark text-lg leading-none">Carillon</h1>
                            <span className="text-[10px] font-bold text-car-blue uppercase tracking-widest">Portail Famille Périscolaire</span>
                        </div>
                    </div>
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-pink p-2 rounded-xl transition-colors flex items-center gap-1 font-bold text-sm">
                        <LogOut size={16}/> Quitter l'Espace Parent
                    </button>
                </div>
            </div>

            {/* GRILLE PRINCIPALE */}
            <div className="max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 items-start">
                
                {/* BLOC 1 : FORMULAIRE INTERACTIF DES INFOS PARENTS */}
                <form onSubmit={saveDossier} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-5 lg:col-span-1">
                    <h3 className="font-black text-car-dark text-xl pb-3 border-b border-slate-100 flex items-center gap-2">
                        <User size={22} className="text-car-blue"/> Mon Dossier Parent
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Nom de Famille :</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark text-sm outline-none focus:ring-2 focus:ring-car-blue/20" value={familyData.name} onChange={e => handleParentChange('name', e.target.value.toUpperCase())} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Prénoms des responsables :</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark text-sm outline-none focus:ring-2 focus:ring-car-blue/20" value={familyData.firstName} onChange={e => handleParentChange('firstName', e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">N° Allocataire CAF :</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark text-sm outline-none focus:ring-2 focus:ring-car-blue/20" value={familyData.cafNumber} onChange={e => handleParentChange('cafNumber', e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Adresse postale :</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark text-sm outline-none focus:ring-2 focus:ring-car-blue/20" value={familyData.address} onChange={e => handleParentChange('address', e.target.value)} required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Téléphone de contact :</label>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark text-sm outline-none focus:ring-2 focus:ring-car-blue/20" value={familyData.phone} onChange={e => handleParentChange('phone', e.target.value)} required />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quotient Fiscal Actuel :</span>
                        <span className="font-black text-car-blue text-lg">{familyData.quotientFamilial} €</span>
                    </div>

                    <button type="submit" disabled={isSaving} className="w-full bg-car-dark text-white p-4 rounded-xl font-black tracking-widest shadow-lg shadow-car-dark/10 hover:bg-black transition-all flex justify-center items-center gap-2">
                        {isSaving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                        {isSaving ? "ENREGISTREMENT..." : "SAUVEGARDER MON DOSSIER"}
                    </button>
                </form>

                {/* COLONNE DE DROITE : ENFANTS, LOGISTIQUE, TRANSMISSION ET DOCUMENTS */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* INFOS ENFANTS MODIFIABLES EN DIRECT */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-car-dark text-xl mb-4 flex items-center gap-2">
                            <Calendar size={22} className="text-car-blue"/> Fiches de mes Enfants
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {familyData.children.map(child => (
                                <div key={child.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-black text-car-dark text-lg">{child.firstName} {child.lastName}</h4>
                                        <span className="text-[10px] font-black px-2.5 py-1 bg-white rounded-md border border-slate-200 shadow-sm uppercase">{child.class}</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 text-xs font-bold">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Classe :</label>
                                            <select className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none text-car-dark font-bold" value={child.class} onChange={e => handleChildChange(child.id, 'class', e.target.value)}>
                                                <option value="Grande Section">Grande Section</option>
                                                <option value="CP">CP</option>
                                                <option value="CE1">CE1</option>
                                                <option value="CM1">CM1</option>
                                                <option value="CM2">CM2</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Régime Alimentaire :</label>
                                            <select className="w-full bg-white border border-slate-200 p-2.5 rounded-lg outline-none text-car-dark font-bold" value={child.regime} onChange={e => handleChildChange(child.id, 'regime', e.target.value)}>
                                                <option value="Standard">Standard (Normal)</option>
                                                <option value="PAI">PAI (Allergie/Repas apporté)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MODULE INTERACTIF DE TÉLÉVERSEMENT DE DOCUMENTS */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1 space-y-2">
                            <h3 className="font-black text-car-dark text-lg leading-tight">Transmettre des justificatifs</h3>
                            <p className="text-xs text-slate-400 font-medium">Attestation d'assurance scolaire, nouveau justificatif CAF, ou certificat médical PAI.</p>
                        </div>
                        
                        <div className="md:col-span-2 space-y-4">
                            {/* ZONE DE DROP INTERACTIVE */}
                            <label className="border-2 border-dashed border-slate-200 hover:border-car-blue bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center relative overflow-hidden group">
                                <input type="file" className="hidden" accept=".pdf,.png,.jpg" onChange={handleFileUpload} disabled={uploadingFile} />
                                <UploadCloud size={32} className="text-slate-400 group-hover:text-car-blue transition-colors mb-2"/>
                                <span className="text-xs font-black text-car-dark block">Cliquez pour téléverser un document</span>
                                <span className="text-[10px] text-slate-400 font-medium mt-1 block">Format PDF ou IMAGE accepté</span>

                                {uploadingFile && (
                                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center p-4">
                                        <div className="w-full bg-slate-100 rounded-full h-2 max-w-xs mb-2">
                                            <div className="bg-car-blue h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-car-blue uppercase tracking-widest animate-pulse">Téléversement en cours... {uploadProgress}%</span>
                                    </div>
                                )}
                            </label>

                            {/* HISTORIQUE ET SUIVI DES PIÈCES */}
                            <div className="space-y-2">
                                {uploadedDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-bold">
                                        <div className="flex items-center gap-2 truncate pr-4">
                                            <File size={16} className="text-slate-400 shrink-0" />
                                            <span className="text-car-dark font-bold truncate">{doc.name}</span>
                                            <span className="text-[10px] text-slate-400 font-medium font-mono shrink-0">({doc.date})</span>
                                        </div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md shrink-0 ${doc.status === 'Validé' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{doc.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* TABLEAU DES FACTURES MENSUELLES */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-car-dark text-xl mb-4 flex items-center gap-2">
                            <FileText size={22} className="text-car-blue"/> Historique de mes Factures
                        </h3>
                        
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 grid grid-cols-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center sm:text-left">
                                <div className="col-span-2 sm:col-span-1 text-left">Mois / Rôle</div>
                                <div className="hidden sm:block">Échéance</div>
                                <div className="text-center">Statut</div>
                                <div className="text-right">Montant / Action</div>
                            </div>

                            <div className="divide-y divide-slate-100 text-xs sm:text-sm font-bold text-car-dark">
                                {invoices.map(inv => (
                                    <div key={inv.id} className="p-4 grid grid-cols-4 items-center text-center sm:text-left">
                                        <div className="col-span-2 sm:col-span-1 text-left">
                                            <span className="font-black text-car-dark text-sm sm:text-base">{inv.month}</span>
                                            <span className="block text-[10px] text-slate-400 font-mono mt-0.5">{inv.id}</span>
                                        </div>
                                        <div className="hidden sm:block text-slate-500 font-medium text-xs">{inv.dueDate}</div>
                                        <div className="text-center">
                                            <span className={`inline-block text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg ${inv.status === 'Payé' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-4">
                                            <span className="font-black text-slate-800 text-sm sm:text-base">{inv.amount.toFixed(2)} €</span>
                                            <button onClick={() => downloadInvoicePDF(inv)} className="text-slate-400 hover:text-car-blue p-2 bg-slate-50 hover:bg-car-blue/5 rounded-lg border border-slate-200 transition-colors" title="Télécharger la facture originale">
                                                <Download size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

// Injection d'un useMemo si nécessaire
const useMemo = React.useMemo;

export default FamilyPortal;