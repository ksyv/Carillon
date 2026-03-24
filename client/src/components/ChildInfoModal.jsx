import React from 'react';
import { Download, X, FolderHeart, Utensils, AlertTriangle, Phone, Users, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ChildInfoModal = ({ child, onClose }) => {
    if (!child) return null;

    const responsables = child.family?.responsables?.length > 0 ? child.family.responsables : [];

    const appendDocumentToPDF = (doc, fileUrl, title) => {
        if (!fileUrl) return;
        if (fileUrl.startsWith('data:image')) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
            try {
                doc.addImage(fileUrl, 14, 30, 180, 0); 
            } catch(e) { console.error("Erreur image", e); }
        } else if (fileUrl.startsWith('data:application/pdf')) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
            doc.setFontSize(12);
            doc.setTextColor(100);
            doc.text("Le document fourni est au format PDF.", 14, 40);
            doc.text("Il ne peut pas être fusionné automatiquement ici.", 14, 48);
            doc.text("Veuillez le consulter depuis l'interface numérique Carillon.", 14, 56);
        }
    };

    const exportChildPDF = () => {
        const doc = new jsPDF();
        let yPos = 20;

        doc.setFontSize(18);
        doc.text(`FICHE ENFANT : ${child.lastName.toUpperCase()} ${child.firstName}`, 14, yPos);
        yPos += 10;

        const mainInfo = [
            ['Catégorie', child.category || 'Maternelle'],
            ['Date de naissance', child.birthDate ? new Date(child.birthDate).toLocaleDateString('fr-FR') : 'Non renseignée'],
            ['Régime Alimentaire', child.regimeAlimentaire],
            ['Droit à l\'image', child.droitImage ? 'OUI' : 'NON'],
            ['Autorisé à sortir seul', child.autorisationSortieSeul ? 'OUI' : 'NON']
        ];
        autoTable(doc, { startY: yPos, head: [['Informations Générales', '']], body: mainInfo, theme: 'grid', headStyles: { fillColor: [84, 132, 164] } });
        yPos = doc.lastAutoTable.finalY + 10;

        const medicalInfo = [
            ['Médecin', `${child.medical?.medecinNom || '-'} (${child.medical?.medecinPhone || '-'})`],
            ['Autres infos', child.medical?.autresInfos || '-'],
            ['Carnet de Vaccins', `${child.documents?.vaccins?.status || 'Manquant'}`],
            ['Assurance Civile', `${child.documents?.assurance?.status || 'Manquant'} ${child.documents?.assurance?.expiryDate ? '(Expire le ' + new Date(child.documents.assurance.expiryDate).toLocaleDateString('fr-FR') + ')' : ''}`]
        ];
        if (child.hasPAI) {
            medicalInfo.push(['PAI ACTIF', child.isPAIAlimentaire ? 'Alimentaire' : 'Médical']);
            medicalInfo.push(['Motif PAI', child.paiDetails || '-']);
        }
        autoTable(doc, { startY: yPos, head: [['Santé & Documents', '']], body: medicalInfo, theme: 'grid', headStyles: { fillColor: [244, 63, 94] } });
        yPos = doc.lastAutoTable.finalY + 10;

        if (responsables.length > 0) {
            const respData = responsables.map(r => [`${r.lastName?.toUpperCase()} ${r.firstName} (${r.qualite || 'Resp'})`, r.phoneMobile || r.phoneFixe || '-']);
            autoTable(doc, { startY: yPos, head: [['Responsables Légaux', 'Téléphone']], body: respData, theme: 'grid' });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        if (child.personnesAutorisees && child.personnesAutorisees.length > 0) {
            const authData = child.personnesAutorisees.map(p => [`${p.lastName?.toUpperCase()} ${p.firstName}`, p.phone || '-', p.isEmergency ? 'OUI' : 'NON']);
            autoTable(doc, { startY: yPos, head: [['Personnes Autorisées', 'Téléphone', 'Urgence']], body: authData, theme: 'grid', headStyles: { fillColor: [156, 163, 175] } });
        }

        if (child.paiDocument) appendDocumentToPDF(doc, child.paiDocument, "Protocole PAI");
        if (child.documents?.vaccins?.fileUrl) appendDocumentToPDF(doc, child.documents.vaccins.fileUrl, "Carnet de Vaccination");
        if (child.documents?.assurance?.fileUrl) appendDocumentToPDF(doc, child.documents.assurance.fileUrl, "Assurance Responsabilité Civile");

        doc.save(`Fiche_${child.lastName.toUpperCase()}_${child.firstName}.pdf`);
    };

    const openDoc = (fileUrl) => {
        const win = window.open();
        win.document.write(`<iframe src="${fileUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
                <div className="absolute top-6 right-6 flex gap-2">
                    <button onClick={exportChildPDF} className="text-car-blue hover:text-white hover:bg-car-blue bg-car-blue/10 p-2 rounded-full transition-colors" title="Exporter Fiche + Documents"><Download size={24}/></button>
                    <button onClick={onClose} className="text-slate-400 hover:text-car-pink bg-slate-100 p-2 rounded-full"><X size={24}/></button>
                </div>
                
                <div className="mb-6 pr-24">
                    <h2 className="text-3xl font-black text-car-dark leading-tight">{child.lastName} <span className="font-medium text-slate-500 capitalize">{child.firstName}</span></h2>
                    <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-widest mt-2 inline-block ${child.category === 'Élémentaire' ? 'bg-car-blue/10 text-car-blue' : 'bg-car-yellow/10 text-car-yellow'}`}>
                        {child.category || 'Maternelle'}
                    </span>
                    {child.active === false && <span className="ml-2 text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-slate-200 text-slate-500">INACTIF</span>}
                    {child.family && (
                        <span className="ml-2 text-xs font-black px-3 py-1 rounded-lg tracking-widest mt-2 inline-flex items-center gap-1 bg-car-purple/10 text-car-purple">
                            <FolderHeart size={14}/> DOSSIER LIÉ
                        </span>
                    )}
                </div>

                <div className="space-y-6">
                    {/* PROFIL & SANTÉ (Épuré pour le terrain) */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 font-black mb-4 uppercase tracking-widest text-sm">
                            <Info size={18}/> Profil, Santé & Cantine
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Cantine</span>
                                <span className={`text-sm font-black ${child.regimeAlimentaire !== 'Standard' ? 'text-car-yellow' : 'text-car-dark'}`}>{child.regimeAlimentaire || 'Standard'}</span>
                            </div>
                            
                            <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Droit à l'image</span>
                                <span className={`text-sm font-black ${child.droitImage ? 'text-car-green' : 'text-car-pink'}`}>{child.droitImage ? 'OUI' : 'NON'}</span>
                            </div>

                            {child.category === 'Élémentaire' && (
                                <div className="bg-white p-3 rounded-xl shadow-sm flex flex-col sm:col-span-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Autorisation de sortie seul</span>
                                    <span className={`text-sm font-black ${child.autorisationSortieSeul ? 'text-car-blue' : 'text-car-pink'}`}>{child.autorisationSortieSeul ? 'AUTORISÉ À PARTIR SEUL' : 'DOIT ÊTRE RÉCUPÉRÉ'}</span>
                                </div>
                            )}
                        </div>

                        {child.medical?.autresInfos && (
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Autres informations / Particularités</span>
                                <p className="text-car-dark font-medium text-sm whitespace-pre-wrap">{child.medical.autresInfos}</p>
                            </div>
                        )}
                        
                        {child.hasPAI && (
                            <div className="bg-car-pink/10 border border-car-pink/30 p-4 rounded-xl mt-2 mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="text-car-pink font-black uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={16}/> PAI ACTIF</div>
                                    {child.paiDocument && (
                                        <button onClick={() => openDoc(child.paiDocument)} className="bg-car-pink text-white text-[10px] font-bold px-2 py-1 rounded-md hover:bg-red-600 transition-colors">VOIR DOC</button>
                                    )}
                                </div>
                                <p className="text-car-dark font-medium text-sm">{child.paiDetails}</p>
                            </div>
                        )}
                    </div>

                    {/* CONTACTS DES RESPONSABLES */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 font-black mb-3 uppercase tracking-widest text-sm">
                            <Phone size={18}/> RESPONSABLES LÉGAUX
                        </div>
                        {Array.isArray(responsables) && responsables.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                {responsables.map((c, i) => (
                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-car-dark uppercase">{c.lastName} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span></span>
                                            <span className="text-xs font-bold text-slate-400 uppercase">{c.qualite || 'Resp. '+ (i+1)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="font-bold text-car-teal bg-car-teal/10 px-3 py-1 rounded-lg text-sm">{c.phoneMobile || c.phoneFixe || 'Pas de numéro'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-400 italic text-sm mb-4">Aucun responsable renseigné dans le dossier Famille.</p>}
                        
                        <div className="w-full h-px bg-slate-200 my-4"></div>
                        
                        <div className="flex items-center gap-2 text-slate-500 font-black mb-3 uppercase tracking-widest text-sm">
                            <Users size={18}/> PERSONNES AUTORISÉES
                        </div>
                        {Array.isArray(child.personnesAutorisees) && child.personnesAutorisees.length > 0 ? (
                            <div className="space-y-2">
                                {child.personnesAutorisees.map((c, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-car-dark">{c.lastName?.toUpperCase()} <span className="font-medium text-slate-500 capitalize">{c.firstName}</span></span>
                                            {c.isEmergency && <span className="text-[10px] font-black text-car-pink uppercase tracking-widest">En cas d'urgence</span>}
                                        </div>
                                        <span className="font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg text-sm">{c.phone || 'Pas de numéro'}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-400 italic text-sm">Aucune personne autorisée</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChildInfoModal;