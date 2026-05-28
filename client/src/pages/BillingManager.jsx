import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Banknote, Search, Users, Trash2, Check, Calculator, FileSpreadsheet, Layers, ShieldCheck } from 'lucide-react';
import InteractiveCalendar from '../components/InteractiveCalendar';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const BillingManager = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('calc'); // 'calc' ou 'alternance'

    // States Onglet Alternance (Ton Code)
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [billings, setBillings] = useState([]);
    const [billTo, setBillTo] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    // States Onglet Calcul Moteur
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [calculatedInvoices, setCalculatedInvoices] = useState([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => { 
        api.get(`/children`)
           .then(res => setChildren(Array.isArray(res.data) ? res.data : []))
           .catch(() => setChildren([]));
    }, []);

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
        } catch (e) { setBillings([]); }
    };

    const handleAddBilling = async (e) => {
        e.preventDefault();
        if(selectedDates.length === 0) return alert("Veuillez sélectionner des dates.");
        try {
            await api.post(`/billing`, { childId: selectedChild._id, billTo, dates: selectedDates });
            setBillTo(''); setSelectedDates([]); loadBillings(selectedChild._id);
        } catch (e) { alert("Erreur enregistrement."); }
    };

    const handleDeleteBilling = async (id) => {
        if(window.confirm("Supprimer cette règle ?")) {
            try { await api.delete(`/billing/${id}`); loadBillings(selectedChild._id); } catch (e) { alert("Erreur."); }
        }
    };

    // Lancement du calcul automatique
    const triggerCalculation = async () => {
        setIsCalculating(true);
        try {
            const { data } = await api.get(`/billing/calculate?startDate=${startDate}&endDate=${endDate}`);
            setCalculatedInvoices(data);
        } catch (e) {
            alert("Erreur lors du calcul mensuel.");
        }
        setIsCalculating(false);
    };

    const totalRecettesCommune = useMemo(() => {
        return calculatedInvoices.reduce((sum, inv) => sum + inv.totalGlobal, 0).toFixed(2);
    }, [calculatedInvoices]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
            {/* EN-TÊTE FIXE */}
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Accueil</button>
                    <div className="flex items-center gap-2">
                        <Banknote className="text-car-blue" size={24}/>
                        <h1 className="font-black text-car-dark text-xl uppercase tracking-wider">Gestionnaire de Facturation</h1>
                    </div>
                </div>

                {/* SÉLECTEUR D'ONGLETS SQUELETTE CARILLON */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setActiveTab('calc')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'calc' ? 'bg-white shadow-sm text-car-blue' : 'text-slate-400'}`}>
                        Calculer un mois
                    </button>
                    <button onClick={() => setActiveTab('alternance')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'alternance' ? 'bg-white shadow-sm text-car-purple' : 'text-slate-400'}`}>
                        Garde alternée
                    </button>
                </div>
            </div>

            {/* CONTENU ONGLET 1 : MOTEUR DE CALCUL */}
            {activeTab === 'calc' && (
                <div className="max-w-6xl mx-auto w-full p-4 md:p-8 space-y-6">
                    {/* FILTRE DE DATE */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Du :</label>
                                <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Au :</label>
                                <input type="date" className="bg-slate-50 p-3 rounded-xl outline-none font-black text-car-dark text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        <button onClick={triggerCalculation} disabled={isCalculating} className="bg-car-blue text-white font-black uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-car-blue/20 hover:bg-blue-600 transition-all flex items-center gap-2">
                            <Calculator size={20}/> {isCalculating ? 'Calcul en cours...' : 'Lancer le calcul'}
                        </button>
                    </div>

                    {calculatedInvoices.length > 0 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* RAPPORTS FINANCIERS RAPIDES */}
                            <div className="bg-car-dark text-white p-8 rounded-[2rem] shadow-xl flex justify-between items-center relative overflow-hidden">
                                <div className="z-10">
                                    <h2 className="text-xs font-black tracking-widest uppercase opacity-60 mb-1">Total des titres émis</h2>
                                    <p className="text-5xl font-black">{totalRecettesCommune} €</p>
                                    <span className="inline-block text-xs bg-white/20 px-3 py-1 rounded-lg font-bold mt-3 text-slate-200">Sur la base de {calculatedInvoices.length} payeurs uniques</span>
                                </div>
                                <div className="flex gap-4 z-10">
                                    <button onClick={() => alert('Étape suivante : Génération du flux XML PES V2 en cours de développement...')} className="bg-white text-car-dark px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-md flex items-center gap-2">
                                        <FileSpreadsheet size={18}/> 1. Export PES_V2 (DGFIP)
                                    </button>
                                </div>
                            </div>

                            {/* LISTE DES FACTURES GÉNÉRÉES */}
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                                    <Layers className="text-slate-400" size={20}/>
                                    <h3 className="font-black text-car-dark text-lg">Prévisualisation des rôles de recettes</h3>
                                </div>
                                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                    {calculatedInvoices.map((inv, idx) => (
                                        <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div className="space-y-2">
                                                <h4 className="font-black text-car-dark text-base">{inv.payeur}</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {inv.items.map((item, iIdx) => (
                                                        <span key={iIdx} className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-md">
                                                            {item.label} : x{item.count} ({item.unitPrice.toFixed(2)}€)
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-car-blue">{inv.totalGlobal.toFixed(2)} €</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CONTENU ONGLET 2 : GARDE ALTERNÉE (TON CODE SÉCURISÉ) */}
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
                                                    <div className="font-bold text-car-blue mb-1">À facturer à : {b.billTo}</div>
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
                                    <input type="text" className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark mb-4" 
                                        placeholder="Nom à facturer (Ex: Maman, Papa...)" value={billTo} onChange={e => setBillTo(e.target.value)} required />
                                    <p className="text-xs text-slate-400 font-medium mb-4 flex-1">Sélectionnez les dates dans le calendrier à côté. Cette mention sera prise en compte lors du calcul global mensuel.</p>
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