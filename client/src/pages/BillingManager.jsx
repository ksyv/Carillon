import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Banknote, Search, Users, Trash2, Check, Calculator, FileSpreadsheet, Layers, FolderHeart, RefreshCcw, Send } from 'lucide-react';
import InteractiveCalendar from '../components/InteractiveCalendar';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BillingManager = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('calc');

    // États - Onglet Garde Alternée
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [billings, setBillings] = useState([]);
    const [billToFamilyId, setBillToFamilyId] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    // États - Onglet Moteur & Historique
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [calculatedInvoices, setCalculatedInvoices] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [hasExistingData, setHasExistingData] = useState(false);

    useEffect(() => { 
        api.get(`/children`)
           .then(res => setChildren(Array.isArray(res.data) ? res.data : []))
           .catch(() => setChildren([]));
    }, []);

    // Vérification automatique au changement de dates
    useEffect(() => {
        if (activeTab === 'calc') {
            loadExistingInvoices();
        }
    }, [startDate, endDate, activeTab]);

    const loadExistingInvoices = async () => {
        try {
            const { data } = await api.get(`/billing/invoices?startDate=${startDate}&endDate=${endDate}`);
            setCalculatedInvoices(data);
            setHasExistingData(data.length > 0);
        } catch (e) { 
            console.error("Erreur de chargement de l'historique", e); 
        }
    };

    const triggerGeneration = async (forceOverwrite = false) => {
        if (forceOverwrite && !window.confirm("⚠️ ATTENTION : Vous allez écraser définitivement les brouillons de factures existants pour ce mois. Continuer ?")) {
            return;
        }

        setIsCalculating(true);
        try {
            const { data } = await api.post(`/billing/generate`, { startDate, endDate, forceOverwrite });
            setCalculatedInvoices(data);
            setHasExistingData(true);
            alert(forceOverwrite ? "Facturation écrasée et recalculée avec succès !" : "Facturation générée et sauvegardée !");
        } catch (e) {
            if (e.response?.status === 409) {
                alert("⚠️ Une facturation existe déjà pour cette période. Cliquez sur 'Recalculer' pour l'écraser.");
            } else if (e.response?.status === 403) {
                alert("⛔ OPÉRATION IMPOSSIBLE : Les factures de cette période sont validées et verrouillées.");
            } else {
                alert("Erreur lors de la génération.");
            }
        }
        setIsCalculating(false);
    };

    const publishInvoices = async () => {
        const confirm = window.confirm(
            "ATTENTION : Cette action va verrouiller les factures de ce mois et les rendre instantanément visibles sur le portail des familles.\n\nÊtes-vous sûr de vouloir publier ces factures ?"
        );

        if (!confirm) return;

        try {
            await api.put('/billing/publish', { startDate, endDate });
            alert("Les factures ont été publiées avec succès !");
            loadExistingInvoices(); 
        } catch (err) {
            console.error(err);
            alert("Une erreur est survenue lors de la publication.");
        }
    };

    const filteredSearch = useMemo(() => {
        if (search.length < 2 || !Array.isArray(children)) return [];
        const query = search.toLowerCase();
        return children.filter(c => 
            (c.lastName?.toLowerCase() || "").includes(query) || 
            (c.firstName?.toLowerCase() || "").includes(query)
        );
    }, [children, search]);

    const selectChild = async (child) => {
        setSelectedChild(child); 
        setSearch(''); 
        loadBillings(child._id);
    };

    const loadBillings = async (childId) => {
        try {
            const { data } = await api.get(`/billing/child/${childId}`);
            setBillings(Array.isArray(data) ? data : []);
        } catch (e) { 
            setBillings([]); 
        }
    };

    const handleAddBilling = async (e) => {
        e.preventDefault();
        if (selectedDates.length === 0) return alert("Veuillez sélectionner des dates.");
        if (!billToFamilyId) return alert("Veuillez sélectionner le dossier à facturer.");
        
        try {
            await api.post(`/billing`, { childId: selectedChild._id, billToFamily: billToFamilyId, dates: selectedDates });
            setBillToFamilyId(''); 
            setSelectedDates([]); 
            loadBillings(selectedChild._id);
        } catch (e) { 
            alert("Erreur enregistrement."); 
        }
    };

    const handleDeleteBilling = async (id) => {
        if (window.confirm("Supprimer cette règle ?")) {
            try { 
                await api.delete(`/billing/${id}`); 
                loadBillings(selectedChild._id); 
            } catch (e) { 
                alert("Erreur."); 
            }
        }
    };

    const totalRecettesCommune = useMemo(() => {
        return calculatedInvoices.reduce((sum, inv) => sum + inv.totalGlobal, 0).toFixed(2);
    }, [calculatedInvoices]);

    const exportInvoicePDF = (invoice) => {
        const doc = new jsPDF();
        const startStr = new Date(startDate).toLocaleDateString('fr-FR');
        const endStr = new Date(endDate).toLocaleDateString('fr-FR');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text("CARIGNAN", 14, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text("DE BORDEAUX", 14, 25);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("MAIRIE DE CARIGNAN DE BORDEAUX", 14, 35);
        doc.text("24 RUE DE VERDUN 33360 CARIGNAN-DE-BORDEAUX", 14, 40);
        doc.text("mairie@carignandebordeaux.fr", 14, 45);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 58, 138);
        doc.text(`Identifiant PAYFIP : 017556`, 120, 20);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
        doc.text(`Référence : ${invoice.reference || 'BROUILLON'}`, 120, 26);
        doc.text(`Période : Du ${startStr} au ${endStr}`, 120, 32);

        doc.rect(118, 42, 78, 25);
        doc.setFont("helvetica", "bold");
        doc.text("DESTINATAIRE :", 122, 48);
        doc.setFont("helvetica", "normal");
        doc.text(invoice.payeur, 122, 55);
        doc.text("33360 CARIGNAN-DE-BORDEAUX", 122, 61);

        doc.setFont("helvetica", "black");
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text("FACTURE : PRESTATIONS PÉRISCOLAIRES", 14, 78);

        const tableHead = [["Enfant", "Prestation", "Dates pointées", "Qté", "P.U.", "Total"]];
        const tableBody = invoice.items.map(item => [
            item.childName || '-',
            item.label,
            item.dates ? item.dates.join(', ') : '',
            item.count.toString(),
            `${item.unitPrice.toFixed(2)} €`,
            `${item.total.toFixed(2)} €`
        ]);

        autoTable(doc, {
            startY: 85,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
            columnStyles: { 
                0: { fontStyle: 'bold', cellWidth: 35 },
                1: { cellWidth: 35 },
                2: { cellWidth: 'auto', fontSize: 8 },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right', cellWidth: 15 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
            },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.rect(130, finalY, 66, 14, 'F', [241, 245, 249]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text("NET À PAYER :", 134, finalY + 9);
        doc.setTextColor(30, 58, 138);
        doc.setFontSize(14);
        doc.text(`${invoice.totalGlobal.toFixed(2)} €`, 166, finalY + 9);

        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("Modalités de règlement : Vous recevrez un avis des sommes à payer du Trésor Public.", 14, finalY + 25);
        doc.text("Règlement possible par chèque, virement ou en ligne sur www.payfip.gouv.fr", 14, finalY + 30);

        doc.save(`Facture_Carillon_${invoice.payeur.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    };

    const exportGeneralRecapPDF = () => {
        const doc = new jsPDF();
        const startStr = new Date(startDate).toLocaleDateString('fr-FR');
        const endStr = new Date(endDate).toLocaleDateString('fr-FR');
        const dateGeneration = new Date().toLocaleDateString('fr-FR');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("VILLE DE CARIGNAN-DE-BORDEAUX", 14, 20);
        
        doc.setFontSize(11);
        doc.text(`RÔLE GÉNÉRAL DE RECETTES - PÉRISCOLAIRE & CANTINE`, 14, 28);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(`Période de facturation : Du ${startStr} au ${endStr}`, 14, 34);
        doc.text(`Généré par Carillon le : ${dateGeneration}`, 14, 39);

        const tableHead = [["Réf", "Payeur / Famille", "Détail des Prestations", "Total Dû"]];
        const tableBody = calculatedInvoices.map((inv) => {
            const detailStr = inv.items.map(item => `[${item.childName}] ${item.label} (x${item.count})`).join("\n");
            return [
                inv.reference || '-',
                inv.payeur,
                detailStr,
                `${inv.totalGlobal.toFixed(2)} €`
            ];
        });

        const grandTotal = calculatedInvoices.reduce((sum, inv) => sum + inv.totalGlobal, 0);
        tableBody.push([
            "",
            "TOTAL GÉNÉRAL DU RÔLE",
            `${calculatedInvoices.length} familles facturées`,
            `${grandTotal.toFixed(2)} €`
        ]);

        autoTable(doc, {
            startY: 45,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { halign: 'center', width: 25 },
                1: { fontStyle: 'bold', width: 50 },
                2: { fontSize: 8 },
                3: { halign: 'right', fontStyle: 'bold', width: 30 }
            },
            didParseCell: (data) => {
                if (data.row.index === tableBody.length - 1) {
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.fontStyle = 'bold';
                    if (data.column.index === 3) {
                        data.cell.styles.textColor = [30, 58, 138];
                    }
                }
            }
        });

        doc.save(`Recap_General_Facturation_${startDate}_${endDate}.pdf`);
    };

    const exportAllInvoicesCombinedPDF = () => {
        if (calculatedInvoices.length === 0) return;
        
        const doc = new jsPDF();
        const startStr = new Date(startDate).toLocaleDateString('fr-FR');
        const endStr = new Date(endDate).toLocaleDateString('fr-FR');

        calculatedInvoices.forEach((invoice, index) => {
            if (index > 0) doc.addPage();

            doc.setFont("helvetica", "bold");
            doc.setFontSize(20);
            doc.setTextColor(30, 41, 59);
            doc.text("CARIGNAN", 14, 20);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.text("DE BORDEAUX", 14, 25);
            
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text("MAIRIE DE CARIGNAN DE BORDEAUX", 14, 35);
            doc.text("24 RUE DE VERDUN 33360 CARIGNAN-DE-BORDEAUX", 14, 40);
            doc.text("mairie@carignandebordeaux.fr", 14, 45);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(30, 58, 138);
            doc.text(`Identifiant PAYFIP : 017556`, 120, 20);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            doc.text(`Référence : ${invoice.reference || 'BROUILLON'}`, 120, 26);
            doc.text(`Période : Du ${startStr} au ${endStr}`, 120, 32);

            doc.rect(118, 42, 78, 25);
            doc.setFont("helvetica", "bold");
            doc.text("DESTINATAIRE :", 122, 48);
            doc.setFont("helvetica", "normal");
            doc.text(invoice.payeur, 122, 55);
            doc.text("33360 CARIGNAN-DE-BORDEAUX", 122, 61);

            doc.setFont("helvetica", "black");
            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59);
            doc.text("FACTURE : PRESTATIONS PÉRISCOLAIRES", 14, 78);

            const tableHead = [["Enfant", "Prestation", "Dates pointées", "Qté", "P.U.", "Total"]];
            const tableBody = invoice.items.map(item => [
                item.childName || '-',
                item.label,
                item.dates ? item.dates.join(', ') : '',
                item.count.toString(),
                `${item.unitPrice.toFixed(2)} €`,
                `${item.total.toFixed(2)} €`
            ]);

            autoTable(doc, {
                startY: 85,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
                columnStyles: { 
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 'auto', fontSize: 8 },
                    3: { halign: 'center', cellWidth: 12 },
                    4: { halign: 'right', cellWidth: 15 },
                    5: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
                },
            });

            const finalY = doc.lastAutoTable.finalY + 10;
            doc.rect(130, finalY, 66, 14, 'F', [241, 245, 249]);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text("NET À PAYER :", 134, finalY + 9);
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(14);
            doc.text(`${invoice.totalGlobal.toFixed(2)} €`, 166, finalY + 9);

            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(120);
            doc.text("Modalités de règlement : Vous recevrez un avis des sommes à payer du Trésor Public.", 14, finalY + 25);
            doc.text("Règlement possible par chèque, virement ou en ligne sur www.payfip.gouv.fr", 14, finalY + 30);

            doc.setFont("helvetica", "normal");
            doc.text(`Page ${index + 1} / ${calculatedInvoices.length}`, 170, doc.internal.pageSize.getHeight() - 10);
        });

        doc.save(`LOT_FACTURES_INDIVIDUELLES_${startDate}_${endDate}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
            {/* EN-TÊTE FIXE */}
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Accueil</button>
                    <div className="flex items-center gap-2">
                        <Banknote className="text-car-blue" size={24}/>
                        <h1 className="font-black text-car-dark text-xl uppercase tracking-wider hidden sm:block">Facturation</h1>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setActiveTab('calc')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'calc' ? 'bg-white shadow-sm text-car-blue' : 'text-slate-400'}`}>
                        Édition & Historique
                    </button>
                    <button onClick={() => setActiveTab('alternance')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'alternance' ? 'bg-white shadow-sm text-car-purple' : 'text-slate-400'}`}>
                        Garde alternée
                    </button>
                </div>
            </div>

            {/* ONGLET 1 : CALCUL ET HISTORIQUE */}
            {activeTab === 'calc' && (
                <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Période du :</label>
                                <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Au :</label>
                                <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        {!hasExistingData ? (
                            <button onClick={() => triggerGeneration(false)} disabled={isCalculating} className="bg-car-blue text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-all flex items-center gap-2 w-full md:w-auto justify-center">
                                <Calculator size={20}/> {isCalculating ? 'Génération...' : 'Générer et Enregistrer'}
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                                <span className="bg-slate-100 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 border border-slate-200">
                                    <Check size={16}/> Facturation enregistrée
                                </span>
                                <button onClick={() => triggerGeneration(true)} disabled={isCalculating} className="bg-slate-100 text-slate-600 hover:text-car-pink hover:bg-red-50 font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all flex items-center gap-2 border border-slate-200 w-full sm:w-auto justify-center text-xs">
                                    <RefreshCcw size={16}/> Recalculer
                                </button>
                                {calculatedInvoices.some(inv => inv.status === 'draft') && (
                                    <button 
                                        onClick={publishInvoices}
                                        className="bg-car-green text-white hover:bg-green-600 px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 text-xs"
                                    >
                                        <Send size={16}/> Publier sur le Portail
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {calculatedInvoices.length > 0 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* EN-TÊTE FINANCIER DU RÔLE */}
                            <div className="bg-car-dark text-white p-8 rounded-[2rem] shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative overflow-hidden">
                                <div className="z-10">
                                    <h2 className="text-xs font-black tracking-widest uppercase opacity-60 mb-1">Total du rôle validé</h2>
                                    <p className="text-5xl font-black">{totalRecettesCommune} €</p>
                                    <span className="inline-block text-xs bg-white/20 px-3 py-1 rounded-lg font-bold mt-3 text-slate-200">Sur la base de {calculatedInvoices.length} factures générées</span>
                                </div>
                                
                                <div className="flex flex-wrap gap-3 z-10 w-full lg:w-auto">
                                    <button onClick={exportGeneralRecapPDF} className="bg-white/10 text-white border border-white/20 hover:bg-white hover:text-car-dark px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 flex-1 lg:flex-none justify-center">
                                        <FileSpreadsheet size={18}/> Rôle de recettes
                                    </button>
                                    <button onClick={exportAllInvoicesCombinedPDF} className="bg-white text-car-dark hover:bg-slate-100 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 flex-1 lg:flex-none justify-center shadow-md">
                                        <Layers size={18}/> Lot PDF complet
                                    </button>
                                    <button onClick={() => alert("Simulation d'exportation XML PES V2 gelée.")} className="bg-slate-700/50 text-slate-400 cursor-not-allowed px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 flex-1 lg:flex-none justify-center border border-slate-600/50">
                                        Export PES_V2
                                    </button>
                                </div>
                            </div>

                            {/* LISTE DES FACTURES ENREGISTRÉES */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-black text-car-dark text-lg">Factures enregistrées (Base de données)</h3>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {calculatedInvoices.map((inv, idx) => (
                                        <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-car-dark text-base">{inv.payeur}</span>
                                                    <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{inv.reference || 'BROUILLON'}</span>
                                                    {inv.status === 'published' && (
                                                        <span className="text-[10px] font-black tracking-widest text-car-green bg-car-green/10 px-2 py-1 rounded-md">PUBLIÉ</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5 mt-2">
                                                    {inv.items.map((item, iIdx) => (
                                                        <span key={iIdx} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md shadow-sm w-fit">
                                                            <strong className="text-car-dark">{item.childName || 'Enfant inconnu'}</strong> - {item.label} : <strong>x{item.count}</strong> ({item.total.toFixed(2)}€)
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-6 justify-between md:justify-end shrink-0">
                                                <span className="text-2xl font-black text-car-blue">{inv.totalGlobal.toFixed(2)} €</span>
                                                <button onClick={() => exportInvoicePDF(inv)} className="bg-slate-100 text-slate-700 hover:bg-car-dark hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm">
                                                    Télécharger
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ONTLET 2 : GARDE ALTERNÉE */}
            {activeTab === 'alternance' && (
                <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
                    <div className="relative">
                        <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                        <input type="text" className="w-full pl-14 p-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg" 
                            placeholder="Rechercher un enfant..." value={search} onChange={e => setSearch(e.target.value)} />
                        
                        {search.length >= 2 && (
                            <div className="bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto absolute w-full mt-2 z-30 border border-slate-100">
                                {filteredSearch.length > 0 ? (
                                    filteredSearch.map(child => (
                                        <div key={child._id} onClick={() => selectChild(child)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <span className="font-black text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-slate-400 italic">Aucun résultat...</div>
                                )}
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
                                                    <div className="font-bold text-car-purple flex items-center gap-2 mb-1">
                                                        <FolderHeart size={16}/> À facturer à : {b.billToFamily?.name || b.billTo || "Dossier inconnu"}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-medium">Appliqué sur {b.dates?.length || 0} date(s)</div>
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
                                    <div className="mb-4">
                                        <label className="text-xs font-bold text-slate-500 mb-2 block">Détourner la facturation sur :</label>
                                        <select className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark cursor-pointer" value={billToFamilyId} onChange={e => setBillToFamilyId(e.target.value)} required>
                                            <option value="">Sélectionner un dossier...</option>
                                            {selectedChild.families?.map(fam => (
                                                <option key={fam._id} value={fam._id}>Dossier : {fam.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium mb-4 flex-1">Sélectionnez les dates dans le calendrier à côté. Le prix sera calculé en fonction du QF du dossier sélectionné.</p>
                                    <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/20 hover:bg-black transition-all flex justify-center items-center gap-2"><Check size={20}/> APPLIQUER</button>
                                </form>
                                <InteractiveCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BillingManager;