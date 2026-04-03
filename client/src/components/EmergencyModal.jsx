import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, Search, X, Users, RefreshCw } from 'lucide-react';
import api from '../api';

const EmergencyModal = ({ attendance, allChildren, sessionType, onClose, access }) => {
    const isMidi = sessionType === 'MIDI';
    // L'évacuation concerne toujours la date du jour
    const today = new Date().toISOString().split('T')[0]; 
    
    const [categoryFilter, setCategoryFilter] = useState(access === 'Tous' ? 'Tous' : access);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyMissing, setShowOnlyMissing] = useState(false);
    const [safeChildren, setSafeChildren] = useState(new Set());
    const [isSyncing, setIsSyncing] = useState(false);

    // --- SYNCHRONISATION TEMPS RÉEL (POLLING) ---
    useEffect(() => {
        const fetchEvacuationState = async () => {
            try {
                const { data } = await api.get(`/evacuation?date=${today}&sessionType=${sessionType}`);
                if (data && data.safeChildren) {
                    setSafeChildren(new Set(data.safeChildren));
                }
            } catch (error) {
                console.error("Erreur de synchronisation", error);
            }
        };

        // On charge tout de suite à l'ouverture
        fetchEvacuationState();

        // Puis on rafraîchit en silence toutes les 2 secondes
        const interval = setInterval(fetchEvacuationState, 2000);
        
        // On coupe le chrono quand on ferme la fenêtre
        return () => clearInterval(interval);
    }, [today, sessionType]);

    // --- GESTION DES CLICS ---
    const toggleSafe = async (id) => {
        setIsSyncing(true);
        const newSafe = new Set(safeChildren);
        const isNowSafe = !newSafe.has(id);
        
        // 1. Mise à jour "Optimiste" immédiate sur l'écran pour la fluidité
        if (isNowSafe) {
            newSafe.add(id);
            setSearchTerm(''); // Auto-nettoyage de la recherche
        } else {
            newSafe.delete(id);
        }
        setSafeChildren(newSafe);
        
        // 2. Envoi silencieux au serveur
        try {
            await api.post('/evacuation/toggle', { date: today, sessionType, childId: id });
        } catch (error) {
            console.error("Erreur d'enregistrement", error);
        }
        setIsSyncing(false);
    };

    const handleReset = async () => {
        if(window.confirm("Voulez-vous clôturer cette alerte et remettre tous les compteurs à zéro ?")) {
            await api.post('/evacuation/clear', { date: today, sessionType });
            setSafeChildren(new Set());
        }
    };

    // --- FILTRAGES ---
    let presentRecords = [];
    if (isMidi) {
        const absentIds = attendance.map(a => a.child._id);
        presentRecords = allChildren
            .filter(c => !absentIds.includes(c._id))
            .map(c => ({ _id: c._id, child: c })); 
    } else {
        presentRecords = attendance.filter(a => !a.checkOut);
    }

    const filteredRecords = presentRecords.filter(record => {
        const matchCategory = categoryFilter === 'Tous' || record.child.category === categoryFilter;
        const matchMissing = showOnlyMissing ? !safeChildren.has(record._id) : true;
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = searchTerm === '' || 
                            record.child.lastName.toLowerCase().includes(searchLower) || 
                            record.child.firstName.toLowerCase().includes(searchLower);
        
        return matchCategory && matchMissing && matchSearch;
    });

    const displayChildren = filteredRecords.sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));

    const totalInCategory = presentRecords.filter(r => categoryFilter === 'Tous' || r.child.category === categoryFilter);
    const currentSafeCount = totalInCategory.filter(r => safeChildren.has(r._id)).length;
    const currentTotalCount = totalInCategory.length;

    return (
        <div className="fixed inset-0 bg-car-pink/95 backdrop-blur-md z-[100] flex flex-col">
            <div className="bg-white shadow-md flex flex-col sticky top-0 z-10">
                {/* EN-TÊTE */}
                <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-car-pink flex items-center gap-3">
                            <AlertTriangle size={32} /> ÉVACUATION
                            {isSyncing && <RefreshCw size={16} className="text-slate-300 animate-spin" />}
                        </h2>
                        <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">
                            {isMidi ? "Midi : Cochez les enfants mis en sécurité." : "Cochez les enfants mis en sécurité."}
                        </p>
                    </div>

                    {access === 'Tous' && (
                        <div className="flex bg-slate-100 rounded-xl p-1 items-center w-full sm:w-auto justify-center flex-shrink-0">
                            <button onClick={() => setCategoryFilter('Tous')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Tous' ? 'bg-white text-car-dark shadow-sm' : 'text-slate-500 hover:text-car-dark'}`}>Tous</button>
                            <button onClick={() => setCategoryFilter('Maternelle')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Maternelle' ? 'bg-car-yellow text-white shadow-sm' : 'text-slate-500 hover:text-car-yellow'}`}>Mat.</button>
                            <button onClick={() => setCategoryFilter('Élémentaire')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Élémentaire' ? 'bg-car-blue text-white shadow-sm' : 'text-slate-500 hover:text-car-blue'}`}>Élém.</button>
                        </div>
                    )}

                    <div className="flex w-full sm:w-auto gap-2">
                        {['admin', 'responsable'].includes(localStorage.getItem('role')) && (
                            <button onClick={handleReset} className="flex-1 sm:flex-none bg-slate-100 text-car-pink hover:bg-car-pink hover:text-white p-3 sm:p-4 rounded-2xl font-black transition-colors">
                                FIN D'ALERTE
                            </button>
                        )}
                        <button onClick={onClose} className="flex-1 sm:flex-none bg-slate-100 text-slate-500 hover:bg-slate-200 p-3 sm:p-4 rounded-2xl font-black transition-colors">
                            FERMER
                        </button>
                    </div>
                </div>

                {/* BARRE DE RECHERCHE D'URGENCE */}
                <div className="px-4 pb-4 sm:px-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-car-pink" size={24}/>
                        <input 
                            type="text" 
                            className="w-full pl-12 pr-12 p-4 bg-car-pink/10 border-2 border-car-pink/30 rounded-2xl outline-none font-black text-car-dark placeholder:text-car-pink/50 focus:border-car-pink focus:bg-white transition-all text-lg uppercase"
                            placeholder="TAPER LE NOM OU PRÉNOM..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-1 rounded-full text-car-pink hover:bg-car-pink hover:text-white transition-colors">
                                <X size={20}/>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    
                    {/* PANNEAU DES COMPTEURS */}
                    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <span className="text-lg sm:text-xl font-black text-car-dark text-center sm:text-left">
                                En sécurité {categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''} :
                            </span>
                            <span className={`text-2xl sm:text-3xl font-black px-6 py-2 rounded-2xl ${currentSafeCount === currentTotalCount && currentTotalCount > 0 ? 'bg-car-green text-white animate-pulse' : 'bg-car-pink/20 text-car-pink'}`}>
                                {currentSafeCount} / {currentTotalCount}
                            </span>
                        </div>
                        
                        <button 
                            onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                            className={`w-full sm:w-auto px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${showOnlyMissing ? 'bg-car-dark text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                            <Users size={18} />
                            {showOnlyMissing ? "Afficher tous les enfants" : "Voir uniquement les manquants"}
                        </button>
                    </div>

                    {/* LISTE DES ENFANTS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-20">
                        {displayChildren.map(record => {
                            const isSafe = safeChildren.has(record._id);
                            return (
                                <div key={record._id} onClick={() => toggleSafe(record._id)} 
                                    className={`p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-between items-center ${isSafe ? 'bg-car-green/10 border-car-green text-car-green shadow-inner' : 'bg-white border-transparent shadow-lg text-car-dark'}`}>
                                    <div>
                                        <span className={`font-black text-lg sm:text-xl block ${isSafe ? 'line-through opacity-50' : ''}`}>{record.child.lastName} <span className="font-medium">{record.child.firstName}</span></span>
                                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">{record.child.category}</span>
                                    </div>
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border-2 ${isSafe ? 'bg-car-green border-car-green text-white' : 'border-slate-200 text-transparent'}`}>
                                        <Check strokeWidth={4} />
                                    </div>
                                </div>
                            );
                        })}

                        {displayChildren.length === 0 && (
                            <div className="col-span-1 sm:col-span-2 text-center text-slate-600 font-bold p-8 bg-white/80 rounded-3xl backdrop-blur-sm">
                                {searchTerm ? "Aucun enfant ne correspond à cette recherche." : "Aucun enfant à afficher."}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyModal;