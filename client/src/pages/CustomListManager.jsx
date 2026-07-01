import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { ListChecks, Plus, Search, CheckSquare, Square, Trash2, RotateCcw, X, Edit3, Save, Users } from 'lucide-react';

const CustomListManager = () => {
    const navigate = useNavigate();

    const [lists, setLists] = useState([]);
    const [children, setChildren] = useState([]);
    const [selectedList, setSelectedList] = useState(null);
    
    const [searchChild, setSearchChild] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newListData, setNewListData] = useState({ name: '', description: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [listsRes, kidsRes] = await Promise.all([
                api.get('/custom-lists'),
                api.get('/children')
            ]);
            setLists(listsRes.data);
            setChildren(kidsRes.data.filter(c => c.active !== false && c.category !== 'Adulte'));
        } catch (e) {
            console.error("Erreur de chargement", e);
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/custom-lists', { ...newListData, items: [] });
            setLists([...lists, res.data]);
            setShowCreateModal(false);
            setNewListData({ name: '', description: '' });
            setSelectedList(res.data);
        } catch (e) { alert("Erreur à la création."); }
    };

    const handleDeleteList = async (id) => {
        if(window.confirm("Supprimer définitivement cette liste ?")) {
            await api.delete(`/custom-lists/${id}`);
            if (selectedList?._id === id) setSelectedList(null);
            loadData();
        }
    };

    const handleAddChild = async (childId) => {
        if (!selectedList) return;
        const isAlreadyInList = selectedList.items.some(i => i.child._id === childId);
        if (isAlreadyInList) return;

        const updatedItems = [...selectedList.items, { child: childId, isChecked: false }];
        try {
            const res = await api.put(`/custom-lists/${selectedList._id}`, { items: updatedItems });
            updateListState(res.data);
            setSearchChild('');
        } catch (e) { alert("Erreur lors de l'ajout."); }
    };

    const handleRemoveChild = async (childId) => {
        if (!selectedList) return;
        const updatedItems = selectedList.items.filter(i => i.child._id !== childId);
        try {
            const res = await api.put(`/custom-lists/${selectedList._id}`, { items: updatedItems });
            updateListState(res.data);
        } catch (e) { alert("Erreur de suppression."); }
    };

    const handleToggleCheck = async (childId) => {
        if (!selectedList) return;
        try {
            const res = await api.put(`/custom-lists/${selectedList._id}/toggle/${childId}`);
            updateListState(res.data);
        } catch (e) { alert("Erreur lors du pointage."); }
    };

    const handleResetChecks = async () => {
        if (!selectedList) return;
        if (window.confirm("Remettre à zéro tous les pointages de cette liste ?")) {
            try {
                const res = await api.put(`/custom-lists/${selectedList._id}/reset`);
                updateListState(res.data);
            } catch (e) { alert("Erreur lors de la remise à zéro."); }
        }
    };

    const updateListState = (updatedList) => {
        setSelectedList(updatedList);
        setLists(lists.map(l => l._id === updatedList._id ? updatedList : l));
    };

    // Filtrer les enfants qui ne sont pas encore dans la liste sélectionnée
    const availableChildren = children.filter(c => 
        !selectedList?.items.some(i => i.child._id === c._id) &&
        (c.lastName.toLowerCase().includes(searchChild.toLowerCase()) || c.firstName.toLowerCase().includes(searchChild.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 relative pb-24">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-purple/10 p-4 rounded-2xl"><ListChecks className="text-car-purple w-8 h-8"/></div>
                        <div>
                            <h1 className="text-3xl font-black text-car-dark">Listes & Groupes</h1>
                            <p className="text-slate-500 font-medium">Pointage informel pour les sorties et activités</p>
                        </div>
                    </div>
                    {/* LE BOUTON CRÉER EST MAINTENANT ACCESSIBLE À TOUT LE MONDE */}
                    <button onClick={() => setShowCreateModal(true)} className="bg-car-purple text-white px-5 py-3 rounded-xl font-black tracking-widest hover:bg-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-car-purple/20 text-xs">
                        <Plus size={18}/> CRÉER UNE LISTE
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* COLONNE GAUCHE : MES LISTES */}
                    <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[600px] overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 font-black text-slate-400 text-xs tracking-widest uppercase">
                            Listes disponibles
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {lists.map(list => {
                                const checkedCount = list.items.filter(i => i.isChecked).length;
                                const isComplete = list.items.length > 0 && checkedCount === list.items.length;

                                return (
                                    <button 
                                        key={list._id} 
                                        onClick={() => { setSelectedList(list); setSearchChild(''); }} 
                                        className={`w-full text-left p-4 rounded-2xl transition-all ${selectedList?._id === list._id ? 'bg-car-purple text-white shadow-md' : 'hover:bg-slate-50 text-car-dark border border-slate-100'}`}
                                    >
                                        <div className="font-black text-lg mb-1">{list.name}</div>
                                        <div className={`text-xs font-bold ${selectedList?._id === list._id ? 'text-purple-200' : 'text-slate-400'}`}>{list.description || 'Sans description'}</div>
                                        
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${selectedList?._id === list._id ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {list.items.length} enfants
                                            </span>
                                            {isComplete && <CheckSquare size={16} className={selectedList?._id === list._id ? 'text-white' : 'text-car-green'}/>}
                                        </div>
                                    </button>
                                );
                            })}
                            {lists.length === 0 && <p className="text-center text-slate-400 text-sm font-bold mt-10">Aucune liste active.</p>}
                        </div>
                    </div>

                    {/* COLONNE DROITE : DÉTAIL DE LA LISTE */}
                    <div className="lg:col-span-2">
                        {selectedList ? (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 h-[600px] flex flex-col">
                                
                                {/* EN-TÊTE LISTE */}
                                <div className="p-6 border-b border-slate-100 flex justify-between items-start gap-4 shrink-0">
                                    <div>
                                        <h2 className="text-2xl font-black text-car-dark">{selectedList.name}</h2>
                                        <p className="text-sm font-medium text-slate-500">{selectedList.description}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleResetChecks} title="Remettre à zéro" aria-label="Remettre les coches à zéro" className="text-slate-400 hover:text-car-yellow bg-slate-50 p-3 rounded-xl transition-colors"><RotateCcw size={20} aria-hidden="true"/></button>
                                        {/* LE BOUTON SUPPRIMER EST MAINTENANT ACCESSIBLE À TOUT LE MONDE */}
                                        <button onClick={() => handleDeleteList(selectedList._id)} className="text-slate-400 hover:text-car-pink bg-slate-50 p-3 rounded-xl transition-colors" aria-label="Supprimer la liste"><Trash2 size={20} aria-hidden="true"/></button>
                                    </div>
                                </div>

                                {/* BARRE DE PROGRESSION */}
                                <div className="bg-slate-50 p-4 border-b border-slate-100 shrink-0">
                                    <div className="flex justify-between text-xs font-black uppercase text-slate-500 mb-2">
                                        <span>Progression du pointage</span>
                                        <span className={selectedList.items.filter(i => i.isChecked).length === selectedList.items.length && selectedList.items.length > 0 ? "text-car-green" : ""}>
                                            {selectedList.items.filter(i => i.isChecked).length} / {selectedList.items.length}
                                        </span>
                                    </div>
                                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-car-green transition-all duration-500" 
                                            style={{ width: `${selectedList.items.length === 0 ? 0 : (selectedList.items.filter(i => i.isChecked).length / selectedList.items.length) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* ZONE : AJOUT D'ENFANTS (ACCESSIBLE À TOUS) */}
                                <div className="p-4 border-b border-slate-100 bg-car-purple/5 shrink-0 relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Search className="text-car-purple" size={16}/>
                                        <span className="text-xs font-bold text-car-purple uppercase">Ajouter des enfants à la liste :</span>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Chercher par nom ou prénom..." 
                                        className="w-full bg-white border border-car-purple/20 p-3 rounded-xl outline-none focus:border-car-purple font-bold text-sm"
                                        value={searchChild}
                                        onChange={e => setSearchChild(e.target.value)}
                                    />
                                    
                                    {searchChild.length >= 2 && (
                                        <div className="absolute left-4 right-4 mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 max-h-60 overflow-y-auto z-20">
                                            {availableChildren.map(c => (
                                                <div key={c._id} className="p-4 flex justify-between items-center border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <span className="font-bold text-car-dark uppercase text-sm">{c.lastName} <span className="font-medium capitalize text-slate-500">{c.firstName}</span></span>
                                                    <button onClick={() => handleAddChild(c._id)} className="bg-car-purple text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:scale-105 transition-transform">+ Ajouter</button>
                                                </div>
                                            ))}
                                            {availableChildren.length === 0 && <div className="p-4 text-center text-slate-400 text-xs font-bold italic">Aucun enfant correspondant (ou déjà dans la liste).</div>}
                                        </div>
                                    )}
                                </div>

                                {/* LISTE DES ENFANTS A POINTER */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {selectedList.items.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                            <Users size={48} className="mb-2"/>
                                            <p className="font-bold">Cette liste est vide.</p>
                                            <p className="text-sm">Cherchez un enfant ci-dessus pour l'ajouter.</p>
                                        </div>
                                    ) : (
                                        [...selectedList.items].sort((a, b) => a.child.lastName.localeCompare(b.child.lastName)).map(item => (
                                            <div key={item.child._id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${item.isChecked ? 'bg-car-green/5 border-car-green/20' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                                                
                                                <div className="flex-1 flex items-center gap-4 cursor-pointer" onClick={() => handleToggleCheck(item.child._id)}>
                                                    <div className={item.isChecked ? 'text-car-green' : 'text-slate-300'}>
                                                        {item.isChecked ? <CheckSquare size={28}/> : <Square size={28}/>}
                                                    </div>
                                                    <div>
                                                        <span className={`font-black uppercase block ${item.isChecked ? 'text-car-dark' : 'text-slate-600'}`}>{item.child.lastName}</span>
                                                        <span className={`font-bold capitalize block text-sm ${item.isChecked ? 'text-slate-600' : 'text-slate-400'}`}>{item.child.firstName}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* BOUTON RETIRER DE LA LISTE ACCESSIBLE A TOUS */}
                                                <button onClick={() => handleRemoveChild(item.child._id)} className="text-slate-300 hover:text-car-pink p-2 bg-slate-50 hover:bg-red-50 rounded-xl transition-colors shrink-0">
                                                    <X size={18}/>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-100/50 rounded-[2rem] h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 p-10 text-center">
                                <ListChecks size={64} className="text-slate-300 mb-4"/>
                                <h3 className="font-black text-slate-400 text-xl">Sélectionnez une liste à pointer</h3>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALE CRÉATION */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleCreateList} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-black text-car-dark">Nouvelle Liste</h3>
                            <button type="button" onClick={() => setShowCreateModal(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-car-pink" aria-label="Fermer le formulaire"><X size={24} aria-hidden="true"/></button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Nom de la liste</label>
                                <input type="text" required placeholder="Ex: Sortie Cinéma CP" className="w-full bg-slate-50 p-3 rounded-xl font-black text-car-dark outline-none border border-slate-200 focus:border-car-purple" value={newListData.name} onChange={e => setNewListData({...newListData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 block mb-1">Description (Optionnel)</label>
                                <input type="text" placeholder="Ex: Groupe du mardi" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-car-dark outline-none border border-slate-200 focus:border-car-purple" value={newListData.description} onChange={e => setNewListData({...newListData, description: e.target.value})} />
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-car-purple text-white font-black p-4 rounded-2xl hover:bg-purple-700 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                            <Save size={20}/> Créer la liste
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CustomListManager;