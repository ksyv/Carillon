import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Mail, Send, Filter, Users, AlertTriangle, 
    CheckCircle, Loader, Paperclip, X, 
    FileText as FileIcon, Save, Bookmark, PenTool, Check
} from 'lucide-react';
import api from '../api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const Mailing = () => {
    const navigate = useNavigate();
    
    // --- États pour les données ---
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [signature, setSignature] = useState('');
    
    // --- États pour l'interface ---
    const [isEditingSignature, setIsEditingSignature] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [filter, setFilter] = useState('TOUS');
    
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const fileInputRef = useRef(null);

    // Toolbar pour l'email (complète)
    const quillModules = {
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'header': '1' }, { 'header': '2' }, 'blockquote'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    // Toolbar pour la signature (plus légère)
    const signatureModules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    useEffect(() => { 
        loadData(); 
        loadTemplates(); 
        loadSignature();
    }, []);

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

    const loadSignature = async () => {
        try {
            const res = await api.get('/settings/signature');
            setSignature(res.data.signature);
        } catch (e) { console.error(e); }
    };

    const handleSaveSignature = async () => {
        try {
            await api.post('/settings/signature', { signature });
            setIsEditingSignature(false);
            alert("Signature enregistrée !");
        } catch (e) { alert("Erreur lors de l'enregistrement"); }
    };

    const saveAsTemplate = async () => {
        const name = window.prompt("Sous quel nom voulez-vous enregistrer ce modèle ?");
        if (!name) return;
        try {
            await api.post('/mail/templates', { name, subject, content: message });
            loadTemplates();
            alert("Modèle enregistré !");
        } catch (e) { alert("Erreur"); }
    };

    const applyTemplate = (t) => {
        if (message && !window.confirm("Remplacer le message actuel ?")) return;
        setSubject(t.subject);
        setMessage(t.content);
    };

    // --- Moteur de ciblage sécurisé ---
    const targetData = useMemo(() => {
        let matchingFamilyIds = new Set();
        if (filter === 'TOUS') {
            families.forEach(f => matchingFamilyIds.add(f._id));
        } else if (filter === 'INCOMPLET') {
            families.filter(f => !f.dossierComplet).forEach(f => matchingFamilyIds.add(f._id));
        } else {
            children.forEach(c => {
                if (!c.family || c.active === false) return;
                const famId = typeof c.family === 'object' ? c.family._id : c.family;
                if (!famId) return;
                if (filter === 'MATERNELLE' && c.category === 'Maternelle') matchingFamilyIds.add(famId);
                if (filter === 'ELEMENTAIRE' && c.category === 'Élémentaire') matchingFamilyIds.add(famId);
                if (filter === 'PAI' && c.hasPAI) matchingFamilyIds.add(famId);
            });
        }
        const emails = new Set();
        families.filter(f => matchingFamilyIds.has(f._id)).forEach(f => {
            f.responsables?.forEach(r => {
                if (r.email && r.email.includes('@')) emails.add(r.email.trim());
            });
        });
        return { emails: Array.from(emails) };
    }, [families, children, filter]);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) return alert("Max 5 Mo");
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => [...prev, { filename: file.name, path: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (targetData.emails.length === 0) return;
        if (!window.confirm(`Confirmer l'envoi à ${targetData.emails.length} destinataires ?`)) return;

        setIsSending(true);
        try {
            // Fusion Message + Signature
            const finalMessage = `${message}<br><br><div style="margin-top:20px;">${signature}</div>`;
            await api.post('/mail/send', { 
                subject, 
                message: finalMessage, 
                recipients: targetData.emails, 
                attachments 
            });
            setSendResult({ type: 'success', msg: "Message envoyé avec succès !" });
            setSubject(''); setMessage(''); setAttachments([]);
        } catch (error) { setSendResult({ type: 'error', msg: "Erreur lors de l'envoi." }); }
        setIsSending(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* COLONNE GAUCHE */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Bookmark size={18}/> Modèles</h2>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                {templates.map(t => (
                                    <button key={t._id} onClick={() => applyTemplate(t)} className="w-full text-left p-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-car-blue/10 transition-all truncate">📄 {t.name}</button>
                                ))}
                            </div>
                        </div>

                        {/* BOUTON ÉDITION SIGNATURE */}
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                            <button 
                                onClick={() => setIsEditingSignature(!isEditingSignature)} 
                                className="text-car-blue font-bold text-xs flex items-center justify-center gap-2 hover:underline"
                            >
                                <PenTool size={16}/> {isEditingSignature ? "Fermer l'éditeur" : "Paramétrer ma signature"}
                            </button>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Filter size={18}/> Ciblage</h2>
                            <div className="space-y-2">
                                {['TOUS', 'MATERNELLE', 'ELEMENTAIRE', 'INCOMPLET', 'PAI'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-car-blue text-white shadow-md' : 'bg-slate-50 text-slate-500'}`}>{f === 'TOUS' ? 'Toutes les familles' : f}</button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-car-dark text-white p-6 rounded-[2rem] shadow-lg text-center">
                            <Users size={32} className="mx-auto mb-2 opacity-30"/>
                            <span className="block text-4xl font-black">{targetData.emails.length}</span>
                            <span className="text-xs font-bold uppercase opacity-70 tracking-widest">Destinataires</span>
                        </div>
                    </div>

                    {/* COLONNE DROITE */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* ZONE ÉDITION SIGNATURE (S'affiche si activé) */}
                        {isEditingSignature && (
                            <div className="bg-car-blue/5 p-6 rounded-[2rem] border-2 border-dashed border-car-blue/20">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-car-blue font-black uppercase text-sm tracking-widest flex items-center gap-2"><PenTool size={18}/> Éditeur de Signature riche</h2>
                                    <button onClick={handleSaveSignature} className="bg-car-blue text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:bg-car-dark transition-colors"><Check size={16}/> Enregistrer la signature</button>
                                </div>
                                <div className="bg-white rounded-xl overflow-hidden border border-car-blue/20">
                                    <ReactQuill theme="snow" value={signature} onChange={setSignature} modules={signatureModules} placeholder="Tapez votre signature ici, insérez votre logo..." />
                                </div>
                                <p className="text-[10px] text-car-blue/60 mt-2 font-bold italic">Note : Cette signature sera automatiquement ajoutée en bas de chaque envoi.</p>
                            </div>
                        )}

                        <form onSubmit={handleSend} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Rédaction du message</h2>
                                <button type="button" onClick={saveAsTemplate} className="text-car-blue font-bold text-sm flex items-center gap-2 hover:underline"><Save size={18}/> Enregistrer comme modèle</button>
                            </div>

                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 font-black outline-none focus:border-car-blue text-lg" placeholder="Objet de l'email..." value={subject} onChange={e => setSubject(e.target.value)} />

                            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
                                <ReactQuill theme="snow" value={message} onChange={setMessage} modules={quillModules} className="h-[350px] mb-12" placeholder="Rédigez votre email..." />
                            </div>

                            <div className="mb-6">
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                                <button type="button" onClick={() => fileInputRef.current.click()} className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-200"><Paperclip size={18}/> Joindre un fichier</button>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {attachments.map((f, i) => (
                                        <div key={i} className="bg-car-blue/10 text-car-blue px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2"><FileIcon size={14}/><span className="truncate max-w-[150px]">{f.filename}</span><X size={16} className="cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}/></div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isSending || targetData.emails.length === 0} className="w-full bg-car-blue text-white p-5 rounded-2xl font-black shadow-lg shadow-car-blue/20 hover:-translate-y-1 transition-all flex justify-center items-center gap-3">
                                {isSending ? <Loader className="animate-spin"/> : <><Send size={24}/> ENVOYER AUX {targetData.emails.length} FAMILLES</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mailing;