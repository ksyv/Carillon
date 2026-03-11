import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Filter, Users, AlertTriangle, CheckCircle, Loader, Paperclip, X, FileText as FileIcon, Save, Bookmark } from 'lucide-react';
import api from '../api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const Mailing = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [templates, setTemplates] = useState([]);
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [filter, setFilter] = useState('TOUS');
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const fileInputRef = useRef(null);

    // --- CONFIGURATION ÉDITEUR RICHE ---
    const quillModules = {
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'header': '1' }, { 'header': '2' }, 'blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }], // Alignement activé
            ['link', 'image'],
            ['clean']
        ],
    };

    useEffect(() => { loadData(); loadTemplates(); }, []);

    const loadData = async () => {
        try {
            const [kidsRes, famRes] = await Promise.all([api.get('/children'), api.get('/families')]);
            setChildren(kidsRes.data);
            setFamilies(famRes.data);
        } catch (e) { console.error(e); }
    };

    const loadTemplates = async () => {
        try {
            const res = await api.get('/mail/templates');
            setTemplates(res.data);
        } catch (e) { console.error(e); }
    };

    const saveAsTemplate = async () => {
        const name = window.prompt("Nom du modèle (ex: Rappel Inscription) :");
        if (!name) return;
        try {
            await api.post('/mail/templates', { name, subject, content: message });
            loadTemplates();
            alert("Modèle enregistré !");
        } catch (e) { alert("Erreur lors de l'enregistrement"); }
    };

    const applyTemplate = (t) => {
        if (message && !window.confirm("Remplacer le message actuel par ce modèle ?")) return;
        setSubject(t.subject);
        setMessage(t.content);
    };

    // ... (Logique targetData et handleFileUpload identique au code précédent) ...

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto pb-20">
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><Mail className="text-car-blue w-8 h-8"/></div>
                        <div>
                            <h1 className="text-4xl font-black text-car-dark">Centre de Communication</h1>
                            <p className="text-slate-500 font-medium mt-1">Gérez vos envois et vos modèles de mails</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* COLONNE GAUCHE : FILTRES & MODÈLES */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Bookmark size={18}/> Mes Modèles</h2>
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <button key={t._id} onClick={() => applyTemplate(t)} className="w-full text-left p-3 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 hover:bg-car-blue/10 hover:text-car-blue transition-all truncate">
                                        📄 {t.name}
                                    </button>
                                ))}
                                {templates.length === 0 && <p className="text-xs italic text-slate-400">Aucun modèle enregistré.</p>}
                            </div>
                        </div>
                        
                        {/* ... (Bloc Ciblage précédent) ... */}
                    </div>

                    {/* COLONNE DROITE : RÉDACTION */}
                    <div className="lg:col-span-3">
                        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Nouveau Message</h2>
                                <button type="button" onClick={saveAsTemplate} className="text-car-blue font-bold text-sm flex items-center gap-2 hover:underline">
                                    <Save size={18}/> Enregistrer comme modèle
                                </button>
                            </div>

                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-car-blue font-black text-car-dark text-lg mb-4" placeholder="Objet de l'email..." value={subject} onChange={e => setSubject(e.target.value)} />
                            
                            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
                                <ReactQuill theme="snow" value={message} onChange={setMessage} modules={quillModules} className="h-[350px] mb-12" />
                            </div>

                            {/* ... (Zone Pièces jointes et Bouton Envoyer précédents) ... */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mailing;