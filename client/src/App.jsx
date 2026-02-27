import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogOut, Sun, Moon, FileText, CheckCircle, Search, Trash2, Plus, Users, Shield, RotateCcw, UserPlus, Download, Pencil, Check, X, Filter, StickyNote, CalendarDays, ChevronLeft, ChevronRight, Calendar as CalendarIcon} from 'lucide-react';

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

// COMPOSANT CALENDRIER DRY (Réutilisable pour notes et facturation)
const InteractiveCalendar = ({ selectedDates, onChange }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const toggleDate = (dateStr) => {
        if (selectedDates.includes(dateStr)) {
            onChange(selectedDates.filter(d => d !== dateStr));
        } else {
            onChange([...selectedDates, dateStr]);
        }
    };

    // Sélection intelligente par jour de la semaine dans le mois actuel
    const toggleWeekdayInMonth = (dayIndex) => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(start);
        const daysInMonth = eachDayOfInterval({ start, end });
        const targetDaysStr = daysInMonth.filter(d => getDay(d) === dayIndex).map(d => format(d, 'yyyy-MM-dd'));

        const allSelected = targetDaysStr.every(d => selectedDates.includes(d));
        if (allSelected) {
            onChange(selectedDates.filter(d => !targetDaysStr.includes(d)));
        } else {
            const newSet = new Set([...selectedDates, ...targetDaysStr]);
            onChange(Array.from(newSet));
        }
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = [{label: 'Lun', idx: 1}, {label: 'Mar', idx: 2}, {label: 'Mer', idx: 3}, {label: 'Jeu', idx: 4}, {label: 'Ven', idx: 5}, {label: 'Sam', idx: 6}, {label: 'Dim', idx: 0}];

    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
                <button type="button" onClick={prevMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronLeft/></button>
                <h3 className="font-black text-car-dark text-lg capitalize">{format(currentMonth, 'MMMM yyyy', { locale: fr })}</h3>
                <button type="button" onClick={nextMonth} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"><ChevronRight/></button>
            </div>
            
            <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map(wd => (
                    <button 
                        key={wd.label} type="button" 
                        onClick={() => toggleWeekdayInMonth(wd.idx)}
                        className="text-center font-bold text-xs text-car-blue bg-car-blue/10 hover:bg-car-blue hover:text-white rounded-lg py-2 transition-colors cursor-pointer"
                        title="Sélectionner tout le mois"
                    >
                        {wd.label}
                    </button>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
                {days.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isSelected = selectedDates.includes(dateStr);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    
                    return (
                        <div 
                            key={dateStr}
                            onClick={() => isCurrentMonth && toggleDate(dateStr)}
                            className={`
                                aspect-square flex items-center justify-center rounded-xl text-sm font-bold cursor-pointer transition-all
                                ${!isCurrentMonth ? 'text-slate-300 opacity-50 cursor-not-allowed' : ''}
                                ${isCurrentMonth && !isSelected ? 'bg-slate-50 text-slate-600 hover:bg-slate-200 hover:-translate-y-0.5' : ''}
                                ${isCurrentMonth && isSelected ? 'bg-car-teal text-white shadow-md shadow-car-teal/30 hover:bg-teal-600 hover:scale-105' : ''}
                            `}
                        >
                            {format(day, 'd')}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 text-center">
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">{selectedDates.length} date(s) sélectionnée(s) au total</span>
            </div>
        </div>
    );
};

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
      localStorage.setItem('categoryAccess', data.categoryAccess);
      setAuth({ token: data.token, role: data.role, categoryAccess: data.categoryAccess });
    } catch (err) { setError('Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-car-blue/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-car-pink/10 rounded-full blur-3xl"></div>
      
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-sm border border-slate-100 relative z-10">
        <div className="mb-8">
            <LogoTexte className="text-4xl mb-2" />
            <p className="text-center text-slate-400 font-semibold tracking-widest text-xs uppercase mt-2">Périscolaire</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div><input type="text" placeholder="Identifiant" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} /></div>
          <div><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} /></div>
          {error && <p className="text-car-pink text-sm font-bold text-center bg-car-pink/10 p-3 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-car-dark/20 hover:-translate-y-1 mt-4">Connexion</button>
        </form>
      </div>
    </div>
  );
};

// 2. DASHBOARD
const Dashboard = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const access = localStorage.getItem('categoryAccess') || 'Tous';
  
  const getSuggestedSlot = () => new Date().getHours() < 13 ? 'MATIN' : 'SOIR';
  const handleLogout = () => { localStorage.clear(); window.location.href = '/'; };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white px-6 py-4 shadow-sm flex justify-between items-center sticky top-0 z-10">
        <LogoTexte className="text-2xl" />
        <div className="flex items-center gap-4">
            {access !== 'Tous' && <span className="text-xs font-black text-car-teal bg-car-teal/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{access}</span>}
            <span className="text-xs font-black text-car-purple bg-car-purple/10 px-4 py-1.5 rounded-full uppercase tracking-widest">{role}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-car-pink transition-colors p-2"><LogOut size={22} /></button>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-10 mt-4">
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
                    <div className="p-5 rounded-3xl mb-4 bg-car-yellow/10 text-car-yellow group-hover:scale-110 transition-transform"><Sun strokeWidth={2.5} size={40} /></div>
                    <span className="font-black text-car-dark text-xl uppercase tracking-wider">Matin</span>
                </button>

                <button onClick={() => navigate(`/session/${format(new Date(), 'yyyy-MM-dd')}/SOIR`)} 
                className={`group relative p-8 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all bg-white hover:shadow-2xl hover:-translate-y-1 ${getSuggestedSlot() === 'SOIR' ? 'border-car-blue shadow-lg shadow-car-blue/10' : 'border-slate-100'}`}>
                    <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-car-blue opacity-50 group-hover:animate-ping"></div>
                    <div className="p-5 rounded-3xl mb-4 bg-car-blue/10 text-car-blue group-hover:scale-110 transition-transform"><Moon strokeWidth={2.5} size={40} /></div>
                    <span className="font-black text-car-dark text-xl uppercase tracking-wider">Soir</span>
                </button>
            </div>
        </section>

        {role === 'admin' && (
          <section className="pt-6 border-t border-slate-200 border-dashed">
            <div className="flex items-center gap-3 mb-6 ml-2">
                <div className="h-2 w-2 rounded-full bg-car-purple"></div>
                <h2 className="text-slate-400 uppercase text-xs font-black tracking-[0.2em]">Administration</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => navigate('/report')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-teal/10 p-4 rounded-2xl w-fit group-hover:bg-car-teal group-hover:text-white text-car-teal transition-colors"><FileText size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Rapports</h3><p className="text-xs text-slate-500 font-medium mt-1">Historique & PDF</p></div>
                </button>
                <button onClick={() => navigate('/admin/children')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-green/10 p-4 rounded-2xl w-fit group-hover:bg-car-green group-hover:text-white text-car-green transition-colors"><Users size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Enfants</h3><p className="text-xs text-slate-500 font-medium mt-1">Base de données</p></div>
                </button>
                <button onClick={() => navigate('/admin/users')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-purple/10 p-4 rounded-2xl w-fit group-hover:bg-car-purple group-hover:text-white text-car-purple transition-colors"><Shield size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Équipe</h3><p className="text-xs text-slate-500 font-medium mt-1">Accès & Rôles</p></div>
                </button>
                <button onClick={() => navigate('/admin/planned-notes')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col gap-4 text-left group">
                    <div className="bg-car-pink/10 p-4 rounded-2xl w-fit group-hover:bg-car-pink group-hover:text-white text-car-pink transition-colors"><CalendarDays size={24} strokeWidth={2.5}/></div>
                    <div><h3 className="font-black text-car-dark text-lg">Notes programmées</h3><p className="text-xs text-slate-500 font-medium mt-1">& notes récurrentes</p></div>
                </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

// --- NOUVEAU MODULE ADMIN : NOTES PLANIFIÉES ---
const PlannedNotesManager = () => {
    const [children, setChildren] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [plannedNotes, setPlannedNotes] = useState([]);
    
    const [newNote, setNewNote] = useState('');
    const [selectedDates, setSelectedDates] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        axios.get(`${API_URL}/children`).then(res => setChildren(res.data));
    }, []);

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase()));
    }, [children, search]);

    const selectChild = async (child) => {
        setSelectedChild(child);
        setSearch('');
        loadNotes(child._id);
    };

    const loadNotes = async (childId) => {
        const { data } = await axios.get(`${API_URL}/planned-notes/child/${childId}`);
        setPlannedNotes(data);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if(selectedDates.length === 0) return alert("Veuillez sélectionner au moins une date.");
        await axios.post(`${API_URL}/planned-notes`, { childId: selectedChild._id, note: newNote, dates: selectedDates });
        setNewNote('');
        setSelectedDates([]);
        loadNotes(selectedChild._id);
    };

    const handleDeleteNote = async (id) => {
        if(window.confirm("Supprimer cette note planifiée ?")) {
            await axios.delete(`${API_URL}/planned-notes/${id}`);
            loadNotes(selectedChild._id);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="bg-white shadow-sm z-20 sticky top-0 p-4 border-b border-slate-100 flex items-center gap-4">
                <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors">← Retour</button>
                <div className="flex items-center gap-2">
                    <CalendarDays className="text-car-pink"/>
                    <h1 className="font-black text-car-dark text-xl">Notes Planifiées</h1>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                    <input type="text" className="w-full pl-14 p-4 bg-white shadow-sm border border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-car-pink/20 outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg"
                        placeholder="Rechercher un enfant pour gérer son planning..." value={search} onChange={e => setSearch(e.target.value)} />
                    
                    {search.length >= 2 && (
                        <div className="bg-white shadow-2xl rounded-2xl max-h-60 overflow-y-auto absolute w-full mt-2 z-30 border border-slate-100">
                            {filteredSearch.map(child => (
                                <div key={child._id} onClick={() => selectChild(child)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <span className="font-black text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {selectedChild && (
                    <div className="bg-slate-100 rounded-[2rem] p-2">
                        <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2 flex items-center gap-4">
                            <div className="bg-car-pink/10 p-3 rounded-xl text-car-pink"><Users size={24}/></div>
                            <div>
                                <h2 className="text-2xl font-black text-car-dark">{selectedChild.lastName} {selectedChild.firstName}</h2>
                                <span className="text-xs font-bold text-slate-400 uppercase">{selectedChild.category || 'Maternelle'}</span>
                            </div>
                        </div>

                        {plannedNotes.length > 0 && (
                            <div className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 mb-2">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Notes existantes</h3>
                                <div className="space-y-3">
                                    {plannedNotes.map(pn => (
                                        <div key={pn._id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div>
                                                <div className="font-bold text-car-dark mb-1">{pn.note}</div>
                                                <div className="text-xs text-slate-500 font-medium">Pour {pn.dates.length} date(s) enregistrée(s)</div>
                                            </div>
                                            <button onClick={() => handleDeleteNote(pn._id)} className="text-slate-300 hover:text-car-pink bg-white p-2 rounded-lg shadow-sm transition-colors"><Trash2 size={20}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <form onSubmit={handleAddNote} className="bg-white rounded-[1.5rem] p-6 shadow-sm border border-slate-200 flex flex-col">
                                <h3 className="font-black text-car-dark mb-4 text-sm tracking-widest text-slate-400 uppercase">Ajouter une info</h3>
                                <textarea 
                                    className="w-full bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-pink/20 outline-none font-medium text-car-dark resize-none flex-1 mb-4"
                                    placeholder="Ex: Part avec Mamie à 16h30..."
                                    value={newNote} onChange={e => setNewNote(e.target.value)} required
                                ></textarea>
                                <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-dark/20 hover:bg-black transition-all flex justify-center items-center gap-2">
                                    <Check size={20}/> ENREGISTRER NOTE
                                </button>
                            </form>
                            
                            <InteractiveCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. SESSION / LISTE DE PRÉSENCE
const SessionView = () => {
    const { date, type } = useParams();
    const [children, setChildren] = useState([]); 
    const [attendance, setAttendance] = useState([]); 
    const [search, setSearch] = useState('');
    
    const [noteModal, setNoteModal] = useState({ show: false, attendanceId: null, text: '' });
    const [readNoteModal, setReadNoteModal] = useState({ show: false, attendanceId: null, text: '', name: '', color: '' });
    const [plannedNotes, setPlannedNotes] = useState([]);

    const navigate = useNavigate();

    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    const isMatin = type === 'MATIN';
    const themeColor = isMatin ? 'car-yellow' : 'car-blue';

    const postItColors = ['bg-car-blue', 'bg-car-yellow', 'bg-car-teal', 'bg-car-pink', 'bg-car-green'];

    useEffect(() => { 
        loadData(); 
        const interval = setInterval(() => loadData(), 5000);
        return () => clearInterval(interval);
    }, [date, type]);

    const loadData = async () => {
        const [kidsRes, attRes, notesRes] = await Promise.all([
            axios.get(`${API_URL}/children`), 
            axios.get(`${API_URL}/attendance?date=${date}&sessionType=${type}`),
            axios.get(`${API_URL}/planned-notes/date?date=${date}`)
        ]);
        setChildren(kidsRes.data); 
        setAttendance(attRes.data);
        setPlannedNotes(notesRes.data);
    };

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return children.filter(c => {
            const matchSearch = c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase());
            const matchCategory = categoryFilter === 'Tous' || c.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [children, search, categoryFilter]);

    const filteredAttendance = useMemo(() => {
        return attendance.filter(a => categoryFilter === 'Tous' || a.child.category === categoryFilter);
    }, [attendance, categoryFilter]);

    const sortedAttendance = useMemo(() => {
        return [...filteredAttendance].sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));
    }, [filteredAttendance]);

    const activeCount = filteredAttendance.filter(a => !a.checkOut).length;
    const totalCount = filteredAttendance.length;

    const handleCheckIn = async (childId) => {
        await axios.post(`${API_URL}/attendance/checkin`, { childId, date, sessionType: type });
        loadData(); setSearch('');
    };

    const handleCheckOut = async (id) => {
        await axios.put(`${API_URL}/attendance/checkout/${id}`);
        loadData(); setSearch('');
    };

    const handleDepartureClick = (record) => {
        if (record.note) {
            const randomColor = postItColors[Math.floor(Math.random() * postItColors.length)];
            setReadNoteModal({ 
                show: true, 
                attendanceId: record._id, 
                text: record.note, 
                name: `${record.child.firstName} ${record.child.lastName}`,
                color: randomColor
            });
        } else {
            handleCheckOut(record._id);
        }
    };

    const handleUndoCheckOut = async (id) => {
        await axios.put(`${API_URL}/attendance/undo-checkout/${id}`);
        loadData();
    };

    const handleDeleteCheckIn = async (id) => {
        if(window.confirm("Annuler la présence ?")) {
            await axios.delete(`${API_URL}/attendance/${id}`);
            loadData();
        }
    };

    const saveNote = async () => {
        await axios.put(`${API_URL}/attendance/note/${noteModal.attendanceId}`, { note: noteModal.text });
        setNoteModal({ show: false, attendanceId: null, text: '' });
        loadData();
    };

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément de retard ?")) {
            await axios.put(`${API_URL}/attendance/remove-late/${id}`);
            loadData();
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 relative">
            <div className="bg-white shadow-sm z-20">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors w-full sm:w-auto text-left">← Retour</button>
                    <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />
                    <div className={`bg-${themeColor}/10 text-${themeColor} px-5 py-2 rounded-full font-black text-sm tracking-widest w-full sm:w-auto text-center`}>
                        {type} • {activeCount} / {totalCount} PRÉSENTS
                    </div>
                </div>
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative max-w-4xl mx-auto">
                        <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                        <input type="text" className={`w-full pl-14 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-${themeColor} outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg`}
                            placeholder="Rechercher pour pointer une arrivée ou un départ..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>
            </div>

            {search.length >= 2 && (
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl max-h-80 overflow-y-auto absolute w-full top-[220px] sm:top-36 z-30 border-b border-slate-200">
                    <div className="max-w-4xl mx-auto">
                        {filteredSearch.map(child => {
                            const attendanceRecord = attendance.find(a => a.child._id === child._id);
                            const isPresent = !!attendanceRecord;
                            const isGone = isPresent && !!attendanceRecord.checkOut;

                            return (
                                <div key={child._id} 
                                    onClick={() => {
                                        if (!isPresent) handleCheckIn(child._id);
                                        else if (!isGone && !isMatin) handleDepartureClick(attendanceRecord);
                                    }} 
                                    className="p-5 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-colors group">
                                    <span className="font-black text-xl text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                    {!isPresent && <span className={`bg-${themeColor} text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider`}>+ AJOUTER</span>}
                                    {isPresent && !isGone && !isMatin && <span className="bg-car-dark text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">DÉPART</span>}
                                    {isGone && <span className="text-slate-400 text-xs font-bold px-4 py-2 rounded-xl">Déjà parti</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-4xl mx-auto w-full pb-20 mt-4">
                {sortedAttendance.map(record => {
                    const isGone = !!record.checkOut;
                    const childNotes = plannedNotes.filter(pn => pn.child === record.child._id);

                    return (
                        <div key={record._id} className={`p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isGone ? 'bg-white/50 border border-slate-200' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100'}`}>
                            <div className="w-full sm:w-auto">
                                <div className={`font-black text-xl flex items-center gap-2 ${isGone ? 'text-slate-400 line-through decoration-slate-300' : 'text-car-dark'}`}>
                                    {record.child.lastName} <span className="font-medium">{record.child.firstName}</span>
                                    {record.note && !isGone && <StickyNote size={18} className="text-car-yellow fill-car-yellow animate-pulse"/>}
                                </div>
                                
                                {!isGone && childNotes.length > 0 && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        {childNotes.map(pn => (
                                            <div key={pn._id} className="flex items-center gap-1.5 text-car-pink bg-car-pink/10 px-2 py-0.5 rounded-md text-xs font-bold w-fit">
                                                <CalendarIcon size={12}/> {pn.note}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    {isGone && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Parti à {format(new Date(record.checkOut), 'HH:mm')}</span>}
                                    {record.isLate && <span className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg"> +19h</span>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {!isGone && (
                                    <button onClick={() => setNoteModal({ show: true, attendanceId: record._id, text: record.note || '' })} className={`p-3 rounded-2xl transition-colors ${record.note ? 'bg-car-yellow/20 text-car-yellow hover:bg-car-yellow/30' : 'bg-slate-50 text-slate-400 hover:text-car-yellow hover:bg-slate-100'}`} title="Ajouter un post-it">
                                        <StickyNote size={22}/>
                                    </button>
                                )}
                                {!isMatin && (
                                    !isGone ? (
                                        <button onClick={() => handleDepartureClick(record)} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-car-dark/20 relative">
                                            DÉPART
                                            {record.note && <div className="absolute -top-2 -right-2 bg-car-pink w-4 h-4 rounded-full border-2 border-white animate-bounce"></div>}
                                        </button>
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
            </div>

            {noteModal.show && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-car-dark">Note / Info</h3>
                            <button onClick={() => setNoteModal({...noteModal, show: false})} className="text-slate-400 hover:text-car-dark"><X size={24}/></button>
                        </div>
                        <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-car-yellow outline-none min-h-[150px] font-medium text-car-dark" placeholder="Ex: S'est fait mal au genou..." value={noteModal.text} onChange={(e) => setNoteModal({...noteModal, text: e.target.value})} autoFocus></textarea>
                        <p className="text-xs text-slate-400 font-bold mt-2 mb-6">Cette note apparaîtra au moment du départ et sera effacée ce soir.</p>
                        <button onClick={saveNote} className="w-full bg-car-yellow text-white font-black p-4 rounded-2xl hover:-translate-y-1 transition-all shadow-lg shadow-car-yellow/20">SAUVEGARDER</button>
                    </div>
                </div>
            )}
            {readNoteModal.show && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`${readNoteModal.color} rounded-[2rem] p-8 w-full max-w-md shadow-2xl transform rotate-1 scale-105 transition-transform`}>
                        <div className="flex items-center gap-3 mb-6">
                            <StickyNote className="text-white/80" size={32}/>
                            <h3 className="text-3xl font-black text-white">À transmettre !</h3>
                        </div>
                        <p className="text-white/90 font-bold text-lg mb-2 uppercase tracking-widest">{readNoteModal.name}</p>
                        <div className="bg-white/10 p-6 rounded-2xl text-white font-medium text-xl leading-relaxed mb-8 backdrop-blur-md">{readNoteModal.text}</div>
                        <button onClick={() => { handleCheckOut(readNoteModal.attendanceId); setReadNoteModal({ show: false, attendanceId: null, text: '', name: '', color: '' }); }} className="w-full bg-white text-car-dark font-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex justify-center items-center gap-2">
                            <CheckCircle size={24}/> J'AI TRANSMIS, VALIDER DÉPART
                        </button>
                        <button onClick={() => setReadNoteModal({...readNoteModal, show: false})} className="w-full mt-4 text-white/80 font-bold p-2 hover:text-white transition-colors">Annuler, ne pas faire partir</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. ADMIN USERS
const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
    const navigate = useNavigate();

    useEffect(() => { loadUsers(); }, []);
    const loadUsers = async () => { const { data } = await axios.get(`${API_URL}/users`); setUsers(data); };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/users`, newUser);
            setNewUser({ username: '', password: '', role: 'staff', categoryAccess: 'Tous' });
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

                <form onSubmit={handleAdd} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 mb-10 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Nom d'utilisateur" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-purple/20 outline-none font-bold text-car-dark" placeholder="Mot de passe" type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required/>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-purple/20" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Staff (Anim)</option>
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
                        <div key={u._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${u.role === 'admin' ? 'bg-car-purple/10 text-car-purple' : 'bg-slate-100 text-slate-400'}`}>
                                    {u.role === 'admin' ? <Shield size={24}/> : <Users size={24}/>}
                                </div>
                                <div>
                                    <span className="font-black text-car-dark text-xl block">{u.username}</span>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{u.role}</span>
                                        <span className="text-xs font-bold text-car-teal bg-car-teal/10 px-2 py-0.5 rounded-md uppercase tracking-widest">{u.categoryAccess || 'Tous'}</span>
                                    </div>
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
    const [newChild, setNewChild] = useState({ firstName: '', lastName: '', category: 'Maternelle' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', category: 'Maternelle' });
    const navigate = useNavigate();

    useEffect(() => { loadChildren(); }, []);
    const loadChildren = () => axios.get(`${API_URL}/children`).then(res => setChildren(res.data));

    const handleAdd = async (e) => {
        e.preventDefault();
        await axios.post(`${API_URL}/children`, newChild);
        setNewChild({ firstName: '', lastName: '', category: 'Maternelle' });
        loadChildren();
    };

    const handleDelete = async (id, nom) => {
        if(window.confirm(`Retirer ${nom} ?`)) {
            await axios.delete(`${API_URL}/children/${id}`);
            loadChildren();
        }
    };

    const startEdit = (child) => {
        setEditingId(child._id);
        setEditForm({ firstName: child.firstName, lastName: child.lastName, category: child.category || 'Maternelle' });
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
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-black text-car-dark placeholder:font-bold placeholder:text-slate-400 flex-1 uppercase" placeholder="NOM" value={newChild.lastName} onChange={e => setNewChild({...newChild, lastName: e.target.value.toUpperCase()})} required/>
                    <input className="bg-slate-50 border-none p-4 rounded-2xl focus:ring-4 focus:ring-car-green/20 outline-none font-bold text-car-dark placeholder:text-slate-400 flex-1" placeholder="Prénom" value={newChild.firstName} onChange={e => setNewChild({...newChild, firstName: e.target.value})} required/>
                    <select className="bg-slate-50 border-none p-4 rounded-2xl font-bold text-car-dark outline-none focus:ring-4 focus:ring-car-green/20" value={newChild.category} onChange={e => setNewChild({...newChild, category: e.target.value})}>
                        <option value="Maternelle">Maternelle</option>
                        <option value="Élémentaire">Élémentaire</option>
                    </select>
                    <button type="submit" className="bg-car-green text-white px-8 py-4 rounded-2xl font-black tracking-widest shadow-lg shadow-car-green/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"><Plus strokeWidth={3}/> AJOUTER</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {children.map(child => (
                        <div key={child._id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                            {editingId === child._id ? (
                                <div className="flex-1 flex flex-col gap-2 mr-4">
                                    <input className="bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-black text-car-dark w-full uppercase text-sm" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value.toUpperCase()})} />
                                    <input className="bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-bold text-car-dark w-full text-sm" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} />
                                    <select className="bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-2 focus:ring-car-green/50 outline-none font-bold text-car-dark w-full text-sm" value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}>
                                        <option value="Maternelle">Maternelle</option>
                                        <option value="Élémentaire">Élémentaire</option>
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <span className="font-black text-car-dark text-xl block">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                    <span className={`text-xs font-black px-3 py-1 rounded-lg tracking-widest mt-2 inline-block ${child.category === 'Élémentaire' ? 'bg-car-blue/10 text-car-blue' : 'bg-car-yellow/10 text-car-yellow'}`}>
                                        {child.category || 'Maternelle'}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {editingId === child._id ? (
                                    <>
                                        <button onClick={() => saveEdit(child._id)} className="bg-car-green text-white p-2 rounded-xl shadow-md"><Check size={20}/></button>
                                        <button onClick={() => setEditingId(null)} className="bg-slate-100 text-slate-500 p-2 rounded-xl"><X size={20}/></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => startEdit(child)} className="text-slate-400 hover:text-car-blue p-2 bg-slate-50 rounded-xl"><Pencil size={20}/></button>
                                        <button onClick={() => handleDelete(child._id, `${child.firstName} ${child.lastName}`)} className="text-slate-400 hover:text-car-pink p-2 bg-slate-50 rounded-xl"><Trash2 size={20}/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 6. RAPPORT
const Report = () => {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState([]);
    const navigate = useNavigate();
    
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    useEffect(() => { loadReport(); }, [date]);

    const loadReport = () => axios.get(`${API_URL}/report?date=${date}`).then(res => setReportData(res.data));

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément ?")) {
            await axios.put(`${API_URL}/attendance/remove-late/${id}`);
            loadReport();
        }
    };

    const filteredReportData = useMemo(() => {
        return reportData.filter(r => categoryFilter === 'Tous' || r.child.category === categoryFilter);
    }, [reportData, categoryFilter]);

    const exportPDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["Nom", "Prénom", "Catégorie", "Matin", "Soir", "Suppl."];
        
        const tableRows = filteredReportData.map(row => {
            const matinText = row.matin ? 'OUI' : '-';
            let soirText = '-';
            if (row.checkOut) soirText = format(new Date(row.checkOut), 'HH:mm');
            else if (row.soir) soirText = 'OUI';
            
            return [row.child.lastName, row.child.firstName, row.child.category || 'Maternelle', matinText, soirText, row.isLate ? 'OUI' : '-'];
        });

        const totalMatin = filteredReportData.filter(r => r.matin).length;
        const totalSoir = filteredReportData.filter(r => r.soir || r.checkOut).length;
        const totalLate = filteredReportData.filter(r => r.isLate).length;

        doc.setFontSize(18);
        doc.text(`Rapport Journalier - ${format(new Date(date), 'dd/MM/yyyy')} ${categoryFilter !== 'Tous' ? `(${categoryFilter})` : ''}`, 14, 22);
        
        autoTable(doc, {
            startY: 35,
            head: [tableColumn],
            body: tableRows,
            foot: [["TOTAL", "", "", totalMatin.toString(), totalSoir.toString(), totalLate.toString()]],
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            theme: 'grid',
            headStyles: { fillColor: [84, 132, 164], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, textColor: [58, 58, 58] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            halign: 'center'
        });

        doc.save(`carillon_rapport_${date}.pdf`);
    };

    const totalMatin = filteredReportData.filter(r => r.matin).length;
    const totalSoir = filteredReportData.filter(r => r.soir || r.checkOut).length;
    const totalLate = filteredReportData.filter(r => r.isLate).length;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><FileText className="text-car-blue w-8 h-8"/></div>
                        <h1 className="text-4xl font-black text-car-dark">Rapports</h1>
                    </div>
                    <button onClick={exportPDF} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-lg shadow-car-dark/20"><Download size={20}/> PDF</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 mb-8">
                    <input type="date" className="bg-slate-50 p-4 rounded-2xl outline-none font-bold text-car-dark flex-1 cursor-pointer" value={date} onChange={e => setDate(e.target.value)} />
                    <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-xs tracking-wider">
                                <th className="p-5 border-b border-slate-100">Nom</th>
                                <th className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">Catégorie</th>
                                <th className="p-5 border-b border-slate-100 text-center">Matin</th>
                                <th className="p-5 border-b border-slate-100 text-center">Soir</th>
                                <th className="p-5 border-b border-slate-100 text-center">19h</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReportData.map(row => (
                                <tr key={row.child._id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5 border-b border-slate-100">
                                        <span className="font-black text-car-dark">{row.child.lastName}</span> <span className="font-medium text-slate-500">{row.child.firstName}</span>
                                    </td>
                                    <td className="p-5 border-b border-slate-100 text-center hidden sm:table-cell">
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{row.child.category || 'Maternelle'}</span>
                                    </td>
                                    <td className="p-5 border-b border-slate-100 text-center">
                                        {row.matin ? <CheckCircle className="text-car-yellow mx-auto" size={24}/> : <span className="text-slate-300 font-bold">-</span>}
                                    </td>
                                    <td className="p-5 border-b border-slate-100 text-center">
                                        {row.checkOut ? (
                                            <span className="font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{format(new Date(row.checkOut), 'HH:mm')}</span>
                                        ) : row.soir ? (
                                            <CheckCircle className="text-car-blue mx-auto" size={24}/>
                                        ) : <span className="text-slate-300 font-bold">-</span>}
                                    </td>
                                    <td className="p-5 border-b border-slate-100 text-center">
                                        {row.isLate ? (
                                            <button onClick={() => handleRemoveLate(row.pmId)} className="text-xs font-bold text-white bg-car-pink hover:bg-red-500 px-3 py-1 rounded-lg transition-colors cursor-pointer shadow-sm"> +19h</button>
                                        ) : <span className="text-slate-300 font-bold">-</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {filteredReportData.length > 0 && (
                            <tfoot className="bg-slate-100/80 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan="2" className="p-5 font-black text-car-dark text-right sm:table-cell hidden">TOTAL PRÉSENCES</td>
                                    <td className="p-5 font-black text-car-dark text-right sm:hidden">TOTAL</td>
                                    <td className="p-5 font-black text-car-dark text-center text-lg">{totalMatin}</td>
                                    <td className="p-5 font-black text-car-dark text-center text-lg">{totalSoir}</td>
                                    <td className="p-5 font-black text-car-pink text-center text-lg">{totalLate}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
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
        <Route path="/admin/planned-notes" element={<PlannedNotesManager />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}