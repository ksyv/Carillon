import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, getDay, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogOut, Sun, Moon, FileText, CheckCircle, Search, Trash2, Plus, Users, Shield, RotateCcw, UserPlus, Download, Pencil, Check, X, Filter, StickyNote, CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Banknote, Wifi, WifiOff, Lock, Info, AlertTriangle, Phone, ShieldCheck, Utensils, FolderHeart, Save, Copy } from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = '/api';

axios.interceptors.request.use(req => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// --- COMPOSANTS UI REUTILISABLES ---
const LogoTexte = ({ className = "text-3xl" }) => (
    <div className={`font-black tracking-[0.15em] flex items-center justify-center ${className}`}>
        <span className="text-car-dark">C</span>
        <span className="text-car-blue">A</span>
        <span className="text-car-yellow">R</span>
        <span className="text-car-teal">I</span>
        <span className="text-car-pink">L</span>
        <span className="text-car-green">L</span>
        <span className="text-car-blue">O</span>
        <span className="text-car-dark">N</span>
    </div>
);

const CategoryFilter = ({ value, onChange, access }) => {
    if (access !== 'Tous') return null;
    return (
        <div className="flex bg-slate-100 rounded-xl p-1 items-center">
            <Filter size={16} className="text-slate-400 mx-2" />
            <button onClick={() => onChange('Tous')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Tous' ? 'bg-white text-car-dark shadow-sm' : 'text-slate-500 hover:text-car-dark'}`}>Tous</button>
            <button onClick={() => onChange('Maternelle')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Maternelle' ? 'bg-car-yellow text-white shadow-sm' : 'text-slate-500 hover:text-car-yellow'}`}>Mat.</button>
            <button onClick={() => onChange('Élémentaire')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Élémentaire' ? 'bg-car-blue text-white shadow-sm' : 'text-slate-500 hover:text-car-blue'}`}>Élém.</button>
        </div>
    );
};

// --- MODALE FICHE D'URGENCE ---
// --- MODALE FICHE D'URGENCE ---
const EmergencyModal = ({ attendance, allChildren, sessionType, onClose, access }) => {
    const isMidi = sessionType === 'MIDI';
    
    // On initialise le filtre sur les droits de l'utilisateur (ou 'Tous')
    const [categoryFilter, setCategoryFilter] = useState(access === 'Tous' ? 'Tous' : access);

    // Logique inversée : Qui est VRAIMENT présent ?
    let presentRecords = [];
    
    if (isMidi) {
        const absentIds = attendance.map(a => a.child._id);
        presentRecords = allChildren
            .filter(c => !absentIds.includes(c._id))
            .map(c => ({ _id: c._id, child: c })); 
    } else {
        presentRecords = attendance.filter(a => !a.checkOut);
    }

    // Application du filtre Mat/Élém
    const filteredRecords = presentRecords.filter(record => 
        categoryFilter === 'Tous' || record.child.category === categoryFilter
    );

    const displayChildren = filteredRecords.sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));
    const [safeChildren, setSafeChildren] = useState(new Set());

    const toggleSafe = (id) => {
        const newSafe = new Set(safeChildren);
        if (newSafe.has(id)) newSafe.delete(id);
        else newSafe.add(id);
        setSafeChildren(newSafe);
    };

    // Les compteurs s'adaptent au filtre sélectionné !
    const currentSafeCount = displayChildren.filter(r => safeChildren.has(r._id)).length;
    const currentTotalCount = displayChildren.length;

    return (
        <div className="fixed inset-0 bg-car-pink/95 backdrop-blur-md z-[100] flex flex-col">
            <div className="bg-white p-4 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-car-pink flex items-center gap-3">
                        <AlertTriangle size={32} /> ÉVACUATION
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">
                        {isMidi ? "Midi : Affiche tous les enfants sauf ceux marqués absents." : "Cochez les enfants en sécurité."}
                    </p>
                </div>

                {/* NOUVEAU : LE FILTRE INTÉGRÉ À L'URGENCE */}
                {access === 'Tous' && (
                    <div className="flex bg-slate-100 rounded-xl p-1 items-center w-full sm:w-auto justify-center flex-shrink-0">
                        <button onClick={() => setCategoryFilter('Tous')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Tous' ? 'bg-white text-car-dark shadow-sm' : 'text-slate-500 hover:text-car-dark'}`}>Tous</button>
                        <button onClick={() => setCategoryFilter('Maternelle')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Maternelle' ? 'bg-car-yellow text-white shadow-sm' : 'text-slate-500 hover:text-car-yellow'}`}>Mat.</button>
                        <button onClick={() => setCategoryFilter('Élémentaire')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Élémentaire' ? 'bg-car-blue text-white shadow-sm' : 'text-slate-500 hover:text-car-blue'}`}>Élém.</button>
                    </div>
                )}

                <button onClick={onClose} className="w-full sm:w-auto bg-slate-100 text-slate-500 hover:bg-slate-200 p-3 sm:p-4 rounded-2xl font-black transition-colors">
                    FERMER
                </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl mb-6 flex justify-between items-center">
                        <span className="text-lg sm:text-xl font-black text-car-dark">
                            En sécurité {categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''} :
                        </span>
                        <span className={`text-2xl sm:text-3xl font-black px-4 sm:px-6 py-2 rounded-2xl ${currentSafeCount === currentTotalCount && currentTotalCount > 0 ? 'bg-car-green text-white animate-pulse' : 'bg-car-pink/20 text-car-pink'}`}>
                            {currentSafeCount} / {currentTotalCount}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {displayChildren.map(record => {
                            const isSafe = safeChildren.has(record._id);
                            return (
                                <div key={record._id} onClick={() => toggleSafe(record._id)} 
                                    className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSafe ? 'bg-car-green/10 border-car-green text-car-green shadow-inner' : 'bg-white border-transparent shadow-lg text-car-dark'}`}>
                                    <div>
                                        <span className={`font-black text-lg sm:text-xl block ${isSafe ? 'line-through opacity-50' : ''}`}>{record.child.lastName} <span className="font-medium">{record.child.firstName}</span></span>
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">{record.child.category}</span>
                                    </div>
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border-2 ${isSafe ? 'bg-car-green border-car-green text-white' : 'border-slate-200 text-transparent'}`}>
                                        <Check strokeWidth={4} />
                                    </div>
                                </div>
                            );
                        })}

                        {displayChildren.length === 0 && (
                            <div className="col-span-1 sm:col-span-2 text-center text-slate-400 font-bold p-8 bg-white/50 rounded-3xl">
                                Aucun enfant dans cette catégorie actuellement.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MODALE D'INFORMATION ENFANT ---
// --- MODALE D'INFORMATION ENFANT ---
const ChildInfoModal = ({ child, onClose }) => {
    if (!child) return null;

    const responsables = child.family?.responsables?.length > 0 ? child.family.responsables : [];

    // Fonction d'aide pour joindre les images au PDF
    const appendDocumentToPDF = (doc, fileUrl, title) => {
        if (!fileUrl) return;
        if (fileUrl.startsWith('data:image')) {
            doc.addPage();
            doc.setFontSize(16);
            doc.setTextColor(0);
            doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
            try {
                doc.addImage(fileUrl, 14, 30, 180, 0); // 0 auto-adapte la hauteur
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

        // 1. INFOS
        const mainInfo = [
            ['Catégorie', child.category || 'Maternelle'],
            ['Date de naissance', child.birthDate ? new Date(child.birthDate).toLocaleDateString('fr-FR') : 'Non renseignée'],
            ['Régime Alimentaire', child.regimeAlimentaire],
            ['Droit à l\'image', child.droitImage ? 'OUI' : 'NON'],
            ['Autorisé à sortir seul', child.autorisationSortieSeul ? 'OUI' : 'NON']
        ];
        autoTable(doc, { startY: yPos, head: [['Informations Générales', '']], body: mainInfo, theme: 'grid', headStyles: { fillColor: [84, 132, 164] } });
        yPos = doc.lastAutoTable.finalY + 10;

        // 2. MÉDICAL & DOCUMENTS
        const medicalInfo = [
            ['Médecin', `${child.medical?.medecinNom || '-'} (${child.medical?.medecinPhone || '-'})`],
            ['Détails', `Lunettes: ${child.medical?.lunettes?'OUI':'NON'} | Audition: ${child.medical?.appareilAuditif?'OUI':'NON'} | Dents: ${child.medical?.appareilDentaire?'OUI':'NON'}`],
            ['Apte au sport', child.medical?.activitesPhysiques !== false ? 'OUI' : 'NON'],
            ['Carnet de Vaccins', `${child.documents?.vaccins?.status || 'Manquant'}`],
            ['Assurance Civile', `${child.documents?.assurance?.status || 'Manquant'} ${child.documents?.assurance?.expiryDate ? '(Expire le ' + new Date(child.documents.assurance.expiryDate).toLocaleDateString('fr-FR') + ')' : ''}`]
        ];
        if (child.hasPAI) {
            medicalInfo.push(['PAI ACTIF', child.isPAIAlimentaire ? 'Alimentaire' : 'Médical']);
            medicalInfo.push(['Motif PAI', child.paiDetails || '-']);
        }
        autoTable(doc, { startY: yPos, head: [['Santé & Documents', '']], body: medicalInfo, theme: 'grid', headStyles: { fillColor: [244, 63, 94] } });
        yPos = doc.lastAutoTable.finalY + 10;

        // 3. RESPONSABLES
        if (responsables.length > 0) {
            const respData = responsables.map(r => [`${r.lastName?.toUpperCase()} ${r.firstName} (${r.qualite || 'Resp'})`, r.phoneMobile || r.phoneFixe || '-']);
            autoTable(doc, { startY: yPos, head: [['Responsables Légaux', 'Téléphone']], body: respData, theme: 'grid' });
            yPos = doc.lastAutoTable.finalY + 10;
        }

        // 4. AUTORISÉS
        if (child.personnesAutorisees && child.personnesAutorisees.length > 0) {
            const authData = child.personnesAutorisees.map(p => [`${p.lastName?.toUpperCase()} ${p.firstName}`, p.phone || '-', p.isEmergency ? 'OUI' : 'NON']);
            autoTable(doc, { startY: yPos, head: [['Personnes Autorisées', 'Téléphone', 'Urgence']], body: authData, theme: 'grid', headStyles: { fillColor: [156, 163, 175] } });
        }

        // 5. AJOUT DES PIÈCES JOINTES EN ANNEXE
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
                    {child.family && (
                        <span className="ml-2 text-xs font-black px-3 py-1 rounded-lg tracking-widest mt-2 inline-flex items-center gap-1 bg-car-purple/10 text-car-purple">
                            <FolderHeart size={14}/> DOSSIER LIÉ
                        </span>
                    )}
                </div>

                <div className="space-y-6">
                    {/* INFOS MÉDICALES & PAI */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500 font-black mb-3 uppercase tracking-widest text-sm">
                            <Utensils size={18}/> Santé & Médical
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm font-medium text-car-dark">
                            <div className="bg-white p-3 rounded-xl shadow-sm">Lunettes : {child.medical?.lunettes ? 'OUI' : 'NON'}</div>
                            <div className="bg-white p-3 rounded-xl shadow-sm">Auditif : {child.medical?.appareilAuditif ? 'OUI' : 'NON'}</div>
                            <div className="bg-white p-3 rounded-xl shadow-sm">Dentaire : {child.medical?.appareilDentaire ? 'OUI' : 'NON'}</div>
                            <div className="bg-white p-3 rounded-xl shadow-sm">Sport : {child.medical?.activitesPhysiques !== false ? 'OUI' : 'NON'}</div>
                        </div>
                        
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

                        {/* AFFICHAGE DES DOCUMENTS ENFANTS */}
                        <div className="space-y-2 border-t border-slate-200 pt-4 mt-2">
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase">Vaccins</span>
                                    <span className={`text-xs font-bold ${child.documents?.vaccins?.status === 'Valide' ? 'text-car-green' : 'text-car-pink'}`}>{child.documents?.vaccins?.status || 'Manquant'}</span>
                                </div>
                                {child.documents?.vaccins?.fileUrl && <button onClick={() => openDoc(child.documents.vaccins.fileUrl)} className="text-[10px] font-bold bg-car-blue/10 text-car-blue px-2 py-1 rounded-md">VOIR DOC</button>}
                            </div>
                            <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                                <div>
                                    <span className="block text-xs font-bold text-slate-500 uppercase">Assurance RC</span>
                                    <span className={`text-xs font-bold ${child.documents?.assurance?.status === 'Valide' ? 'text-car-green' : 'text-car-pink'}`}>
                                        {child.documents?.assurance?.status || 'Manquant'}
                                        {child.documents?.assurance?.expiryDate && ` (Exp: ${new Date(child.documents.assurance.expiryDate).toLocaleDateString('fr-FR')})`}
                                    </span>
                                </div>
                                {child.documents?.assurance?.fileUrl && <button onClick={() => openDoc(child.documents.assurance.fileUrl)} className="text-[10px] font-bold bg-car-blue/10 text-car-blue px-2 py-1 rounded-md">VOIR DOC</button>}
                            </div>
                        </div>
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

// COMPOSANT CALENDRIER
const InteractiveCalendar = ({ selectedDates, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const toggleDate = (dateStr) => {
        if (selectedDates.includes(dateStr)) {
            onChange(selectedDates.filter(d => d !== dateStr));
        } else {
            onChange([...selectedDates, dateStr]);
        }
    };

    const toggleWeekdayInMonth = (dayIndex) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(start);
        const daysInMonth = eachDayOfInterval({ start, end });
        const targetDaysStr = daysInMonth.filter(d => getDay(d) === dayIndex).map(d => format(d, 'yyyy-MM-dd'));

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const toggleWeek = (weekStartDay) => {
        const end = endOfWeek(weekStartDay, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStartDay, end: end });
        
        const targetDaysStr = weekDays
            .filter(d => isSameMonth(d, currentMonth))
            .map(d => format(d, 'yyyy-MM-dd'));

        if(targetDaysStr.length === 0) return;

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const toggleParity = (isEven) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(start);
        const daysInMonth = eachDayOfInterval({ start, end });
        
        const targetDaysStr = daysInMonth.filter(d => {
            const weekNum = getISOWeek(d);
            return isEven ? weekNum % 2 === 0 : weekNum % 2 !== 0;
        }).map(d => format(d, 'yyyy-MM-dd'));

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = [{label: 'Lun', idx: 1}, {label: 'Mar', idx: 2}, {label: 'Mer', idx: 3}, {label: 'Jeu', idx: 4}, {label: 'Ven', idx: 5}, {label: 'Sam', idx: 6}, {label: 'Dim', idx: 0}];

    const weeks = [];
    let currentWeek = [];
    days.forEach((day, i) => {
        currentWeek.push(day);
        if ((i + 1) % 7 === 0) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={prevMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronLeft/></button>
                    <h3 className="font-black text-car-dark text-lg capitalize w-32 text-center">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</h3>
                    <button type="button" onClick={nextMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronRight/></button>
                </div>
                
                <div className="flex gap-2">
                    <button type="button" onClick={() => toggleParity(true)} className="text-xs font-bold bg-car-purple/10 text-car-purple hover:bg-car-purple hover:text-white px-3 py-1.5 rounded-lg transition-colors">Sem. Paires</button>
                    <button type="button" onClick={() => toggleParity(false)} className="text-xs font-bold bg-car-teal/10 text-car-teal hover:bg-car-teal hover:text-white px-3 py-1.5 rounded-lg transition-colors">Sem. Impaires</button>
                </div>
            </div>
            
            <div className="grid grid-cols-8 gap-1 sm:gap-2 mb-2">
                <div></div>
                {weekDays.map(wd => (
                    <button key={wd.label} type="button" onClick={() => toggleWeekdayInMonth(wd.idx)} className="text-center font-bold text-xs sm:text-sm text-car-blue bg-car-blue/10 hover:bg-car-blue hover:text-white rounded-lg py-2 transition-colors cursor-pointer">{wd.label}</button>
                ))}
            </div>
            
            <div className="space-y-1 sm:space-y-2">
                {weeks.map((week, index) => (
                    <div key={index} className="grid grid-cols-8 gap-1 sm:gap-2">
                        <button type="button" onClick={() => toggleWeek(week[0])} className="aspect-square flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-400 font-bold rounded-xl text-xs transition-colors">W</button>
                        {week.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const isSelected = selectedDates.includes(dateStr);
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            return (
                                <div key={dateStr} onClick={() => isCurrentMonth && toggleDate(dateStr)}
                                    className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold cursor-pointer transition-all ${!isCurrentMonth ? 'text-slate-300 opacity-30 cursor-not-allowed bg-transparent' : ''} ${isCurrentMonth && !isSelected ? 'bg-slate-50 text-slate-600 hover:bg-slate-200 hover:-translate-y-0.5' : ''} ${isCurrentMonth && isSelected ? 'bg-car-teal text-white shadow-md shadow-car-teal/30 hover:bg-teal-600 hover:scale-105' : ''}`}>
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            
            <div className="mt-4 text-center">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{selectedDates.length} date(s) sélectionnée(s) au total</span>
            </div>
        </div>
    );
};

// 1. LOGIN
const Login = ({ setAuth }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/login`, creds);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('categoryAccess', data.categoryAccess);
      setAuth({ token: data.token, role: data.role, categoryAccess: data.categoryAccess });
    } catch (err) { setError('Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-car-blue/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-car-pink/10 rounded-full blur-3xl"></div>
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-sm border border-slate-100 relative z-10">
        <div className="mb-8"><LogoTexte className="text-4xl mb-2" /><p className="text-center text-slate-400 font-semibold tracking-widest text-xs uppercase mt-2">Périscolaire</p></div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div><input type="text" placeholder="Identifiant" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} /></div>
          <div><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} /></div>
          {error && <p className="text-car-pink text-sm font-bold text-center bg-car-pink/10 p-3 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-car-dark/20 hover:-translate-y-1 mt-4">Connexion</button>
        </form>
      </div>
    </div>
  );
};

// 2. DASHBOARD
const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const access = localStorage.getItem('categoryAccess') || 'Tous';
  
  const getSessionStatus = (session) => {
      if (role === 'admin') return { locked: false, text: 'Admin' };
      const now = new Date();
      const time = now.getHours() * 60 + now.getMinutes();

      if (session === 'MATIN') {
          if (time >= 435 && time <= 525) return { locked: false };
          return { locked: true, text: '7h15 - 8h45' };
      }
      if (session === 'MIDI') {
          if (time >= 705 && time <= 845) return { locked: false };
          return { locked: true, text: '11h45 - 14h05' };
      }
      if (session === 'SOIR') {
          if (time >= 975 && time <= 1155) return { locked: false };
          return { locked: true, text: '16h15 - 19h15' };
      }
      return { locked: true, text: 'Fermé' };
  };

  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  const SessionButton = ({ title, icon: Icon, type, colorClass }) => {
      const status = getSessionStatus(type);
      return (
          <button onClick={() => !status.locked && navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/${type}`)} disabled={status.locked}
              className={`group relative p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all bg-white ${status.locked ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' : `border-${colorClass} hover:shadow-2xl hover:-translate-y-1 shadow-lg shadow-${colorClass}/10`}`}>
              {!status.locked && <div className={`absolute top-4 right-4 w-3 h-3 rounded-full bg-${colorClass} opacity-50 group-hover:animate-ping`}></div>}
              {status.locked && <div className="absolute top-4 right-4 text-slate-400"><Lock size={20}/></div>}
              <div className={`p-5 rounded-3xl mb-4 ${status.locked ? 'bg-slate-200 text-slate-400' : `bg-${colorClass}/10 text-${colorClass} group-hover:scale-110`} transition-transform`}><Icon strokeWidth={2.5} size={40} /></div>
              <span className={`font-black text-xl uppercase tracking-wider ${status.locked ? 'text-slate-400' : 'text-car-dark'}`}>{title}</span>
              {status.locked && <span className="text-xs font-bold text-slate-400 mt-2 bg-slate-200 px-3 py-1 rounded-lg">{status.text}</span>}
          </button>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <LogoTexte className="text-2xl" />
        <div className="flex items-center gap-4">
            {access !== 'Tous' && <span className="text-xs font-black text-car-teal bg-car-teal/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{access}</span>}
            <span className="text-xs font-black text-car-purple bg-car-purple/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{role}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-car-pink transition-colors p-2"><LogOut size={22} /></button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-10 mt-4">
        <section>
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-teal"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Pointage en cours</h2>
                <span className="ml-auto text-sm font-bold text-car-dark">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <SessionButton title="Matin" icon={Sun} type="MATIN" colorClass="car-yellow" />
                <SessionButton title="Midi (Cantine)" icon={Utensils} type="MIDI" colorClass="car-teal" />
                <SessionButton title="Soir" icon={Moon} type="SOIR" colorClass="car-blue" />
            </div>
        </section>

        {(role === 'admin' || role === 'responsable') && (
          <section className="pt-6 border-t border-slate-200 border-dashed">
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Administration</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <button onClick={() => navigate('/admin/children')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-green/10 p-4 rounded-2xl w-fit group-hover:bg-car-green group-hover:text-white text-car-green transition-colors"><Users size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Enfants & Fiches</h3><p className="text-xs text-slate-500 font-medium mt-1">Base de données, PAI...</p></div>
                </button>
                {role === 'admin' && (
                    <>
                        <button onClick={() => navigate('/admin/families')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-car-pink text-white text-xs font-black px-3 py-1 rounded-bl-xl shadow-sm animate-pulse">NOUVEAU</div>
                            <div className="bg-car-yellow/10 p-4 rounded-2xl w-fit group-hover:bg-car-yellow group-hover:text-white text-car-yellow transition-colors"><FolderHeart size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Dossiers Familles</h3><p className="text-xs text-slate-500 font-medium mt-1">Rattachement & CAF</p></div>
                        </button>
                        <button onClick={() => navigate('/report')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-teal/10 p-4 rounded-2xl w-fit group-hover:bg-car-teal group-hover:text-white text-car-teal transition-colors"><FileText size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Rapports & Listes</h3><p className="text-xs text-slate-500 font-medium mt-1">Historique & PDF</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/users')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-purple/10 p-4 rounded-2xl w-fit group-hover:bg-car-purple group-hover:text-white text-car-purple transition-colors"><Shield size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Équipe</h3><p className="text-xs text-slate-500 font-medium mt-1">Accès & Rôles</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/planned-notes')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-pink/10 p-4 rounded-2xl w-fit group-hover:bg-car-pink group-hover:text-white text-car-pink transition-colors"><CalendarDays size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Notes plannifiées</h3><p className="text-xs text-slate-500 font-medium mt-1">& notes récurrentes</p></div>
                        </button>
                        <button onClick={() => navigate('/admin/billing')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                            <div className="bg-car-blue/10 p-4 rounded-2xl w-fit group-hover:bg-car-blue group-hover:text-white text-car-blue transition-colors"><Banknote size={24} strokeWidth={2.5}/></div>
                            <div><h3 className="font-black text-car-dark text-lg">Facturation</h3><p className="text-xs text-slate-500 font-medium mt-1">Payeurs séparés</p></div>
                        </button>
                    </>
                )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 3. SESSION / LISTE DE PRÉSENCE
const SessionView = () => {
    const { date, type } = useParams();
    const role = localStorage.getItem('role');
    const [children, setChildren] = useState([]); 
    const [attendance, setAttendance] = useState([]); 
    const [amAttendance, setAmAttendance] = useState([]); 
    const [search, setSearch] = useState('');
    
    const [noteModal, setNoteModal] = useState({ show: false, attendanceId: null, text: '', amNote: '' });
    // Update de la modale de lecture pour gérer la sauvegarde pour demain
    const [readNoteModal, setReadNoteModal] = useState({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' });
    const [plannedNotes, setPlannedNotes] = useState([]);
    const [childInfoToView, setChildInfoToView] = useState(null); 
    const [showEmergency, setShowEmergency] = useState(false);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);

    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    const isMatin = type === 'MATIN';
    const isMidi = type === 'MIDI'; 
    const themeColor = isMatin ? 'car-yellow' : (isMidi ? 'car-teal' : 'car-blue');
    const postItColors = ['bg-car-blue', 'bg-car-yellow', 'bg-car-teal', 'bg-car-pink', 'bg-car-green'];

    useEffect(() => {
        if (role !== 'admin') {
            const now = new Date();
            const time = now.getHours() * 60 + now.getMinutes();
            let locked = true;
            if (type === 'MATIN' && time >= 435 && time <= 525) locked = false;
            if (type === 'MIDI' && time >= 705 && time <= 845) locked = false;
            if (type === 'SOIR' && time >= 975 && time <= 1155) locked = false;
            if (locked) navigate('/');
        }
    }, [type, role, navigate]);

    const syncOfflineActions = async () => {
        const queueStr = localStorage.getItem('syncQueue');
        if (!queueStr) return;
        const queue = JSON.parse(queueStr);
        if (queue.length === 0) return;

        try {
            await axios.post(`${API_URL}/attendance/sync`, { actions: queue });
            localStorage.removeItem('syncQueue'); 
            setPendingSync(0);
            setIsOnline(true); 
            loadData(); 
        } catch (e) {
            setIsOnline(false); 
        }
    };

    const loadLocalFallback = () => {
        const cachedKids = localStorage.getItem('offline_children');
        const cachedAtt = localStorage.getItem(`offline_attendance_${date}_${type}`);
        const cachedAmAtt = localStorage.getItem(`offline_attendance_${date}_MATIN`);
        const cachedNotes = localStorage.getItem(`offline_notes_${date}`);
        
        if (cachedKids) setChildren(JSON.parse(cachedKids));
        if (cachedAtt) setAttendance(JSON.parse(cachedAtt));
        if (cachedAmAtt && type === 'SOIR') setAmAttendance(JSON.parse(cachedAmAtt));
        if (cachedNotes) setPlannedNotes(JSON.parse(cachedNotes));
    };

    const loadData = async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            loadLocalFallback();
            return;
        }
        try {
            const [kidsRes, attRes, amAttRes, notesRes] = await Promise.all([
                axios.get(`${API_URL}/children`), 
                axios.get(`${API_URL}/attendance?date=${date}&sessionType=${type}`),
                type === 'SOIR' ? axios.get(`${API_URL}/attendance?date=${date}&sessionType=MATIN`) : Promise.resolve({ data: [] }),
                axios.get(`${API_URL}/planned-notes/date?date=${date}`)
            ]);
            setIsOnline(true); 
            setChildren(kidsRes.data); 
            setAttendance(attRes.data);
            setAmAttendance(amAttRes.data);
            setPlannedNotes(notesRes.data);

            localStorage.setItem('offline_children', JSON.stringify(kidsRes.data));
            localStorage.setItem(`offline_attendance_${date}_${type}`, JSON.stringify(attRes.data));
            if (type === 'SOIR') localStorage.setItem(`offline_attendance_${date}_MATIN`, JSON.stringify(amAttRes.data));
            localStorage.setItem(`offline_notes_${date}`, JSON.stringify(notesRes.data));
            
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            setPendingSync(queue.length);
        } catch (error) {
            setIsOnline(false); 
            loadLocalFallback();
        }
    };

    useEffect(() => { 
        let isMounted = true;
        let timeoutId;
        const loop = async () => {
            if (!isMounted) return;
            await loadData();
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            if (navigator.onLine && queue.length > 0) {
                await syncOfflineActions();
            } else {
                setPendingSync(queue.length);
            }
            timeoutId = setTimeout(loop, 5000);
        };
        loop();

        const handleOnline = () => { setIsOnline(true); syncOfflineActions(); };
        const handleOffline = () => { setIsOnline(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [date, type]);

    const processAction = async (actionDef, optimisticUpdate) => {
        const timestamp = Date.now();
        const action = { ...actionDef, timestamp, date, sessionType: type };

        setAttendance(prev => optimisticUpdate(prev, timestamp));
        const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        queue.push(action);
        localStorage.setItem('syncQueue', JSON.stringify(queue));
        setPendingSync(queue.length);

        setAttendance(currentAtt => {
            localStorage.setItem(`offline_attendance_${date}_${type}`, JSON.stringify(currentAtt));
            return currentAtt;
        });
        if (navigator.onLine) syncOfflineActions();
    };

    const handleCheckIn = (childId) => {
        const childObj = children.find(c => c._id === childId);
        processAction(
            { type: 'CHECK_IN', childId },
            (prev, ts) => [...prev, { _id: `temp_${ts}`, child: childObj, checkIn: new Date(ts).toISOString(), checkOut: null, isLate: false }]
        );
        setSearch('');
    };

    const handleCheckOut = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        const limit = new Date(); limit.setHours(18, 35, 0, 0);
        const isLate = type === 'SOIR' ? (new Date() > limit) : false; 

        processAction(
            { type: 'CHECK_OUT', childId: record.child._id },
            (prev, ts) => prev.map(a => a._id === recordId ? { ...a, checkOut: new Date(ts).toISOString(), isLate } : a)
        );
        setSearch('');
    };

    const handleUndoCheckOut = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        processAction(
            { type: 'CHECK_IN', childId: record.child._id },
            (prev) => prev.map(a => a._id === recordId ? { ...a, checkOut: null, isLate: false } : a)
        );
    };

    const handleDeleteCheckIn = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        const msg = isMidi ? "Annuler l'absence de cet enfant ?" : "Annuler la présence ?";
        if(window.confirm(msg)) {
            processAction(
                { type: 'DELETE', childId: record.child._id },
                (prev) => prev.filter(a => a._id !== recordId)
            );
        }
    };

    const saveNote = () => {
        const record = attendance.find(a => a._id === noteModal.attendanceId);
        if (!record) return;
        processAction(
            { type: 'ADD_NOTE', childId: record.child._id, note: noteModal.text },
            (prev) => prev.map(a => a._id === noteModal.attendanceId ? { ...a, note: noteModal.text } : a)
        );
        setNoteModal({ show: false, attendanceId: null, text: '', amNote: '' });
    };

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément de retard ?")) {
            await axios.put(`${API_URL}/attendance/remove-late/${id}`);
            loadData();
        }
    };

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => {
            const matchSearch = c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase());
            const matchCategory = categoryFilter === 'Tous' || c.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [children, search, categoryFilter]);

    const filteredAttendance = useMemo(() => {
        return attendance.filter(a => categoryFilter === 'Tous' || a.child.category === categoryFilter);
    }, [attendance, categoryFilter]);

    const sortedAttendance = useMemo(() => {
        return [...filteredAttendance].sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));
    }, [filteredAttendance]);

    const activeCount = filteredAttendance.filter(a => !a.checkOut).length;
    const totalCount = filteredAttendance.length;

    const totalCategoryChildren = children.filter(c => categoryFilter === 'Tous' || c.category === categoryFilter).length;
    const midiPresents = totalCategoryChildren - totalCount; 

    // MODIFIÉ : Fusionne la note du jour + note persistante
    const handleDepartureClick = (record) => {
        const amRecord = type === 'SOIR' ? amAttendance.find(a => a.child._id === record.child._id) : null;
        const amNote = amRecord?.note || '';
        const persistentNote = record.child.persistentNote || '';
        
        let combinedDisplay = [];
        let combinedSave = [];

        if (persistentNote) {
            combinedDisplay.push(`⚠️ EN ATTENTE : ${persistentNote}`);
            combinedSave.push(persistentNote);
        }
        if (type === 'SOIR' && amNote) {
            combinedDisplay.push(`MATIN : ${amNote}`);
            combinedSave.push(`Matin: ${amNote}`);
        }
        if (record.note) {
            combinedDisplay.push(`${type === 'SOIR' ? 'SOIR : ' : ''}${record.note}`);
            combinedSave.push(record.note);
        }

        if (combinedDisplay.length > 0) {
            const randomColor = postItColors[Math.floor(Math.random() * postItColors.length)];
            setReadNoteModal({ 
                show: true, 
                attendanceId: record._id, 
                childId: record.child._id,
                text: combinedDisplay.join('\n\n'), 
                textToSave: combinedSave.join(' | '),
                name: `${record.child.firstName} ${record.child.lastName}`,
                color: randomColor
            });
        } else {
            handleCheckOut(record._id);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 relative">
            <div className="bg-white shadow-sm z-20">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors w-full sm:w-auto text-left">← Retour</button>
                    
                    <div className="flex items-center gap-3">
                        {/* NOUVEAU : BOUTON URGENCE */}
                        <button onClick={() => setShowEmergency(true)} className="flex items-center gap-2 bg-car-pink text-white px-4 py-2 rounded-xl text-sm font-black tracking-widest hover:bg-red-600 transition-colors shadow-md shadow-car-pink/30 animate-pulse">
                            <AlertTriangle size={18} /> URGENCE
                        </button>

                        {isOnline ? (
                            <div className="flex items-center gap-2 text-car-teal bg-car-teal/10 px-3 py-1.5 rounded-lg text-xs font-bold hidden sm:flex">
                                <Wifi size={16}/> {pendingSync > 0 ? `${pendingSync} en attente...` : 'En ligne'}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-car-pink bg-car-pink/10 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse hidden sm:flex">
                                <WifiOff size={16}/> HORS-LIGNE ({pendingSync})
                            </div>
                        )}
                        <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />
                    </div>

                    <div className={`bg-${themeColor}/10 text-${themeColor} px-5 py-2 rounded-full font-black text-sm tracking-widest w-full sm:w-auto text-center`}>
                        {type} • {isMidi ? `${midiPresents} PRÉSENTS` : `${activeCount} / ${totalCount} PRÉSENTS`}
                    </div>
                </div>
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative max-w-4xl mx-auto">
                        <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                        <input type="text" className={`w-full pl-14 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-${themeColor} outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg`}
                            placeholder={isMidi ? "Rechercher un enfant pour le marquer ABSENT à la cantine..." : "Rechercher pour pointer une arrivée ou un départ..."} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {search.length >= 2 && (
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl max-h-80 overflow-y-auto absolute w-full top-[220px] sm:top-36 z-30 border-b border-slate-200">
                    <div className="max-w-4xl mx-auto">
                        {filteredSearch.map(child => {
                            const attendanceRecord = attendance.find(a => a.child._id === child._id);
                            const isPresent = !!attendanceRecord;
                            const isGone = isPresent && !!attendanceRecord.checkOut;

                            return (
                                <div key={child._id} className="p-5 flex justify-between items-center hover:bg-slate-100 transition-colors group rounded-2xl mb-1">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setChildInfoToView(child)} className="text-slate-300 hover:text-car-blue bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-colors">
                                            <Info size={20}/>
                                        </button>
                                        <span className="font-black text-xl text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                        {child.hasPAI && <AlertTriangle size={18} className="text-car-pink fill-car-pink"/>}
                                    </div>
                                    
                                    <div onClick={() => {
                                        if (!isPresent) handleCheckIn(child._id);
                                        else if (!isGone && !isMatin && !isMidi) handleDepartureClick(attendanceRecord);
                                    }} className="cursor-pointer">
                                        {!isPresent && <span className={`bg-${themeColor} text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider`}>{isMidi ? 'MARQUER ABSENT' : '+ AJOUTER'}</span>}
                                        {isPresent && !isGone && !isMatin && !isMidi && <span className="bg-car-dark text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">DÉPART</span>}
                                        {isGone && !isMidi && <span className="text-slate-400 text-xs font-bold px-4 py-2 rounded-xl">Déjà parti</span>}
                                        {isPresent && isMidi && <span className="text-slate-400 text-xs font-bold px-4 py-2 rounded-xl">Déjà noté absent</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full pb-20 mt-4">
                {sortedAttendance.map(record => {
                    const isGone = !!record.checkOut;
                    const childNotes = plannedNotes.filter(pn => pn.child === record.child._id);

                    const amRecord = type === 'SOIR' ? amAttendance.find(a => a.child._id === record.child._id) : null;
                    const amNote = amRecord?.note || '';
                    const persistentNote = record.child.persistentNote || '';
                    // Indicateur global de message en attente
                    const hasAnyNote = record.note || (type === 'SOIR' && amNote) || persistentNote;

                    return (
                        <div key={record._id} className={`p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isGone ? 'bg-slate-50 opacity-70' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]'}`}>
                            <div className="w-full sm:w-auto">
                                <div className={`font-black text-xl flex items-center gap-2 ${isGone ? 'text-slate-400 line-through decoration-slate-300' : 'text-car-dark'}`}>
                                    <button onClick={() => setChildInfoToView(record.child)} className="text-slate-300 hover:text-car-blue mr-2 transition-colors"><Info size={20}/></button>
                                    {record.child.lastName} <span className="font-medium">{record.child.firstName}</span>
                                    {record.child.hasPAI && <AlertTriangle size={18} className="text-car-pink fill-car-pink"/>}
                                    {hasAnyNote && !isGone && !isMidi && <StickyNote size={18} className="text-car-yellow fill-car-yellow animate-pulse"/>}
                                </div>
                                
                                {!isGone && childNotes.length > 0 && !isMidi && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        {childNotes.map(pn => (
                                            <div key={pn._id} className="flex items-center gap-1.5 text-car-pink bg-car-pink/10 px-2 py-0.5 rounded-md text-xs font-bold w-fit">
                                                <CalendarIcon size={12}/> {pn.note}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    {isMidi && <span className="text-xs font-bold text-car-teal bg-car-teal/10 px-3 py-1 rounded-lg uppercase tracking-widest">Absent Cantine</span>}
                                    {isGone && !isMidi && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Parti à {format(new Date(record.checkOut), 'HH:mm')}</span>}
                                    {record.isLate && !isMidi && <button onClick={() => handleRemoveLate(record._id)} className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg hover:scale-105 transition-transform" title="Cliquer pour annuler le supplément"> +19h</button>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {!isGone && !isMidi && (
                                    <button onClick={() => setNoteModal({ show: true, attendanceId: record._id, text: record.note || '', amNote: amNote })} 
                                        className={`p-3 rounded-2xl transition-colors ${hasAnyNote ? 'bg-car-yellow/20 text-car-yellow hover:bg-car-yellow/30' : 'bg-slate-50 text-slate-400 hover:text-car-yellow hover:bg-slate-100'}`} title="Ajouter un post-it">
                                        <StickyNote size={22}/>
                                    </button>
                                )}
                                
                                {!isMatin && !isMidi && (
                                    !isGone ? (
                                        <button onClick={() => handleDepartureClick(record)} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-car-dark/20 relative">
                                            DÉPART
                                            {hasAnyNote && <div className="absolute -top-2 -right-2 bg-car-pink w-4 h-4 rounded-full border-2 border-white animate-bounce"></div>}
                                        </button>
                                    ) : (
                                        <button onClick={() => handleUndoCheckOut(record._id)} className="bg-slate-100 text-slate-500 p-3 rounded-2xl hover:bg-slate-200 transition-colors" title="Annuler le départ"><RotateCcw size={22}/></button>
                                    )
                                )}

                                {(!isGone || isMatin || isMidi) && (
                                    <button onClick={() => handleDeleteCheckIn(record._id)} className={`p-2 rounded-xl transition-colors ${isMidi ? 'bg-car-teal/10 text-car-teal hover:bg-car-teal hover:text-white px-4 font-bold text-sm' : 'text-slate-300 hover:text-car-pink'}`}>
                                        {isMidi ? "ANNULER ABSENCE" : <Trash2 size={24}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />
            
            {/* NOUVEAU : Appel de la modale d'urgence corrigée */}
            {showEmergency && <EmergencyModal 
                attendance={attendance} 
                allChildren={children} 
                sessionType={type} 
                access={access} 
                onClose={() => setShowEmergency(false)} 
            />}

            {noteModal.show && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-car-dark">Note / Info</h3>
                            <button onClick={() => setNoteModal({...noteModal, show: false})} className="text-slate-400 hover:text-car-dark"><X size={24}/></button>
                        </div>
                        {noteModal.amNote && (
                            <div className="mb-4 p-4 bg-car-yellow/10 border border-car-yellow/30 rounded-2xl text-sm font-medium text-car-dark">
                                <span className="font-black text-car-yellow uppercase tracking-widest text-xs block mb-1">Transmis ce matin :</span>
                                {noteModal.amNote}
                            </div>
                        )}
                        <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-car-yellow outline-none min-h-[120px] font-medium text-car-dark" 
                            placeholder={noteModal.amNote ? "Ajouter une info pour le soir..." : "Ex: S'est fait mal au genou..."} 
                            value={noteModal.text} 
                            onChange={(e) => setNoteModal({...noteModal, text: e.target.value})} 
                            autoFocus>
                        </textarea>
                        <p className="text-xs text-slate-400 font-bold mt-2 mb-6">Cette note apparaîtra au moment du départ et sera effacée ce soir.</p>
                        <button onClick={saveNote} className="w-full bg-car-yellow text-white font-black p-4 rounded-2xl hover:-translate-y-1 transition-all shadow-lg shadow-car-yellow/20">SAUVEGARDER</button>
                    </div>
                </div>
            )}

            {/* MODIFIÉ : Modale de lecture avec sauvegarde persistante */}
            {readNoteModal.show && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`${readNoteModal.color} rounded-[2rem] p-8 w-full max-w-md shadow-2xl transform rotate-1 scale-105 transition-transform`}>
                        <div className="flex items-center gap-3 mb-6">
                            <StickyNote className="text-white/80" size={32}/>
                            <h3 className="text-3xl font-black text-white">À transmettre !</h3>
                        </div>
                        <p className="text-white/90 font-bold text-lg mb-2 uppercase tracking-widest">{readNoteModal.name}</p>
                        <div className="bg-white/10 p-6 rounded-2xl text-white font-medium text-xl leading-relaxed mb-8 backdrop-blur-md whitespace-pre-wrap">
                            {readNoteModal.text}
                        </div>
                        
                        <div className="space-y-3">
                            {/* BOUTON TRANSMIS : Valide le départ et EFFACE la note persistante de l'enfant */}
                            <button onClick={() => { 
                                handleCheckOut(readNoteModal.attendanceId); 
                                axios.put(`${API_URL}/children/${readNoteModal.childId}`, { persistentNote: "" }).then(() => loadData());
                                setReadNoteModal({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' }); 
                            }} className="w-full bg-white text-car-dark font-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex justify-center items-center gap-2">
                                <CheckCircle size={24}/> J'AI TRANSMIS, DÉPART
                            </button>
                            
                            {/* NOUVEAU BOUTON NON TRANSMIS : Valide le départ et SAUVEGARDE la note pour demain */}
                            <button onClick={() => { 
                                handleCheckOut(readNoteModal.attendanceId); 
                                axios.put(`${API_URL}/children/${readNoteModal.childId}`, { persistentNote: readNoteModal.textToSave }).then(() => loadData());
                                setReadNoteModal({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' }); 
                            }} className="w-full bg-black/20 text-white font-black p-4 rounded-2xl hover:bg-black/30 transition-all flex justify-center items-center gap-2 border border-white/30">
                                <AlertTriangle size={20}/> NON TRANSMIS (REPORTER)
                            </button>

                            <button onClick={() => setReadNoteModal({...readNoteModal, show: false})} className="w-full mt-2 text-white/80 font-bold p-2 hover:text-white transition-colors">
                                Annuler, ne pas faire partir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. ADMIN ENFANTS 
const ChildrenManager = () => {
    const [children, setChildren] = useState([]);
    const role = localStorage.getItem('role');
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const isReadOnly = role !== 'admin'; 
    
    const [newChild, setNewChild] = useState({ 
        firstName: '', lastName: '', category: 'Maternelle' 
    });
    
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkCategory, setBulkCategory] = useState('Élémentaire');
    const [isImporting, setIsImporting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    
    const [childInfoToView, setChildInfoToView] = useState(null);
    
    const [searchTerm, setSearchTerm] = useState('');

    const navigate = useNavigate();

    useEffect(() => { loadChildren(); }, []);
    const loadChildren = () => axios.get(`${API_URL}/children`).then(res => setChildren(res.data));

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

    const handleAdd = async (e) => {
        e.preventDefault();
        if (isReadOnly) return;
        await axios.post(`${API_URL}/children`, newChild);
        setNewChild({ firstName: '', lastName: '', category: 'Maternelle' });
        loadChildren();
    };

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
                    await axios.post(`${API_URL}/children`, { firstName, lastName, category: bulkCategory });
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
        if(window.confirm(`Retirer ${nom} ?`)) {
            await axios.delete(`${API_URL}/children/${id}`);
            loadChildren();
        }
    };

    const startEdit = (child) => {
        if(isReadOnly) return;
        setEditingId(child._id);
        
        let respLegaux = [{firstName: '', lastName: '', phone: ''}];
        if (Array.isArray(child.responsablesLegaux) && child.responsablesLegaux.length > 0) {
            respLegaux = child.responsablesLegaux;
        }

        let persAuto = [];
        if (Array.isArray(child.personnesAutorisees)) {
            persAuto = child.personnesAutorisees;
        }

        setEditForm({ 
            firstName: child.firstName, 
            lastName: child.lastName, 
            category: child.category || 'Maternelle',
            responsablesLegaux: respLegaux, 
            personnesAutorisees: persAuto,
            autorisationSortieSeul: child.autorisationSortieSeul || false,
            hasPAI: child.hasPAI || false, 
            paiDetails: child.paiDetails || '', 
            isPAIAlimentaire: child.isPAIAlimentaire || false,
            regimeAlimentaire: child.regimeAlimentaire || 'Standard'
        });
    };

    const saveEdit = async (id) => {
        if(isReadOnly) return;
        await axios.put(`${API_URL}/children/${id}`, editForm);
        setEditingId(null);
        loadChildren();
    };

    const renderContacts = (field, title, minRequired) => (
        <div>
            <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {title} {minRequired > 0 && <span className="text-car-pink">*</span>}
                </label>
                <button type="button" onClick={() => {
                    setEditForm(prev => ({...prev, [field]: [...prev[field], {firstName:'', lastName:'', phone:''}]}))
                }} className="text-xs font-bold text-car-blue bg-car-blue/10 px-3 py-1.5 rounded-lg hover:bg-car-blue hover:text-white transition-colors">+ AJOUTER</button>
            </div>
            <div className="space-y-2">
                {editForm[field].map((contact, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <input className="bg-white border border-slate-200 p-2.5 rounded-xl text-sm flex-1 uppercase outline-none focus:border-car-green w-full" placeholder="Nom" value={contact.lastName} onChange={e => {
                            const newArr = [...editForm[field]]; newArr[index].lastName = e.target.value.toUpperCase(); setEditForm({...editForm, [field]: newArr});
                        }} />
                        <input className="bg-white border border-slate-200 p-2.5 rounded-xl text-sm flex-1 outline-none focus:border-car-green w-full" placeholder="Prénom" value={contact.firstName} onChange={e => {
                            const newArr = [...editForm[field]]; newArr[index].firstName = e.target.value; setEditForm({...editForm, [field]: newArr});
                        }} />
                        <input className="bg-white border border-slate-200 p-2.5 rounded-xl text-sm flex-1 outline-none focus:border-car-green w-full" placeholder="Téléphone" value={contact.phone} onChange={e => {
                            const newArr = [...editForm[field]]; newArr[index].phone = e.target.value; setEditForm({...editForm, [field]: newArr});
                        }} />
                        {editForm[field].length > minRequired ? (
                            <button type="button" onClick={() => {
                                const newArr = editForm[field].filter((_, i) => i !== index); setEditForm({...editForm, [field]: newArr});
                            }} className="p-2 text-slate-400 hover:bg-car-pink/10 hover:text-car-pink rounded-xl transition-colors"><X size={20}/></button>
                        ) : <div className="w-9"></div>}
                    </div>
                ))}
                {editForm[field].length === 0 && (
                    <p className="text-xs text-slate-400 italic">Aucun contact enregistré.</p>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-4xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-green/10 p-4 rounded-2xl"><Users className="text-car-green w-8 h-8"/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Base Enfants</h1>
                            {isReadOnly && <p className="text-car-pink font-bold text-sm mt-1">Mode Lecture Seule</p>}
                        </div>
                    </div>
                    {!isReadOnly && (
                        <button onClick={() => setIsBulkMode(!isBulkMode)} className={`font-bold px-4 py-2 rounded-xl transition-all ${isBulkMode ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-car-green/10 text-car-green hover:bg-car-green/20'}`}>
                            {isBulkMode ? "Passer en Ajout Simple" : "Ajout Groupé (Liste)"}
                        </button>
                    )}
                </div>

                {!isReadOnly && (
                    isBulkMode ? (
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
                    ) : (
                        <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-black text-car-dark placeholder:font-bold placeholder:text-slate-400 flex-1 uppercase" placeholder="NOM" value={newChild.lastName} onChange={e => setNewChild({...newChild, lastName: e.target.value.toUpperCase()})} required/>
                                <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-bold text-car-dark placeholder:text-slate-400 flex-1" placeholder="Prénom" value={newChild.firstName} onChange={e => setNewChild({...newChild, firstName: e.target.value})} required/>
                                <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-green/20" value={newChild.category} onChange={e => setNewChild({...newChild, category: e.target.value})}>
                                    <option value="Maternelle">Maternelle</option>
                                    <option value="Élémentaire">Élémentaire</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-car-green text-white px-8 py-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-green/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><Plus strokeWidth={3}/> CRÉATION RAPIDE</button>
                        </form>
                    )
                )}

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 mb-6 flex items-center gap-4 relative">
                    <Search className="text-slate-400 ml-2" size={24} />
                    <input 
                        type="text" 
                        className="bg-transparent border-none outline-none font-bold text-car-dark placeholder:text-slate-400 w-full text-lg" 
                        placeholder="Rechercher un enfant pour voir ou modifier sa fiche..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-car-pink transition-colors">
                            <X size={20}/>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredChildren.map(child => (
                        <div key={child._id} className={`bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-all duration-300 ${editingId === child._id ? 'md:col-span-2 ring-4 ring-car-green/10' : 'hover:-translate-y-1 hover:shadow-lg'}`}>
                            {editingId === child._id && !isReadOnly ? (
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <input className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-black text-car-dark w-full md:w-1/3 uppercase" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value.toUpperCase()})} />
                                        <input className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-bold text-car-dark w-full md:w-1/3" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
                                        <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-bold text-car-dark w-full md:w-1/3" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                                            <option value="Maternelle">Maternelle</option>
                                            <option value="Élémentaire">Élémentaire</option>
                                        </select>
                                    </div>
                                    
                                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-2 mt-2">
                                        {renderContacts('responsablesLegaux', 'Responsables Légaux', 1)}
                                        <div className="w-full h-px bg-slate-200 my-6"></div>
                                        {renderContacts('personnesAutorisees', 'Personnes Autorisées (Hors Parents)', 0)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                        <label className="flex items-center gap-2 text-sm font-bold text-car-dark cursor-pointer">
                                            <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editForm.hasPAI} onChange={e => setEditForm({...editForm, hasPAI: e.target.checked})} />
                                            Enfant sous PAI
                                        </label>
                                        {editForm.hasPAI && (
                                            <>
                                                <input type="text" className="border border-slate-200 p-2 rounded-lg text-sm w-full outline-none focus:border-car-pink" placeholder="Détails du PAI..." value={editForm.paiDetails} onChange={e => setEditForm({...editForm, paiDetails: e.target.value})} />
                                                <label className="flex items-center gap-2 text-sm font-bold text-car-pink cursor-pointer">
                                                    <input type="checkbox" className="w-5 h-5 accent-car-pink" checked={editForm.isPAIAlimentaire} onChange={e => {
                                                        const isAlim = e.target.checked;
                                                        setEditForm({...editForm, isPAIAlimentaire: isAlim, regimeAlimentaire: isAlim ? 'PAI' : 'Standard'});
                                                    }} /> PAI Alimentaire
                                                </label>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div>
                                            <label className="text-xs font-bold text-slate-400 block mb-1">Régime Alimentaire</label>
                                            <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl outline-none font-bold text-car-dark w-full" value={editForm.regimeAlimentaire} onChange={e => setEditForm({...editForm, regimeAlimentaire: e.target.value})} disabled={editForm.isPAIAlimentaire}>
                                                <option value="Standard">Standard</option>
                                                <option value="Sans-porc">Sans-porc</option>
                                                <option value="Végétarien">Végétarien</option>
                                                <option value="PAI">PAI</option>
                                            </select>
                                        </div>
                                        {editForm.category === 'Élémentaire' && (
                                            <label className="flex items-center gap-2 text-sm font-bold text-car-blue cursor-pointer mt-4">
                                                <input type="checkbox" className="w-5 h-5 accent-car-blue" checked={editForm.autorisationSortieSeul} onChange={e => setEditForm({...editForm, autorisationSortieSeul: e.target.checked})} />
                                                Autorisation de sortir seul
                                            </label>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-2 mt-2 pt-4 border-t border-slate-100">
                                        <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-500 px-6 py-2 font-bold rounded-xl hover:bg-slate-200 transition-colors">Annuler</button>
                                        <button onClick={() => saveEdit(child._id)} className="bg-car-green text-white px-6 py-2 font-bold rounded-xl shadow-md hover:bg-green-600 transition-colors flex items-center gap-2"><Check size={20}/> Sauvegarder</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-full gap-4">
                                    <div className="flex items-center gap-4">
                                        <button onClick={() => setChildInfoToView(child)} className="text-slate-300 hover:text-car-blue bg-slate-50 p-3 rounded-full transition-colors flex-shrink-0"><Info size={24}/></button>
                                        <div>
                                            <span className="font-black text-car-dark text-xl block leading-tight">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-widest ${child.category === 'Élémentaire' ? 'bg-car-blue/10 text-car-blue' : 'bg-car-yellow/10 text-car-yellow'}`}>
                                                    {child.category || 'Maternelle'}
                                                </span>
                                                {child.hasPAI && <span className="text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-car-pink/10 text-car-pink flex items-center gap-1"><AlertTriangle size={12}/> PAI</span>}
                                                {child.regimeAlimentaire !== 'Standard' && <span className="text-xs font-black px-3 py-1 rounded-lg tracking-widest bg-car-yellow/20 text-car-yellow flex items-center gap-1"><Utensils size={12}/> {child.regimeAlimentaire}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {!isReadOnly && (
                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button onClick={() => startEdit(child)} className="text-slate-400 hover:text-car-blue p-3 bg-slate-50 rounded-xl transition-colors"><Pencil size={20}/></button>
                                            <button onClick={() => handleDelete(child._id, `${child.firstName} ${child.lastName}`)} className="text-slate-400 hover:text-car-pink p-3 bg-slate-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {filteredChildren.length === 0 && (
                        <div className="text-center text-slate-400 font-bold p-8 bg-white rounded-3xl border border-slate-100 md:col-span-2">
                            Aucun enfant ne correspond à "{searchTerm}"
                        </div>
                    )}
                </div>
            </div>
            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />
        </div>
    );
};

// 5. RAPPORTS (4 Onglets)
const Report = () => {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState([]);
    
    const [activeTab, setActiveTab] = useState('PERISCO');
    
    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    useEffect(() => { loadReport(); }, [date]);
    const loadReport = () => axios.get(`${API_URL}/report?date=${date}`).then(res => setReportData(res.data));

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément ?")) {
            await axios.put(`${API_URL}/attendance/remove-late/${id}`);
            loadReport();
        }
    };

    const filteredReportData = useMemo(() => {
        return reportData.filter(r => categoryFilter === 'Tous' || r.child.category === categoryFilter);
    }, [reportData, categoryFilter]);

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        
        let title = "";
        let tableColumn = [];
        let tableRows = [];
        let footData = [];

        if (activeTab === 'PERISCO') {
            title = `Rapport Périscolaire - ${format(new Date(date), 'dd/MM/yyyy')} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Facture", "Matin", "Soir", "19h"];
            const presences = filteredReportData.filter(r => r.matin || r.soir || r.checkOut);
            tableRows = presences.map(row => [row.child.lastName, row.child.firstName, row.billTo || '-', row.matin ? 'OUI' : '-', (row.checkOut || row.soir) ? 'OUI' : '-', row.isLate ? 'OUI' : '-']);
            footData = [["TOTAL", "", "", presences.filter(r=>r.matin).length.toString(), presences.filter(r=>r.soir||r.checkOut).length.toString(), presences.filter(r=>r.isLate).length.toString()]];
        } 
        else if (activeTab === 'CANTINE') {
            title = `Rapport ABSENTS Cantine - ${format(new Date(date), 'dd/MM/yyyy')} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Régime", "PAI Alim."];
            const absents = filteredReportData.filter(r => r.midiAbsent);
            tableRows = absents.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire, row.child.isPAIAlimentaire ? 'OUI' : '-']);
            footData = [["TOTAL ABSENTS", absents.length.toString(), "", "", ""]];
        }
        else if (activeTab === 'PAI') {
            title = `Liste Globale des PAI ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Type PAI", "Détails"];
            const pais = filteredReportData.filter(r => r.child.hasPAI);
            tableRows = pais.map(row => [row.child.lastName, row.child.firstName, row.child.isPAIAlimentaire ? 'Alimentaire' : 'Médical', row.child.paiDetails]);
            footData = [["TOTAL ENFANTS PAI", pais.length.toString(), "", ""]];
        }
        else if (activeTab === 'REGIMES') {
            title = `Régimes Alimentaires Spécifiques ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Régime"];
            const regimes = filteredReportData.filter(r => r.child.regimeAlimentaire !== 'Standard');
            tableRows = regimes.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire]);
            footData = [["TOTAL RÉGIMES", regimes.length.toString(), "", ""]];
        }
        
        doc.text(title, 14, 22);
        autoTable(doc, {
            startY: 35, head: [tableColumn], body: tableRows, foot: footData,
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            theme: 'grid', headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, textColor: [58, 58, 58] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            halign: 'center'
        });

        doc.save(`carillon_rapport_${activeTab}_${date}.pdf`);
    };

    const displayData = useMemo(() => {
        if (activeTab === 'PERISCO') return filteredReportData.filter(r => r.matin || r.soir || r.checkOut);
        if (activeTab === 'CANTINE') return filteredReportData.filter(r => r.midiAbsent);
        if (activeTab === 'PAI') return filteredReportData.filter(r => r.child.hasPAI);
        if (activeTab === 'REGIMES') return filteredReportData.filter(r => r.child.regimeAlimentaire !== 'Standard');
        return [];
    }, [filteredReportData, activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><FileText className="text-car-blue w-8 h-8"/></div>
                        <h1 className="text-4xl font-black text-car-dark">Rapports & Listes</h1>
                    </div>
                    <button onClick={exportPDF} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20"><Download size={20}/> TÉLÉCHARGER PDF</button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setActiveTab('PERISCO')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'PERISCO' ? 'bg-car-blue text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Périscolaire</button>
                    <button onClick={() => setActiveTab('CANTINE')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'CANTINE' ? 'bg-car-teal text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Absents Cantine</button>
                    <button onClick={() => setActiveTab('PAI')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'PAI' ? 'bg-car-pink text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Fiches PAI</button>
                    <button onClick={() => setActiveTab('REGIMES')} className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'REGIMES' ? 'bg-car-yellow text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Régimes Spéciaux</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 mb-6">
                    {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                        <input type="date" className="bg-slate-50 p-4 rounded-2xl outline-none font-bold text-car-dark flex-1 cursor-pointer" value={date} onChange={e => setDate(e.target.value)} />
                    )}
                    <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-xs tracking-wider">
                                <th className="p-5 border-b border-slate-100">Enfant</th>
                                
                                {activeTab === 'PERISCO' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">Facturation</th>
                                        <th className="p-5 border-b border-slate-100 text-center">Matin</th>
                                        <th className="p-5 border-b border-slate-100 text-center">Soir</th>
                                        <th className="p-5 border-b border-slate-100 text-center">19h</th>
                                    </>
                                )}

                                {activeTab === 'CANTINE' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100 text-center">Catégorie</th>
                                        <th className="p-5 border-b border-slate-100 text-center">Régime</th>
                                        <th className="p-5 border-b border-slate-100 text-center">PAI Alim.</th>
                                    </>
                                )}

                                {activeTab === 'PAI' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100">Détails du PAI</th>
                                        <th className="p-5 border-b border-slate-100 text-center">Alimentaire</th>
                                    </>
                                )}

                                {activeTab === 'REGIMES' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100 text-center">Catégorie</th>
                                        <th className="p-5 border-b border-slate-100">Régime Strict</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.map(row => {
                                const c = row.child ? row.child : row; 
                                return (
                                <tr key={c._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5 border-b border-slate-100">
                                        <span className="font-black text-car-dark">{c.lastName}</span> <span className="font-medium text-slate-500">{c.firstName}</span>
                                    </td>
                                    
                                    {activeTab === 'PERISCO' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">{row.billTo ? <span className="bg-car-blue/10 text-car-blue font-bold px-2 py-1 rounded-md text-xs uppercase tracking-widest">{row.billTo}</span> : <span className="text-slate-300">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{row.matin ? <CheckCircle className="text-car-yellow mx-auto" size={24}/> : <span className="text-slate-300 font-bold">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{(row.checkOut || row.soir) ? <CheckCircle className="text-car-blue mx-auto" size={24}/> : <span className="text-slate-300 font-bold">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{row.isLate ? <button onClick={() => handleRemoveLate(row.pmId)} className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg"> +19h</button> : <span className="text-slate-300 font-bold">-</span>}</td>
                                        </>
                                    )}

                                    {activeTab === 'CANTINE' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.category}</span></td>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="text-sm font-bold text-car-dark">{c.regimeAlimentaire}</span></td>
                                            <td className="p-5 border-b border-slate-100 text-center">{c.isPAIAlimentaire ? <AlertTriangle className="text-car-pink mx-auto" size={20}/> : <span className="text-slate-300">-</span>}</td>
                                        </>
                                    )}

                                    {activeTab === 'PAI' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-sm font-medium text-car-dark">{c.paiDetails}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{c.isPAIAlimentaire ? <span className="bg-car-pink text-white text-xs font-bold px-2 py-1 rounded-md">OUI</span> : <span className="text-slate-300">-</span>}</td>
                                        </>
                                    )}

                                    {activeTab === 'REGIMES' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.category}</span></td>
                                            <td className="p-5 border-b border-slate-100"><span className="text-sm font-bold text-car-yellow bg-car-yellow/10 px-3 py-1 rounded-lg">{c.regimeAlimentaire}</span></td>
                                        </>
                                    )}
                                </tr>
                            )})}
                            {displayData.length === 0 && (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Aucune donnée trouvée</td></tr>
                            )}
                        </tbody>
                        
                        {displayData.length > 0 && activeTab === 'PERISCO' && (
                            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="2" className="p-5 font-black text-car-dark text-right sm:table-cell hidden">TOTAL PRÉSENCES</td>
                                    <td className="p-5 font-black text-car-dark text-right sm:hidden">TOTAL</td>
                                    <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.matin).length}</td>
                                    <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.soir||r.checkOut).length}</td>
                                    <td className="p-5 font-black text-car-pink text-center text-lg">{displayData.filter(r=>r.isLate).length}</td>
                                </tr>
                            </tfoot>
                        )}
                        {displayData.length > 0 && activeTab === 'CANTINE' && (
                            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="3" className="p-5 font-black text-car-teal text-right">TOTAL ABSENTS CANTINE :</td>
                                    <td colSpan="2" className="p-5 font-black text-car-teal text-left text-xl">{displayData.length}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- 6. ADMIN USERS ---
const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
    
    // NOUVEAU : États pour l'édition
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ role: 'staff', categoryAccess: 'Tous' });

    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { const { data } = await axios.get(`${API_URL}/users`); setUsers(data); };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, newUser);
            setNewUser({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
            loadUsers();
        } catch (e) { alert("Erreur."); }
    };

    // NOUVEAU : Fonctions d'édition
    const startEdit = (user) => {
        setEditingId(user._id);
        setEditForm({ role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
    };

    const saveEdit = async (id) => {
        try {
            await axios.put(`${API_URL}/users/${id}`, editForm);
            setEditingId(null);
            loadUsers();
        } catch (e) { alert("Erreur lors de la modification."); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex items-center gap-4 mb-10">
                    <div className="bg-car-purple/10 p-4 rounded-2xl"><Shield className="text-car-purple w-8 h-8"/></div>
                    <h1 className="text-4xl font-black text-car-dark">Équipe & Accès</h1>
                </div>

                <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Nom d'utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Mot de passe" type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required/>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Staff (Anim)</option>
                        <option value="responsable">Responsable</option>
                        <option value="admin">Admin (Dir)</option>
                    </select>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.categoryAccess} onChange={e => setNewUser({...newUser, categoryAccess: e.target.value})}>
                        <option value="Tous">Accès: Tous</option>
                        <option value="Maternelle">Accès: Maternelle</option>
                        <option value="Élémentaire">Accès: Élémentaire</option>
                    </select>
                    <button type="submit" className="bg-car-purple text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-purple/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><UserPlus size={22}/> CRÉER</button>
                </form>

                {/* GRILLE DE CARTES EQUIPE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map(u => (
                        <div key={u._id} className={`bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-all duration-300 ${editingId === u._id ? 'md:col-span-2 ring-4 ring-car-purple/10' : 'hover:-translate-y-1 hover:shadow-lg'}`}>
                            {editingId === u._id ? (
                                <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                                    <div className="font-black text-car-dark text-xl w-full md:w-1/4">{u.username}</div>
                                    <div className="flex flex-1 gap-4 w-full">
                                        <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark outline-none focus:border-car-purple flex-1" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                                            <option value="staff">Staff (Anim)</option>
                                            <option value="responsable">Responsable</option>
                                            <option value="admin">Admin (Dir)</option>
                                        </select>
                                        <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark outline-none focus:border-car-purple flex-1" value={editForm.categoryAccess} onChange={e => setEditForm({...editForm, categoryAccess: e.target.value})}>
                                            <option value="Tous">Accès: Tous</option>
                                            <option value="Maternelle">Accès: Maternelle</option>
                                            <option value="Élémentaire">Accès: Élémentaire</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 justify-end w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-500 p-3 rounded-xl hover:bg-slate-200 transition-colors"><X size={20}/></button>
                                        <button onClick={() => saveEdit(u._id)} className="bg-car-green text-white p-3 rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-500/20"><Check size={20}/></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start sm:items-center w-full h-full gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl flex-shrink-0 ${u.role === 'admin' ? 'bg-car-purple/10 text-car-purple' : 'bg-slate-100 text-slate-400'}`}>
                                            {u.role === 'admin' ? <Shield size={24}/> : <Users size={24}/>}
                                        </div>
                                        <div>
                                            <span className="font-black text-car-dark text-xl block leading-tight">{u.username}</span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                                                <span className="text-xs font-bold text-car-teal bg-car-teal/10 px-2 py-0.5 rounded-md uppercase tracking-widest">{u.categoryAccess || 'Tous'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button onClick={() => startEdit(u)} className="text-slate-400 hover:text-car-blue p-3 bg-slate-50 rounded-xl transition-colors"><Pencil size={20}/></button>
                                        <button onClick={async () => { if(window.confirm("Supprimer cet utilisateur ?")) { await axios.delete(`${API_URL}/users/${u._id}`); loadUsers(); } }} className="text-slate-400 hover:text-car-pink p-3 bg-slate-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- 7. NOTES PLANIFIEES ---
const PlannedNotesManager = () => {
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [plannedNotes, setPlannedNotes] = useState([]);
    
    const [newNote, setNewNote] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    const navigate = useNavigate();

    useEffect(() => { axios.get(`${API_URL}/children`).then(res => setChildren(res.data)); }, []);

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase()));
    }, [children, search]);

    const selectChild = async (child) => {
        setSelectedChild(child); setSearch(''); loadNotes(child._id);
    };

    const loadNotes = async (childId) => {
        const { data } = await axios.get(`${API_URL}/planned-notes/child/${childId}`);
        setPlannedNotes(data);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if(selectedDates.length === 0) return alert("Veuillez sélectionner au moins une date.");
        await axios.post(`${API_URL}/planned-notes`, { childId: selectedChild._id, note: newNote, dates: selectedDates });
        setNewNote(''); setSelectedDates([]); loadNotes(selectedChild._id);
    };

    const handleDeleteNote = async (id) => {
        if(window.confirm("Supprimer cette note planifiée ?")) {
            await axios.delete(`${API_URL}/planned-notes/${id}`);
            loadNotes(selectedChild._id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Retour</button>
                <div className="flex items-center gap-2"><CalendarDays className="text-car-pink"/><h1 className="font-black text-car-dark text-xl">Notes Planifiées</h1></div>
            </div>

            <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                    <input type="text" className="w-full pl-14 p-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-car-pink/20 outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg" placeholder="Rechercher un enfant..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search.length >= 2 && (
                        <div className="bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto absolute w-full mt-2 z-30 border border-slate-100">
                            {filteredSearch.map(child => (
                                <div key={child._id} onClick={() => selectChild(child)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <span className="font-black text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedChild && (
                    <div className="bg-slate-100 rounded-[2rem] p-2">
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2 flex items-center gap-4">
                            <div className="bg-car-pink/10 p-3 rounded-xl text-car-pink"><Users size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black text-car-dark">{selectedChild.lastName} {selectedChild.firstName}</h2>
                                <span className="text-xs font-bold text-slate-400 uppercase">{selectedChild.category || 'Maternelle'}</span>
                            </div>
                        </div>

                        {plannedNotes.length > 0 && (
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Notes existantes</h3>
                                <div className="space-y-3">
                                    {plannedNotes.map(pn => (
                                        <div key={pn._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <div className="font-bold text-car-dark mb-1">{pn.note}</div>
                                                <div className="text-xs text-slate-500 font-medium">Pour {pn.dates.length} date(s)</div>
                                            </div>
                                            <button onClick={() => handleDeleteNote(pn._id)} className="text-slate-300 hover:text-car-pink bg-white p-2 rounded-lg shadow-sm transition-colors"><Trash2 size={20}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <form onSubmit={handleAddNote} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 flex flex-col">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Ajouter une info</h3>
                                <textarea className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-pink/20 outline-none font-medium text-car-dark resize-none flex-1 mb-4" placeholder="Ex: Part avec Mamie à 16h30..." value={newNote} onChange={e => setNewNote(e.target.value)} required></textarea>
                                <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/20 hover:bg-black transition-all flex justify-center items-center gap-2"><Check size={20}/> ENREGISTRER</button>
                            </form>
                            <InteractiveCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 8. FACTURATION ---
const BillingManager = () => {
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [billings, setBillings] = useState([]);
    
    const [billTo, setBillTo] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    const navigate = useNavigate();

    useEffect(() => { axios.get(`${API_URL}/children`).then(res => setChildren(res.data)); }, []);

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase()));
    }, [children, search]);

    const selectChild = async (child) => {
        setSelectedChild(child); setSearch(''); loadBillings(child._id);
    };

    const loadBillings = async (childId) => {
        const { data } = await axios.get(`${API_URL}/billing/child/${childId}`);
        setBillings(data);
    };

    const handleAddBilling = async (e) => {
        e.preventDefault();
        if(selectedDates.length === 0) return alert("Veuillez sélectionner au moins une date.");
        await axios.post(`${API_URL}/billing`, { childId: selectedChild._id, billTo, dates: selectedDates });
        setBillTo(''); setSelectedDates([]); loadBillings(selectedChild._id);
    };

    const handleDeleteBilling = async (id) => {
        if(window.confirm("Supprimer cette règle de facturation ?")) {
            await axios.delete(`${API_URL}/billing/${id}`);
            loadBillings(selectedChild._id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Retour</button>
                <div className="flex items-center gap-2"><Banknote className="text-car-blue"/><h1 className="font-black text-car-dark text-xl">Facturation Alternée</h1></div>
            </div>

            <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                    <input type="text" className="w-full pl-14 p-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg" placeholder="Rechercher un enfant..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search.length >= 2 && (
                        <div className="bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto absolute w-full mt-2 z-30 border border-slate-100">
                            {filteredSearch.map(child => (
                                <div key={child._id} onClick={() => selectChild(child)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <span className="font-black text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedChild && (
                    <div className="bg-slate-100 rounded-[2rem] p-2">
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2 flex items-center gap-4">
                            <div className="bg-car-blue/10 p-3 rounded-xl text-car-blue"><Users size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black text-car-dark">{selectedChild.lastName} {selectedChild.firstName}</h2>
                                <span className="text-xs font-bold text-slate-400 uppercase">{selectedChild.category || 'Maternelle'}</span>
                            </div>
                        </div>

                        {billings.length > 0 && (
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Règles actives</h3>
                                <div className="space-y-3">
                                    {billings.map(b => (
                                        <div key={b._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <div className="font-bold text-car-blue mb-1">À facturer à : {b.billTo}</div>
                                                <div className="text-xs text-slate-500 font-medium">Appliqué sur {b.dates.length} date(s)</div>
                                            </div>
                                            <button onClick={() => handleDeleteBilling(b._id)} className="text-slate-300 hover:text-car-pink bg-white p-2 rounded-lg shadow-sm transition-colors"><Trash2 size={20}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <form onSubmit={handleAddBilling} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 flex flex-col">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Nouvelle Règle</h3>
                                <input type="text" className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark mb-4" placeholder="Nom à facturer (Ex: Maman, Papa...)" value={billTo} onChange={e => setBillTo(e.target.value)} required />
                                <p className="text-xs text-slate-400 font-medium mb-4 flex-1">Sélectionnez les dates dans le calendrier à côté. Cette mention apparaîtra dans le rapport pour l'aide à la facturation.</p>
                                <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/20 hover:bg-black transition-all flex justify-center items-center gap-2"><Check size={20}/> APPLIQUER</button>
                            </form>
                            <InteractiveCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 9. ADMIN FAMILLES (Dossiers) ---
const FamilyManager = () => {
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    
    const [searchFamilyText, setSearchFamilyText] = useState('');
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [editFamily, setEditFamily] = useState(null); 
    const [searchOrphan, setSearchOrphan] = useState('');
    
    const [childInfoToView, setChildInfoToView] = useState(null);
    const [editingChild, setEditingChild] = useState(null);

    const navigate = useNavigate();

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const [kidsRes, famRes] = await Promise.all([
            axios.get(`${API_URL}/children`),
            axios.get(`${API_URL}/families`)
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
        } else {
            setEditFamily(null);
        }
    }, [selectedFamily]);

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
            const res = await axios.post(`${API_URL}/families`, { name: searchName });
            setSearchFamilyText('');
            loadData();
            setSelectedFamily(res.data);
        } catch (e) { alert("Erreur à la création."); }
    };

    const handleDeleteFamily = async (id) => {
        if (window.confirm("Supprimer ce dossier ? Les enfants deviendront orphelins.")) {
            await axios.delete(`${API_URL}/families/${id}`);
            setSelectedFamily(null);
            loadData();
        }
    };

    const handleAttachChild = async (childId, familyId) => {
        await axios.put(`${API_URL}/children/${childId}`, { family: familyId });
        loadData();
        setSearchOrphan('');
    };

    const handleDetachChild = async (childId) => {
        if (window.confirm("Détacher cet enfant de la famille ?")) {
            await axios.put(`${API_URL}/children/${childId}`, { family: null });
            loadData();
        }
    };

    const handleSaveFamily = async () => {
        try {
            const res = await axios.put(`${API_URL}/families/${selectedFamily._id}`, editFamily);
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
            updated.quotientFamilial = Math.round(updated.revenuReference / updated.nombreParts);
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

    // LOGIQUE DE L'ENFANT
    const startAddChild = () => {
        setEditingChild({
            _id: null,
            firstName: '', lastName: selectedFamily.name, category: 'Maternelle', sexe: '', birthDate: '', droitImage: false, autorisationSortieSeul: false,
            medical: { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '' },
            hasPAI: false, paiDetails: '', isPAIAlimentaire: false, paiDocument: '', regimeAlimentaire: 'Standard',
            personnesAutorisees: [],
            documents: { vaccins: {}, assurance: {} }
        });
    };

    const startEditChild = (child) => {
        setEditingChild({
            _id: child._id,
            firstName: child.firstName, lastName: child.lastName, category: child.category || 'Maternelle', sexe: child.sexe || '',
            birthDate: child.birthDate ? child.birthDate.split('T')[0] : '', 
            droitImage: child.droitImage || false, autorisationSortieSeul: child.autorisationSortieSeul || false,
            medical: child.medical || { lunettes: false, appareilAuditif: false, appareilDentaire: false, activitesPhysiques: true, medecinNom: '', medecinPhone: '' },
            hasPAI: child.hasPAI || false, paiDetails: child.paiDetails || '', isPAIAlimentaire: child.isPAIAlimentaire || false, paiDocument: child.paiDocument || '', regimeAlimentaire: child.regimeAlimentaire || 'Standard',
            personnesAutorisees: child.personnesAutorisees || [],
            documents: child.documents || { vaccins: {}, assurance: {} }
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
                await axios.put(`${API_URL}/children/${editingChild._id}`, editingChild);
            } else {
                await axios.post(`${API_URL}/children`, { ...editingChild, family: selectedFamily._id });
            }
            setEditingChild(null);
            loadData();
        } catch (err) { alert("Erreur sauvegarde enfant."); }
    };

    // L'EXPORT COMPLET DE LA FAMILLE (AVEC PIÈCES JOINTES)
    const exportFamilyPDF = () => {
        if (!editFamily) return;
        const doc = new jsPDF();
        let yPos = 20;

        // Fonction pour joindre les images à la fin
        const appendDocumentToPDF = (fileUrl, title) => {
            if (!fileUrl) return;
            if (fileUrl.startsWith('data:image')) {
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(0);
                doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
                try { doc.addImage(fileUrl, 14, 30, 180, 0); } catch(e) { console.error(e); }
            } else if (fileUrl.startsWith('data:application/pdf')) {
                doc.addPage();
                doc.setFontSize(16);
                doc.setTextColor(0);
                doc.text(`ANNEXE : ${title.toUpperCase()}`, 14, 20);
                doc.setFontSize(12);
                doc.setTextColor(100);
                doc.text("Document au format PDF. Consultez-le sur le logiciel.", 14, 40);
            }
        };

        doc.setFontSize(18);
        doc.text(`DOSSIER FAMILLE : ${editFamily.name.toUpperCase()}`, 14, yPos);
        doc.setFontSize(10);
        doc.setTextColor(100);
        yPos += 8;
        doc.text(`Statut : ${editFamily.dossierComplet ? 'Complet' : 'Incomplet'} | Edité le ${new Date().toLocaleDateString('fr-FR')}`, 14, yPos);
        yPos += 12;

        const facturationData = [
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

        if (respBody.length > 0) {
            autoTable(doc, { startY: yPos, body: respBody, theme: 'grid' });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        if (attachedChildren.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(20);
            doc.text("Enfants rattachés au foyer :", 14, yPos);
            yPos += 8;

            attachedChildren.forEach(child => {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                const childBody = [
                    ['Catégorie', child.category],
                    ['Date de naissance', child.birthDate ? new Date(child.birthDate).toLocaleDateString('fr-FR') : '-'],
                    ['Autorisations', `Image: ${child.droitImage?'OUI':'NON'} | Sortie Seul: ${child.autorisationSortieSeul?'OUI':'NON'}`],
                    ['Médical', `Médecin: ${child.medical?.medecinNom||'-'} | Sport: ${child.medical?.activitesPhysiques !== false ?'OUI':'NON'}`],
                    ['Vaccins & Assurance', `Vaccins: ${child.documents?.vaccins?.status||'Manquant'} | Assurance RC: ${child.documents?.assurance?.status||'Manquant'}`]
                ];
                if (child.hasPAI) {
                    childBody.push(['PAI', `ACTIF - ${child.isPAIAlimentaire ? 'Alimentaire' : 'Médical'} (${child.paiDetails})`]);
                }

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

        // On annexe tous les documents !
        if (editFamily.documents?.attestationCAF?.fileUrl) appendDocumentToPDF(editFamily.documents.attestationCAF.fileUrl, "Justificatif CAF Famille");
        attachedChildren.forEach(child => {
            if (child.paiDocument) appendDocumentToPDF(child.paiDocument, `Protocole PAI - ${child.firstName}`);
            if (child.documents?.vaccins?.fileUrl) appendDocumentToPDF(child.documents.vaccins.fileUrl, `Vaccins - ${child.firstName}`);
            if (child.documents?.assurance?.fileUrl) appendDocumentToPDF(child.documents.assurance.fileUrl, `Assurance RC - ${child.firstName}`);
        });

        doc.save(`Dossier_Famille_${editFamily.name.toUpperCase()}.pdf`);
    };

    const orphans = children.filter(c => !c.family);
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
                            <p className="text-slate-500 font-medium mt-1">Gestion centralisée & Rattachements</p>
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
                            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 min-h-[800px] flex flex-col">
                                
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
                                    <div>
                                        <h2 className="text-3xl font-black text-car-dark uppercase">Famille <span className="text-car-yellow">{selectedFamily.name}</span></h2>
                                        <label className="flex items-center gap-2 mt-3 cursor-pointer group w-fit">
                                            <input type="checkbox" className="w-5 h-5 accent-car-green" checked={editFamily.dossierComplet} onChange={e => setEditFamily({...editFamily, dossierComplet: e.target.checked})} />
                                            <span className={`font-bold text-sm ${editFamily.dossierComplet ? 'text-car-green' : 'text-car-pink group-hover:text-car-dark transition-colors'}`}>
                                                {editFamily.dossierComplet ? 'Dossier vérifié et complet' : 'Dossier incomplet (informations manquantes)'}
                                            </span>
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleDeleteFamily(selectedFamily._id)} className="text-slate-400 hover:text-car-pink bg-slate-50 p-4 rounded-2xl transition-colors" title="Supprimer la famille"><Trash2 size={24}/></button>
                                        
                                        {/* LE BOUTON D'EXPORT PDF */}
                                        <button onClick={exportFamilyPDF} className="text-slate-400 hover:text-white hover:bg-car-blue bg-slate-50 p-4 rounded-2xl transition-colors" title="Télécharger le dossier complet">
                                            <Download size={24}/>
                                        </button>

                                        <button onClick={handleSaveFamily} className="bg-car-green text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-car-green/20">
                                            <Save size={20}/> SAUVEGARDER LE DOSSIER
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
                                                            <button onClick={() => startEditChild(c)} className="text-slate-400 hover:text-car-yellow p-2 bg-slate-50 rounded-lg transition-colors" title="Modifier"><Pencil size={18}/></button>
                                                            <button onClick={() => handleDetachChild(c._id)} className="text-slate-400 hover:text-car-pink p-2 bg-slate-50 rounded-lg transition-colors" title="Détacher"><X size={18}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : ( <p className="text-slate-400 font-medium mb-6 italic text-sm">Aucun enfant rattaché.</p> )}
                                        <div className="mt-auto pt-4 border-t border-slate-200">
                                            <button onClick={startAddChild} className="w-full bg-car-yellow/10 text-car-yellow font-bold p-3 rounded-xl hover:bg-car-yellow hover:text-white transition-colors text-sm flex justify-center items-center gap-2">
                                                <Plus size={18}/> Créer et ajouter un enfant complet
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                            <h3 className="font-black text-car-dark text-sm tracking-widest text-slate-400 uppercase flex items-center gap-2"><Banknote size={18}/> Facturation & QF</h3>
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
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <select className={`flex-1 p-2 rounded-lg text-sm font-bold border outline-none ${editFamily.documents?.attestationCAF?.status === 'Valide' ? 'bg-car-green/10 text-car-green border-car-green/20' : 'bg-slate-50 text-slate-600 border-slate-100'}`} 
                                                        value={editFamily.documents?.attestationCAF?.status || 'Manquant'} onChange={e => handleDocChange('attestationCAF', 'status', e.target.value)}>
                                                        <option value="Manquant">Manquant</option><option value="Valide">Valide</option><option value="Expiré">Expiré</option>
                                                    </select>
                                                    <input type="date" className="flex-1 bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none focus:border-car-yellow font-medium text-car-dark text-sm" value={editFamily.documents?.attestationCAF?.expiryDate ? editFamily.documents.attestationCAF.expiryDate.split('T')[0] : ''} onChange={e => handleDocChange('attestationCAF', 'expiryDate', e.target.value)} />
                                                </div>
                                                <input type="file" accept=".pdf, image/jpeg, image/png" onChange={(e) => handleFileUpload('attestationCAF', e)} className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"/>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BLOC : RESPONSABLES LÉGAUX */}
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

            {/* FORMULAIRE ENFANT (AVEC VACCINS & RC) */}
            {editingChild && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-3xl font-black text-car-dark">{editingChild._id ? 'Modifier' : 'Créer'} la fiche enfant</h3>
                            <button type="button" onClick={() => setEditingChild(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={saveChild} className="space-y-8">
                            <div>
                                <h4 className="text-sm font-black text-slate-400 tracking-widest uppercase mb-3">Identité</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-black uppercase text-car-dark" placeholder="NOM" value={editingChild.lastName} onChange={e => setEditingChild({...editingChild, lastName: e.target.value.toUpperCase()})} required/>
                                    <input className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-bold text-car-dark capitalize" placeholder="Prénom" value={editingChild.firstName} onChange={e => setEditingChild({...editingChild, firstName: e.target.value})} required/>
                                    <input type="date" className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none focus:border-car-yellow font-medium text-car-dark" value={editingChild.birthDate} onChange={e => setEditingChild({...editingChild, birthDate: e.target.value})} required/>
                                    <select className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-car-dark" value={editingChild.category} onChange={e => setEditingChild({...editingChild, category: e.target.value})}>
                                        <option value="Maternelle">Maternelle</option>
                                        <option value="Élémentaire">Élémentaire</option>
                                    </select>
                                </div>
                            </div>

                            {/* NOUVEAU BLOC : VACCINS & ASSURANCE RC */}
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
                                        {attachedChildren.length > 1 && (
                                            <button type="button" onClick={handleCopyContacts} className="text-xs font-bold text-car-purple bg-car-purple/10 px-3 py-1.5 rounded-lg flex items-center gap-1"><Copy size={14}/> Copier</button>
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
                                    {editingChild.personnesAutorisees.length === 0 && <p className="text-xs text-slate-400 italic text-center">Aucune personne autorisée.</p>}
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
                                                <input type="file" accept=".pdf, image/*" onChange={handleChildFileUpload} className="text-xs w-full text-slate-500 file:rounded-lg file:border-0 file:bg-slate-100 file:px-2 file:py-1 mt-2 cursor-pointer"/>
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

// --- ROUTER ---
export default function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), role: localStorage.getItem('role') });
  
  if (!auth.token) return <Login setAuth={setAuth} />;
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:date/:type" element={<SessionView />} />
        <Route path="/report" element={<Report />} />
        <Route path="/admin/children" element={<ChildrenManager />} />
        <Route path="/admin/users" element={<UserManager />} />
        <Route path="/admin/planned-notes" element={<PlannedNotesManager />} />
        <Route path="/admin/billing" element={<BillingManager />} />
        <Route path="/admin/families" element={<FamilyManager />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}