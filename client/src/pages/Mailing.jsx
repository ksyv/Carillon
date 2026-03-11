import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Send, Filter, Users, AlertTriangle, CheckCircle, Loader, Paperclip, X, FileText as FileIcon, Save, Bookmark, PenTool } from 'lucide-react';
import api from '../api';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const Mailing = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [families, setFamilies] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [signature, setSignature] = useState('');
    
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState([]);
    const [filter, setFilter] = useState('TOUS');
    const [isSending, setIsSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    const fileInputRef = useRef(null);

    const quillModules = {
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    };

    useEffect(() => { loadData(); loadTemplates(); loadSignature(); }, []);

    const loadData = async () => {
        const [k, f] = await Promise.all([api.get('/children'), api.get('/families')]);
        setChildren(k.data); setFamilies(f.data);
    };

    const loadTemplates = async () => { const r = await api.get('/mail/templates'); setTemplates(r.data); };
    const loadSignature = async () => { const r = await api.get('/settings/signature'); setSignature(r.data.signature); };

    const saveSignature = async () => {
        const newSig = window.prompt("Entrez votre signature (nom, fonction...) :", signature);
        if (newSig !== null) {
            await api.post('/settings/signature', { signature: newSig });
            setSignature(newSig);
            alert("Signature enregistrée !");
        }
    };

    const applyTemplate = (t) => {
        if (!message || window.confirm("Remplacer le message ?")) { setSubject(t.subject); setMessage(t.content); }
    };

    const targetData = useMemo(() => {
        let ids = new Set();
        if (filter === 'TOUS') families.forEach(f => ids.add(f._id));
        else if (filter === 'INCOMPLET') families.filter(f => !f.dossierComplet).forEach(f => ids.add(f._id));
        else {
            children.forEach(c => {
                const fId = typeof c.family === 'object' ? c.family._id : c.family;
                if (c.active !== false && ((filter==='MATERNELLE'&&c.category==='Maternelle') || (filter==='ELEMENTAIRE'&&c.category==='Élémentaire') || (filter==='PAI'&&c.hasPAI))) ids.add(fId);
            });
        }
        const ems = new Set();
        families.filter(f => ids.has(f._id)).forEach(f => f.responsables?.forEach(r => r.email?.includes('@') && ems.add(r.email.trim())));
        return { emails: Array.from(ems) };
    }, [families, children, filter]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (targetData.emails.length === 0 || !window.confirm(`Envoyer à ${targetData.emails.length} parents ?`)) return;
        setIsSending(true);
        try {
            // On ajoute la signature au message HTML juste pour l'envoi
            const finalMessage = `${message}<br><br><div style="color:#666; border-top:1px solid #eee; padding-top:10px;">${signature.replace(/\n/g, '<br>')}</div>`;
            await api.post('/mail/send', { subject, message: finalMessage, recipients: targetData.emails, attachments });
            setSendResult({ type: 'success', msg: "Message envoyé !" });
            setSubject(''); setMessage(''); setAttachments([]);
        } catch (error) { setSendResult({ type: 'error', msg: "Erreur" }); }
        setIsSending(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto pb-20">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour</button>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Bookmark size={16}/> Modèles</h2>
                            <div className="space-y-2">
                                {templates.map(t => (
                                    <button key={t._id} onClick={() => applyTemplate(t)} className="w-full text-left p-3 rounded-xl text-xs font-bold bg-slate-50 hover:bg-car-blue/10 truncate">📄 {t.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 text-center">
                            <button onClick={saveSignature} className="text-car-blue font-bold text-xs flex items-center justify-center gap-2 hover:underline"><PenTool size={16}/> Paramétrer ma signature</button>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                            <h2 className="text-xs font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Filter size={16}/> Ciblage</h2>
                            <div className="space-y-2">
                                {['TOUS', 'MATERNELLE', 'ELEMENTAIRE', 'INCOMPLET', 'PAI'].map(f => (
                                    <button key={f} onClick={() => setFilter(f)} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-car-blue text-white' : 'bg-slate-50 text-slate-500'}`}>{f}</button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-car-dark text-white p-6 rounded-[2rem] text-center shadow-lg">
                            <span className="block text-4xl font-black">{targetData.emails.length}</span>
                            <span className="text-[10px] font-bold uppercase opacity-70">Destinataires</span>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <form onSubmit={handleSend} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between mb-6">
                                <h2 className="text-xs font-black text-slate-400 uppercase">Rédaction</h2>
                                <button type="button" onClick={() => {const n=window.prompt("Nom du modèle ?"); if(n) api.post('/mail/templates',{name:n,subject,content:message}).then(()=>loadTemplates())}} className="text-car-blue font-bold text-xs flex items-center gap-2 hover:underline"><Save size={16}/> Sauver modèle</button>
                            </div>
                            <input type="text" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 font-black outline-none" placeholder="Objet..." value={subject} onChange={e => setSubject(e.target.value)} />
                            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
                                <ReactQuill theme="snow" value={message} onChange={setMessage} modules={quillModules} className="h-[350px] mb-12" />
                            </div>
                            <div className="mb-6">
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => Array.from(e.target.files).forEach(f => {const r=new FileReader(); r.onloadend=()=>setAttachments(p=>[...p,{filename:f.name,path:r.result}]); r.readAsDataURL(f);})} />
                                <button type="button" onClick={() => fileInputRef.current.click()} className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"><Paperclip size={18}/> Pièce jointe</button>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {attachments.map((f, i) => (
                                        <div key={i} className="bg-car-blue/10 text-car-blue px-3 py-1 rounded-lg text-[10px] font-bold flex items-center gap-2">{f.filename} <X size={14} className="cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}/></div>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" disabled={isSending || targetData.emails.length === 0} className="w-full bg-car-blue text-white p-5 rounded-2xl font-black shadow-lg flex justify-center items-center gap-3 disabled:opacity-50">
                                {isSending ? <Loader className="animate-spin"/> : <><Send/> ENVOYER AUX {targetData.emails.length} FAMILLES</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Mailing;