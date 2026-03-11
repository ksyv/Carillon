import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CategoryFilter from '../components/CategoryFilter';



const Report = () => {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState([]);
    
    const [activeTab, setActiveTab] = useState('PERISCO');
    
    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    useEffect(() => { loadReport(); }, [date]);
    const loadReport = () => api.get(`/report?date=${date}`).then(res => setReportData(res.data));

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément ?")) {
            await api.put(`/attendance/remove-late/${id}`);
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

export default Report;