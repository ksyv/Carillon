import React from 'react';
import { Newspaper } from 'lucide-react';

const TabHub = ({ newsList, setNewsToView }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-car-blue text-white p-8 rounded-[2rem] shadow-lg relative overflow-hidden mb-6">
                <div className="relative z-10">
                    <h2 className="text-lg font-bold tracking-widest opacity-100 uppercase mb-2">Bienvenue sur votre espace</h2>
                    <h1 className="text-3xl sm:text-4xl font-black mb-2">Service Périscolaire</h1>
                    <p className="text-sm font-medium opacity-100 max-w-md">Retrouvez ici toutes les actualités de la structure et les informations importantes.</p>
                </div>
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none"><Newspaper size={200} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {newsList.length > 0 ? (
                    newsList.map(news => (
                        <div 
                            key={news._id} 
                            onClick={() => setNewsToView(news)}
                            className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col h-80 relative group"
                        >
                            <div className="h-2.5 w-full shrink-0" style={{ backgroundColor: news.borderColor || '#0ea5e9' }}></div>
                            
                            <div className="p-6 flex flex-col flex-1 overflow-hidden">
                                <h2 className="text-lg font-black text-car-dark mb-3 line-clamp-2 group-hover:text-car-blue transition-colors">{news.title}</h2>
                                <div className="relative flex-1 overflow-hidden pointer-events-none text-xs text-slate-500">
                                    <div 
                                        className="prose prose-sm max-w-none text-slate-500 prose-headings:font-black prose-img:max-h-24 prose-img:object-cover prose-img:rounded-xl"
                                        dangerouslySetInnerHTML={{ __html: news.content }} 
                                    />
                                    <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
                                </div>
                                <div className="mt-3 text-[10px] font-black uppercase text-car-dark tracking-wider flex items-center gap-1 shrink-0">
                                    Lire la suite →
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full bg-slate-100/50 p-12 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                        <p className="text-slate-400 font-bold">Aucune actualité pour le moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TabHub;