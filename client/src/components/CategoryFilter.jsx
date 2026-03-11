import React from 'react';
import { Filter } from 'lucide-react';

const CategoryFilter = ({ value, onChange, access }) => {
    if (access !== 'Tous') return null;
    return (
        <div className="flex bg-slate-100 rounded-xl p-1 items-center">
            <Filter size={16} className="text-slate-400 mx-2" />
            <button onClick={() => onChange('Tous')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Tous' ? 'bg-white text-car-dark shadow-sm' : 'text-slate-500 hover:text-car-dark'}`}>Tous</button>
            <button onClick={() => onChange('Maternelle')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Maternelle' ? 'bg-car-yellow text-white shadow-sm' : 'text-slate-500 hover:text-car-yellow'}`}>Mat.</button>
            <button onClick={() => onChange('Élémentaire')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${value === 'Élémentaire' ? 'bg-car-blue text-white shadow-sm' : 'text-slate-500 hover:text-car-blue'}`}>Élém.</button>
        </div>
    );
};

export default CategoryFilter;