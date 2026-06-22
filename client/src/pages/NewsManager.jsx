import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Plus, Trash2, Save, GripVertical, Image as ImageIcon, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff, Link } from 'lucide-react';
import api from '../api';

// --- COMPOSANT : ÉDITEUR WYSIWYG ULTRA-STABLE (ANTI-TAILWIND OVERRIDES) ---
const RichTextEditor = ({ content, onChange }) => {
    const editorRef = useRef(null);
    const savedRangeRef = useRef(null);

    // Sauvegarde la position exacte du curseur
    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0);
        }
    };

    // Restaure la sélection ou se positionne à la fin par défaut
    const restoreSelection = () => {
        const sel = window.getSelection();
        if (savedRangeRef.current) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        } else {
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    // Nettoie et convertit les vieilles balises <font> en <span style="..."> pour écraser Tailwind
    const cleanAndSync = () => {
        if (!editorRef.current) return;

        const fontTags = editorRef.current.getElementsByTagName('font');
        if (fontTags.length > 0) {
            // Correspondance des tailles natives en pixels réels indispensables pour contourner Tailwind
            const sizeMap = {
                '1': '12px', '2': '14px', '3': '16px', 
                '4': '20px', '5': '24px', '6': '32px', '7': '48px'
            };

            // On fige la sélection pendant qu'on transmute le DOM
            const sel = window.getSelection();
            let backupRange = null;
            if (sel.rangeCount > 0) backupRange = sel.getRangeAt(0).cloneRange();

            Array.from(fontTags).forEach(font => {
                const span = document.createElement('span');
                
                // Si la balise a déjà des styles, on les préserve
                if (font.style.cssText) span.style.cssText = font.style.cssText;

                // Conversion magique anti-Tailwind
                if (font.hasAttribute('face')) span.style.fontFamily = font.getAttribute('face');
                if (font.hasAttribute('size')) span.style.fontSize = sizeMap[font.getAttribute('size')] || '16px';
                if (font.hasAttribute('color')) span.style.color = font.getAttribute('color');
                
                while (font.firstChild) {
                    span.appendChild(font.firstChild);
                }
                font.parentNode.replaceChild(span, font);
            });

            // On remet le curseur exactement là où il était
            if (backupRange) {
                sel.removeAllRanges();
                sel.addRange(backupRange);
            }
        }
        
        // On envoie le HTML propre à l'état React
        onChange(editorRef.current.innerHTML);
    };

    const format = (command, value = null) => {
        restoreSelection();
        document.execCommand(command, false, value);
        editorRef.current.focus();
        saveSelection();
        cleanAndSync(); // Nettoyage immédiat au clic ou changement de liste
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            editorRef.current.focus();
            restoreSelection();
            document.execCommand('insertImage', false, reader.result);
            saveSelection();
            cleanAndSync();
            e.target.value = ''; 
        };
        reader.readAsDataURL(file);
    };

    const handleLinkImage = () => {
        const url = window.prompt("Collez l'URL de l'image internet :");
        if (url) format('insertImage', url);
    };

    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white flex flex-col shadow-sm">
            {/* BARRE D'OUTILS SÉCURISÉE */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap gap-2 items-center shrink-0 select-none">
                
                {/* Sélecteur de Police */}
                <select 
                    onChange={(e) => format('fontName', e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
                    title="Police de caractères"
                >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Montserrat', sans-serif">Montserrat</option>
                    <option value="'Comic Sans MS', cursive">Comic Sans</option>
                    <option value="'Courier New', monospace">Courier</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="Impact, Haettenschweiler, sans-serif">Impact</option>
                </select>

                {/* Sélecteur de Taille */}
                <select 
                    onChange={(e) => format('fontSize', e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-600 outline-none cursor-pointer hover:border-slate-300"
                    title="Taille du texte"
                    defaultValue="3"
                >
                    <option value="2">Petit (14px)</option>
                    <option value="3">Normal (16px)</option>
                    <option value="4">Grand (20px)</option>
                    <option value="5">Très Grand (24px)</option>
                    <option value="6">Énorme (32px)</option>
                    <option value="7">Géant (48px)</option>
                </select>

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Styles de base */}
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('bold'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Gras"><Bold size={16}/></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('italic'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Italique"><Italic size={16}/></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('underline'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Souligné"><Underline size={16}/></button>
                
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                
                {/* Alignements */}
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('justifyLeft'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Aligner à gauche"><AlignLeft size={16}/></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('justifyCenter'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Centrer"><AlignCenter size={16}/></button>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); format('justifyRight'); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors" title="Aligner à droite"><AlignRight size={16}/></button>
                
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                
                {/* Nuancier de couleur */}
                <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-xl" title="Couleur du texte">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Couleur</span>
                    <input 
                        type="color" 
                        onChange={(e) => format('foreColor', e.target.value)} 
                        onMouseDown={(e) => e.preventDefault()} 
                        className="w-6 h-6 p-0 cursor-pointer bg-transparent border-none rounded" 
                    />
                </div>

                <div className="w-px h-6 bg-slate-200 mx-1"></div>

                {/* Importations Médias */}
                <button type="button" onMouseDown={(e) => { e.preventDefault(); saveSelection(); handleLinkImage(); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors flex items-center gap-1 text-xs font-black uppercase tracking-wider" title="Image par lien Internet"><Link size={14}/> Image URL</button>
                
                <label onMouseDown={saveSelection} className="p-2 hover:bg-slate-200 rounded-xl text-slate-600 cursor-pointer flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors" title="Téléverser une image locale">
                    <ImageIcon size={14}/> Importer Fichier
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
                </label>
            </div>

            {/* ZONE D'ÉCRITURE PRINCIPALE */}
            <div 
                ref={editorRef}
                className="p-6 min-h-[400px] outline-none max-w-full overflow-x-auto prose prose-slate focus:prose-blue bg-white"
                contentEditable={true}
                onKeyUp={() => { saveSelection(); cleanAndSync(); }}
                onMouseUp={() => { saveSelection(); cleanAndSync(); }}
                onBlur={() => { saveSelection(); cleanAndSync(); }}
                dangerouslySetInnerHTML={{ __html: content }} 
            />
        </div>
    );
};


// ==========================================
// COMPOSANT PRINCIPAL : NEWS MANAGER
// ==========================================
const NewsManager = () => {
    const navigate = useNavigate();
    const [newsList, setNewsList] = useState([]);
    const [selectedCard, setSelectedCard] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const colorPresets = ['#0ea5e9', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b', '#0f172a'];

    useEffect(() => { loadNews(); }, []);

    const loadNews = async () => {
        try {
            const { data } = await api.get('/news');
            setNewsList(data);
        } catch (error) { console.error("Erreur de chargement", error); }
    };

    const handleCreateNew = async () => {
        try {
            const { data } = await api.post('/news', { title: 'Nouvelle Actualité', content: '<p>Écrivez votre message ici...</p>' });
            setNewsList([data, ...newsList]);
            setSelectedCard(data);
        } catch (error) { alert("Erreur à la création."); }
    };

    const handleSaveCard = async () => {
        if (!selectedCard) return;
        setIsSaving(true);
        try {
            const { data } = await api.put(`/news/${selectedCard._id}`, selectedCard);
            setNewsList(newsList.map(n => n._id === data._id ? data : n));
            alert("Carte sauvegardée avec succès !");
        } catch (error) { alert("Erreur de sauvegarde."); }
        setIsSaving(false);
    };

    const handleDeleteCard = async (id) => {
        if (window.confirm("Supprimer définitivement cette actualité ?")) {
            try {
                await api.delete(`/news/${id}`);
                setNewsList(newsList.filter(n => n._id !== id));
                if (selectedCard?._id === id) setSelectedCard(null);
            } catch (error) { alert("Erreur de suppression."); }
        }
    };

    // DRAG & DROP LOGIQUE
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);

    const onDragStart = (e, index) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.style.opacity = '0.4';
    };

    const onDragOver = (e, index) => {
        e.preventDefault();
    };

    const onDrop = async (e, targetIndex) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

        const newList = [...newsList];
        const draggedItem = newList[draggedItemIndex];
        newList.splice(draggedItemIndex, 1);
        newList.splice(targetIndex, 0, draggedItem);
        
        setNewsList(newList);
        setDraggedItemIndex(null);

        const orderedIds = newList.map(n => n._id);
        try {
            await api.post('/news/reorder', { orderedIds });
        } catch (error) { alert("Erreur de tri."); }
    };

    const onDragEnd = (e) => {
        e.currentTarget.style.opacity = '1';
        setDraggedItemIndex(null);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/')} className="mb-8 text-slate-400 font-bold hover:text-car-dark transition-colors">← Retour Accueil</button>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-car-blue/10 p-4 rounded-2xl"><Newspaper className="text-car-blue w-8 h-8"/></div>
                        <div>
                            <h1 className="text-3xl font-black text-car-dark">Page d'accueil Parents</h1>
                            <p className="text-slate-500 font-medium">Gerez l'ordre et le contenu textuel enrichi</p>
                        </div>
                    </div>
                    <button onClick={handleCreateNew} className="bg-car-blue text-white px-5 py-3 rounded-xl font-black tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-car-blue/20 text-xs">
                        <Plus size={18}/> CRÉER UNE CARTE
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* CARTES DISPONIBLES */}
                    <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[700px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50 font-black text-slate-400 text-xs tracking-widest uppercase flex justify-between rounded-t-3xl">
                            <span>Ordre d'affichage (Glisser)</span>
                            <span>{newsList.length} Carte(s)</span>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3 space-y-2">
                            {newsList.map((news, index) => (
                                <div 
                                    key={news._id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, index)}
                                    onDragOver={(e) => onDragOver(e, index)}
                                    onDrop={(e) => onDrop(e, index)}
                                    onDragEnd={onDragEnd}
                                    className={`flex items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${selectedCard?._id === news._id ? 'bg-slate-100 border-slate-300 shadow-inner' : 'bg-white border-slate-100'}`}
                                    onClick={() => setSelectedCard(news)}
                                    style={{ borderLeftColor: news.borderColor, borderLeftWidth: '6px' }}
                                >
                                    <div className="text-slate-300 cursor-grab active:cursor-grabbing hover:text-car-dark px-1"><GripVertical size={20}/></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-car-dark truncate text-sm">{news.title || 'Sans titre'}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            {news.isActive ? (
                                                <span className="text-[10px] font-black text-car-green flex items-center gap-1 uppercase tracking-widest"><Eye size={12}/> En Ligne</span>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest"><EyeOff size={12}/> Brouillon</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteCard(news._id); }} className="text-slate-300 hover:text-car-pink p-2 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            ))}
                            {newsList.length === 0 && <p className="text-center text-slate-400 text-sm font-bold mt-10">Aucune carte active.</p>}
                        </div>
                    </div>

                    {/* ÉDITEUR PRINCIPAL */}
                    <div className="lg:col-span-2">
                        {selectedCard ? (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8 flex flex-col min-h-[700px]">
                                
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                                    <input 
                                        type="text" 
                                        className="text-2xl sm:text-3xl font-black text-car-dark outline-none bg-transparent border-b-2 border-transparent focus:border-car-blue transition-colors w-full sm:w-2/3 uppercase tracking-tight"
                                        placeholder="Titre de la carte..."
                                        value={selectedCard.title}
                                        onChange={(e) => setSelectedCard({...selectedCard, title: e.target.value})}
                                    />
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setSelectedCard({...selectedCard, isActive: !selectedCard.isActive})}
                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors ${selectedCard.isActive ? 'bg-car-green/10 text-car-green hover:bg-car-green/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {selectedCard.isActive ? <><Eye size={16}/> En Ligne</> : <><EyeOff size={16}/> Brouillon</>}
                                        </button>
                                        <button 
                                            onClick={handleSaveCard} 
                                            disabled={isSaving}
                                            className="bg-car-blue text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md flex items-center gap-2"
                                        >
                                            <Save size={16}/> {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6 flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Bordure Thématique :</span>
                                    <div className="flex gap-2">
                                        {colorPresets.map(color => (
                                            <button 
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedCard({...selectedCard, borderColor: color})}
                                                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${selectedCard.borderColor === color ? 'border-car-dark ring-2 ring-offset-2 ring-car-dark/20 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Contenu de la publication</label>
                                    <div className="flex-1 overflow-hidden">
                                        <RichTextEditor 
                                            content={selectedCard.content} 
                                            onChange={(html) => setSelectedCard({...selectedCard, content: html})}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-100/50 rounded-[2rem] h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 p-10 text-center min-h-[700px]">
                                <Newspaper size={64} className="text-slate-300 mb-4"/>
                                <h3 className="font-black text-slate-400 text-xl">Sélectionnez ou créez une actualité</h3>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default NewsManager;