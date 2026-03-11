import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';

const EmergencyModal = ({ attendance, allChildren, sessionType, onClose, access }) => {
    const isMidi = sessionType === 'MIDI';
    
    const [categoryFilter, setCategoryFilter] = useState(access === 'Tous' ? 'Tous' : access);

    let presentRecords = [];
    
    if (isMidi) {
        const absentIds = attendance.map(a => a.child._id);
        presentRecords = allChildren
            .filter(c => !absentIds.includes(c._id))
            .map(c => ({ _id: c._id, child: c })); 
    } else {
        presentRecords = attendance.filter(a => !a.checkOut);
    }

    const filteredRecords = presentRecords.filter(record => 
        categoryFilter === 'Tous' || record.child.category === categoryFilter
    );

    const displayChildren = filteredRecords.sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));
    const [safeChildren, setSafeChildren] = useState(new Set());

    const toggleSafe = (id) => {
        const newSafe = new Set(safeChildren);
        if (newSafe.has(id)) newSafe.delete(id);
        else newSafe.add(id);
        setSafeChildren(newSafe);
    };

    const currentSafeCount = displayChildren.filter(r => safeChildren.has(r._id)).length;
    const currentTotalCount = displayChildren.length;

    return (
        <div className="fixed inset-0 bg-car-pink/95 backdrop-blur-md z-[100] flex flex-col">
            <div className="bg-white p-4 sm:p-6 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-car-pink flex items-center gap-3">
                        <AlertTriangle size={32} /> ÉVACUATION
                    </h2>
                    <p className="text-slate-500 font-bold mt-1 text-sm sm:text-base">
                        {isMidi ? "Midi : Affiche tous les enfants sauf ceux marqués absents." : "Cochez les enfants en sécurité."}
                    </p>
                </div>

                {access === 'Tous' && (
                    <div className="flex bg-slate-100 rounded-xl p-1 items-center w-full sm:w-auto justify-center flex-shrink-0">
                        <button onClick={() => setCategoryFilter('Tous')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Tous' ? 'bg-white text-car-dark shadow-sm' : 'text-slate-500 hover:text-car-dark'}`}>Tous</button>
                        <button onClick={() => setCategoryFilter('Maternelle')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Maternelle' ? 'bg-car-yellow text-white shadow-sm' : 'text-slate-500 hover:text-car-yellow'}`}>Mat.</button>
                        <button onClick={() => setCategoryFilter('Élémentaire')} className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${categoryFilter === 'Élémentaire' ? 'bg-car-blue text-white shadow-sm' : 'text-slate-500 hover:text-car-blue'}`}>Élém.</button>
                    </div>
                )}

                <button onClick={onClose} className="w-full sm:w-auto bg-slate-100 text-slate-500 hover:bg-slate-200 p-3 sm:p-4 rounded-2xl font-black transition-colors">
                    FERMER
                </button>
            </div>
            
            <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl mb-6 flex justify-between items-center">
                        <span className="text-lg sm:text-xl font-black text-car-dark">
                            En sécurité {categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''} :
                        </span>
                        <span className={`text-2xl sm:text-3xl font-black px-4 sm:px-6 py-2 rounded-2xl ${currentSafeCount === currentTotalCount && currentTotalCount > 0 ? 'bg-car-green text-white animate-pulse' : 'bg-car-pink/20 text-car-pink'}`}>
                            {currentSafeCount} / {currentTotalCount}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                            <div className="col-span-1 sm:col-span-2 text-center text-slate-400 font-bold p-8 bg-white/50 rounded-3xl">
                                Aucun enfant dans cette catégorie actuellement.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyModal;