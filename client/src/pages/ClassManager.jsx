import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Trash2, Pencil, X, Check } from 'lucide-react';

const ClassManager = () => {
    const [classes, setClasses] = useState([]);
    const [editingClass, setEditingClass] = useState(null);
    const navigate = useNavigate();

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => {
        try {
            const res = await api.get('/classes');
            setClasses(res.data);
        } catch (e) { alert("Erreur de chargement des classes"); }
    };

    const startAdd = () => setEditingClass({ _id: null, name: '', category: 'Maternelle', teacher: '' });
    const startEdit = (cls) => setEditingClass({ ...cls });

    const saveClass = async (e) => {
        e.preventDefault();
        try {
            if (editingClass._id) {
                await api.put(`/classes/${editingClass._id}`, editingClass);
            } else {
                await api.post('/classes', editingClass);
            }
            setEditingClass(null);
            loadClasses();
        } catch (e) { alert("Erreur lors de la sauvegarde."); }
    };

    const deleteClass = async (id, name) => {
        if (window.confirm(`Supprimer la classe ${name} ?\n(Elle sera retirée de la fiche des enfants concernés).`)) {
            try {
                await api.delete(`/classes/${id}`);
                loadClasses();
            } catch (e) { alert("Erreur de suppression."); }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative">
            <div className="max-w-4xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><GraduationCap className="text-car-blue w-8 h-8"/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Classes Scolaires</h1>
                            <p className="text-slate-500 font-medium mt-1">Gestion des classes et des enseignants</p>
                        </div>
                    </div>
                    <button onClick={startAdd} className="bg-car-blue text-white font-bold px-4 py-3 rounded-xl shadow-md shadow-car-blue/20 flex items-center gap-2 hover:bg-blue-700 transition-colors uppercase tracking-widest text-xs">
                        <Plus size={18}/> Créer une classe
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Colonne Maternelle */}
                    <div>
                        <h2 className="font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Maternelle</h2>
                        <div className="space-y-3">
                            {classes.filter(c => c.category === 'Maternelle').map(cls => (
                                <div key={cls._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-black text-car-dark text-lg">{cls.name}</h3>
                                        <p className="text-sm font-bold text-slate-400">{cls.teacher || 'Enseignant non renseigné'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(cls)} className="p-2 text-slate-400 hover:text-car-yellow bg-slate-50 rounded-lg"><Pencil size={18}/></button>
                                        <button onClick={() => deleteClass(cls._id, cls.name)} className="p-2 text-slate-400 hover:text-car-pink bg-slate-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Colonne Élémentaire */}
                    <div>
                        <h2 className="font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Élémentaire</h2>
                        <div className="space-y-3">
                            {classes.filter(c => c.category === 'Élémentaire').map(cls => (
                                <div key={cls._id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-black text-car-dark text-lg">{cls.name}</h3>
                                        <p className="text-sm font-bold text-slate-400">{cls.teacher || 'Enseignant non renseigné'}</p>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => startEdit(cls)} className="p-2 text-slate-400 hover:text-car-yellow bg-slate-50 rounded-lg"><Pencil size={18}/></button>
                                        <button onClick={() => deleteClass(cls._id, cls.name)} className="p-2 text-slate-400 hover:text-car-pink bg-slate-50 rounded-lg"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Édition */}
            {editingClass && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={saveClass} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-dark">{editingClass._id ? 'Modifier' : 'Créer'} la classe</h3>
                            <button type="button" onClick={() => setEditingClass(null)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink"><X size={24}/></button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Niveau</label>
                                <select className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200" value={editingClass.category} onChange={e => setEditingClass({...editingClass, category: e.target.value})}>
                                    <option value="Maternelle">Maternelle</option>
                                    <option value="Élémentaire">Élémentaire</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Nom de la classe</label>
                                <input type="text" required placeholder="Ex: CP 1 ou M. Dupont" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-blue" value={editingClass.name} onChange={e => setEditingClass({...editingClass, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Enseignant (Optionnel)</label>
                                <input type="text" placeholder="Ex: Mme Sophie MARTIN" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-blue" value={editingClass.teacher} onChange={e => setEditingClass({...editingClass, teacher: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-car-blue text-white font-black p-4 rounded-2xl hover:bg-blue-600 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                            <Check size={20}/> Enregistrer
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ClassManager;