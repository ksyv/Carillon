import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle, AlertTriangle, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
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

    // Filtres cumulatifs (Checkboxes)
    const [categories, setCategories] = useState({
        Maternelle: access === 'Tous' || access === 'Maternelle',
        Élémentaire: access === 'Tous' || access === 'Élémentaire'
    });

    const [regimes, setRegimes] = useState({
        'Sans-porc': true,
        'Végétarien': true,
        'PAI': true
    });

    // Tri dynamique
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // --- CHARGEMENT ---
    useEffect(() => { loadReport(); }, [startDate, endDate]);
    
    const loadReport = () => {
        api.get(`/report?startDate=${startDate}&endDate=${endDate}`).then(res => {
            if (Array.isArray(res.data)) setReportData({ children: res.data, attendances: res.data });
            else setReportData(res.data);
        });
    };

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément ?")) {
            await api.put(`/attendance/remove-late/${id}`);
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

        // 1. Filtre par Catégorie (Cumulatif)
        list = list.filter(r => {
            const cat = r.child.category || 'Maternelle';
            return categories[cat];
        });

        // 2. Filtres par onglet
        if (activeTab === 'PERISCO') list = list.filter(r => r.matin || r.soir || r.checkOut);
        if (activeTab === 'CANTINE') list = list.filter(r => r.midiAbsent);
        if (activeTab === 'PAI') list = list.filter(r => r.child.hasPAI);
        if (activeTab === 'REGIMES') {
            list = list.filter(r => {
                const reg = r.child.regimeAlimentaire;
                if (reg === 'Standard') return false; // On exclut les standards
                return regimes[reg]; // Vrai si la case du régime est cochée
            });
        }
        if (activeTab === 'SORTIE_SEUL') list = list.filter(r => r.child.autorisationSortieSeul);
        if (activeTab === 'SANS_IMAGE') list = list.filter(r => !r.child.droitImage);

        // 3. Application du Tri
        return list.sort((a, b) => {
            let valA = '', valB = '';

            if (sortConfig.key === 'date') {
                valA = a.date || ''; valB = b.date || '';
            } else if (sortConfig.key === 'name') {
                valA = `${a.child.lastName} ${a.child.firstName}`;
                valB = `${b.child.lastName} ${b.child.firstName}`;
            } else if (sortConfig.key === 'category') {
                valA = a.child.category || ''; valB = b.child.category || '';
            } else if (sortConfig.key === 'regime') {
                valA = a.child.regimeAlimentaire || ''; valB = b.child.regimeAlimentaire || '';
            } else if (sortConfig.key === 'pai') {
                valA = a.child.isPAIAlimentaire ? 'A' : 'B'; // Tri basique pour regrouper
                valB = b.child.isPAIAlimentaire ? 'A' : 'B';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [reportData, activeTab, categories, regimes, sortConfig]);

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
            tableColumn = ["Date", "Nom", "Prénom", "Facture", "Matin", "Soir", "19h"];
            tableRows = displayData.map(row => [new Date(row.date).toLocaleDateString('fr-FR'), row.child.lastName, row.child.firstName, row.billTo || '-', row.matin ? 'OUI' : '-', (row.checkOut || row.soir) ? 'OUI' : '-', row.isLate ? 'OUI' : '-']);
            footData = [["TOTAL", "", "", "", displayData.filter(r=>r.matin).length.toString(), displayData.filter(r=>r.soir||r.checkOut).length.toString(), displayData.filter(r=>r.isLate).length.toString()]];
        } 
        else if (activeTab === 'CANTINE') {
            title = `Rapport ABSENTS Cantine - ${periodStr}`;
            tableColumn = ["Date", "Nom", "Prénom", "Catégorie", "Régime", "PAI"];
            tableRows = displayData.map(row => [new Date(row.date).toLocaleDateString('fr-FR'), row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire, row.child.isPAIAlimentaire ? 'OUI' : '-']);
            footData = [["TOTAL ABSENTS", displayData.length.toString(), "", "", "", ""]];
        }
        else if (activeTab === 'PAI') {
            title = `Liste Globale des PAI`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Type PAI", "Détails"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.isPAIAlimentaire ? 'Alimentaire' : 'Médical', row.child.paiDetails]);
            footData = [["TOTAL ENFANTS PAI", displayData.length.toString(), "", "", ""]];
        }
        else if (activeTab === 'REGIMES') {
            title = `Régimes Alimentaires Spéciaux`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Régime"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire]);
            footData = [["TOTAL RÉGIMES SÉLECTIONNÉS", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SORTIE_SEUL') {
            title = `Enfants autorisés à partir seuls`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Statut"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, 'Autorisé']);
            footData = [["TOTAL AUTORISÉS", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SANS_IMAGE') {
            title = `Enfants SANS droit à l'image`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Statut"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, 'Refusé']);
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
                    <button onClick={exportPDF} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20"><Download size={20}/> TÉLÉCHARGER PDF</button>
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
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 mb-6">
                    
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
                    
                    <div className={`flex flex-col gap-2 ${activeTab === 'REGIMES' ? 'border-r border-slate-100 pr-6' : ''}`}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Catégories (Cumulables) :</span>
                        <div className="flex gap-2">
                            <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border select-none transition-colors ${categories.Maternelle ? 'bg-car-yellow/10 border-car-yellow/30 text-car-yellow' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                <input type="checkbox" className="hidden" checked={categories.Maternelle} onChange={() => setCategories({...categories, Maternelle: !categories.Maternelle})} disabled={access === 'Élémentaire'} />
                                <span className="font-bold text-sm">Maternelle</span>
                            </label>
                            <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border select-none transition-colors ${categories.Élémentaire ? 'bg-car-blue/10 border-car-blue/30 text-car-blue' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                <input type="checkbox" className="hidden" checked={categories.Élémentaire} onChange={() => setCategories({...categories, Élémentaire: !categories.Élémentaire})} disabled={access === 'Maternelle'} />
                                <span className="font-bold text-sm">Élémentaire</span>
                            </label>
                        </div>
                    </div>

                    {activeTab === 'REGIMES' && (
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Types de Régimes (Cumulables) :</span>
                            <div className="flex flex-wrap gap-2">
                                {['Sans-porc', 'Végétarien', 'PAI'].map(reg => (
                                    <label key={reg} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border select-none transition-colors ${regimes[reg] ? 'bg-car-dark text-white border-car-dark' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                        <input type="checkbox" className="hidden" checked={regimes[reg]} onChange={() => setRegimes({...regimes, [reg]: !regimes[reg]})} />
                                        <span className="font-bold text-sm">{reg === 'PAI' ? 'PAI Alimentaire' : reg}</span>
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
                                        <SortHeader label="Catégorie" sortKey="category" className="text-center" />
                                        <SortHeader label="Régime" sortKey="regime" className="text-center" />
                                        <SortHeader label="PAI Alim." sortKey="pai" className="text-center" />
                                    </>
                                )}

                                {activeTab === 'PAI' && (
                                    <>
                                        <SortHeader label="Catégorie" sortKey="category" className="text-center" />
                                        <th className="p-5 border-b border-slate-100">Détails du PAI</th>
                                        <SortHeader label="Alimentaire" sortKey="pai" className="text-center" />
                                    </>
                                )}

                                {activeTab === 'REGIMES' && (
                                    <>
                                        <SortHeader label="Catégorie" sortKey="category" className="text-center" />
                                        <SortHeader label="Régime Strict" sortKey="regime" />
                                    </>
                                )}

                                {(activeTab === 'SORTIE_SEUL' || activeTab === 'SANS_IMAGE') && (
                                    <SortHeader label="Catégorie" sortKey="category" className="text-center" />
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
                                    
                                    {activeTab === 'PERISCO' && (
                                        <>
                                            <td className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">{row.billTo ? <span className="bg-car-blue/10 text-car-blue font-bold px-2 py-1 rounded-md text-xs uppercase tracking-widest">{row.billTo}</span> : <span className="text-slate-300">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{row.matin ? <CheckCircle className="text-car-yellow mx-auto" size={24}/> : <span className="text-slate-300 font-bold">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{(row.checkOut || row.soir) ? <CheckCircle className="text-car-blue mx-auto" size={24}/> : <span className="text-slate-300 font-bold">-</span>}</td>
                                            <td className="p-5 border-b border-slate-100 text-center">{row.isLate ? <button onClick={() => handleRemoveLate(row.pmId)} className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg hover:bg-red-600 transition-colors"> +19h (Annuler)</button> : <span className="text-slate-300 font-bold">-</span>}</td>
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
                                            <td className="p-5 border-b border-slate-100 text-center"><span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.category}</span></td>
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

                                    {(activeTab === 'SORTIE_SEUL' || activeTab === 'SANS_IMAGE') && (
                                        <td className="p-5 border-b border-slate-100 text-center"><span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{c.category}</span></td>
                                    )}
                                </tr>
                            )})}
                            {displayData.length === 0 && (
                                <tr><td colSpan="7" className="p-8 text-center text-slate-400 font-bold">Aucune donnée trouvée pour cette sélection.</td></tr>
                            )}
                        </tbody>
                        
                        {/* TOTAUX */}
                        {displayData.length > 0 && (
                            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200">
                                {activeTab === 'PERISCO' && (
                                    <tr>
                                        <td colSpan="3" className="p-5 font-black text-car-dark text-right sm:table-cell hidden">TOTAL PRÉSENCES</td>
                                        <td colSpan="2" className="p-5 font-black text-car-dark text-right sm:hidden">TOTAL</td>
                                        <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.matin).length}</td>
                                        <td className="p-5 font-black text-car-dark text-center text-lg">{displayData.filter(r=>r.soir||r.checkOut).length}</td>
                                        <td className="p-5 font-black text-car-pink text-center text-lg">{displayData.filter(r=>r.isLate).length}</td>
                                    </tr>
                                )}
                                {activeTab === 'CANTINE' && (
                                    <tr>
                                        <td colSpan="4" className="p-5 font-black text-car-teal text-right">TOTAL ABSENTS CANTINE :</td>
                                        <td colSpan="2" className="p-5 font-black text-car-teal text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'PAI' && (
                                    <tr>
                                        <td colSpan="2" className="p-5 font-black text-car-pink text-right">TOTAL ENFANTS PAI :</td>
                                        <td colSpan="3" className="p-5 font-black text-car-pink text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'REGIMES' && (
                                    <tr>
                                        <td colSpan="2" className="p-5 font-black text-car-yellow text-right">TOTAL RÉGIMES :</td>
                                        <td colSpan="2" className="p-5 font-black text-car-yellow text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'SORTIE_SEUL' && (
                                    <tr>
                                        <td colSpan="2" className="p-5 font-black text-slate-700 text-right">TOTAL AUTORISÉS :</td>
                                        <td colSpan="1" className="p-5 font-black text-slate-700 text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                                {activeTab === 'SANS_IMAGE' && (
                                    <tr>
                                        <td colSpan="2" className="p-5 font-black text-slate-700 text-right">TOTAL REFUSÉS :</td>
                                        <td colSpan="1" className="p-5 font-black text-slate-700 text-left text-xl">{displayData.length}</td>
                                    </tr>
                                )}
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Report;