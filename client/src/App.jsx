import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogOut, Sun, Moon, FileText, CheckCircle, Search, Trash2, Plus, Users, Shield, RotateCcw, UserPlus, Download, Pencil, Check, X} from 'lucide-react';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = '/api';

axios.interceptors.request.use(req => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// --- COMPOSANTS UI REUTILISABLES ---
const LogoTexte = ({ className = "text-3xl" }) => (
    <div className={`font-black tracking-[0.15em] flex items-center justify-center ${className}`}>
        <span className="text-car-dark">C</span>
        <span className="text-car-blue">A</span>
        <span className="text-car-yellow">R</span>
        <span className="text-car-teal">I</span>
        <span className="text-car-pink">L</span>
        <span className="text-car-green">L</span>
        <span className="text-car-blue">O</span>
        <span className="text-car-dark">N</span>
    </div>
);

// 1. LOGIN
const Login = ({ setAuth }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/login`, creds);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setAuth({ token: data.token, role: data.role });
    } catch (err) { setError('Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Formes décoratives en fond inspirées des couleurs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-car-blue/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-car-pink/10 rounded-full blur-3xl"></div>
      
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-sm border border-slate-100 relative z-10">
        <div className="mb-8">
            <LogoTexte className="text-4xl mb-2" />
            <p className="text-center text-slate-400 font-semibold tracking-widest text-xs uppercase mt-2">Périscolaire</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
              <input type="text" placeholder="Identifiant" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" 
                value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} />
          </div>
          <div>
              <input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" 
                value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} />
          </div>
          {error && <p className="text-car-pink text-sm font-bold text-center bg-car-pink/10 p-3 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-car-dark/20 hover:-translate-y-1 mt-4">
            Connexion
          </button>
        </form>
      </div>
    </div>
  );
};

// 2. DASHBOARD
const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  
  const getSuggestedSlot = () => new Date().getHours() < 13 ? 'MATIN' : 'SOIR';
  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <LogoTexte className="text-2xl" />
        <div className="flex items-center gap-4">
            <span className="text-xs font-black text-car-purple bg-car-purple/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{role}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-car-pink transition-colors p-2"><LogOut size={22} /></button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-10 mt-4">
        
        {/* SECTION POINTAGE */}
        <section>
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-teal"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Pointage en cours</h2>
                <span className="ml-auto text-sm font-bold text-car-dark">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 md:gap-6">
                <button onClick={() => navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/MATIN`)} 
                className={`group relative p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all bg-white hover:shadow-2xl hover:-translate-y-1 ${getSuggestedSlot() === 'MATIN' ? 'border-car-yellow shadow-lg shadow-car-yellow/10' : 'border-slate-100'}`}>
                    <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-car-yellow opacity-50 group-hover:animate-ping"></div>
                    <div className="p-5 rounded-3xl mb-4 bg-car-yellow/10 text-car-yellow group-hover:scale-110 transition-transform">
                        <Sun strokeWidth={2.5} size={40} />
                    </div>
                    <span className="font-black text-car-dark text-xl uppercase tracking-wider">Matin</span>
                </button>

                <button onClick={() => navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/SOIR`)} 
                className={`group relative p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all bg-white hover:shadow-2xl hover:-translate-y-1 ${getSuggestedSlot() === 'SOIR' ? 'border-car-blue shadow-lg shadow-car-blue/10' : 'border-slate-100'}`}>
                    <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-car-blue opacity-50 group-hover:animate-ping"></div>
                    <div className="p-5 rounded-3xl mb-4 bg-car-blue/10 text-car-blue group-hover:scale-110 transition-transform">
                        <Moon strokeWidth={2.5} size={40} />
                    </div>
                    <span className="font-black text-car-dark text-xl uppercase tracking-wider">Soir</span>
                </button>
            </div>
        </section>

        {/* SECTION ADMIN */}
        {role === 'admin' && (
          <section className="pt-6 border-t border-slate-200 border-dashed">
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Administration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => navigate('/report')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-teal/10 p-4 rounded-2xl w-fit group-hover:bg-car-teal group-hover:text-white text-car-teal transition-colors"><FileText size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Rapports</h3><p className="text-sm text-slate-500 font-medium">Historique complet</p></div>
                </button>
                <button onClick={() => navigate('/admin/children')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-green/10 p-4 rounded-2xl w-fit group-hover:bg-car-green group-hover:text-white text-car-green transition-colors"><Users size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Enfants</h3><p className="text-sm text-slate-500 font-medium">Base de données</p></div>
                </button>
                <button onClick={() => navigate('/admin/users')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-purple/10 p-4 rounded-2xl w-fit group-hover:bg-car-purple group-hover:text-white text-car-purple transition-colors"><Shield size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Équipe</h3><p className="text-sm text-slate-500 font-medium">Accès & Rôles</p></div>
                </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// 3. SESSION / LISTE DE PRÉSENCE
const SessionView = () => {
    const { date, type } = useParams();
    const [children, setChildren] = useState([]); 
    const [attendance, setAttendance] = useState([]); 
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    const isMatin = type === 'MATIN';
    const themeColor = isMatin ? 'car-yellow' : 'car-blue';

    useEffect(() => { loadData(); }, [date, type]);

    const loadData = async () => {
        const [kidsRes, attRes] = await Promise.all([axios.get(`${API_URL}/children`), axios.get(`${API_URL}/attendance?date=${date}&sessionType=${type}`)]);
        setChildren(kidsRes.data); setAttendance(attRes.data);
    };

    const presentIds = useMemo(() => attendance.map(a => a.child._id), [attendance]);
    
    const filteredChildren = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => !presentIds.includes(c._id) && (c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase())));
    }, [children, search, presentIds]);

    const sortedAttendance = useMemo(() => {
        return [...attendance].sort((a, b) => {
            if (a.checkOut && !b.checkOut) return 1;
            if (!a.checkOut && b.checkOut) return -1;
            return a.child.lastName.localeCompare(b.child.lastName);
        });
    }, [attendance]);

    const activeCount = attendance.filter(a => !a.checkOut).length;

    // ACTIONS
    const handleCheckIn = async (childId) => {
        const { data } = await axios.post(`${API_URL}/attendance/checkin`, { childId, date, sessionType: type });
        setAttendance([data, ...attendance]); setSearch('');
    };

    const handleCheckOut = async (id) => {
        const { data } = await axios.put(`${API_URL}/attendance/checkout/${id}`);
        setAttendance(attendance.map(a => a._id === id ? data : a));
    };

    const handleUndoCheckOut = async (id) => {
        const { data } = await axios.put(`${API_URL}/attendance/undo-checkout/${id}`);
        setAttendance(attendance.map(a => a._id === id ? data : a));
    };

    const handleDeleteCheckIn = async (id) => {
        if(window.confirm("Annuler la présence ?")) {
            await axios.delete(`${API_URL}/attendance/${id}`);
            setAttendance(attendance.filter(a => a._id !== id));
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50">
            {/* HEADER */}
            <div className="bg-white shadow-sm z-20">
                <div className="p-4 flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Retour</button>
                    <div className={`bg-${themeColor}/10 text-${themeColor} px-5 py-2 rounded-full font-black text-sm tracking-widest`}>
                        {type} • {activeCount} PRÉSENTS
                    </div>
                </div>
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative max-w-4xl mx-auto">
                        <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                        <input type="text" className={`w-full pl-14 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-${themeColor} outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg`}
                            placeholder="Taper un nom pour l'ajouter..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* AUTOCOMPLETION */}
            {search.length >= 2 && (
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl max-h-80 overflow-y-auto absolute w-full top-36 z-30 border-b border-slate-200">
                    <div className="max-w-4xl mx-auto">
                        {filteredChildren.map(child => (
                            <div key={child._id} onClick={() => handleCheckIn(child._id)} className="p-5 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group">
                                <span className="font-black text-xl text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                <span className={`bg-${themeColor} text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider`}>+ AJOUTER</span>
                            </div>
                        ))}
                        {filteredChildren.length === 0 && <div className="p-8 text-center text-slate-400 font-bold">Aucun enfant trouvé.</div>}
                    </div>
                </div>
            )}

            {/* LISTE */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full pb-20 mt-4">
                {sortedAttendance.map(record => {
                    const isGone = !!record.checkOut;
                    return (
                        <div key={record._id} className={`p-5 rounded-3xl flex justify-between items-center transition-all ${isGone ? 'bg-white/50 border border-slate-200' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100'}`}>
                            <div>
                                <div className={`font-black text-xl ${isGone ? 'text-slate-400 line-through decoration-slate-300' : 'text-car-dark'}`}>
                                    {record.child.lastName} <span className="font-medium">{record.child.firstName}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {isGone && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Parti à {format(new Date(record.checkOut), 'HH:mm')}</span>}
                                    {record.isLate && <span className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg">⚠️ +19h</span>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {!isMatin && (
                                    !isGone ? (
                                        <button onClick={() => handleCheckOut(record._id)} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-car-dark/20">DÉPART</button>
                                    ) : (
                                        <button onClick={() => handleUndoCheckOut(record._id)} className="bg-slate-100 text-slate-500 p-3 rounded-2xl hover:bg-slate-200 transition-colors" title="Annuler le départ"><RotateCcw size={22}/></button>
                                    )
                                )}
                                {(!isGone || isMatin) && (
                                    <button onClick={() => handleDeleteCheckIn(record._id)} className="text-slate-300 hover:text-car-pink p-2 rounded-xl transition-colors"><Trash2 size={24}/></button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {attendance.length === 0 && (
                    <div className="text-center mt-32">
                        <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"><Users className="text-slate-300 w-10 h-10"/></div>
                        <p className="text-slate-400 font-bold text-lg">La liste est vide.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// 4. ADMIN USERS
const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { const { data } = await axios.get(`${API_URL}/users`); setUsers(data); };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, newUser);
            setNewUser({ username: '', password: '', role: 'staff' });
            loadUsers();
        } catch (e) { alert("Erreur."); }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex items-center gap-4 mb-10">
                    <div className="bg-car-purple/10 p-4 rounded-2xl"><Shield className="text-car-purple w-8 h-8"/></div>
                    <h1 className="text-4xl font-black text-car-dark">Équipe & Accès</h1>
                </div>

                <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Nom d'utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Mot de passe" type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required/>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Staff (Animateur)</option>
                        <option value="admin">Admin (Directeur)</option>
                    </select>
                    <button type="submit" className="bg-car-purple text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-purple/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><UserPlus size={22}/> CRÉER</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {users.map(u => (
                        <div key={u._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${u.role === 'admin' ? 'bg-car-purple/10 text-car-purple' : 'bg-slate-100 text-slate-400'}`}>
                                    {u.role === 'admin' ? <Shield size={24}/> : <Users size={24}/>}
                                </div>
                                <div>
                                    <span className="font-black text-car-dark text-xl block">{u.username}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                                </div>
                            </div>
                            <button onClick={async () => { if(window.confirm("Supprimer ?")) { await axios.delete(`${API_URL}/users/${u._id}`); loadUsers(); } }} className="text-slate-300 hover:text-car-pink p-2 bg-slate-50 rounded-xl transition-colors"><Trash2 size={20}/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 5. ADMIN ENFANTS
const ChildrenManager = () => {
    const [children, setChildren] = useState([]);
    const [newChild, setNewChild] = useState({ firstName: '', lastName: '' });
    // Nouveaux states pour l'édition
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });
    
    const navigate = useNavigate();

    useEffect(() => { loadChildren(); }, []);
    
    const loadChildren = () => axios.get(`${API_URL}/children`).then(res => setChildren(res.data));

    const handleAdd = async (e) => {
        e.preventDefault();
        await axios.post(`${API_URL}/children`, newChild);
        setNewChild({ firstName: '', lastName: '' });
        loadChildren();
    };

    // --- NOUVELLES ACTIONS ---
    const handleDelete = async (id, nom) => {
        if(window.confirm(`Retirer ${nom} de la liste ?\n(Son historique sera conservé dans les anciens rapports)`)) {
            await axios.delete(`${API_URL}/children/${id}`);
            loadChildren();
        }
    };

    const startEdit = (child) => {
        setEditingId(child._id);
        setEditForm({ firstName: child.firstName, lastName: child.lastName });
    };

    const saveEdit = async (id) => {
        await axios.put(`${API_URL}/children/${id}`, editForm);
        setEditingId(null);
        loadChildren();
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                <div className="flex items-center gap-4 mb-10">
                    <div className="bg-car-green/10 p-4 rounded-2xl"><Users className="text-car-green w-8 h-8"/></div>
                    <h1 className="text-4xl font-black text-car-dark">Base Enfants</h1>
                </div>

                <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 flex flex-col md:flex-row gap-4">
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-black text-car-dark placeholder:font-bold placeholder:text-slate-400 flex-1 uppercase" placeholder="NOM DE FAMILLE" value={newChild.lastName} onChange={e => setNewChild({...newChild, lastName: e.target.value.toUpperCase()})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-bold text-car-dark placeholder:text-slate-400 flex-1" placeholder="Prénom" value={newChild.firstName} onChange={e => setNewChild({...newChild, firstName: e.target.value})} required/>
                    <button type="submit" className="bg-car-green text-white px-8 py-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-green/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><Plus strokeWidth={3}/> AJOUTER</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children.map(child => (
                        <div key={child._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                            
                            {/* MODE EDITION */}
                            {editingId === child._id ? (
                                <div className="flex-1 flex items-center gap-2 mr-4">
                                    <input className="bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-black text-car-dark w-full uppercase text-sm" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value.toUpperCase()})} />
                                    <input className="bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-bold text-car-dark w-full text-sm" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
                                </div>
                            ) : (
                            /* MODE LECTURE */
                                <div>
                                    <span className="font-black text-car-dark text-xl block">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                    <span className="bg-car-green/10 text-car-green text-xs font-black px-3 py-1 rounded-lg tracking-widest mt-2 inline-block">ACTIF</span>
                                </div>
                            )}

                            {/* BOUTONS D'ACTION */}
                            <div className="flex items-center gap-2">
                                {editingId === child._id ? (
                                    <>
                                        <button onClick={() => saveEdit(child._id)} className="bg-car-green text-white p-2 rounded-xl hover:-translate-y-0.5 transition-all shadow-md shadow-car-green/20"><Check size={20}/></button>
                                        <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-500 p-2 rounded-xl hover:bg-slate-200 transition-all"><X size={20}/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(child)} className="text-slate-400 hover:text-car-blue p-2 bg-slate-50 rounded-xl transition-colors" title="Modifier"><Pencil size={20}/></button>
                                        <button onClick={() => handleDelete(child._id, `${child.firstName} ${child.lastName}`)} className="text-slate-400 hover:text-car-pink p-2 bg-slate-50 rounded-xl transition-colors" title="Supprimer"><Trash2 size={20}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    {children.length === 0 && <div className="col-span-full p-10 text-center text-slate-400 font-bold">Aucun enfant dans la base.</div>}
                </div>
            </div>
        </div>
    );
};

// 6. RAPPORT
const Report = () => {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState([]);
    const navigate = useNavigate();

    useEffect(() => { axios.get(`${API_URL}/report?date=${date}`).then(res => setData(res.data)); }, [date]);

    // Fonction de génération du PDF
    const exportPDF = () => {
        const doc = new jsPDF();
        
        // Titre du document
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(58, 58, 58); // car-dark
        doc.text(`Rapport Périscolaire - Carignan-de-Bordeaux`, 14, 20);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Date : ${format(new Date(date), 'dd MMMM yyyy', { locale: fr })}`, 14, 28);

        // Préparation des colonnes et lignes
        const tableColumn = ["Enfant", "Matin", "Soir", "Supplément 19h"];
        const tableRows = [];

        data.forEach(row => {
            const enfant = `${row.child.lastName} ${row.child.firstName}`;
            const matin = row.matin ? 'OUI' : '-';
            const soir = row.soir ? 'OUI' : '-';
            const supp = row.supplement ? 'OUI' : '-';
            tableRows.push([enfant, matin, soir, supp]);
        });

        // Génération du tableau avec les couleurs de la charte
        autoTable(doc, {
            startY: 35,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, textColor: [58, 58, 58] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            halign: 'center'
        });

        // Sauvegarde le fichier
        doc.save(`Rapport_Carillon_${date}.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors no-print">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 no-print">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-teal/10 p-4 rounded-2xl"><FileText className="text-car-teal w-8 h-8"/></div>
                        <h1 className="text-4xl font-black text-car-dark">Rapport</h1>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white border border-slate-200 p-4 rounded-2xl font-black text-car-dark outline-none focus:ring-4 focus:ring-car-teal/20 shadow-sm flex-1 md:flex-none" />
                        
                        {/* NOUVEAU BOUTON PDF */}
                        <button onClick={exportPDF} className="bg-car-blue text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-blue/30 hover:-translate-y-1 active:scale-95 transition-all flex justify-center items-center gap-2">
                            <Download size={22} strokeWidth={2.5}/> PDF
                        </button>
                    </div>
                </div>
                
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-6 font-black text-slate-400 tracking-widest text-xs uppercase">Enfant</th>
                                <th className="p-6 font-black text-slate-400 tracking-widest text-xs uppercase text-center">Matin</th>
                                <th className="p-6 font-black text-slate-400 tracking-widest text-xs uppercase text-center">Soir</th>
                                <th className="p-6 font-black text-car-pink tracking-widest text-xs uppercase text-center">Supp. 19h</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-6 font-black text-car-dark text-lg">{row.child.lastName} <span className="font-medium text-slate-500">{row.child.firstName}</span></td>
                                    <td className="p-6 text-center">{row.matin ? <span className="text-car-teal font-black">X</span> : <span className="text-slate-200">-</span>}</td>
                                    <td className="p-6 text-center">{row.soir ? <span className="text-car-teal font-black">X</span> : <span className="text-slate-200">-</span>}</td>
                                    <td className="p-6 text-center font-black text-car-pink">{row.supplement ? 'OUI' : <span className="text-slate-200">-</span>}</td>
                                </tr>
                            ))}
                            {data.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-slate-400 font-bold">Aucune présence à cette date.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            <style>{`@media print { .no-print { display: none; } body { background: white; } }`}</style>
        </div>
    );
};

// --- ROUTER ---
export default function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), role: localStorage.getItem('role') });
  if (!auth.token) return <Login setAuth={setAuth} />;
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:date/:type" element={<SessionView />} />
        <Route path="/report" element={<Report />} />
        <Route path="/admin/children" element={<ChildrenManager />} />
        <Route path="/admin/users" element={<UserManager />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}