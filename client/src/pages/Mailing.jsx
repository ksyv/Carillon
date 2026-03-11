import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Filter, Users, AlertTriangle, CheckCircle, Loader, Paperclip, X, FileText as FileIcon } from 'lucide-react';
import api from '../api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Le style de l'éditeur !

const Mailing = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState(''); // Contiendra maintenant du HTML
    const [attachments, setAttachments] = useState([]); // [{ filename, path, size }]
    
    const [filter, setFilter] = useState('TOUS'); 
    
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    
    const fileInputRef = useRef(null);

    // Configuration de la barre d'outils de l'éditeur
    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link'],
            ['clean']
        ],
    };

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [kidsRes, famRes] = await Promise.all([api.get('/children'), api.get('/families')]);
            setChildren(kidsRes.data);
            setFamilies(famRes.data);
        } catch (e) { console.error("Erreur de chargement", e); }
    };

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
                if (filter === 'MATERNELLE' && c.category === 'Maternelle') matchingFamilyIds.add(famId);
                if (filter === 'ELEMENTAIRE' && c.category === 'Élémentaire') matchingFamilyIds.add(famId);
                if (filter === 'PAI' && c.hasPAI) matchingFamilyIds.add(famId);
            });
        }

        const emails = new Set();
        let familiesCount = 0;
        families.filter(f => matchingFamilyIds.has(f._id)).forEach(f => {
            let hasValidEmail = false;
            if (f.responsables) {
                f.responsables.forEach(r => {
                    if (r.email && r.email.includes('@')) {
                        emails.add(r.email.trim());
                        hasValidEmail = true;
                    }
                });
            }
            if (hasValidEmail) familiesCount++;
        });

        return { familiesCount, emails: Array.from(emails) };
    }, [families, children, filter]);

    // GESTION DES PIÈCES JOINTES
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo maximum par fichier (pour Gmail)
        
        files.forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                alert(`Le fichier ${file.name} est trop lourd (Max: 5 Mo).`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                // Nodemailer accepte directement le format "data:..." dans la propriété "path"
                setAttachments(prev => [...prev, { filename: file.name, path: reader.result, size: file.size }]);
            };
            reader.readAsDataURL(file);
        });
        // Réinitialise l'input pour pouvoir sélectionner le même fichier si on s'est trompé
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (indexToRemove) => {
        setAttachments(attachments.filter((_, i) => i !== indexToRemove));
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setSendResult(null);

        if (targetData.emails.length === 0) return setSendResult({ type: 'error', msg: "Aucune adresse email trouvée." });
        
        // ReactQuill renvoie "<p><br></p>" quand il est vide, donc on nettoie pour vérifier
        const cleanMessage = message.replace(/<[^>]*>?/gm, '').trim();
        if (!subject.trim() || !cleanMessage) return setSendResult({ type: 'error', msg: "Sujet et message obligatoires." });

        if (!window.confirm(`Envoyer cet email à ${targetData.emails.length} destinataires ?`)) return;

        setIsSending(true);
        try {
            await api.post('/mail/send', {
                subject,
                message, // On envoie le HTML complet
                recipients: targetData.emails,
                attachments
            });
            setSendResult({ type: 'success', msg: `Envoyé avec succès à ${targetData.emails.length} adresses !` });
            setSubject('');
            setMessage('');
            setAttachments([]);
        } catch (error) {
            setSendResult({ type: 'error', msg: "Erreur lors de l'envoi." });
        }
        setIsSending(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex items-center gap-4 mb-10">
                    <div className="bg-car-blue/10 p-4 rounded-2xl">
                        <Mail className="text-car-blue w-8 h-8"/>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-car-dark">Communication</h1>
                        <p className="text-slate-500 font-medium mt-1">Envoyer des emails groupés aux familles</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* COLONNE GAUCHE : LES FILTRES */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Filter size={18}/> Ciblage</h2>
                            <div className="space-y-2">
                                <button onClick={() => setFilter('TOUS')} className={`w-full text-left p-4 rounded-xl font-bold transition-all ${filter === 'TOUS' ? 'bg-car-blue text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Toutes les familles</button>
                                <button onClick={() => setFilter('MATERNELLE')} className={`w-full text-left p-4 rounded-xl font-bold transition-all ${filter === 'MATERNELLE' ? 'bg-car-yellow text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Parents Maternelle</button>
                                <button onClick={() => setFilter('ELEMENTAIRE')} className={`w-full text-left p-4 rounded-xl font-bold transition-all ${filter === 'ELEMENTAIRE' ? 'bg-car-blue text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Parents Élémentaire</button>
                                <button onClick={() => setFilter('INCOMPLET')} className={`w-full text-left p-4 rounded-xl font-bold transition-all flex justify-between items-center ${filter === 'INCOMPLET' ? 'bg-car-pink text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                    Dossiers Incomplets {filter === 'INCOMPLET' && <AlertTriangle size={18}/>}
                                </button>
                                <button onClick={() => setFilter('PAI')} className={`w-full text-left p-4 rounded-xl font-bold transition-all flex justify-between items-center ${filter === 'PAI' ? 'bg-car-teal text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                    Enfants avec PAI
                                </button>
                            </div>
                        </div>

                        <div className="bg-car-dark text-white p-6 rounded-[2rem] shadow-lg text-center">
                            <Users size={32} className="mx-auto mb-2 opacity-50"/>
                            <span className="block text-4xl font-black mb-1">{targetData.emails.length}</span>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-70">Adresses Email trouvées</span>
                            <p className="text-sm mt-4 opacity-80">Sur {targetData.familiesCount} famille(s) ciblée(s)</p>
                        </div>
                    </div>

                    {/* COLONNE DROITE : LE MESSAGE */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleSend} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col h-full">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Rédaction du message</h2>
                            
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-car-blue font-black text-car-dark text-lg mb-4" 
                                placeholder="Objet de l'email..." 
                                value={subject} 
                                onChange={e => setSubject(e.target.value)} 
                                disabled={isSending}
                            />
                            
                            {/* L'ÉDITEUR DE TEXTE RICHE */}
                            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden [&_.ql-toolbar]:border-none [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[300px] [&_.ql-editor]:text-base">
                                <ReactQuill 
                                    theme="snow" 
                                    value={message} 
                                    onChange={setMessage} 
                                    modules={quillModules}
                                    placeholder="Rédigez votre message ici (mise en forme, couleurs...)"
                                    readOnly={isSending}
                                />
                            </div>

                            {/* GESTION DES PIÈCES JOINTES */}
                            <div className="mb-8">
                                <div className="flex items-center gap-4 mb-3">
                                    <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current.click()}
                                        className="bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-200 transition-colors text-sm"
                                        disabled={isSending}
                                    >
                                        <Paperclip size={18}/> Joindre un fichier
                                    </button>
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        onChange={handleFileUpload} 
                                    />
                                    <span className="text-xs text-slate-400 font-medium">PDF, Images, Word... (Max 5 Mo/fichier)</span>
                                </div>
                                
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {attachments.map((file, idx) => (
                                            <div key={idx} className="bg-car-blue/10 border border-car-blue/20 text-car-blue flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold">
                                                <FileIcon size={16}/>
                                                <span className="truncate max-w-[200px]">{file.filename}</span>
                                                <span className="text-xs opacity-70">({Math.round(file.size / 1024)} ko)</span>
                                                <button type="button" onClick={() => removeAttachment(idx)} className="hover:text-car-pink ml-1"><X size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {sendResult && (
                                <div className={`p-4 rounded-xl font-bold mb-6 flex items-center gap-3 ${sendResult.type === 'success' ? 'bg-car-green/10 text-car-green' : 'bg-car-pink/10 text-car-pink'}`}>
                                    {sendResult.type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                                    {sendResult.msg}
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={isSending || targetData.emails.length === 0}
                                className="w-full bg-car-blue text-white p-5 rounded-2xl font-black tracking-widest shadow-lg shadow-car-blue/20 hover:-translate-y-1 transition-all flex justify-center items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                {isSending ? <><Loader size={24} className="animate-spin"/> ENVOI EN COURS...</> : <><Send size={24}/> ENVOYER À {targetData.emails.length} PARENTS</>}
                            </button>
                            <p className="text-center text-xs text-slate-400 font-bold mt-4">
                                ℹ️ Les adresses des parents seront placées en Copie Cachée (BCC) pour respecter le RGPD.
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Mailing;