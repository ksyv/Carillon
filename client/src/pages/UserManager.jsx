import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Shield, UserPlus, Pencil, Trash2, X, Check, Users } from 'lucide-react';


const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
    
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ role: 'staff', categoryAccess: 'Tous' });

    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { const { data } = await api.get(`/users`); setUsers(data); };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/users`, newUser);
            setNewUser({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
            loadUsers();
        } catch (e) { alert("Erreur."); }
    };

    const startEdit = (user) => {
        setEditingId(user._id);
        setEditForm({ role: user.role, categoryAccess: user.categoryAccess || 'Tous' });
    };

    const saveEdit = async (id) => {
        try {
            await api.put(`/users/${id}`, editForm);
            setEditingId(null);
            loadUsers();
        } catch (e) { alert("Erreur lors de la modification."); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex items-center gap-4 mb-10">
                    <div className="bg-car-purple/10 p-4 rounded-2xl"><Shield className="text-car-purple w-8 h-8"/></div>
                    <h1 className="text-4xl font-black text-car-dark">Équipe & Accès</h1>
                </div>

                <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-10 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Nom d'utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Mot de passe" type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required/>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Staff (Anim)</option>
                        <option value="responsable">Responsable</option>
                        <option value="admin">Admin (Dir)</option>
                    </select>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.categoryAccess} onChange={e => setNewUser({...newUser, categoryAccess: e.target.value})}>
                        <option value="Tous">Accès: Tous</option>
                        <option value="Maternelle">Accès: Maternelle</option>
                        <option value="Élémentaire">Accès: Élémentaire</option>
                    </select>
                    <button type="submit" className="bg-car-purple text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-purple/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><UserPlus size={22}/> CRÉER</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map(u => (
                        <div key={u._id} className={`bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 transition-all duration-300 ${editingId === u._id ? 'md:col-span-2 ring-4 ring-car-purple/10' : 'hover:-translate-y-1 hover:shadow-lg'}`}>
                            {editingId === u._id ? (
                                <div className="flex flex-col md:flex-row gap-4 items-center w-full">
                                    <div className="font-black text-car-dark text-xl w-full md:w-1/4">{u.username}</div>
                                    <div className="flex flex-1 gap-4 w-full">
                                        <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark outline-none focus:border-car-purple flex-1" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}>
                                            <option value="staff">Staff (Anim)</option>
                                            <option value="responsable">Responsable</option>
                                            <option value="admin">Admin (Dir)</option>
                                        </select>
                                        <select className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-car-dark outline-none focus:border-car-purple flex-1" value={editForm.categoryAccess} onChange={e => setEditForm({...editForm, categoryAccess: e.target.value})}>
                                            <option value="Tous">Accès: Tous</option>
                                            <option value="Maternelle">Accès: Maternelle</option>
                                            <option value="Élémentaire">Accès: Élémentaire</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 justify-end w-full md:w-auto mt-2 md:mt-0">
                                        <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-500 p-3 rounded-xl hover:bg-slate-200 transition-colors"><X size={20}/></button>
                                        <button onClick={() => saveEdit(u._id)} className="bg-car-green text-white p-3 rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-500/20"><Check size={20}/></button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start sm:items-center w-full h-full gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl flex-shrink-0 ${u.role === 'admin' ? 'bg-car-purple/10 text-car-purple' : 'bg-slate-100 text-slate-400'}`}>
                                            {u.role === 'admin' ? <Shield size={24}/> : <Users size={24}/>}
                                        </div>
                                        <div>
                                            <span className="font-black text-car-dark text-xl block leading-tight">{u.username}</span>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                                                <span className="text-xs font-bold text-car-teal bg-car-teal/10 px-2 py-0.5 rounded-md uppercase tracking-widest">{u.categoryAccess || 'Tous'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <button onClick={() => startEdit(u)} className="text-slate-400 hover:text-car-blue p-3 bg-slate-50 rounded-xl transition-colors"><Pencil size={20}/></button>
                                        <button onClick={async () => { if(window.confirm("Supprimer cet utilisateur ?")) { await api.delete(`/users/${u._id}`); loadUsers(); } }} className="text-slate-400 hover:text-car-pink p-3 bg-slate-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default UserManager;