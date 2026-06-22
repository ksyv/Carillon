import React from 'react';
import { Banknote } from 'lucide-react';

const TabFactures = () => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-2 w-2 rounded-full bg-car-dark"></div>
                <h3 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Mes Factures</h3>
            </div>
            
            {/* C'est ici que nous coderons l'historique et les PDF */}
            <div className="bg-slate-100/50 rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Banknote size={64} className="text-slate-300 mb-4" />
                <h4 className="font-black text-slate-400 text-xl mb-2">Espace Facturation</h4>
                <p className="text-sm text-slate-400 max-w-sm">Prêt pour l'implémentation du système de suivi des règlements et historiques de la régie.</p>
            </div>
        </div>
    );
};

export default TabFactures;