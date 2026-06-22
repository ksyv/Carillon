import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FileText, Download, AlertCircle, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TabFactures = () => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        api.get('/parent/my-invoices') // Remplace par ton endpoint exact du portail famille
            .then(res => {
                setInvoices(Array.isArray(res.data) ? res.data : []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Erreur chargement factures parents", err);
                setIsLoading(false);
            });
    }, []);

    const downloadPDF = (invoice) => {
        const doc = new jsPDF();
        const startStr = new Date(invoice.periodStart).toLocaleDateString('fr-FR');
        const endStr = new Date(invoice.periodEnd).toLocaleDateString('fr-FR');
        
        // Design officiel identique à la mairie
        doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(30, 41, 59); doc.text("CARIGNAN", 14, 20);
        doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.text("DE BORDEAUX", 14, 25);
        doc.setFontSize(9); doc.setTextColor(100);
        doc.text("MAIRIE DE CARIGNAN DE BORDEAUX\n24 RUE DE VERDUN 33360 CARIGNAN-DE-BORDEAUX\nmairie@carignandebordeaux.fr", 14, 35);

        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 58, 138); doc.text(`Identifiant PAYFIP : 017556`, 120, 20);
        doc.setFont("helvetica", "normal"); doc.setTextColor(30, 41, 59);
        doc.text(`Référence : ${invoice.reference}`, 120, 26);
        doc.text(`Période : Du ${startStr} au ${endStr}`, 120, 32);

        doc.rect(118, 42, 78, 25);
        doc.setFont("helvetica", "bold"); doc.text("DESTINATAIRE :", 122, 48);
        doc.setFont("helvetica", "normal"); doc.text(invoice.payeur, 122, 55); doc.text("33360 CARIGNAN-DE-BORDEAUX", 122, 61);

        doc.setFont("helvetica", "black"); doc.setFontSize(18); doc.setTextColor(30, 41, 59); doc.text("FACTURE : PRESTATIONS PÉRISCOLAIRES", 14, 78);

        const tableHead = [["Enfant", "Prestation", "Dates pointées", "Qté", "P.U.", "Total"]];
        const tableBody = invoice.items.map(item => [
            item.childName || '-',
            item.label,
            item.dates ? item.dates.join(', ') : '',
            item.count.toString(),
            `${item.unitPrice.toFixed(2)} €`,
            `${item.total.toFixed(2)} €`
        ]);

        autoTable(doc, {
            startY: 85, head: tableHead, body: tableBody, theme: 'grid',
            headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
            columnStyles: { 
                0: { fontStyle: 'bold', cellWidth: 35 },
                1: { cellWidth: 35 },
                2: { cellWidth: 'auto', fontSize: 8 },
                3: { halign: 'center', cellWidth: 12 },
                4: { halign: 'right', cellWidth: 15 },
                5: { halign: 'right', fontStyle: 'bold', cellWidth: 20 }
            },
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.rect(130, finalY, 66, 14, 'F', [241, 245, 249]);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text("NET À PAYER :", 134, finalY + 9);
        doc.setTextColor(30, 58, 138); doc.setFontSize(14); doc.text(`${invoice.totalGlobal.toFixed(2)} €`, 166, finalY + 9);

        doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(120);
        doc.text("Modalités de règlement : Vous recevrez un avis des sommes à payer du Trésor Public.\nRèglement possible par chèque, virement ou en ligne sur www.payfip.gouv.fr", 14, finalY + 25);

        doc.save(`Facture_Périscolaire_${invoice.reference}.pdf`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-car-blue"></div>
            </div>
        );
    }

    if (invoices.length === 0) {
        return (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center max-w-xl mx-auto mt-6">
                <div className="bg-white p-4 rounded-full w-fit mx-auto shadow-sm text-slate-400 mb-4">
                    <FileText size={32} />
                </div>
                <h3 className="font-black text-car-dark text-lg mb-1">Aucune facture disponible</h3>
                <p className="text-slate-500 font-medium text-sm">Les factures apparaissent ici dès qu'elles sont validées par le service régie de la mairie (généralement en début de mois suivant).</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-6 space-y-4 px-2">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mb-6">
                <AlertCircle className="text-car-blue shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    <strong>Note aux parents :</strong> Le paiement de ces factures s'effectue à réception de l'Avis de Sommes à Payer (titre exécutoire) envoyé par le Trésor Public, par carte bancaire sur PayFiP ou par chèque.
                </p>
            </div>

            <h2 className="font-black text-car-dark text-lg uppercase tracking-wider mb-2">Historique de vos factures</h2>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100">
                {invoices.map((invoice) => {
                    const monthName = new Date(invoice.periodStart).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                    
                    return (
                        <div key={invoice._id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-car-blue/10 p-3 rounded-2xl text-car-blue shrink-0">
                                    <Calendar size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-black text-car-dark text-base capitalize">{monthName}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold tracking-wide">
                                        <span>Réf : {invoice.reference}</span>
                                        <span>•</span>
                                        <span>Du {new Date(invoice.periodStart).toLocaleDateString('fr-FR')} au {new Date(invoice.periodEnd).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-slate-50 sm:border-none pt-3 sm:pt-0">
                                <div className="text-left sm:text-right">
                                    <span className="text-2xl font-black text-car-blue block">{invoice.totalGlobal.toFixed(2)} €</span>
                                    <span className="text-[10px] uppercase font-black tracking-widest text-car-green bg-car-green/10 px-2 py-0.5 rounded-md">Validé</span>
                                </div>
                                <button 
                                    onClick={() => downloadPDF(invoice)}
                                    className="bg-slate-100 text-slate-700 hover:bg-car-dark hover:text-white p-3 sm:px-4 sm:py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                                >
                                    <Download size={16} />
                                    <span className="hidden sm:inline">Télécharger PDF</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TabFactures;