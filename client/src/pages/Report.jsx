import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { FileText, Download, CheckCircle, AlertTriangle, ArrowUpDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CategoryFilter from '../components/CategoryFilter';

const Report = () => {
    // Gestion par période
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    const [reportData, setReportData] = useState({ children: [], attendances: [] });
    const [activeTab, setActiveTab] = useState('PERISCO');
    
    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    
    // Nouveaux filtres et tris
    const [categoryFilter, setCategoryFilter] = useState(access);
    const [regimeFilter, setRegimeFilter] = useState('Tous');
    const [sortBy, setSortBy] = useState('alpha'); // 'alpha', 'category', 'regime'

    useEffect(() => { loadReport(); }, [startDate, endDate]);
    
    const loadReport = () => {
        api.get(`/report?startDate=${startDate}&endDate=${endDate}`).then(res => {
            // Rétrocompatibilité de transition
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

    const displayData = useMemo(() => {
        const isAttendanceTab = activeTab === 'PERISCO' || activeTab === 'CANTINE';
        let list = isAttendanceTab ? [...reportData.attendances] : [...reportData.children];

        // 1. Filtre par Catégorie (Maternelle/Élémentaire)
        if (categoryFilter !== 'Tous') {
            list = list.filter(r => r.child.category === categoryFilter);
        }

        // 2. Filtres Spécifiques aux onglets
        if (activeTab === 'PERISCO') list = list.filter(r => r.matin || r.soir || r.checkOut);
        if (activeTab === 'CANTINE') list = list.filter(r => r.midiAbsent);
        if (activeTab === 'PAI') list = list.filter(r => r.child.hasPAI);
        if (activeTab === 'REGIMES') {
            list = list.filter(r => r.child.regimeAlimentaire !== 'Standard');
            if (regimeFilter !== 'Tous') list = list.filter(r => r.child.regimeAlimentaire === regimeFilter);
        }
        if (activeTab === 'SORTIE_SEUL') list = list.filter(r => r.child.autorisationSortieSeul);
        if (activeTab === 'SANS_IMAGE') list = list.filter(r => !r.child.droitImage);

        // 3. Tri
        return list.sort((a, b) => {
            if (isAttendanceTab) {
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
            }
            if (sortBy === 'category') {
                const catCompare = (a.child.category || '').localeCompare(b.child.category || '');
                if (catCompare !== 0) return catCompare;
            }
            if (sortBy === 'regime' && activeTab === 'REGIMES') {
                const regCompare = (a.child.regimeAlimentaire || '').localeCompare(b.child.regimeAlimentaire || '');
                if (regCompare !== 0) return regCompare;
            }
            // Tri alphabétique par défaut
            return `${a.child.lastName} ${a.child.firstName}`.localeCompare(`${b.child.lastName} ${b.child.firstName}`);
        });
    }, [reportData, activeTab, categoryFilter, regimeFilter, sortBy]);

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        
        let title = "";
        let tableColumn = [];
        let tableRows = [];
        let footData = [];

        const periodStr = startDate === endDate ? format(new Date(startDate), 'dd/MM/yyyy') : `${format(new Date(startDate), 'dd/MM/yyyy')} au ${format(new Date(endDate), 'dd/MM/yyyy')}`;

        if (activeTab === 'PERISCO') {
            title = `Rapport Périscolaire - ${periodStr} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Date", "Nom", "Prénom", "Facture", "Matin", "Soir", "19h"];
            tableRows = displayData.map(row => [new Date(row.date).toLocaleDateString('fr-FR'), row.child.lastName, row.child.firstName, row.billTo || '-', row.matin ? 'OUI' : '-', (row.checkOut || row.soir) ? 'OUI' : '-', row.isLate ? 'OUI' : '-']);
            footData = [["TOTAL", "", "", "", displayData.filter(r=>r.matin).length.toString(), displayData.filter(r=>r.soir||r.checkOut).length.toString(), displayData.filter(r=>r.isLate).length.toString()]];
        } 
        else if (activeTab === 'CANTINE') {
            title = `Rapport ABSENTS Cantine - ${periodStr} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Date", "Nom", "Prénom", "Catégorie", "Régime", "PAI"];
            tableRows = displayData.map(row => [new Date(row.date).toLocaleDateString('fr-FR'), row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire, row.child.isPAIAlimentaire ? 'OUI' : '-']);
            footData = [["TOTAL ABSENTS", displayData.length.toString(), "", "", "", ""]];
        }
        else if (activeTab === 'PAI') {
            title = `Liste Globale des PAI ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Type PAI", "Détails"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.isPAIAlimentaire ? 'Alimentaire' : 'Médical', row.child.paiDetails]);
            footData = [["TOTAL ENFANTS PAI", displayData.length.toString(), "", "", ""]];
        }
        else if (activeTab === 'REGIMES') {
            title = `Régimes : ${regimeFilter !== 'Tous' ? regimeFilter : 'Tous'} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Régime"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, row.child.regimeAlimentaire]);
            footData = [["TOTAL RÉGIMES", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SORTIE_SEUL') {
            title = `Enfants autorisés à partir seuls ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
            tableColumn = ["Nom", "Prénom", "Catégorie", "Statut"];
            tableRows = displayData.map(row => [row.child.lastName, row.child.firstName, row.child.category, 'Autorisé']);
            footData = [["TOTAL AUTORISÉS", displayData.length.toString(), "", ""]];
        }
        else if (activeTab === 'SANS_IMAGE') {
            title = `Enfants SANS droit à l'image ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`;
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

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative pb-24">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><FileText className="text-car-blue w-8 h-8"/></div>
                        <h1 className="text-4xl font-black text-car-dark">Rapports & Listes</h1>
                    </div>
                    <button onClick={exportPDF} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20"><Download size={20}/> PDF</button>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setActiveTab('PERISCO')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'PERISCO' ? 'bg-car-blue text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Périscolaire</button>
                    <button onClick={() => setActiveTab('CANTINE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'CANTINE' ? 'bg-car-teal text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Absents Cantine</button>
                    <button onClick={() => setActiveTab('PAI')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'PAI' ? 'bg-car-pink text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Fiches PAI</button>
                    <button onClick={() => setActiveTab('REGIMES')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'REGIMES' ? 'bg-car-yellow text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Régimes Spéciaux</button>
                    <button onClick={() => setActiveTab('SORTIE_SEUL')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'SORTIE_SEUL' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Sortie Seul</button>
                    <button onClick={() => setActiveTab('SANS_IMAGE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'SANS_IMAGE' ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>Sans Image</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    
                    {/* Bloc Date (uniquement pour les présences/absences) */}
                    {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between col-span-1 md:col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Du :</span>
                            <input type="date" className="bg-transparent border-none outline-none font-bold text-car-dark text-sm w-32" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Au :</span>
                            <input type="date" className="bg-transparent border-none outline-none font-bold text-car-dark text-sm w-32" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    )}
                    
                    <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />

                    <div className="relative">
                        <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl outline-none font-bold text-slate-600 appearance-none" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="alpha">Tri : Alphabétique</option>
                            <option value="category">Tri : Maternelle / Élém.</option>
                            {activeTab === 'REGIMES' && <option value="regime">Tri : Type de Régime</option>}
                        </select>
                        <ArrowUpDown className="absolute right-4 top-4 text-slate-400 pointer-events-none" size={18}/>
                    </div>

                    {activeTab === 'REGIMES' && (
                        <select className="bg-car-yellow/10 border-none p-4 rounded-xl outline-none font-bold text-car-yellow" value={regimeFilter} onChange={e => setRegimeFilter(e.target.value)}>
                            <option value="Tous">Tous les régimes spéciaux</option>
                            <option value="Sans-porc">Sans-porc uniquement</option>
                            <option value="Végétarien">Végétarien uniquement</option>
                            <option value="PAI">PAI Alimentaires uniquement</option>
                        </select>
                    )}
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-xs tracking-wider">
                                {(activeTab === 'PERISCO' || activeTab === 'CANTINE') && (
                                    <th className="p-5 border-b border-slate-100">Date</th>
                                )}
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
                                        <th className="p-5 border-b border-slate-100 text-center">Catégorie</th>
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

                                {(activeTab === 'SORTIE_SEUL' || activeTab === 'SANS_IMAGE') && (
                                    <th className="p-5 border-b border-slate-100 text-center">Catégorie</th>
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