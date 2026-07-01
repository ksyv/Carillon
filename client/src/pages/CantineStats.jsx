import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, Download, CalendarDays, BarChart, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const CantineStats = () => {
    const navigate = useNavigate();
    
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (startDate && endDate) {
            loadStats();
        }
    }, [startDate, endDate]);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get(`/stats/cantine-1-euro?startDate=${startDate}&endDate=${endDate}`);
            setStats(data);
        } catch (error) {
            console.error("Erreur lors du chargement des stats Cantine à 1€");
        }
        setIsLoading(false);
    };

    const exportPDF = () => {
        if (!stats) return;
        const doc = new jsPDF();
        
        const startStr = new Date(startDate).toLocaleDateString('fr-FR');
        const endStr = new Date(endDate).toLocaleDateString('fr-FR');
        
        doc.setFontSize(22);
        doc.setTextColor(13, 148, 136); // Teal color
        doc.text(`DISPOSITIF CANTINE À 1€`, 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`Période du ${startStr} au ${endStr} (Tranches 1 & 2)`, 14, 30);

        let currentY = 40;

        // --- TABLEAU 1 : LISTE DES ENFANTS ---
        doc.setFontSize(14);
        doc.setTextColor(30, 58, 138);
        doc.text("Enfants éligibles ayant déjeuné", 14, currentY);

        const childrenHead = [["Nom / Prénom", "QF Famille", "Nombre de repas"]];
        const childrenBody = stats.children.map(c => [
            `${c.lastName} ${c.firstName}`,
            `${c.qf} €`,
            c.mealsCount.toString()
        ]);
        
        // Ligne de total
        childrenBody.push(["TOTAL GLOBAL", "-", stats.global.totalMeals.toString()]);

        autoTable(doc, {
            startY: currentY + 5,
            head: childrenHead,
            body: childrenBody,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' } },
            didParseCell: function(data) {
                // Mettre la dernière ligne (Total) en gras
                if (data.row.index === stats.children.length && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 15;

        // --- TABLEAU 2 : DÉTAIL JOURNALIER ---
        if (stats.daily && stats.daily.length > 0) {
            if (currentY > 240) { doc.addPage(); currentY = 20; }

            doc.setFontSize(14);
            doc.setTextColor(30, 58, 138);
            doc.text("Détail journalier des repas (T1 & T2)", 14, currentY);

            const dailyHead = [["Date", "Nombre de repas servis"]];
            const dailyBody = stats.daily.map(day => [
                new Date(day.date).toLocaleDateString('fr-FR'),
                day.meals.toString()
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: dailyHead,
                body: dailyBody,
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 10, halign: 'center' },
                columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } }
            });
        }

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} par le logiciel Carillon.`, 14, doc.internal.pageSize.getHeight() - 10);

        doc.save(`Cantine_1Euro_${startDate}_au_${endDate}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-6xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-teal/10 p-4 rounded-2xl">
                            <Utensils className="text-car-teal w-8 h-8"/>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Cantine à 1€</h1>
                            <p className="text-slate-500 font-medium mt-1">Export des repas pour les tranches 1 et 2 (QF 0-1000€)</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-wrap sm:flex-nowrap">
                        <span className="text-sm font-bold text-car-dark uppercase tracking-widest pl-2">Période :</span>
                        <div className="flex items-center gap-2">
                            <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark cursor-pointer text-sm hover:bg-slate-100 transition-colors" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-slate-300 font-bold">au</span>
                            <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark cursor-pointer text-sm hover:bg-slate-100 transition-colors" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                {isLoading || !stats ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-car-teal"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* EN-TÊTE GLOBAL */}
                        <div className="bg-car-teal text-white p-8 rounded-[2rem] shadow-lg flex flex-col md:flex-row justify-between items-center overflow-hidden relative">
                            <BarChart className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
                            <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                                <h2 className="text-sm font-bold tracking-widest opacity-80 uppercase mb-1">Total sur la période</h2>
                                <p className="text-2xl font-black mb-2">Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}</p>
                                <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
                                    <Users size={18}/> {stats.global.uniqueChildrenCount} Enfants concernés
                                </span>
                            </div>
                            <div className="relative z-10 flex gap-8 text-center bg-black/10 p-6 rounded-3xl backdrop-blur-sm border border-white/20">
                                <div>
                                    <span className="block text-5xl font-black mb-1">{stats.global.totalMeals}</span>
                                    <span className="text-xs font-bold tracking-widest opacity-90 uppercase">Repas Servis</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* TABLEAU ENFANTS */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                                    <Users className="text-car-teal" size={24}/>
                                    <h3 className="text-xl font-black text-car-dark">Enfants éligibles</h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 z-10">
                                            <tr className="text-slate-500 font-bold uppercase text-xs tracking-wider">
                                                <th className="p-4 border-b border-slate-200">Enfant</th>
                                                <th className="p-4 border-b border-slate-200 text-center">QF</th>
                                                <th className="p-4 border-b border-slate-200 text-center">Repas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.children.length > 0 ? stats.children.map(child => (
                                                <tr key={child._id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                    <td className="p-4 font-bold text-car-dark">{child.lastName} {child.firstName}</td>
                                                    <td className="p-4 text-center font-medium text-slate-500">{child.qf} €</td>
                                                    <td className="p-4 text-center font-black text-car-teal">{child.mealsCount}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" className="p-8 text-center text-slate-400 font-bold italic">Aucun enfant trouvé dans ces tranches.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* TABLEAU JOURNALIER */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                                    <CalendarDays className="text-slate-400" size={24}/>
                                    <h3 className="text-xl font-black text-car-dark">Détail journalier</h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-50 z-10">
                                            <tr className="text-slate-500 font-bold uppercase text-xs tracking-wider">
                                                <th className="p-4 border-b border-slate-200">Date</th>
                                                <th className="p-4 border-b border-slate-200 text-center">Repas Servis</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.daily.length > 0 ? stats.daily.map(day => (
                                                <tr key={day.date} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                    <td className="p-4 font-bold text-car-dark">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                                                    <td className="p-4 text-center font-black text-car-teal">{day.meals}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="2" className="p-8 text-center text-slate-400 font-bold italic">Aucun pointage sur cette période.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button onClick={exportPDF} className="bg-car-dark text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-lg shadow-car-dark/20 hover:-translate-y-1">
                                <Download size={24}/> EXPORTER LE RELEVÉ PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CantineStats;