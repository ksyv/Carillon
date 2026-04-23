import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tags, Save, Plus, Trash2, Check, AlertTriangle, GripVertical } from 'lucide-react';
import api from '../api';

const AdminTariffs = () => {
    const navigate = useNavigate();
    const [tariffs, setTariffs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    useEffect(() => {
        loadTariffs();
    }, []);

    const loadTariffs = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/tariffs');
            if (!Array.isArray(data)) throw new Error("Format invalide");

            if (data.length === 0) {
                setTariffs([
                    { _id: 'new_matin', activityCode: 'CA2_MATIN', name: 'APS Matin', pricingMode: 'TAUX_EFFORT', 
                      effortRates: [{childrenCount: 1, rate: 0.000827, min: 0.50, max: 3.50}], qfBrackets: [], fixedPrice: 0 },
                    { _id: 'new_midi', activityCode: 'CA1', name: 'Restauration (Cantine)', pricingMode: 'QF_BRACKETS', 
                      effortRates: [], qfBrackets: [{min: 0, max: 500, price: 0.85}], fixedPrice: 0 },
                    { _id: 'new_pai', activityCode: 'CA1_PAI', name: 'Restauration (PAI Alimentaire)', pricingMode: 'FIXED', 
                      effortRates: [], qfBrackets: [], fixedPrice: 0.85 },
                    { _id: 'new_soir', activityCode: 'CA2_SOIR', name: 'APS Soir (16h30-18h30)', pricingMode: 'TAUX_EFFORT', 
                      effortRates: [{childrenCount: 1, rate: 0.00164, min: 1.00, max: 6.00}], qfBrackets: [], fixedPrice: 0 },
                    { _id: 'new_supp', activityCode: 'CA2_SUPP', name: 'Supplément (18h30-19h)', pricingMode: 'TAUX_EFFORT', 
                      effortRates: [{childrenCount: 1, rate: 0.00035, min: 0.10, max: 1.35}], qfBrackets: [], fixedPrice: 0 }
                ]);
            } else {
                setTariffs(data);
            }
        } catch (error) {
            console.error("Erreur chargement tarifs", error);
        }
        setIsLoading(false);
    };

    const handleSave = async (tariff) => {
        try {
            if (tariff._id.startsWith('new_')) {
                const { _id, ...newTariff } = tariff;
                const res = await api.post('/tariffs', newTariff);
                setTariffs(tariffs.map(t => t._id === tariff._id ? res.data : t));
            } else {
                await api.put(`/tariffs/${tariff._id}`, tariff);
            }
            alert('Tarif sauvegardé avec succès !');
        } catch (e) {
            alert('Erreur lors de la sauvegarde. Vérifiez que le Code Trésor Public est unique.');
        }
    };

    const handleDelete = async (id, index) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette activité tarifaire ?")) return;
        
        if (!id.startsWith('new_')) {
            try {
                await api.delete(`/tariffs/${id}`);
            } catch (e) {
                alert("Erreur lors de la suppression.");
                return;
            }
        }
        const newTariffs = [...tariffs];
        newTariffs.splice(index, 1);
        setTariffs(newTariffs);
    };

    const addNewTariffActivity = () => {
        setTariffs([{
            _id: `new_${Date.now()}`, activityCode: `CODE_${Date.now().toString().slice(-4)}`, name: 'NOUVELLE ACTIVITÉ', 
            pricingMode: 'FIXED', effortRates: [], qfBrackets: [], fixedPrice: 0
        }, ...tariffs]);
    };

    const handleModeChange = (index, mode) => {
        const newTariffs = [...tariffs];
        newTariffs[index].pricingMode = mode;
        setTariffs(newTariffs);
    };

    const handleSort = async () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        
        let _tariffs = [...tariffs];
        const draggedItemContent = _tariffs.splice(dragItem.current, 1)[0];
        _tariffs.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;
        setTariffs(_tariffs);

        const orderedIds = _tariffs.filter(t => !t._id.startsWith('new_')).map(t => t._id);
        if (orderedIds.length > 0) {
            try {
                await api.post('/tariffs/reorder', { orderedIds });
            } catch (e) {
                console.error("Erreur de sauvegarde de l'ordre", e);
            }
        }
    };

    const updateField = (index, field, value) => {
        const newTariffs = [...tariffs];
        newTariffs[index][field] = value;
        setTariffs(newTariffs);
    };

    const addBracket = (index) => {
        const newTariffs = [...tariffs];
        newTariffs[index].qfBrackets.push({ min: '', max: '', price: '' });
        setTariffs(newTariffs);
    };
    const updateBracket = (tIndex, bIndex, field, value) => {
        const newTariffs = [...tariffs];
        newTariffs[tIndex].qfBrackets[bIndex][field] = value;
        setTariffs(newTariffs);
    };
    const removeBracket = (tIndex, bIndex) => {
        const newTariffs = [...tariffs];
        newTariffs[tIndex].qfBrackets.splice(bIndex, 1);
        setTariffs(newTariffs);
    };

    const addEffortRate = (index) => {
        const newTariffs = [...tariffs];
        const nextCount = newTariffs[index].effortRates.length + 1;
        newTariffs[index].effortRates.push({ childrenCount: nextCount, rate: '', min: '', max: '' });
        setTariffs(newTariffs);
    };
    const updateEffortRate = (tIndex, rIndex, field, value) => {
        const newTariffs = [...tariffs];
        newTariffs[tIndex].effortRates[rIndex][field] = value;
        setTariffs(newTariffs);
    };
    const removeEffortRate = (tIndex, rIndex) => {
        const newTariffs = [...tariffs];
        newTariffs[tIndex].effortRates.splice(rIndex, 1);
        setTariffs(newTariffs);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-6xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-500/10 p-4 rounded-2xl">
                            <Tags className="text-orange-500 w-8 h-8"/>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Grilles Tarifaires</h1>
                            <p className="text-slate-500 font-medium mt-1">Configuration du moteur de facturation Trésor Public</p>
                        </div>
                    </div>
                    <button onClick={addNewTariffActivity} className="bg-white border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all">
                        <Plus size={20}/> Nouvelle Activité
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-500"></div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {tariffs.map((tariff, index) => (
                            <div 
                                key={tariff._id} 
                                draggable
                                onDragStart={(e) => (dragItem.current = index)}
                                onDragEnter={(e) => (dragOverItem.current = index)}
                                onDragEnd={handleSort}
                                onDragOver={(e) => e.preventDefault()}
                                className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group/card transition-all"
                            >
                                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>

                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-100 pb-6 gap-4 pl-4">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="text-slate-300 cursor-grab active:cursor-grabbing">
                                            <GripVertical size={24} />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <input type="text" className="text-2xl font-black text-car-dark uppercase outline-none border-b-2 border-transparent hover:border-slate-200 focus:border-orange-500 transition-colors bg-transparent w-full max-w-sm" 
                                                value={tariff.name} onChange={e => updateField(index, 'name', e.target.value)} placeholder="Nom de l'activité..." />
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Code Trésor Public :</span>
                                                <input type="text" className="text-xs font-black text-car-dark bg-slate-100 px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-orange-500/50 uppercase" 
                                                    value={tariff.activityCode} onChange={e => updateField(index, 'activityCode', e.target.value.toUpperCase())} placeholder="EX: CA1" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 flex-1 md:flex-none">
                                            <button onClick={() => handleModeChange(index, 'TAUX_EFFORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 ${tariff.pricingMode === 'TAUX_EFFORT' ? 'bg-white shadow-sm text-orange-500' : 'text-slate-400 hover:text-car-dark'}`}>Taux d'effort</button>
                                            <button onClick={() => handleModeChange(index, 'QF_BRACKETS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 ${tariff.pricingMode === 'QF_BRACKETS' ? 'bg-white shadow-sm text-car-teal' : 'text-slate-400 hover:text-car-dark'}`}>Tranches QF</button>
                                            <button onClick={() => handleModeChange(index, 'FIXED')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 ${tariff.pricingMode === 'FIXED' ? 'bg-white shadow-sm text-car-blue' : 'text-slate-400 hover:text-car-dark'}`}>Fixe</button>
                                        </div>
                                        <button onClick={() => handleDelete(tariff._id, index)} className="text-slate-300 hover:text-car-pink bg-slate-50 p-3 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>

                                <div className="mb-6 flex-1 pl-10">
                                    {tariff.pricingMode === 'TAUX_EFFORT' && (
                                        <div className="bg-orange-500/5 border border-orange-500/20 p-6 rounded-2xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-black text-orange-500 tracking-widest uppercase">Calcul (QF × Taux) et Dégressivité</h3>
                                                <button onClick={() => addEffortRate(index)} className="text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-xl flex items-center gap-1 transition-colors"><Plus size={16}/> AJOUTER UN TAUX</button>
                                            </div>
                                            <div className="space-y-3">
                                                {tariff.effortRates?.map((rate, rIdx) => (
                                                    <div key={rIdx} className="grid grid-cols-1 lg:grid-cols-5 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm items-center">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-500 text-sm">Pour</span>
                                                            <input type="number" className="w-16 bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none font-black text-car-dark text-center" 
                                                                value={rate.childrenCount} onChange={e => updateEffortRate(index, rIdx, 'childrenCount', e.target.value)} />
                                                            <span className="font-bold text-slate-500 text-sm">enfant(s)</span>
                                                        </div>
                                                        <div className="lg:col-span-2">
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Taux (ex: 0.000827)</label>
                                                            <input type="number" step="0.000001" className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none focus:border-orange-500 font-black text-car-dark" 
                                                                value={rate.rate} onChange={e => updateEffortRate(index, rIdx, 'rate', e.target.value)} />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Mini (€)</label>
                                                            <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none focus:border-orange-500 font-bold text-car-dark" 
                                                                value={rate.min} onChange={e => updateEffortRate(index, rIdx, 'min', e.target.value)} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">Maxi (€)</label>
                                                                <input type="number" step="0.01" className="w-full bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none focus:border-orange-500 font-bold text-car-dark" 
                                                                    value={rate.max} onChange={e => updateEffortRate(index, rIdx, 'max', e.target.value)} />
                                                            </div>
                                                            <button onClick={() => removeEffortRate(index, rIdx)} className="mt-4 p-2 text-slate-300 hover:text-car-pink transition-colors"><Trash2 size={18}/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tariff.pricingMode === 'QF_BRACKETS' && (
                                        <div className="bg-car-teal/5 border border-car-teal/20 p-6 rounded-2xl">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-sm font-black text-car-teal tracking-widest uppercase">Paliers de facturation</h3>
                                                <button onClick={() => addBracket(index)} className="text-xs font-bold text-white bg-car-teal hover:bg-teal-600 px-4 py-2 rounded-xl flex items-center gap-1 transition-colors"><Plus size={16}/> AJOUTER TRANCHE</button>
                                            </div>
                                            <div className="space-y-3">
                                                {tariff.qfBrackets.map((bracket, bIdx) => (
                                                    <div key={bIdx} className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                                        <span className="font-black text-slate-400 w-24 uppercase text-xs tracking-widest">Tranche {bIdx + 1}</span>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <span className="text-xs font-bold text-slate-400">QF de</span>
                                                            <input type="number" className="w-24 bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none font-bold text-car-dark text-center" value={bracket.min} onChange={e => updateBracket(index, bIdx, 'min', e.target.value)} placeholder="0" />
                                                            <span className="text-xs font-bold text-slate-400">à</span>
                                                            <input type="number" className="w-24 bg-slate-50 border border-slate-100 p-2 rounded-lg outline-none font-bold text-car-dark text-center" value={bracket.max} onChange={e => updateBracket(index, bIdx, 'max', e.target.value)} placeholder="500" />
                                                        </div>
                                                        <span className="font-black text-slate-300">=</span>
                                                        <div className="relative">
                                                            <input type="number" step="0.01" className="w-32 bg-car-teal/10 border-none p-3 pl-8 rounded-lg outline-none font-black text-car-teal text-lg" value={bracket.price} onChange={e => updateBracket(index, bIdx, 'price', e.target.value)} placeholder="0.85" />
                                                            <span className="absolute left-3 top-3 font-black text-car-teal">€</span>
                                                        </div>
                                                        <button onClick={() => removeBracket(index, bIdx)} className="p-3 text-slate-300 hover:text-car-pink hover:bg-car-pink/10 rounded-lg transition-colors"><Trash2 size={20}/></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {tariff.pricingMode === 'FIXED' && (
                                        <div className="bg-car-blue/5 border border-car-blue/20 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-6">
                                            <div>
                                                <h3 className="text-sm font-black text-car-blue tracking-widest uppercase mb-1">Prix Unique</h3>
                                                <p className="text-xs font-medium text-slate-500">Ce tarif sera appliqué sans tenir compte du QF de la famille.</p>
                                            </div>
                                            <div className="relative sm:ml-auto">
                                                <input type="number" step="0.01" className="w-full sm:w-48 bg-white border border-car-blue/30 p-4 pl-10 rounded-xl outline-none focus:border-car-blue font-black text-car-blue text-2xl text-center shadow-sm" 
                                                    value={tariff.fixedPrice ?? ''} onChange={e => updateField(index, 'fixedPrice', e.target.value)} placeholder="0.00" />
                                                <span className="absolute left-4 top-4 font-black text-car-blue text-xl">€</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-4 border-t border-slate-100 pr-4">
                                    <button onClick={() => handleSave(tariff)} className="bg-car-dark text-white px-8 py-3 rounded-xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20">
                                        <Check size={20}/> ENREGISTRER L'ACTIVITÉ
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTariffs;