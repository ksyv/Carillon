import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Wifi, WifiOff, Search, Info, StickyNote, RotateCcw, Trash2, CheckCircle, X, Calendar as CalendarIcon } from 'lucide-react';
import CategoryFilter from '../components/CategoryFilter';
import EmergencyModal from '../components/EmergencyModal';
import ChildInfoModal from '../components/ChildInfoModal';



const SessionView = () => {
    const { date, type } = useParams();
    const role = localStorage.getItem('role');
    const [allChildren, setAllChildren] = useState([]); 
    const [attendance, setAttendance] = useState([]); 
    const [amAttendance, setAmAttendance] = useState([]); 
    const [search, setSearch] = useState('');
    
    const [noteModal, setNoteModal] = useState({ show: false, attendanceId: null, text: '', amNote: '' });
    const [readNoteModal, setReadNoteModal] = useState({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' });
    const [plannedNotes, setPlannedNotes] = useState([]);
    const [childInfoToView, setChildInfoToView] = useState(null); 
    const [showEmergency, setShowEmergency] = useState(false);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSync, setPendingSync] = useState(0);

    const navigate = useNavigate();
    const access = localStorage.getItem('categoryAccess') || 'Tous';
    const [categoryFilter, setCategoryFilter] = useState(access);

    const isMatin = type === 'MATIN';
    const isMidi = type === 'MIDI'; 
    const themeColor = isMatin ? 'car-yellow' : (isMidi ? 'car-teal' : 'car-blue');
    const postItColors = ['bg-car-blue', 'bg-car-yellow', 'bg-car-teal', 'bg-car-pink', 'bg-car-green'];

    useEffect(() => {
        if (role !== 'admin') {
            const now = new Date();
            const time = now.getHours() * 60 + now.getMinutes();
            let locked = true;
            if (type === 'MATIN' && time >= 435 && time <= 525) locked = false;
            if (type === 'MIDI' && time >= 705 && time <= 845) locked = false;
            if (type === 'SOIR' && time >= 975 && time <= 1155) locked = false;
            if (locked) navigate('/');
        }
    }, [type, role, navigate]);

    const syncOfflineActions = async () => {
        const queueStr = localStorage.getItem('syncQueue');
        if (!queueStr) return;
        const queue = JSON.parse(queueStr);
        if (queue.length === 0) return;

        try {
            await api.post(`/attendance/sync`, { actions: queue });
            localStorage.removeItem('syncQueue'); 
            setPendingSync(0);
            setIsOnline(true); 
            loadData(); 
        } catch (e) {
            setIsOnline(false); 
        }
    };

    const loadLocalFallback = () => {
        const cachedKids = localStorage.getItem('offline_children');
        const cachedAtt = localStorage.getItem(`offline_attendance_${date}_${type}`);
        const cachedAmAtt = localStorage.getItem(`offline_attendance_${date}_MATIN`);
        const cachedNotes = localStorage.getItem(`offline_notes_${date}`);
        
        if (cachedKids) setAllChildren(JSON.parse(cachedKids));
        if (cachedAtt) setAttendance(JSON.parse(cachedAtt));
        if (cachedAmAtt && type === 'SOIR') setAmAttendance(JSON.parse(cachedAmAtt));
        if (cachedNotes) setPlannedNotes(JSON.parse(cachedNotes));
    };

    const loadData = async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            loadLocalFallback();
            return;
        }
        try {
            const [kidsRes, attRes, amAttRes, notesRes] = await Promise.all([
                api.get(`/children`), 
                api.get(`/attendance?date=${date}&sessionType=${type}`),
                type === 'SOIR' ? api.get(`/attendance?date=${date}&sessionType=MATIN`) : Promise.resolve({ data: [] }),
                api.get(`/planned-notes/date?date=${date}`)
            ]);
            setIsOnline(true); 
            setAllChildren(kidsRes.data); 
            setAttendance(attRes.data);
            setAmAttendance(amAttRes.data);
            setPlannedNotes(notesRes.data);

            localStorage.setItem('offline_children', JSON.stringify(kidsRes.data));
            localStorage.setItem(`offline_attendance_${date}_${type}`, JSON.stringify(attRes.data));
            if (type === 'SOIR') localStorage.setItem(`offline_attendance_${date}_MATIN`, JSON.stringify(amAttRes.data));
            localStorage.setItem(`offline_notes_${date}`, JSON.stringify(notesRes.data));
            
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            setPendingSync(queue.length);
        } catch (error) {
            setIsOnline(false); 
            loadLocalFallback();
        }
    };

    useEffect(() => { 
        let isMounted = true;
        let timeoutId;
        const loop = async () => {
            if (!isMounted) return;
            await loadData();
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            if (navigator.onLine && queue.length > 0) {
                await syncOfflineActions();
            } else {
                setPendingSync(queue.length);
            }
            timeoutId = setTimeout(loop, 5000);
        };
        loop();

        const handleOnline = () => { setIsOnline(true); syncOfflineActions(); };
        const handleOffline = () => { setIsOnline(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [date, type]);

    const processAction = async (actionDef, optimisticUpdate) => {
        const timestamp = Date.now();
        const action = { ...actionDef, timestamp, date, sessionType: type };

        setAttendance(prev => optimisticUpdate(prev, timestamp));
        const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        queue.push(action);
        localStorage.setItem('syncQueue', JSON.stringify(queue));
        setPendingSync(queue.length);

        setAttendance(currentAtt => {
            localStorage.setItem(`offline_attendance_${date}_${type}`, JSON.stringify(currentAtt));
            return currentAtt;
        });
        if (navigator.onLine) syncOfflineActions();
    };

    const activeChildren = useMemo(() => allChildren.filter(c => c.active !== false), [allChildren]);

    const handleCheckIn = (childId) => {
        const childObj = activeChildren.find(c => c._id === childId);
        processAction(
            { type: 'CHECK_IN', childId },
            (prev, ts) => [...prev, { _id: `temp_${ts}`, child: childObj, checkIn: new Date(ts).toISOString(), checkOut: null, isLate: false }]
        );
        setSearch('');
    };

    const handleCheckOut = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        const limit = new Date(); limit.setHours(18, 35, 0, 0);
        const isLate = type === 'SOIR' ? (new Date() > limit) : false; 

        processAction(
            { type: 'CHECK_OUT', childId: record.child._id },
            (prev, ts) => prev.map(a => a._id === recordId ? { ...a, checkOut: new Date(ts).toISOString(), isLate } : a)
        );
        setSearch('');
    };

    const handleUndoCheckOut = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        processAction(
            { type: 'CHECK_IN', childId: record.child._id },
            (prev) => prev.map(a => a._id === recordId ? { ...a, checkOut: null, isLate: false } : a)
        );
    };

    const handleDeleteCheckIn = (recordId) => {
        const record = attendance.find(a => a._id === recordId);
        if (!record) return;
        const msg = isMidi ? "Annuler l'absence de cet enfant ?" : "Annuler la présence ?";
        if(window.confirm(msg)) {
            processAction(
                { type: 'DELETE', childId: record.child._id },
                (prev) => prev.filter(a => a._id !== recordId)
            );
        }
    };

    const saveNote = () => {
        const record = attendance.find(a => a._id === noteModal.attendanceId);
        if (!record) return;
        processAction(
            { type: 'ADD_NOTE', childId: record.child._id, note: noteModal.text },
            (prev) => prev.map(a => a._id === noteModal.attendanceId ? { ...a, note: noteModal.text } : a)
        );
        setNoteModal({ show: false, attendanceId: null, text: '', amNote: '' });
    };

    const handleRemoveLate = async (id) => {
        if(window.confirm("Supprimer le supplément de retard ?")) {
            await api.put(`/attendance/remove-late/${id}`);
            loadData();
        }
    };

    const filteredSearch = useMemo(() => {
        if (search.length < 2) return [];
        return activeChildren.filter(c => {
            const matchSearch = c.lastName.toLowerCase().includes(search.toLowerCase()) || c.firstName.toLowerCase().includes(search.toLowerCase());
            const matchCategory = categoryFilter === 'Tous' || c.category === categoryFilter;
            return matchSearch && matchCategory;
        });
    }, [activeChildren, search, categoryFilter]);

    const filteredAttendance = useMemo(() => {
        return attendance.filter(a => categoryFilter === 'Tous' || a.child.category === categoryFilter);
    }, [attendance, categoryFilter]);

    const sortedAttendance = useMemo(() => {
        return [...filteredAttendance].sort((a, b) => a.child.lastName.localeCompare(b.child.lastName));
    }, [filteredAttendance]);

    const activeCount = filteredAttendance.filter(a => !a.checkOut).length;
    const totalCount = filteredAttendance.length;

    const totalCategoryChildren = activeChildren.filter(c => categoryFilter === 'Tous' || c.category === categoryFilter).length;
    const midiPresents = totalCategoryChildren - totalCount; 

    const handleDepartureClick = (record) => {
        const amRecord = type === 'SOIR' ? amAttendance.find(a => a.child._id === record.child._id) : null;
        const amNote = amRecord?.note || '';
        const persistentNote = record.child.persistentNote || '';
        
        let combinedDisplay = [];
        let combinedSave = [];

        if (persistentNote) {
            combinedDisplay.push(`⚠️ EN ATTENTE : ${persistentNote}`);
            combinedSave.push(persistentNote);
        }
        if (type === 'SOIR' && amNote) {
            combinedDisplay.push(`MATIN : ${amNote}`);
            combinedSave.push(`Matin: ${amNote}`);
        }
        if (record.note) {
            combinedDisplay.push(`${type === 'SOIR' ? 'SOIR : ' : ''}${record.note}`);
            combinedSave.push(record.note);
        }

        if (combinedDisplay.length > 0) {
            const randomColor = postItColors[Math.floor(Math.random() * postItColors.length)];
            setReadNoteModal({ 
                show: true, 
                attendanceId: record._id, 
                childId: record.child._id,
                text: combinedDisplay.join('\n\n'), 
                textToSave: combinedSave.join(' | '),
                name: `${record.child.firstName} ${record.child.lastName}`,
                color: randomColor
            });
        } else {
            handleCheckOut(record._id);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 relative">
            <div className="bg-white shadow-sm z-20">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-dark font-bold transition-colors w-full sm:w-auto text-left">← Retour</button>
                    
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowEmergency(true)} className="flex items-center gap-2 bg-car-pink text-white px-4 py-2 rounded-xl text-sm font-black tracking-widest hover:bg-red-600 transition-colors shadow-md shadow-car-pink/30 animate-pulse">
                            <AlertTriangle size={18} /> URGENCE
                        </button>

                        {isOnline ? (
                            <div className="flex items-center gap-2 text-car-teal bg-car-teal/10 px-3 py-1.5 rounded-lg text-xs font-bold hidden sm:flex">
                                <Wifi size={16}/> {pendingSync > 0 ? `${pendingSync} en attente...` : 'En ligne'}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-car-pink bg-car-pink/10 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse hidden sm:flex">
                                <WifiOff size={16}/> HORS-LIGNE ({pendingSync})
                            </div>
                        )}
                        <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} access={access} />
                    </div>

                    <div className={`bg-${themeColor}/10 text-${themeColor} px-5 py-2 rounded-full font-black text-sm tracking-widest w-full sm:w-auto text-center`}>
                        {type} • {isMidi ? `${midiPresents} PRÉSENTS` : `${activeCount} / ${totalCount} PRÉSENTS`}
                    </div>
                </div>
                <div className="p-4 bg-white border-b border-slate-100">
                    <div className="relative max-w-4xl mx-auto">
                        <Search className="absolute left-4 top-4 text-slate-400" size={24}/>
                        <input type="text" className={`w-full pl-14 p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-${themeColor} outline-none font-bold text-car-dark placeholder:text-slate-400 transition-all text-lg`}
                            placeholder={isMidi ? "Rechercher un enfant pour le marquer ABSENT à la cantine..." : "Rechercher pour pointer une arrivée ou un départ..."} value={search} onChange={e => setSearch(e.target.value)} />
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
                                <div key={child._id} className="p-5 flex justify-between items-center hover:bg-slate-100 transition-colors group rounded-2xl mb-1">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setChildInfoToView(child)} className="text-slate-300 hover:text-car-blue bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-colors">
                                            <Info size={20}/>
                                        </button>
                                        <span className="font-black text-xl text-car-dark">{child.lastName} <span className="font-medium text-slate-500">{child.firstName}</span></span>
                                        {child.hasPAI && <AlertTriangle size={18} className="text-car-pink fill-car-pink"/>}
                                    </div>
                                    
                                    <div onClick={() => {
                                        if (!isPresent) handleCheckIn(child._id);
                                        else if (!isGone && !isMatin && !isMidi) handleDepartureClick(attendanceRecord);
                                    }} className="cursor-pointer">
                                        {!isPresent && <span className={`bg-${themeColor} text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider`}>{isMidi ? 'MARQUER ABSENT' : '+ AJOUTER'}</span>}
                                        {isPresent && !isGone && !isMatin && !isMidi && <span className="bg-car-dark text-white text-xs font-bold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity tracking-wider">DÉPART</span>}
                                        {isGone && !isMidi && <span className="text-slate-400 text-xs font-bold px-4 py-2 rounded-xl">Déjà parti</span>}
                                        {isPresent && isMidi && <span className="text-slate-400 text-xs font-bold px-4 py-2 rounded-xl">Déjà noté absent</span>}
                                    </div>
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

                    const amRecord = type === 'SOIR' ? amAttendance.find(a => a.child._id === record.child._id) : null;
                    const amNote = amRecord?.note || '';
                    const persistentNote = record.child.persistentNote || '';
                    const hasAnyNote = record.note || (type === 'SOIR' && amNote) || persistentNote;

                    return (
                        <div key={record._id} className={`p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all ${isGone ? 'bg-slate-50 opacity-70' : 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]'}`}>
                            <div className="w-full sm:w-auto">
                                <div className={`font-black text-xl flex items-center gap-2 ${isGone ? 'text-slate-400 line-through decoration-slate-300' : 'text-car-dark'}`}>
                                    <button onClick={() => setChildInfoToView(record.child)} className="text-slate-300 hover:text-car-blue mr-2 transition-colors"><Info size={20}/></button>
                                    {record.child.lastName} <span className="font-medium">{record.child.firstName}</span>
                                    {record.child.hasPAI && <AlertTriangle size={18} className="text-car-pink fill-car-pink"/>}
                                    {hasAnyNote && !isGone && !isMidi && <StickyNote size={18} className="text-car-yellow fill-car-yellow animate-pulse"/>}
                                </div>
                                
                                {!isGone && childNotes.length > 0 && !isMidi && (
                                    <div className="flex flex-col gap-1 mt-1">
                                        {childNotes.map(pn => (
                                            <div key={pn._id} className="flex items-center gap-1.5 text-car-pink bg-car-pink/10 px-2 py-0.5 rounded-md text-xs font-bold w-fit">
                                                <CalendarIcon size={12}/> {pn.note}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    {isMidi && <span className="text-xs font-bold text-car-teal bg-car-teal/10 px-3 py-1 rounded-lg uppercase tracking-widest">Absent Cantine</span>}
                                    {isGone && !isMidi && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">Parti à {format(new Date(record.checkOut), 'HH:mm')}</span>}
                                    {record.isLate && !isMidi && <button onClick={() => handleRemoveLate(record._id)} className="text-xs font-bold text-white bg-car-pink px-3 py-1 rounded-lg hover:scale-105 transition-transform" title="Cliquer pour annuler le supplément"> +19h</button>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                {!isGone && !isMidi && (
                                    <button onClick={() => setNoteModal({ show: true, attendanceId: record._id, text: record.note || '', amNote: amNote })} 
                                        className={`p-3 rounded-2xl transition-colors ${hasAnyNote ? 'bg-car-yellow/20 text-car-yellow hover:bg-car-yellow/30' : 'bg-slate-50 text-slate-400 hover:text-car-yellow hover:bg-slate-100'}`} title="Ajouter un post-it">
                                        <StickyNote size={22}/>
                                    </button>
                                )}
                                
                                {!isMatin && !isMidi && (
                                    !isGone ? (
                                        <button onClick={() => handleDepartureClick(record)} className="bg-car-dark text-white px-6 py-3 rounded-2xl font-black tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg shadow-car-dark/20 relative">
                                            DÉPART
                                            {hasAnyNote && <div className="absolute -top-2 -right-2 bg-car-pink w-4 h-4 rounded-full border-2 border-white animate-bounce"></div>}
                                        </button>
                                    ) : (
                                        <button onClick={() => handleUndoCheckOut(record._id)} className="bg-slate-100 text-slate-500 p-3 rounded-2xl hover:bg-slate-200 transition-colors" title="Annuler le départ"><RotateCcw size={22}/></button>
                                    )
                                )}

                                {(!isGone || isMatin || isMidi) && (
                                    <button onClick={() => handleDeleteCheckIn(record._id)} className={`p-2 rounded-xl transition-colors ${isMidi ? 'bg-car-teal/10 text-car-teal hover:bg-car-teal hover:text-white px-4 font-bold text-sm' : 'text-slate-300 hover:text-car-pink'}`}>
                                        {isMidi ? "ANNULER ABSENCE" : <Trash2 size={24}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ChildInfoModal child={childInfoToView} onClose={() => setChildInfoToView(null)} />
            
            {showEmergency && <EmergencyModal 
                attendance={attendance} 
                allChildren={activeChildren} 
                sessionType={type} 
                access={access} 
                onClose={() => setShowEmergency(false)} 
            />}

            {noteModal.show && (
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-car-dark">Note / Info</h3>
                            <button onClick={() => setNoteModal({...noteModal, show: false})} className="text-slate-400 hover:text-car-dark"><X size={24}/></button>
                        </div>
                        {noteModal.amNote && (
                            <div className="mb-4 p-4 bg-car-yellow/10 border border-car-yellow/30 rounded-2xl text-sm font-medium text-car-dark">
                                <span className="font-black text-car-yellow uppercase tracking-widest text-xs block mb-1">Transmis ce matin :</span>
                                {noteModal.amNote}
                            </div>
                        )}
                        <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl focus:border-car-yellow outline-none min-h-[120px] font-medium text-car-dark" 
                            placeholder={noteModal.amNote ? "Ajouter une info pour le soir..." : "Ex: S'est fait mal au genou..."} 
                            value={noteModal.text} 
                            onChange={(e) => setNoteModal({...noteModal, text: e.target.value})} 
                            autoFocus>
                        </textarea>
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
                        <div className="bg-white/10 p-6 rounded-2xl text-white font-medium text-xl leading-relaxed mb-8 backdrop-blur-md whitespace-pre-wrap">
                            {readNoteModal.text}
                        </div>
                        
                        <div className="space-y-3">
                            <button onClick={() => { 
                                handleCheckOut(readNoteModal.attendanceId); 
                                api.put(`/children/${readNoteModal.childId}`, { persistentNote: "" }).then(() => loadData());
                                setReadNoteModal({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' }); 
                            }} className="w-full bg-white text-car-dark font-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex justify-center items-center gap-2">
                                <CheckCircle size={24}/> J'AI TRANSMIS, DÉPART
                            </button>
                            
                            <button onClick={() => { 
                                handleCheckOut(readNoteModal.attendanceId); 
                                api.put(`/children/${readNoteModal.childId}`, { persistentNote: readNoteModal.textToSave }).then(() => loadData());
                                setReadNoteModal({ show: false, attendanceId: null, childId: null, text: '', textToSave: '', name: '', color: '' }); 
                            }} className="w-full bg-black/20 text-white font-black p-4 rounded-2xl hover:bg-black/30 transition-all flex justify-center items-center gap-2 border border-white/30">
                                <AlertTriangle size={20}/> NON TRANSMIS (REPORTER)
                            </button>

                            <button onClick={() => setReadNoteModal({...readNoteModal, show: false})} className="w-full mt-2 text-white/80 font-bold p-2 hover:text-white transition-colors">
                                Annuler, ne pas faire partir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SessionView;