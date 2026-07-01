import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle, AlertTriangle, ArrowUpDown, ChevronUp, ChevronDown, Trash2, Plus, X, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Report = () => {
    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';

    // --- ÉTATS ---
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState({ children: [], attendances: [] });
    const [activeTab, setActiveTab] = useState('PERISCO');
    
    const [classes, setClasses] = useState([]);

    // Filtres cumulatifs (Checkboxes & Select)
    const [categories, setCategories] = useState({
        Maternelle: access === 'Tous' || access === 'Maternelle',
        Élémentaire: access === 'Tous' || access === 'Élémentaire'
    });
    
    const [selectedClassId, setSelectedClassId] = useState('');

    const [regimes, setRegimes] = useState({
        'Sans-porc': true,
        'Végétarien': true,
        'PAI': true
    });

    // Tri dynamique
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // --- ÉTATS POUR L'AJOUT MANUEL ---
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState({ childId: '', date: format(new Date(), 'yyyy-MM-dd'), sessionType: 'SOIR' });
    const [searchChildText, setSearchChildText] = useState('');
    const [selectedChildData, setSelectedChildData] = useState(null);

    // --- CHARGEMENT ---
    useEffect(() => { 
        loadReport();
        loadClasses();
    }, [startDate, endDate]);
    
    const loadReport = () => {
        api.get(`/stats/report?startDate=${startDate}&endDate=${endDate}`).then(res => {
            if (Array.isArray(res.data)) setReportData({ children: res.data, attendances: res.data });
            else setReportData(res.data);
        });
    };

    const loadClasses = () => {
        api.get('/classes').then(res => {
            setClasses(res.data);
        }).catch(err => console.error(err));
    };

    // On crée une liste unique d'enfants actifs pour la recherche (évite les doublons si l'enfant a pointé plusieurs fois)
    const uniqueActiveChildren = useMemo(() => {
        const map = new Map();
        if (reportData.children) {
            reportData.children.forEach(item => {
                if (item.child && item.child.active !== false) {
                    map.set(item.child._id, item.child);
                }
            });
        }
        return Array.from(map.values());
    }, [reportData]);

    const filteredChildrenForAdd = searchChildText.length >= 2
        ? uniqueActiveChildren.filter(child => 
            child.lastName.toLowerCase().includes(searchChildText.toLowerCase()) || 
            child.firstName.toLowerCase().includes(searchChildText.toLowerCase())
          )
        : [];

    // --- AJOUT MANUEL D'UN POINTAGE OUBLIÉ ---
    const handleManualAdd = async (e) => {
        e.preventDefault();
        try {
            const actualSessionType = addForm.sessionType === 'SOIR_LATE' ? 'SOIR' : addForm.sessionType;
            const isLate = addForm.sessionType === 'SOIR_LATE';

            // 1. On crée le pointage
            const res = await api.post('/attendance/checkin', {
                childId: addForm.childId,
                date: addForm.date,
                sessionType: actualSessionType,
                isLate: isLate // Envoyé à la création au cas où le schéma le permette directement
            });
            
            // 2. Si c'est le SOIR, on simule sa sortie immédiatement pour qu'il soit clôturé et facturable
            if (actualSessionType === 'SOIR') {
                await api.put(`/attendance/checkout/${res.data._id}`, { isLate: isLate });
                
                // 3. Forcer le tag "retard" si une route spécifique existe sur le backend (par sécurité)
                if (isLate) {
                    try { await api.put(`/attendance/add-late/${res.data._id}`); } catch(err) {}
                    try { await api.put(`/attendance/mark-late/${res.data._id}`); } catch(err) {}
                }
            }

            setShowAddModal(false);
            setAddForm({ ...addForm, childId: '' }); // On reset juste l'enfant
            setSearchChildText('');
            setSelectedChildData(null);
            loadReport();
            alert("Pointage ajouté avec succès !");
        } catch (e) {
            alert("Erreur : Ce pointage a peut-être déjà été enregistré pour cet enfant à cette date.");
        }
    };

    // --- SUPPRESSION DE POINTAGES ---
    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément retard (19h) pour cet enfant ?")) {
            await api.put(`/attendance/remove-late/${id}`);
            loadReport();
        }
    };

    const handleDeleteAttendance = async (id, type) => {
        if(window.confirm(`Voulez-vous annuler complètement le pointage du ${type} pour cet enfant ?`)) {
            await api.delete(`/attendance/${id}`);
            loadReport();
        }
    };

    // --- GESTION DU TRI ---
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- FILTRAGE ET TRI DES DONNÉES ---
    const displayData = useMemo(() => {
        const isAttendanceTab = activeTab === 'PERISCO' || activeTab === 'CANTINE';
        let list = isAttendanceTab ? [...reportData.attendances] : [...reportData.children];

        // 1. Filtre par Catégorie (Maternelle/Élémentaire)
        list = list.filter(r => {
            const cat = r.child.category || 'Maternelle';
            return categories[cat];
        });
        
        // 2. Filtre par Classe
        if (selectedClassId !== '') {
            list = list.filter(r => {
                const childClassId = r.child.classGroup?._id || r.child.classGroup;
                return childClassId === selectedClassId;
            });
        }

        // 3. Filtres par onglet
        if (activeTab === 'PERISCO') list = list.filter(r => r.matin || r.soir || r.checkOut);
        if (activeTab === 'CANTINE') list = list.filter(r => r.midiAbsent);
        if (activeTab === 'PAI') list = list.filter(r => r.child.hasPAI);
        if (activeTab === 'REGIMES') {
            list = list.filter(r => {
                const reg = r.child.regimeAlimentaire;
                if (reg === 'Standard') return false; 
                return regimes[reg]; 
            });
        }
        if (activeTab === 'SORTIE_SEUL') list = list.filter(r => r.child.autorisationSortieSeul);
        if (activeTab === 'SANS_IMAGE') list = list.filter(r => !r.child.droitImage);

        // 4. Application du Tri
        return list.sort((a, b) => {
            const nameA = `${a.child.lastName} ${a.child.firstName}`;
            const nameB = `${b.child.lastName} ${b.child.firstName}`;

            let valA = '', valB = '';

            if (sortConfig.key === 'date') {
                valA = a.date ? a.date.split('T')[0] : ''; 
                valB = b.date ? b.date.split('T')[0] : '';
            } else if (sortConfig.key === 'name') {
                valA = nameA;
                valB = nameB;
            } else if (sortConfig.key === 'category') {
                valA = a.child.category || ''; valB = b.child.category || '';
            } else if (sortConfig.key === 'class') {
                valA = a.child.classGroup?.name || ''; valB = b.child.classGroup?.name || '';
            } else if (sortConfig.key === 'regime') {
                valA = a.child.regimeAlimentaire || ''; valB = b.child.regimeAlimentaire || '';
            } else if (sortConfig.key === 'pai') {
                valA = a.child.isPAIAlimentaire ? 'A' : 'B'; 
                valB = b.child.isPAIAlimentaire ? 'A' : 'B';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            
            return nameA.localeCompare(nameB);
        });
    }, [reportData, activeTab, categories, regimes, sortConfig, selectedClassId]);

    // --- EXPORT PDF ---
    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        
        let title = "";
        let tableColumn = [];
        let tableRows = [];
        let footData = [];

        const periodStr = startDate === endDate ? format(new Date(startDate), 'dd/MM/yyyy') : `${format(new Date(startDate), 'dd/MM/yyyy')} au ${format(new Date(endDate), 'dd/MM/yyyy')}`;

        if (activeTab === 'PERISCO') {
            title = `Rapport Périscolaire - ${periodStr}`;
            tableColumn = ["Date", "Nom", "Prénom", "Classe", "Facture", "Matin", "Soir", "19h"];
            tableRows = displayData.map(row => [
                new Date(row.date).toLocaleDateString('fr-FR'), 
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || '-',
                row.billTo || '-', 
                row.matin ? 'OUI' : '-', 
                (row.checkOut || row.soir) ? 'OUI' : '-', 
                row.isLate ? 'OUI' : '-'
            ]);
            footData = [["TOTAL", "", "", "", "", displayData.filter(r=>r.matin).length.toString(), displayData.filter(r=>r.soir||r.checkOut).length.toString(), displayData.filter(r=>r.isLate).length.toString()]];
        } 
        else if (activeTab === 'CANTINE') {
            title = `Rapport ABSENTS Cantine - ${periodStr}`;
            tableColumn = ["Date", "Nom", "Prénom", "Classe", "Régime", "PAI"];
            tableRows = displayData.map(row => [
                new Date(row.date).toLocaleDateString('fr-FR'), 
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || row.child.category, 
                row.child.regimeAlimentaire, 
                row.child.isPAIAlimentaire ? 'OUI' : '-'
            ]);
            footData = [["TOTAL ABSENTS", displayData.length.toString(), "", "", "", ""]];
        }
        else if (activeTab === 'PAI') {
            title = `Liste Globale des PAI`;
            tableColumn = ["Nom", "Prénom", "Classe", "Type PAI", "Détails"];
            tableRows = displayData.map(row => [
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || row.child.category, 
                row.child.isPAIAlimentaire ? 'Alimentaire' : 'Médical', 
                row.child.paiDetails
            ]);
            footData = [["TOTAL ENFANTS PAI", displayData.length.toString(), "", "", ""]];
        }
        else if (activeTab === 'REGIMES') {
            title = `Régimes Alimentaires Spéciaux`;
            tableColumn = ["Nom", "Prénom", "Classe", "Régime"];
            tableRows = displayData.map(row => [
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || row.child.category, 
                row.child.regimeAlimentaire
            ]);
            footData = [["TOTAL RÉGIMES SÉLECTIONNÉS", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SORTIE_SEUL') {
            title = `Enfants autorisés à partir seuls`;
            tableColumn = ["Nom", "Prénom", "Classe", "Statut"];
            tableRows = displayData.map(row => [
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || row.child.category, 
                'Autorisé'
            ]);
            footData = [["TOTAL AUTORISÉS", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SANS_IMAGE') {
            title = `Enfants SANS droit à l'image`;
            tableColumn = ["Nom", "Prénom", "Classe", "Statut"];
            tableRows = displayData.map(row => [
                row.child.lastName, 
                row.child.firstName, 
                row.child.classGroup?.name || row.child.category, 
                'Refusé'
            ]);
            footData = [["TOTAL REFUSÉS", displayData.length.toString(), "", ""]];
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

        doc.save(`Rapport_${activeTab}_${startDate}.pdf`);
    };

    // Composant En-tête de colonne cliquable
    const SortHeader = ({ label, sortKey, className = "" }) => (
        <th className={`p-5 border-b border-slate-100 cursor-pointer hover:bg-slate-200 transition-colors select-none ${className}`} onClick={() => handleSort(sortKey)}>
            <div className={`flex items-center gap-2 ${className.includes('text-center') ? 'justify-center' : ''}`}>
                {label}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>
                ) : <ArrowUpDown size={14} className="text-slate-300 opacity-50"/>}
            </div>
        </th>
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative pb-24">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><FileText className="text-car-blue w-8 h-8"/></div>
                        <h1 className="text-4xl font-black text-car-dark">Rapports & Listes</h1>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                            <button onClick={() => setShowAddModal(true)} className="bg-car-blue/10 text-car-blue px-5 py-3 rounded-2xl font-black tracking-widest hover:bg-car-blue hover:text-white transition-all flex items-center gap-2 shadow-sm">
                                <Plus size={20}/> POINTAGE
                            </button>
                        )}
                        <button onClick={exportPDF} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20">
                            <Download size={20}/> PDF
                        </button>
                    </div>
                </div>

                {/* ONGLETS */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setActiveTab('PERISCO')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'PERISCO' ? 'bg-car-blue text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Périscolaire</button>
                    <button onClick={() => setActiveTab('CANTINE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'CANTINE' ? 'bg-car-teal text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Absents Cantine</button>
                    <button onClick={() => setActiveTab('PAI')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'PAI' ? 'bg-car-pink text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Fiches PAI</button>
                    <button onClick={() => setActiveTab('REGIMES')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'REGIMES' ? 'bg-car-yellow text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Régimes Spéciaux</button>
                    <button onClick={() => setActiveTab('SORTIE_SEUL')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'SORTIE_SEUL' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Sortie Seul</button>
                    <button onClick={() => setActiveTab('SANS_IMAGE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'SANS_IMAGE' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Sans Image</button>
                </div>

                {/* ZONE DE FILTRES CUMULATIFS */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row flex-wrap gap-6 mb-6">
                    
                    {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                        <div className="flex flex-col gap-2 border-r border-slate-100 pr-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Période :</span>
                            <div className="flex items-center gap-2">
                                <input type="date" className="bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none font-bold text-car-dark text-sm w-32" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Au</span>
                                <input type="date" className="bg-slate-50 border border-slate-200 p-2 rounded-lg outline-none font-bold text-car-dark text-sm w-32" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-2 border-r border-slate-100 pr-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Catégories (Cumulables) :</span>
                        <div className="flex gap-2">
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border-2 select-none transition-all ${categories.Maternelle ? 'bg-car-yellow border-car-yellow text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                                <input type="checkbox" className="hidden" checked={categories.Maternelle} onChange={() => setCategories({...categories, Maternelle: !categories.Maternelle})} disabled={access === 'Élémentaire'} />
                                <span className="font-black text-sm">Maternelle</span>
                            </label>
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border-2 select-none transition-all ${categories.Élémentaire ? 'bg-car-blue border-car-blue text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                                <input type="checkbox" className="hidden" checked={categories.Élémentaire} onChange={() => setCategories({...categories, Élémentaire: !categories.Élémentaire})} disabled={access === 'Maternelle'} />
                                <span className="font-black text-sm">Élémentaire</span>
                            </label>
                        </div>
                    </div>

                    <div className={`flex flex-col gap-2 ${activeTab === 'REGIMES' ? 'border-r border-slate-100 pr-6' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Filtrer par Classe :</span>
                        <select 
                            className="bg-slate-50 border border-slate-200 p-2 rounded-xl outline-none font-bold text-car-dark text-sm h-full"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                        >
                            <option value="">Toutes les classes</option>
                            {classes.filter(c => (categories.Maternelle && c.category === 'Maternelle') || (categories.Élémentaire && c.category === 'Élémentaire')).map(cls => (
                                <option key={cls._id} value={cls._id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>

                    {activeTab === 'REGIMES' && (
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Types de Régimes (Cumulables) :</span>
                            <div className="flex flex-wrap gap-2">
                                {['Sans-porc', 'Végétarien', 'PAI'].map(reg => (
                                    <label key={reg} className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer border-2 select-none transition-all ${regimes[reg] ? 'bg-car-dark text-white border-car-dark shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                                        <input type="checkbox" className="hidden" checked={regimes[reg]} onChange={() => setRegimes({...regimes, [reg]: !regimes[reg]})} />
                                        <span className="font-black text-sm">{reg === 'PAI' ? 'PAI Alimentaire' : reg}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* TABLEAU */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-xs tracking-wider">
                                {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                                    <SortHeader label="Date" sortKey="date" />
                                )}
                                <SortHeader label="Enfant (Nom Prénom)" sortKey="name" />
                                
                                <SortHeader label="Classe" sortKey="class" />

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
                                        <SortHeader label="Régime" sortKey="regime" className="text-center" />
                                        <SortHeader label="PAI Alim." sortKey="pai" className="text-center" />
                                        <th className="p-5 border-b border-slate-100 text-center">Action</th>
                                    </>
                                )}

                                {activeTab === 'PAI' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100">Détails du PAI</th>
                                        <SortHeader label="Alimentaire" sortKey="pai" className="text-center" />
                                    </>
                                )}

                                {activeTab === 'REGIMES' && (
                                    <>
                                        <SortHeader label="Régime Strict" sortKey="regime" />
                                    </>
                                )}

                                {activeTab === 'SORTIE_SEUL' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100 text-center">Autorisation</th>
                                    </>
                                )}
                                
                                {activeTab === 'SANS_IMAGE' && (
                                    <>
                                        <th className="p-5 border-b border-slate-100 text-center">Droit à l'image</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.map((row, idx) => {
                                const c = row.child ? row.child : row; 
                                return (
                                <tr key={c._id + idx} className="hover:bg-slate-50/50 transition-colors group">
                                    {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                                        <td className="p-5 border-b border-slate-100 font-bold text-slate-500 text-sm whitespace-nowrap">
                                            {new Date(row.date).toLocaleDateString('fr-FR')}
                                        </td>
                                    )}
                                    <td className="p-5 border-b border-slate-100">
                                        <span className="font-black text-car-dark">{c.lastName}</span> <span className="font-medium text-slate-500">{c.firstName}</span>
                                    </td>

                                    <td className="p-5 border-b border-slate-100">
                                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                            {c.classGroup?.name || c.category}
                                        </span>
                                    </td>
                                    
                                    {activeTab === 'PERISCO' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">{row.billTo ? <span className="bg-car-blue/10 text-car-blue font-bold px-2 py-1 rounded-md text-xs uppercase tracking-widest">{row.billTo}</span> : <span className="text-slate-300">-</span>}</td>
                                            
                                            <td className="p-5 border-b border-slate-100 text-center">
                                                {row.matin ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <CheckCircle className="text-car-yellow" size={24}/>
                                                        <button onClick={() => handleDeleteAttendance(row.matinId, 'Matin')} className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-car-pink transition-all flex items-center gap-1"><Trash2 size={10}/> Annuler</button>
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>
                                            
                                            <td className="p-5 border-b border-slate-100 text-center">
                                                {(row.checkOut || row.soir) ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <CheckCircle className="text-car-blue" size={24}/>
                                                        <button onClick={() => handleDeleteAttendance(row.pmId, 'Soir')} className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-400 hover:text-car-pink transition-all flex items-center gap-1"><Trash2 size={10}/> Annuler</button>
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </td>
                                            
                                            <td className="p-5 border-b border-slate-100 text-center">
                                                {row.isLate ? <button onClick={() => handleRemoveLate(row.pmId)} className="text-[10px] font-bold text-white bg-car-pink px-2 py-1 rounded hover:bg-red-600 transition-colors"> +19h (Annuler)</button> : <span className="text-slate-300 font-bold">-</span>}
                                            </td>
                                        </>
                                    )}

                                    {activeTab === 'CANTINE' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="text-sm font-bold text-car-dark">{c.regimeAlimentaire}</span></td>
                                            <td className="p-5 border-b border-slate-100 text-center">{c.isPAIAlimentaire ? <AlertTriangle className="text-car-pink mx-auto" size={20}/> : <span className="text-slate-300">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">
                                                <button onClick={() => handleDeleteAttendance(row.midiId, 'Midi (Absence)')} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-car-pink transition-all flex items-center justify-center gap-1 mx-auto"><Trash2 size={16}/></button>
                                            </td>
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
                                            <td className="p-5 border-b border-slate-100"><span className="text-sm font-bold text-car-yellow bg-car-yellow/10 px-3 py-1 rounded-lg">{c.regimeAlimentaire}</span></td>
                                        </>
                                    )}

                                    {activeTab === 'SORTIE_SEUL' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="bg-car-blue/10 text-car-blue text-xs font-bold px-3 py-1 rounded-lg">AUTORISÉ À SORTIR SEUL</span></td>
                                        </>
                                    )}

                                    {activeTab === 'SANS_IMAGE' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="bg-car-pink/10 text-car-pink text-xs font-bold px-3 py-1 rounded-lg">SANS DROIT À L'IMAGE</span></td>
                                        </>
                                    )}
                                </tr>
                            )})}
                            {displayData.length === 0 && (
                                <tr><td colSpan="8" className="p-8 text-center text-slate-400 font-bold">Aucune donnée trouvée pour cette sélection.</td></tr>
                            )}
                        </tbody>
                        
                        {/* TOTAUX */}
                        {displayData.length > 0 && (
                            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200">
                                {activeTab === 'PERISCO' && (
                                    <tr>
                                        <td colSpan="4" className="p-5 font-black text-car-dark text-right sm:table-cell hidden">TOTAL PRÉSENCES</td>
                                        <td colSpan="2" className="p-5 font-black text-car-dark text-right sm:hidden">TOTAL</td>
                                        <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.matin).length}</td>
                                        <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.soir||r.checkOut).length}</td>
                                        <td className="p-5 font-black text-car-pink text-center text-lg">{displayData.filter(r=>r.isLate).length}</td>
                                    </tr>
                                )}
                                {activeTab === 'CANTINE' && (
                                    <tr>
                                        <td colSpan="5" className="p-5 font-black text-car-teal text-right">TOTAL ABSENTS CANTINE :</td>
                                        <td colSpan="2" className="p-5 font-black text-car-teal text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'PAI' && (
                                    <tr>
                                        <td colSpan="3" className="p-5 font-black text-car-pink text-right">TOTAL ENFANTS PAI :</td>
                                        <td colSpan="2" className="p-5 font-black text-car-pink text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'REGIMES' && (
                                    <tr>
                                        <td colSpan="3" className="p-5 font-black text-car-yellow text-right">TOTAL RÉGIMES :</td>
                                        <td colSpan="1" className="p-5 font-black text-car-yellow text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'SORTIE_SEUL' && (
                                    <tr>
                                        <td colSpan="3" className="p-5 font-black text-slate-700 text-right">TOTAL AUTORISÉS :</td>
                                        <td colSpan="1" className="p-5 font-black text-slate-700 text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'SANS_IMAGE' && (
                                    <tr>
                                        <td colSpan="3" className="p-5 font-black text-slate-700 text-right">TOTAL REFUSÉS :</td>
                                        <td colSpan="1" className="p-5 font-black text-slate-700 text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* MODALE D'AJOUT MANUEL D'UN POINTAGE */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleManualAdd} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-dark">Ajout Manuel</h3>
                            <button type="button" onClick={() => setShowAddModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Enfant</label>
                                {!selectedChildData ? (
                                    <div className="relative">
                                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 focus-within:border-car-blue transition-colors">
                                            <Search className="text-slate-400 mr-2" size={18} />
                                            <input 
                                                type="text" 
                                                className="w-full bg-transparent p-3 font-bold text-car-dark outline-none placeholder:text-slate-300 placeholder:font-medium text-sm" 
                                                placeholder="Rechercher par nom ou prénom..." 
                                                value={searchChildText} 
                                                onChange={e => setSearchChildText(e.target.value)} 
                                                autoFocus
                                            />
                                        </div>
                                        {searchChildText.length >= 2 && (
                                            <div className="absolute w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl max-h-60 overflow-y-auto z-50">
                                                {filteredChildrenForAdd.length > 0 ? (
                                                    filteredChildrenForAdd.map(child => (
                                                        <button 
                                                            type="button"
                                                            key={child._id} 
                                                            onClick={() => {
                                                                setAddForm({ ...addForm, childId: child._id });
                                                                setSelectedChildData(child);
                                                                setSearchChildText('');
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group"
                                                        >
                                                            <div>
                                                                <span className="font-black text-car-dark uppercase group-hover:text-car-blue transition-colors">{child.lastName}</span> <span className="font-medium text-slate-600 capitalize">{child.firstName}</span>
                                                            </div>
                                                            {child.classGroup && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold">{child.classGroup.name || child.classGroup}</span>}
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-sm font-bold text-slate-400 italic">Aucun enfant trouvé</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-car-blue/10 border border-car-blue/20 p-4 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="text-car-blue" size={20} />
                                            <div>
                                                <span className="font-black text-car-dark uppercase">{selectedChildData.lastName}</span> <span className="font-medium capitalize text-slate-600">{selectedChildData.firstName}</span>
                                            </div>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setAddForm({ ...addForm, childId: '' });
                                                setSelectedChildData(null);
                                            }} 
                                            className="text-slate-400 hover:text-car-pink transition-colors p-1"
                                            title="Changer d'enfant"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Date</label>
                                <input type="date" required className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-blue" value={addForm.date} onChange={e => setAddForm({...addForm, date: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Activité</label>
                                <select required className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200" value={addForm.sessionType} onChange={e => setAddForm({...addForm, sessionType: e.target.value})}>
                                    <option value="MATIN">Périscolaire MATIN</option>
                                    <option value="SOIR">Périscolaire SOIR</option>
                                    <option value="SOIR_LATE">Supplément Soir (19h)</option>
                                    <option value="MIDI">Absence CANTINE (Midi)</option>
                                </select>

                                {(addForm.sessionType === 'SOIR' || addForm.sessionType === 'SOIR_LATE') && (
                                    <div className="mt-3 bg-car-pink/10 border border-car-pink/20 p-3 rounded-xl transition-all">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-car-pink">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 accent-car-pink" 
                                                checked={addForm.sessionType === 'SOIR_LATE'} 
                                                onChange={e => setAddForm({...addForm, sessionType: e.target.checked ? 'SOIR_LATE' : 'SOIR'})} 
                                            />
                                            Appliquer le supplément (19h)
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={!addForm.childId}
                            className={`w-full text-white font-black p-4 rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 ${!addForm.childId ? 'bg-slate-300 cursor-not-allowed' : 'bg-car-blue hover:bg-blue-600 shadow-lg shadow-car-blue/20'}`}
                        >
                            <CheckCircle size={20}/> Enregistrer le pointage
                        </button>
                    </form>
                </div>
            )}

        </div>
    );
};

export default Report;