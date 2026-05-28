import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, FileText, ShieldCheck, Download, LogOut, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FamilyPortal = () => {
    const navigate = useNavigate();
    const [mockFamily, setMockFamily] = useState({
        name: "DUPONT",
        firstName: "Jean & Marie",
        cafNumber: "1234567",
        quotientFamilial: 850,
        address: "12 Rue des Écoles, 33360 Carignan-de-Bordeaux",
        children: [
            { name: "Dupont Lucas", class: "CM1", regime: "Standard" },
            { name: "Dupont Chloé", class: "Grande Section", regime: "PAI" }
        ]
    });

    // Facture simulée du mois actuel pour la démo
    const mockInvoice = {
        payeur: "M. & Mme DUPONT (Dossier n°1234567)",
        totalGlobal: 76.50,
        items: [
            { label: "Cantine (Repas Enfant)", count: 18, unitPrice: 3.10, total: 55.80 },
            { label: "APS Matin", count: 12, unitPrice: 0.85, total: 10.20 },
            { label: "APS Soir (16h30-18h30)", count: 5, unitPrice: 2.10, total: 10.50 }
        ]
    };

    // Reprise exacte de ta fonction d'export PDF pour que le parent télécharge la MÊME facture
    const downloadInvoice = () => {
        const doc = new jsPDF();
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(30, 41, 59);
        doc.text("CARIGNAN", 14, 20); doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.text("DE BORDEAUX", 14, 25);
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text("MAIRIE DE CARIGNAN DE BORDEAUX", 14, 35);
        doc.text("24 RUE DE VERDUN 33360 CARIGNAN-DE-BORDEAUX", 14, 40);
        
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 58, 138);
        doc.text(`Identifiant PAYFIP : 017556`, 120, 20);
        doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
        doc.text(`Référence : 2026-CA-05-PORTAIL`, 120, 26);
        doc.text(`Période : Du 01/05/2026 au 31/05/2026`, 120, 32);

        doc.rect(118, 42, 78, 25); doc.setFont("helvetica", "bold"); doc.text("DESTINATAIRE :", 122, 48);
        doc.setFont("helvetica", "normal"); doc.text(mockInvoice.payeur, 122, 55);
        doc.text(mockFamily.address, 122, 61);

        doc.setFont("helvetica", "black"); doc.setFontSize(18); doc.setTextColor(30, 41, 59);
        doc.text("FACTURE : PRESTATIONS PÉRISCOLAIRES", 14, 78);

        autoTable(doc, {
            startY: 85,
            head: [["Prestation", "Nombre d'actes", "Prix Unitaire (€)", "Montant Total (€)"]],
            body: mockInvoice.items.map(i => [i.label, i.count.toString(), `${i.unitPrice.toFixed(2)} €`, `${i.total.toFixed(2)} €`]),
            theme: 'grid',
            headStyles: { fillColor: [30, 58, 138] },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.rect(130, finalY, 66, 14, 'F', [241, 245, 249]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 41, 59);
        doc.text("NET À PAYER :", 134, finalY + 9); doc.setTextColor(30, 58, 138); doc.text(`${mockInvoice.totalGlobal.toFixed(2)} €`, 166, finalY + 9);

        doc.save(`Facture_Carillon_MAI_2026.pdf`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* BARRE DE NAVIGATION PORTAIL FAMILLE */}
            <div className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-car-blue text-white p-2.5 rounded-xl font-black text-xl tracking-tighter">C</div>
                        <div>
                            <h1 className="font-black text-car-dark text-lg leading-none">Carillon</h1>
                            <span className="text-[10px] font-bold text-car-blue uppercase tracking-widest">Espace Famille</span>
                        </div>
                    </div>
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-car-pink p-2 rounded-xl transition-colors flex items-center gap-1 font-bold text-sm">
                        <LogOut size={16}/> Déconnexion
                    </button>
                </div>
            </div>

            {/* CORPS DE LA PAGE */}
            <div className="max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
                
                {/* COLONNE DE GAUCHE : INFOS DOSSIER PARENT */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-50">
                        <div className="bg-slate-100 p-3 rounded-xl text-slate-500"><User size={20}/></div>
                        <div>
                            <h2 className="font-black text-car-dark text-lg leading-tight">{mockFamily.name}</h2>
                            <p className="text-xs text-slate-400 font-medium">{mockFamily.firstName}</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">N° Allocataire CAF :</span>
                            <span className="font-bold text-car-dark">{mockFamily.cafNumber}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Quotient Familial (QF) :</span>
                            <span className="font-black text-car-blue text-lg">{mockFamily.quotientFamilial} €</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Adresse déclarée :</span>
                            <span className="font-medium text-slate-600 text-xs">{mockFamily.address}</span>
                        </div>
                    </div>

                    {/* BLOC SÉCURITÉ CONFORME RGPD */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex items-start gap-3">
                        <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={18}/>
                        <p className="text-[11px] font-medium text-emerald-700 leading-relaxed">Dossier vérifié et conforme aux critères du service scolaire de la Ville.</p>
                    </div>
                </div>

                {/* COLONNE DE DROITE (PREND 2 COLONNES) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* LES ENFANTS DU FOYER */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <h3 className="font-black text-car-dark text-xl mb-4">Enfants inscrits</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {mockFamily.children.map((child, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-black text-car-dark text-base">{child.name}</h4>
                                        <p className="text-xs text-slate-400 font-bold mt-0.5">Classe : {child.class}</p>
                                    </div>
                                    {child.regime === 'PAI' && (
                                        <span className="text-[10px] font-black uppercase bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded-md">PAI</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ENCART FACTURATION MENSUELLE DIRECTE */}
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                            <div>
                                <h3 className="font-black text-car-dark text-xl">Dernière facture émise</h3>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">Mois de Mai 2026 • À régler avant le 15/06/2026</p>
                            </div>
                            <button onClick={downloadInvoice} className="bg-car-blue text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md shadow-car-blue/10 flex items-center gap-2">
                                <Download size={16}/> Télécharger (PDF)
                            </button>
                        </div>

                        {/* RECAP DE LA FACTURE SUR LE PORTAIL */}
                        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-4 border-b border-slate-100 grid grid-cols-3 text-xs font-black uppercase tracking-wider text-slate-400">
                                <div className="col-span-2">Prestation</div>
                                <div className="text-right">Montant</div>
                            </div>
                            <div className="divide-y divide-slate-100 text-sm font-bold text-car-dark">
                                {mockInvoice.items.map((item, idx) => (
                                    <div key={idx} className="p-4 grid grid-cols-3">
                                        <div className="col-span-2">
                                            {item.label}
                                            <span className="block text-xs text-slate-400 font-medium mt-0.5">Quantité : x{item.count}</span>
                                        </div>
                                        <div className="text-right my-auto font-black text-slate-700">{item.total.toFixed(2)} €</div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-black text-car-dark text-sm uppercase tracking-wide">État du paiement :</span>
                                <span className="text-xs font-black bg-amber-500/15 text-amber-600 px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    <AlertCircle size={14}/> En attente PayFip
                                </span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default FamilyPortal;