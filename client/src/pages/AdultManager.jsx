import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Coffee, Plus, CheckCircle, XCircle, X, Users, Search } from 'lucide-react';

const AdultManager = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [adults, setAdults] = useState([]);
    const [families, setFamilies] = useState([]);
    const [attendances, setAttendances] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [showAddModal, setShowAddModal] = useState(false);
    const [newAdult, setNewAdult] = useState({ firstName: '', lastName: '', familyId: '' });

    useEffect(() => {
        loadData();
    }, [date]);

    const loadData = async () => {
        try {
            // On charge les enfants de catégorie "Adulte", les familles, et les présences du jour
            const [childrenRes, famRes, attRes] = await Promise.all([
                api.get('/children'),
                api.get('/families'),
                api.get(`/attendance?date=${date}&sessionType=MIDI_ADULTE`)
            ]);
            
            setAdults(childrenRes.data.filter(c => c.category === 'Adulte' && c.active !== false));
            setFamilies(famRes.data);
            setAttendances(attRes.data);
        } catch (e) {
            console.error("Erreur de chargement", e);
        }
    };

    // Toggle présence (Si présent -> on supprime, si absent -> on crée)
    const toggleAttendance = async (adultId) => {
        const existingAtt = attendances.find(a => a.child._id === adultId || a.child === adultId);
        try {
            if (existingAtt) {
                await api.delete(`/attendance/${existingAtt._id}`);
            } else {
                await api.post('/attendance/checkin', {
                    childId: adultId,
                    date: date,
                    sessionType: 'MIDI_ADULTE'
                });
            }
            loadData(); // On recharge pour rafraîchir l'interface
        } catch (e) {
            alert("Erreur lors du pointage.");
        }
    };

    const handleCreateAdult = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                firstName: newAdult.firstName,
                lastName: newAdult.lastName.toUpperCase(),
                category: 'Adulte',
                families: [newAdult.familyId], // On le rattache au dossier famille pour la facturation
                active: true,
                regimeAlimentaire: 'Standard'
            };
            await api.post('/children', payload);
            setShowAddModal(false);
            setNewAdult({ firstName: '', lastName: '', familyId: '' });
            loadData();
        } catch (e) {
            alert("Erreur lors de la création.");
        }
    };

    const filteredAdults = adults.filter(a => 
        a.lastName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.firstName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative pb-24">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-orange-500/10 p-4 rounded-2xl"><Coffee className="text-orange-500 w-8 h-8"/></div>
                        <div>
                            <h1 className="text-3xl font-black text-car-dark">Repas Adultes</h1>
                            <p className="text-slate-500 font-medium">Pointage facturable du personnel</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 items-center w-full md:w-auto">
                        <input 
                            type="date" 
                            className="bg-white border border-slate-200 p-3 rounded-xl outline-none font-bold text-car-dark" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                        />
                        <button onClick={() => setShowAddModal(true)} className="bg-car-dark text-white px-5 py-3 rounded-xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20 text-xs">
                            <Plus size={18}/> AJOUTER
                        </button>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-6 flex items-center gap-4">
                    <Search className="text-slate-400 ml-2" size={20} />
                    <input type="text" className="bg-transparent border-none outline-none font-bold text-car-dark placeholder:text-slate-300 w-full text-sm" placeholder="Rechercher un enseignant..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAdults.map(adult => {
                        const isPresent = attendances.some(a => a.child._id === adult._id || a.child === adult._id);
                        return (
                            <div 
                                key={adult._id} 
                                onClick={() => toggleAttendance(adult._id)}
                                className={`cursor-pointer border-2 p-6 rounded-3xl transition-all flex flex-col items-center justify-center text-center gap-4 group hover:-translate-y-1 ${isPresent ? 'bg-orange-500/5 border-orange-500 shadow-md' : 'bg-white border-slate-100 shadow-sm hover:border-slate-300'}`}
                            >
                                <div className={`p-4 rounded-full transition-colors ${isPresent ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-300 group-hover:text-slate-400'}`}>
                                    {isPresent ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-car-dark text-lg uppercase">{adult.lastName}</h3>
                                    <p className="font-bold text-slate-500 capitalize">{adult.firstName}</p>
                                </div>
                                <span className={`text-[10px] font-black tracking-widest px-3 py-1 rounded-md ${isPresent ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    {isPresent ? 'A MANGÉ' : 'ABSENT'}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {filteredAdults.length === 0 && (
                    <div className="text-center p-10 text-slate-400 font-bold">Aucun adulte trouvé.</div>
                )}
            </div>

            {/* MODALE D'AJOUT */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleCreateAdult} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-dark flex items-center gap-2"><Users size={24}/> Nouveau convive</h3>
                            <button type="button" onClick={() => setShowAddModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink" aria-label="Fermer la fenêtre"><X size={24} aria-hidden="true"/></button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <p className="text-xs text-slate-500 font-medium mb-4">Pour que les repas de cet adulte puissent être facturés, vous devez d'abord créer son Dossier Famille dans l'onglet "Familles".</p>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Nom</label>
                                <input type="text" required className="w-full bg-slate-50 p-3 rounded-xl font-black uppercase text-car-dark outline-none border border-slate-200 focus:border-orange-500" value={newAdult.lastName} onChange={e => setNewAdult({...newAdult, lastName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Prénom</label>
                                <input type="text" required className="w-full bg-slate-50 p-3 rounded-xl font-bold capitalize text-car-dark outline-none border border-slate-200 focus:border-orange-500" value={newAdult.firstName} onChange={e => setNewAdult({...newAdult, firstName: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Dossier de Facturation (Famille)</label>
                                <select required className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200" value={newAdult.familyId} onChange={e => setNewAdult({...newAdult, familyId: e.target.value})}>
                                    <option value="">-- Sélectionner un dossier --</option>
                                    {families.map(f => (
                                        <option key={f._id} value={f._id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-orange-500 text-white font-black p-4 rounded-2xl hover:bg-orange-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                            <Plus size={20}/> Enregistrer l'adulte
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdultManager;