import React, { useState, useEffect } from 'react';
import api from '../api';
import { Building2, X, Phone, Mail, MapPin, Clock, Info, Edit3, Save, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

const StructureInfo = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [infos, setInfos] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    
    const role = localStorage.getItem('role');
    const isAdmin = role === 'admin';

    useEffect(() => {
        if (isOpen) {
            loadInfos();
        } else {
            setIsEditing(false);
        }
    }, [isOpen]);

    const loadInfos = async () => {
        try {
            const res = await api.get('/settings/structure-info');
            setInfos(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setInfos([]);
        }
    };

    const handleSave = async () => {
        try {
            const res = await api.put('/settings/structure-info', infos);
            setInfos(Array.isArray(res.data) ? res.data : infos);
            setIsEditing(false);
            alert("Informations enregistrées avec succès !");
        } catch (e) {
            alert("Erreur lors de la sauvegarde.");
        }
    };

    const handleAdd = () => {
        setInfos([...infos, { label: '', value: '' }]);
    };

    const handleRemove = (index) => {
        setInfos(infos.filter((_, i) => i !== index));
    };

    const handleChange = (index, field, newValue) => {
        const newInfos = infos.map((info, i) => {
            if (i === index) return { ...info, [field]: newValue };
            return info;
        });
        setInfos(newInfos);
    };

    // --- FONCTIONS DE RÉORGANISATION ---
    const moveUp = (index) => {
        if (index === 0) return;
        const newInfos = [...infos];
        const temp = newInfos[index];
        newInfos[index] = newInfos[index - 1];
        newInfos[index - 1] = temp;
        setInfos(newInfos);
    };

    const moveDown = (index) => {
        if (index === infos.length - 1) return;
        const newInfos = [...infos];
        const temp = newInfos[index];
        newInfos[index] = newInfos[index + 1];
        newInfos[index + 1] = temp;
        setInfos(newInfos);
    };

    const getIcon = (label) => {
        const l = (label || '').toLowerCase();
        if (l.includes('tél') || l.includes('tel') || l.includes('phone') || l.includes('urgence')) return <Phone size={24} className="text-car-blue" />;
        if (l.includes('mail') || l.includes('contact')) return <Mail size={24} className="text-car-purple" />;
        if (l.includes('adress') || l.includes('lieu') || l.includes('gps')) return <MapPin size={24} className="text-car-pink" />;
        if (l.includes('horaire') || l.includes('heure') || l.includes('ouvert')) return <Clock size={24} className="text-car-yellow" />;
        return <Info size={24} className="text-car-teal" />;
    };

    return (
        <>
            {/* BOUTON FLOTTANT GLOBAL */}
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-[9000] bg-car-dark text-white p-4 rounded-full shadow-2xl hover:scale-110 hover:bg-black transition-all flex items-center justify-center group"
                title="Informations de la structure"
            >
                <Building2 size={28} />
                <span className="absolute right-full mr-4 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Infos Structure
                </span>
            </button>

            {/* MODALE EN SURCOUCHE ABSOLUE */}
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-6 md:p-8 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-100 p-3 rounded-xl">
                                    <Building2 className="text-car-dark" size={24}/>
                                </div>
                                <h3 className="text-2xl font-black text-car-dark">Infos Utiles</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAdmin && !isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="bg-slate-100 text-slate-500 hover:text-car-blue p-2.5 rounded-full transition-colors" title="Modifier les infos">
                                        <Edit3 size={20}/>
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="bg-slate-100 text-slate-500 hover:text-car-pink p-2.5 rounded-full transition-colors">
                                    <X size={20}/>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
                            {!isEditing ? (
                                <div className="space-y-4">
                                    {infos.length === 0 ? (
                                        <div className="text-center p-8 text-slate-400 font-bold italic">
                                            Aucune information renseignée.<br/>
                                            {isAdmin && "Cliquez sur l'icône stylo pour ajouter des infos."}
                                        </div>
                                    ) : (
                                        infos.map((info, idx) => (
                                            <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-start gap-4 hover:border-slate-300 transition-colors">
                                                <div className="bg-white p-2.5 rounded-xl shadow-sm shrink-0">
                                                    {getIcon(info.label)}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{info.label}</h4>
                                                    <p className="font-bold text-car-dark whitespace-pre-line text-sm md:text-base leading-relaxed">{info.value}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                // MODE ÉDITION (ADMIN)
                                <div className="space-y-4 pt-2">
                                    {infos.map((info, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 relative group">
                                            
                                            {/* BOUTONS DE RÉORGANISATION ET SUPPRESSION */}
                                            <div className="absolute top-3 right-3 flex items-center gap-1">
                                                <button type="button" onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-car-blue disabled:opacity-30 disabled:hover:text-slate-400 shadow-sm transition-all" title="Monter">
                                                    <ChevronUp size={14}/>
                                                </button>
                                                <button type="button" onClick={() => moveDown(idx)} disabled={idx === infos.length - 1} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-car-blue disabled:opacity-30 disabled:hover:text-slate-400 shadow-sm transition-all" title="Descendre">
                                                    <ChevronDown size={14}/>
                                                </button>
                                                <button type="button" onClick={() => handleRemove(idx)} className="p-1.5 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-car-pink shadow-sm transition-all" title="Supprimer">
                                                    <Trash2 size={14}/>
                                                </button>
                                            </div>
                                            
                                            <div className="pr-28">
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Titre</label>
                                                <input type="text" className="w-full bg-white border border-slate-200 p-2 rounded-xl outline-none font-bold text-car-dark focus:border-car-blue text-xs" value={info.label} onChange={e => handleChange(idx, 'label', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Contenu</label>
                                                <textarea className="w-full bg-white border border-slate-200 p-2 rounded-xl outline-none font-medium text-car-dark focus:border-car-blue text-xs resize-y min-h-[60px]" value={info.value} onChange={e => handleChange(idx, 'value', e.target.value)} />
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button type="button" onClick={handleAdd} className="w-full border-2 border-dashed border-slate-300 text-slate-500 font-bold p-3 rounded-2xl hover:border-car-blue hover:text-car-blue transition-colors flex items-center justify-center gap-2 text-sm">
                                        <Plus size={18}/> Ajouter une ligne
                                    </button>
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="pt-4 border-t border-slate-100 mt-4 shrink-0 flex gap-3">
                                <button type="button" onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 text-slate-500 font-bold p-3 rounded-2xl hover:bg-slate-200 transition-colors text-sm">Annuler</button>
                                <button type="button" onClick={handleSave} className="flex-[2] bg-car-green text-white font-black uppercase tracking-widest p-3 rounded-2xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-car-green/20 text-sm">
                                    <Save size={18}/> Enregistrer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default StructureInfo;