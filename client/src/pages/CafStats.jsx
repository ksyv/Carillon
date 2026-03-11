import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Download, Sun, Moon, BarChart, CalendarDays } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const CafStats = () => {
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
            const { data } = await api.get(`/stats/caf?startDate=${startDate}&endDate=${endDate}`);
            // data contient maintenant { global: {...}, daily: [...] }
            setStats(data);
        } catch (error) {
            console.error("Erreur lors du chargement des stats CAF");
        }
        setIsLoading(false);
    };

    const exportPDF = () => {
        if (!stats || !stats.global) return;
        const doc = new jsPDF();
        
        const startStr = new Date(startDate).toLocaleDateString('fr-FR');
        const endStr = new Date(endDate).toLocaleDateString('fr-FR');
        
        // --- 1. EN-TÊTE ---
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); 
        doc.text(`DÉCLARATION CAF (PSO)`, 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`Période du ${startStr} au ${endStr}`, 14, 30);

        // --- 2. TABLEAU GLOBAL ---
        const globalHead = ["Période & Tranche d'âge", "Actes (Présences)", "Heures facturées"];
        const globalBody = [
            ["MATIN : Moins de 6 ans", stats.global.matin.under6.acts.toString(), `${stats.global.matin.under6.hours} h`],
            ["MATIN : 6 ans et plus", stats.global.matin.over6.acts.toString(), `${stats.global.matin.over6.hours} h`],
            ["SOIR : Moins de 6 ans", stats.global.soir.under6.acts.toString(), `${stats.global.soir.under6.hours} h`],
            ["SOIR : 6 ans et plus", stats.global.soir.over6.acts.toString(), `${stats.global.soir.over6.hours} h`]
        ];
        const globalFoot = [
            ["TOTAL GLOBAL SUR LA PÉRIODE", stats.global.total.acts.toString(), `${stats.global.total.hours} h`]
        ];

        autoTable(doc, {
            startY: 40,
            head: [globalHead],
            body: globalBody,
            foot: globalFoot,
            footStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold', fontSize: 12 }, 
            theme: 'grid',
            headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' } }
        });

        // --- 3. TABLEAU DÉTAILLÉ (JOURNALIER) ---
        if (stats.daily && stats.daily.length > 0) {
            let currentY = doc.lastAutoTable.finalY + 15;
            
            // Ajouter une nouvelle page si on est trop bas
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(30, 58, 138);
            doc.text("Détail journalier des présences", 14, currentY);

            const dailyHead = [["Date", "Matin (- 6 ans)", "Matin (6 ans +)", "Soir (- 6 ans)", "Soir (6 ans +)"]];
            const dailyBody = stats.daily.map(day => [
                new Date(day.date).toLocaleDateString('fr-FR'),
                `${day.matin.under6.acts} actes (${day.matin.under6.hours}h)`,
                `${day.matin.over6.acts} actes (${day.matin.over6.hours}h)`,
                `${day.soir.under6.acts} actes (${day.soir.under6.hours}h)`,
                `${day.soir.over6.acts} actes (${day.soir.over6.hours}h)`
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: dailyHead,
                body: dailyBody,
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, halign: 'center' },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });
        }

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} par le logiciel Carillon.`, 14, doc.internal.pageSize.getHeight() - 10);

        doc.save(`CAF_PSO_${startDate}_au_${endDate}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-5xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-purple/10 p-4 rounded-2xl">
                            <Calculator className="text-car-purple w-8 h-8"/>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Statistiques CAF</h1>
                            <p className="text-slate-500 font-medium mt-1">Déclaration PSO (Actes & Heures)</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-wrap sm:flex-nowrap">
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest pl-2">Période :</span>
                        <div className="flex items-center gap-2">
                            <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark cursor-pointer text-sm hover:bg-slate-100 transition-colors" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-slate-300 font-bold">au</span>
                            <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark cursor-pointer text-sm hover:bg-slate-100 transition-colors" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                </div>

                {isLoading || !stats || !stats.global ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-car-purple"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* 1. EN-TÊTE GLOBAL */}
                        <div className="bg-car-purple text-white p-8 rounded-[2rem] shadow-lg flex flex-col md:flex-row justify-between items-center overflow-hidden relative">
                            <BarChart className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
                            <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                                <h2 className="text-sm font-bold tracking-widest opacity-80 uppercase mb-1">Total sur la période</h2>
                                <p className="text-2xl font-black">Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="relative z-10 flex gap-8 text-center bg-black/20 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                                <div>
                                    <span className="block text-5xl font-black mb-1">{stats.global.total.acts}</span>
                                    <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Actes</span>
                                </div>
                                <div className="w-px bg-white/20"></div>
                                <div>
                                    <span className="block text-5xl font-black mb-1">{stats.global.total.hours}</span>
                                    <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Heures</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. CARTES MATIN / SOIR */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <h3 className="text-2xl font-black text-car-yellow mb-6 uppercase flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Sun size={28}/> Matin <span className="text-sm font-bold bg-car-yellow/10 text-car-yellow px-3 py-1 rounded-lg ml-auto">1 Acte = 1h</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark">Moins de 6 ans</span><span className="text-xs font-bold text-slate-400 uppercase">Maternelle / CP</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-2xl text-car-dark">{stats.global.matin.under6.acts} <span className="text-sm text-slate-400 font-bold">actes</span></span>
                                            <span className="text-car-yellow font-black">{stats.global.matin.under6.hours} heures</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark">6 ans et plus</span><span className="text-xs font-bold text-slate-400 uppercase">Élémentaire</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-2xl text-car-dark">{stats.global.matin.over6.acts} <span className="text-sm text-slate-400 font-bold">actes</span></span>
                                            <span className="text-car-yellow font-black">{stats.global.matin.over6.hours} heures</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                <h3 className="text-2xl font-black text-car-blue mb-6 uppercase flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Moon size={28}/> Soir <span className="text-sm font-bold bg-car-blue/10 text-car-blue px-3 py-1 rounded-lg ml-auto">1 Acte = 2h30</span>
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark">Moins de 6 ans</span><span className="text-xs font-bold text-slate-400 uppercase">Maternelle / CP</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-2xl text-car-dark">{stats.global.soir.under6.acts} <span className="text-sm text-slate-400 font-bold">actes</span></span>
                                            <span className="text-car-blue font-black">{stats.global.soir.under6.hours} heures</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark">6 ans et plus</span><span className="text-xs font-bold text-slate-400 uppercase">Élémentaire</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-2xl text-car-dark">{stats.global.soir.over6.acts} <span className="text-sm text-slate-400 font-bold">actes</span></span>
                                            <span className="text-car-blue font-black">{stats.global.soir.over6.hours} heures</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. TABLEAU DÉTAILLÉ */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mt-8">
                            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                                <CalendarDays className="text-slate-400" size={24}/>
                                <h3 className="text-xl font-black text-car-dark">Détail journalier</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider">
                                            <th className="p-4 border-b border-slate-200">Date</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Matin (-6 ans)</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Matin (6 ans +)</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Soir (-6 ans)</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Soir (6 ans +)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.daily.length > 0 ? stats.daily.map(day => (
                                            <tr key={day.date} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                <td className="p-4 font-bold text-car-dark">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                                                <td className="p-4 text-center text-sm">
                                                    <span className="font-black text-car-dark">{day.matin.under6.acts}</span> actes <span className="text-car-yellow font-bold ml-1">({day.matin.under6.hours}h)</span>
                                                </td>
                                                <td className="p-4 text-center text-sm">
                                                    <span className="font-black text-car-dark">{day.matin.over6.acts}</span> actes <span className="text-car-yellow font-bold ml-1">({day.matin.over6.hours}h)</span>
                                                </td>
                                                <td className="p-4 text-center text-sm">
                                                    <span className="font-black text-car-dark">{day.soir.under6.acts}</span> actes <span className="text-car-blue font-bold ml-1">({day.soir.under6.hours}h)</span>
                                                </td>
                                                <td className="p-4 text-center text-sm">
                                                    <span className="font-black text-car-dark">{day.soir.over6.acts}</span> actes <span className="text-car-blue font-bold ml-1">({day.soir.over6.hours}h)</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-slate-400 font-bold italic">Aucun pointage sur cette période.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end mt-8">
                            <button onClick={exportPDF} className="bg-car-dark text-white px-8 py-4 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-3 shadow-lg shadow-car-dark/20 hover:-translate-y-1">
                                <Download size={24}/> TÉLÉCHARGER LE RELEVÉ CAF
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CafStats;