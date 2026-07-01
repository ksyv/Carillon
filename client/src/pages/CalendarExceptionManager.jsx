import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarX, ChevronLeft, ChevronRight, Plus, Trash2, Check, CalendarDays } from 'lucide-react';
import api from '../api';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWeekend, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const CalendarExceptionManager = () => {
    const navigate = useNavigate();
    const [closedDates, setClosedDates] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    // States pour le formulaire de plage (Vacances)
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    useEffect(() => {
        loadClosedDays();
    }, []);

    const loadClosedDays = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/settings/closed-days');
            setClosedDates(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Erreur chargement jours de fermeture", e);
        }
        setIsLoading(false);
    };

    const handleSaveDates = async (newDatesList) => {
        try {
            // Tri des dates pour que ce soit propre en BDD
            const sortedDates = [...new Set(newDatesList)].sort();
            await api.post('/settings/closed-days', { dates: sortedDates });
            setClosedDates(sortedDates);
        } catch (e) {
            alert("Erreur lors de la sauvegarde du calendrier.");
        }
    };

    // Toggle d'un jour unique au clic dans le calendrier
    const handleDayClick = (dateStr) => {
        let updated = [...closedDates];
        if (updated.includes(dateStr)) {
            updated = updated.filter(d => d !== dateStr);
        } else {
            updated.push(dateStr);
        }
        handleSaveDates(updated);
    };

    // Ajout d'une plage entière (Vacances scolaires)
    const handleAddRange = (e) => {
        e.preventDefault();
        if (!rangeStart || !rangeEnd) return alert("Veuillez saisir une date de début et de fin.");
        if (new Date(rangeStart) > new Date(rangeEnd)) return alert("La date de début doit être avant la date de fin.");

        // Génère tous les jours inclus dans l'intervalle
        const interval = eachDayOfInterval({
            start: new Date(rangeStart),
            end: new Date(rangeEnd)
        });

        const stringsToAdd = interval.map(d => format(d, 'yyyy-MM-dd'));
        
        // Fusionne avec l'existant sans doublon
        const updated = [...closedDates, ...stringsToAdd];
        handleSaveDates(updated);

        // Reset formulaire
        setRangeStart('');
        setRangeEnd('');
        alert("Plage de fermeture ajoutée avec succès !");
    };

    // Vider complètement le calendrier des fermetures
    const handleClearAll = () => {
        if (window.confirm("Voulez-vous réouvrir TOUS les jours de l'année ? (Effacera tous les fériés/vacances)")) {
            handleSaveDates([]);
        }
    };

    // --- LOGIQUE DE GÉNÉRATION DE LA GRILLE DU CALENDRIER DE L'ONGLET ---
    const daysInMonth = useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    // Remplissage pour que le 1er du mois tombe sur le bon jour de la semaine (Lundi, Mardi...)
    const blanks = useMemo(() => {
        if (daysInMonth.length === 0) return [];
        // getDay: 0 = Dimanche, 1 = Lundi... On réajuste pour que Lundi = 0
        let firstDayOfWeek = getDay(daysInMonth[0]);
        let result = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        return Array(result).fill(null);
    }, [daysInMonth]);

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-6xl mx-auto pb-20">
                
                {/* BOUTON RETOUR SQUELETTE CARILLON */}
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                {/* EN-TÊTE DE LA PAGE */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-pink/10 p-4 rounded-2xl text-car-pink">
                            <CalendarX size={32}/>
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Jours de Fermeture</h1>
                            <p className="text-slate-500 font-medium mt-1">Saisie des vacances scolaires, ponts et jours fériés</p>
                        </div>
                    </div>
                    {closedDates.length > 0 && (
                        <button onClick={handleClearAll} className="text-xs font-black uppercase tracking-widest text-car-pink bg-car-pink/10 hover:bg-car-pink hover:text-white px-5 py-3 rounded-xl transition-all">
                            Réouvrir toute l'année
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-car-pink"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        
                        {/* FORMULAIRE BLOC DE GAUCHE : AJOUT DE PLAGE */}
                        <div className="space-y-6">
                            <form onSubmit={handleAddRange} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                                <h3 className="font-black text-car-dark text-lg mb-2 flex items-center gap-2">
                                    <CalendarDays size={20} className="text-slate-400" />
                                    Fermeture en bloc
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Idéal pour enregistrer une période complète de vacances scolaires.</p>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Date de début :</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none font-bold text-car-dark text-sm focus:ring-2 focus:ring-car-pink/20" 
                                        value={rangeStart} onChange={e => setRangeStart(e.target.value)} required />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Date de fin :</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl outline-none font-bold text-car-dark text-sm focus:ring-2 focus:ring-car-pink/20" 
                                        value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} required />
                                </div>

                                <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-xl font-black tracking-widest shadow-lg shadow-car-dark/10 hover:bg-black transition-all flex justify-center items-center gap-2 pt-3.5">
                                    <Plus size={18}/> BLOQUER LA PÉRIODE
                                </button>
                            </form>

                            {/* COMPTEUR COMPACT DE SÉCURITÉ */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <h4 className="text-xs font-black text-car-dark uppercase tracking-wider mb-2">Statut du moteur</h4>
                                <p className="text-sm font-bold text-car-dark">
                                    <span className="text-2xl font-black text-car-pink">{closedDates.length}</span> jours de fermeture enregistrés au total pour la commune.
                                </p>
                            </div>
                        </div>

                        {/* BLOC DE DROITE : LE VRAI CALENDRIER VISUEL INTERACTIF (Prend 2 colonnes) */}
                        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            
                            {/* NAVIGATION DU MOIS */}
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-car-dark uppercase tracking-wide">
                                    {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                                </h2>
                                <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
                                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 text-slate-600 hover:bg-white rounded-lg hover:shadow-sm transition-all"><ChevronLeft size={20}/></button>
                                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 text-slate-600 hover:bg-white rounded-lg hover:shadow-sm transition-all"><ChevronRight size={20}/></button>
                                </div>
                            </div>

                            {/* EN-TÊTE DES JOURS DE LA SEMAINE */}
                            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                                <div>Lun</div><div>Mar</div><div>Mer</div><div>Jeu</div><div>Ven</div>
                                <div className="text-slate-300">Sam</div><div className="text-slate-300">Dim</div>
                            </div>

                            {/* LA GRILLE DYNAMIQUE DES JOURS */}
                            <div className="grid grid-cols-7 gap-2">
                                {/* Les cases vides du début de mois */}
                                {blanks.map((_, idx) => <div key={`blank-${idx}`} className="aspect-square"></div>)}
                                
                                {/* Les vrais jours */}
                                {daysInMonth.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const isClosed = closedDates.includes(dateStr);
                                    const isWeekEndDay = isWeekend(day);
                                    const isMercredi = getDay(day) === 3;

                                    // Couleurs dynamiques selon le type de jour
                                    let btnClass = "bg-slate-50 text-car-dark hover:bg-slate-100 border border-transparent";
                                    if (isClosed) {
                                        btnClass = "bg-car-pink text-white font-black shadow-md shadow-car-pink/20 border-transparent";
                                    } else if (isWeekEndDay || isMercredi) {
                                        btnClass = "bg-slate-100/50 text-slate-300 cursor-not-allowed border-transparent";
                                    }

                                    return (
                                        <button 
                                            key={dateStr}
                                            disabled={isWeekEndDay || isMercredi} // Inutile de cocher les week-ends et mercredis car le moteur les ignore par défaut
                                            onClick={() => handleDayClick(dateStr)}
                                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold relative transition-all group ${btnClass}`}
                                            title={isClosed ? "Jour de fermeture (Cliquez pour réouvrir)" : "Jour d'école (Cliquez pour fermer)"}
                                        >
                                            <span>{format(day, 'd')}</span>
                                            {isClosed && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-white opacity-60"></span>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* LÉGENDE DU COMPOSANT */}
                            <div className="mt-8 flex gap-6 text-xs font-bold text-slate-400 border-t border-slate-50 pt-4 flex-wrap">
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-car-pink rounded-md"></div> Jour de fermeture (Férié / Vacances)</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-50 rounded-md"></div> Jour d'école normal</div>
                                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100/50 rounded-md"></div> Week-end & Mercredi (Fermé par défaut)</div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Injection d'un petit useMemo rapide pour optimiser le rendu du calendrier
const useMemo = React.useMemo;

export default CalendarExceptionManager;