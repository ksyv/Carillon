import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Banknote, Search, Users, Trash2, Check } from 'lucide-react';
import InteractiveCalendar from '../components/InteractiveCalendar';

const API_URL = '/api';

const BillingManager = () => {
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [billings, setBillings] = useState([]);
    
    const [billTo, setBillTo] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    const navigate = useNavigate();

    useEffect(() => { axios.get(`${API_URL}/children`).then(res => setChildren(res.data)); }, []);

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase()));
    }, [children, search]);

    const selectChild = async (child) => {
        setSelectedChild(child); setSearch(''); loadBillings(child._id);
    };

    const loadBillings = async (childId) => {
        const { data } = await axios.get(`${API_URL}/billing/child/${childId}`);
        setBillings(data);
    };

    const handleAddBilling = async (e) => {
        e.preventDefault();
        if(selectedDates.length === 0) return alert("Veuillez sélectionner au moins une date.");
        await axios.post(`${API_URL}/billing`, { childId: selectedChild._id, billTo, dates: selectedDates });
        setBillTo(''); setSelectedDates([]); loadBillings(selectedChild._id);
    };

    const handleDeleteBilling = async (id) => {
        if(window.confirm("Supprimer cette règle de facturation ?")) {
            await axios.delete(`${API_URL}/billing/${id}`);
            loadBillings(selectedChild._id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Retour</button>
                <div className="flex items-center gap-2"><Banknote className="text-car-blue"/><h1 className="font-black text-car-dark text-xl">Facturation Alternée</h1></div>
            </div>

            <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                    <input type="text" className="w-full pl-14 p-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg" placeholder="Rechercher un enfant..." value={search} onChange={e => setSearch(e.target.value)} />
                    {search.length >= 2 && (
                        <div className="bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto absolute w-full mt-2 z-30 border border-slate-100">
                            {filteredSearch.map(child => (
                                <div key={child._id} onClick={() => selectChild(child)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <span className="font-black text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                </div>
                            ))}
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
                                                <div className="text-xs text-slate-500 font-medium">Appliqué sur {b.dates.length} date(s)</div>
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
                                <input type="text" className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-blue/20 outline-none font-bold text-car-dark mb-4" placeholder="Nom à facturer (Ex: Maman, Papa...)" value={billTo} onChange={e => setBillTo(e.target.value)} required />
                                <p className="text-xs text-slate-400 font-medium mb-4 flex-1">Sélectionnez les dates dans le calendrier à côté. Cette mention apparaîtra dans le rapport pour l'aide à la facturation.</p>
                                <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/20 hover:bg-black transition-all flex justify-center items-center gap-2"><Check size={20}/> APPLIQUER</button>
                            </form>
                            <InteractiveCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingManager;