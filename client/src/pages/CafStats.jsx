import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, Download, Sun, Moon, BarChart, CalendarDays, LineChart, Sunset, Users } from 'lucide-react';
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
        
        doc.setFontSize(22);
        doc.setTextColor(30, 58, 138); 
        doc.text(`DÉCLARATION CAF (PSU)`, 14, 20);
        
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`Période du ${startStr} au ${endStr}`, 14, 30);

        let currentY = 40;

        // --- TABLEAU ENFANTS UNIQUES DÉTAILLÉ ---
        const uniqueHead = [["Catégorie", "Enfants uniques (Total)", "Dont - de 6 ans", "Dont 6 ans et +"]];
        const uniqueBody = [
            ["Matin (7h30 - 8h30)", stats.global.uniqueChildren.matin.all.toString(), stats.global.uniqueChildren.matin.under6.toString(), stats.global.uniqueChildren.matin.over6.toString()],
            ["Soir (16h30 - 18h30)", stats.global.uniqueChildren.soir.all.toString(), stats.global.uniqueChildren.soir.under6.toString(), stats.global.uniqueChildren.soir.over6.toString()],
            ["Supplément (18h30 - 19h)", stats.global.uniqueChildren.supplement.all.toString(), stats.global.uniqueChildren.supplement.under6.toString(), stats.global.uniqueChildren.supplement.over6.toString()],
            ["TOTAL GLOBAL UNIQUE", stats.global.uniqueChildren.total.all.toString(), stats.global.uniqueChildren.total.under6.toString(), stats.global.uniqueChildren.total.over6.toString()]
        ];
        
        autoTable(doc, {
            startY: currentY,
            head: uniqueHead,
            body: uniqueBody,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
            columnStyles: { 1: { halign: 'center', fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
            didParseCell: function(data) {
                if (data.row.index === 3 && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
            }
        });
        
        currentY = doc.lastAutoTable.finalY + 10;

        // --- TABLEAU GLOBAL DES ACTES AVEC TOTAUX PAR ACTIVITÉ ---
        const globalHead = ["Période & Tranche d'âge", "Actes (Présences)", "Heures facturées"];
        const globalBody = [
            ["MATIN : Moins de 6 ans", stats.global.matin.under6.acts.toString(), `${stats.global.matin.under6.hours} h`],
            ["MATIN : 6 ans et plus", stats.global.matin.over6.acts.toString(), `${stats.global.matin.over6.hours} h`],
            ["MATIN : TOTAL", (stats.global.matin.under6.acts + stats.global.matin.over6.acts).toString(), `${stats.global.matin.under6.hours + stats.global.matin.over6.hours} h`],
            
            ["SOIR : Moins de 6 ans", stats.global.soir.under6.acts.toString(), `${stats.global.soir.under6.hours} h`],
            ["SOIR : 6 ans et plus", stats.global.soir.over6.acts.toString(), `${stats.global.soir.over6.hours} h`],
            ["SOIR : TOTAL", (stats.global.soir.under6.acts + stats.global.soir.over6.acts).toString(), `${stats.global.soir.under6.hours + stats.global.soir.over6.hours} h`],
            
            ["SUPPLÉMENT : Moins de 6 ans", stats.global.supplement.under6.acts.toString(), `${stats.global.supplement.under6.hours} h`],
            ["SUPPLÉMENT : 6 ans et plus", stats.global.supplement.over6.acts.toString(), `${stats.global.supplement.over6.hours} h`],
            ["SUPPLÉMENT : TOTAL", (stats.global.supplement.under6.acts + stats.global.supplement.over6.acts).toString(), `${stats.global.supplement.under6.hours + stats.global.supplement.over6.hours} h`]
        ];
        const globalFoot = [
            ["TOTAL GLOBAL DES ACTES", stats.global.total.acts.toString(), `${stats.global.total.hours} h`]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [globalHead],
            body: globalBody,
            foot: globalFoot,
            footStyles: { fillColor: [88, 28, 135], textColor: 255, fontStyle: 'bold', fontSize: 12 }, 
            theme: 'grid',
            headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center', fontStyle: 'bold' } },
            didParseCell: function(data) {
                if ((data.row.index === 2 || data.row.index === 5 || data.row.index === 8) && data.section === 'body') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [248, 250, 252];
                }
            }
        });

        currentY = doc.lastAutoTable.finalY + 15;

        // --- TABLEAU DÉTAILLÉ (JOURNALIER) ---
        if (stats.daily && stats.daily.length > 0) {
            if (currentY > 240) { doc.addPage(); currentY = 20; }

            doc.setFontSize(14);
            doc.setTextColor(30, 58, 138);
            doc.text("Détail journalier des présences", 14, currentY);

            const dailyHead = [["Date", "Matin (-6 / +6)", "Soir (-6 / +6)", "Supplément (-6 / +6)"]];
            const dailyBody = stats.daily.map(day => [
                new Date(day.date).toLocaleDateString('fr-FR'),
                `${day.matin.under6.acts} / ${day.matin.over6.acts} actes`,
                `${day.soir.under6.acts} / ${day.soir.over6.acts} actes`,
                `${day.supplement.under6.acts} / ${day.supplement.over6.acts} actes`
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

        doc.save(`CAF_PSU_${startDate}_au_${endDate}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-6xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-purple/10 p-4 rounded-2xl">
                            <Calculator className="text-car-purple w-8 h-8"/>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Statistiques CAF</h1>
                            <p className="text-slate-500 font-medium mt-1">Déclaration PSU (Actes, Heures & Enfants uniques)</p>
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
                                <p className="text-2xl font-black mb-2">Du {new Date(startDate).toLocaleDateString('fr-FR')} au {new Date(endDate).toLocaleDateString('fr-FR')}</p>
                                <span className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl text-sm font-bold shadow-sm" title={`${stats.global.uniqueChildren.total.under6} de -6 ans / ${stats.global.uniqueChildren.total.over6} de 6 ans+`}>
                                    <Users size={18}/> {stats.global.uniqueChildren.total.all} Enfants Uniques (Toutes tranches d'âge)
                                </span>
                            </div>
                            <div className="relative z-10 flex gap-8 text-center bg-black/20 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
                                <div>
                                    <span className="block text-5xl font-black mb-1">{stats.global.total.acts}</span>
                                    <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Actes Globaux</span>
                                </div>
                                <div className="w-px bg-white/20"></div>
                                <div>
                                    <span className="block text-5xl font-black mb-1">{stats.global.total.hours}</span>
                                    <span className="text-xs font-bold tracking-widest opacity-80 uppercase">Heures</span>
                                </div>
                            </div>
                        </div>

                        {/* 2. CARTES MATIN / SOIR / SUPPLÉMENT */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* MATIN */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                                <h3 className="text-xl font-black text-car-yellow mb-4 uppercase flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2"><Sun size={24}/> Matin</div>
                                    <span className="text-[10px] font-bold bg-car-yellow/10 text-car-yellow px-2 py-1 rounded-lg">1 Acte = 1h</span>
                                </h3>
                                <span className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-1"><Users size={16}/> {stats.global.uniqueChildren.matin.all} enfants uniques <span className="text-[10px] text-slate-400 font-normal">({stats.global.uniqueChildren.matin.under6} de -6a / {stats.global.uniqueChildren.matin.over6} de 6a+)</span></span>
                                <div className="space-y-3 mt-auto">
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">Moins de 6 ans</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.matin.under6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">6 ans et plus</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.matin.over6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-car-yellow/10 p-4 rounded-2xl flex justify-between items-center border border-car-yellow/20 mt-2">
                                        <div><span className="block font-black text-car-dark text-sm uppercase">TOTAL MATIN</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-xl text-car-dark">{stats.global.matin.under6.acts + stats.global.matin.over6.acts} actes</span>
                                            <span className="text-car-yellow font-black text-xs">{stats.global.matin.under6.hours + stats.global.matin.over6.hours} h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SOIR */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                                <h3 className="text-xl font-black text-car-blue mb-4 uppercase flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2"><Moon size={24}/> Soir</div>
                                    <span className="text-[10px] font-bold bg-car-blue/10 text-car-blue px-2 py-1 rounded-lg">1 Acte = 2h</span>
                                </h3>
                                <span className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-1"><Users size={16}/> {stats.global.uniqueChildren.soir.all} enfants uniques <span className="text-[10px] text-slate-400 font-normal">({stats.global.uniqueChildren.soir.under6} de -6a / {stats.global.uniqueChildren.soir.over6} de 6a+)</span></span>
                                <div className="space-y-3 mt-auto">
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">Moins de 6 ans</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.soir.under6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">6 ans et plus</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.soir.over6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-car-blue/10 p-4 rounded-2xl flex justify-between items-center border border-car-blue/20 mt-2">
                                        <div><span className="block font-black text-car-dark text-sm uppercase">TOTAL SOIR</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-xl text-car-dark">{stats.global.soir.under6.acts + stats.global.soir.over6.acts} actes</span>
                                            <span className="text-car-blue font-black text-xs">{stats.global.soir.under6.hours + stats.global.soir.over6.hours} h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SUPPLÉMENT */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                                <h3 className="text-xl font-black text-car-pink mb-4 uppercase flex justify-between items-center border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2"><Sunset size={24}/> Supplément</div>
                                    <span className="text-[10px] font-bold bg-car-pink/10 text-car-pink px-2 py-1 rounded-lg">1 Acte = 0.5h</span>
                                </h3>
                                <span className="text-sm font-bold text-slate-500 mb-4 flex items-center gap-1"><Users size={16}/> {stats.global.uniqueChildren.supplement.all} enfants uniques <span className="text-[10px] text-slate-400 font-normal">({stats.global.uniqueChildren.supplement.under6} de -6a / {stats.global.uniqueChildren.supplement.over6} de 6a+)</span></span>
                                <div className="space-y-3 mt-auto">
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">Moins de 6 ans</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.supplement.under6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-slate-100">
                                        <div><span className="block font-black text-car-dark text-sm">6 ans et plus</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-lg text-car-dark">{stats.global.supplement.over6.acts}</span>
                                        </div>
                                    </div>
                                    <div className="bg-car-pink/10 p-4 rounded-2xl flex justify-between items-center border border-car-pink/20 mt-2">
                                        <div><span className="block font-black text-car-dark text-sm uppercase">TOTAL SUPP.</span></div>
                                        <div className="text-right">
                                            <span className="block font-black text-xl text-car-dark">{stats.global.supplement.under6.acts + stats.global.supplement.over6.acts} actes</span>
                                            <span className="text-car-pink font-black text-xs">{stats.global.supplement.under6.hours + stats.global.supplement.over6.hours} h</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 4. TABLEAU DÉTAILLÉ */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mt-4">
                            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                                <CalendarDays className="text-slate-400" size={24}/>
                                <h3 className="text-xl font-black text-car-dark">Détail journalier des Actes</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-xs tracking-wider">
                                            <th className="p-4 border-b border-slate-200">Date</th>
                                            <th className="p-4 border-b border-slate-200 text-center">Matin<br/><span className="text-[10px]">-6 / 6+</span></th>
                                            <th className="p-4 border-b border-slate-200 text-center">Soir<br/><span className="text-[10px]">-6 / 6+</span></th>
                                            <th className="p-4 border-b border-slate-200 text-center">Supplément<br/><span className="text-[10px]">-6 / 6+</span></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.daily.length > 0 ? stats.daily.map(day => (
                                            <tr key={day.date} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                                                <td className="p-4 font-bold text-car-dark">{new Date(day.date).toLocaleDateString('fr-FR')}</td>
                                                <td className="p-4 text-center text-sm font-black text-car-dark">
                                                    {day.matin.under6.acts} <span className="text-slate-300 font-normal">/</span> {day.matin.over6.acts}
                                                </td>
                                                <td className="p-4 text-center text-sm font-black text-car-dark">
                                                    {day.soir.under6.acts} <span className="text-slate-300 font-normal">/</span> {day.soir.over6.acts}
                                                </td>
                                                <td className="p-4 text-center text-sm font-black text-car-pink">
                                                    {day.supplement.under6.acts} <span className="text-slate-300 font-normal">/</span> {day.supplement.over6.acts}
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