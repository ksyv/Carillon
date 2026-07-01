import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// =========================================================================
// 1. IMPORTS STATIQUES (CRITIQUES POUR LE HORS-LIGNE)
// Chargés immédiatement. Réseau ou pas, ces pages fonctionneront toujours.
// =========================================================================
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StructureInfo from './components/StructureInfo';
import SessionView from './pages/SessionView';
import CustomListManager from './pages/CustomListManager';
import ChildrenManager from './pages/ChildrenManager';

// =========================================================================
// 2. IMPORTS DYNAMIQUES / LAZY LOADING (LES PAGES "BUREAU" LOURDES)
// Chargés uniquement au clic. Contiennent souvent jsPDF ou de gros tableaux.
// =========================================================================
const Report = lazy(() => import('./pages/Report'));
const UserManager = lazy(() => import('./pages/UserManager'));
const PlannedNotesManager = lazy(() => import('./pages/PlannedNotesManager'));
const BillingManager = lazy(() => import('./pages/BillingManager'));
const FamilyManager = lazy(() => import('./pages/FamilyManager'));
const CafStats = lazy(() => import('./pages/CafStats')); 
const Mailing = lazy(() => import('./pages/Mailing'));
const AdminTariffs = lazy(() => import('./pages/AdminTariffs'));
const CalendarExceptionManager = lazy(() => import('./pages/CalendarExceptionManager'));
const AdvancedStats = lazy(() => import('./pages/AdvancedStats'));
const FamilyPortal = lazy(() => import('./pages/FamilyPortal'));
const CantineStats = lazy(() => import('./pages/CantineStats'));
const ClassManager = lazy(() => import('./pages/ClassManager'));
const AdultManager = lazy(() => import('./pages/AdultManager'));
const ModificationRequestsAdmin = lazy(() => import('./pages/ModificationRequestsAdmin'));
const NewsManager = lazy(() => import('./pages/NewsManager'));

// Écran d'attente pendant qu'une page administrative se télécharge
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-xl font-black text-slate-400 animate-pulse uppercase tracking-widest">
      Chargement...
    </div>
  </div>
);

export default function App() {
  const [auth, setAuth] = useState({ 
    token: localStorage.getItem('token'), 
    role: localStorage.getItem('role') 
  });
  
  return (
    <BrowserRouter>
      <div className="font-sans text-slate-800">
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* ========================================================== */}
            {/* ROUTE PUBLIC : LE PORTAIL FAMILLE PARENT (ACCESSIBLE À TOUS) */}
            {/* ========================================================== */}
            <Route path="/parent/portal" element={<FamilyPortal />} />

            {/* ========================================================== */}
            {/* ROUTES PRIVÉES : RÉSERVÉES AU STAFF (PROTÉGÉES)             */}
            {/* ========================================================== */}
            
            {/* --- PAGES "TERRAIN" (Chargement instantané & Hors-ligne garanti) --- */}
            <Route 
              path="/" 
              element={auth.token ? <Dashboard /> : <Login setAuth={setAuth} />} 
            />
            <Route 
              path="/session/:date/:type" 
              element={auth.token ? <SessionView /> : <Navigate to="/" />} 
            />
            <Route 
              path="/pointage-listes" 
              element={auth.token ? <CustomListManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/children" 
              element={auth.token ? <ChildrenManager /> : <Navigate to="/" />} 
            />

            {/* --- PAGES "ADMINISTRATIVES" (Lazy Loading) --- */}
            <Route 
              path="/report" 
              element={auth.token ? <Report /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/users" 
              element={auth.token ? <UserManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/planned-notes" 
              element={auth.token ? <PlannedNotesManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/billing" 
              element={auth.token ? <BillingManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/families" 
              element={auth.token ? <FamilyManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/caf" 
              element={auth.token ? <CafStats /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/mailing" 
              element={auth.token ? <Mailing /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/tariffs" 
              element={auth.token ? <AdminTariffs /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/calendar-exception" 
              element={auth.token ? <CalendarExceptionManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/cantine" 
              element={auth.token ? <CantineStats /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/stats-advanced" 
              element={auth.token ? <AdvancedStats /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/classes" 
              element={auth.token ? <ClassManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/adults" 
              element={auth.token ? <AdultManager /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/requests" 
              element={auth.token ? <ModificationRequestsAdmin /> : <Navigate to="/" />} 
            />
            <Route 
              path="/admin/news" 
              element={auth.token ? <NewsManager /> : <Navigate to="/" />} 
            />

            {/* ========================================================== */}
            {/* ROUTE PAR DÉFAUT : REDIRECTION VERS LE DASHBOARD OU LOGIN */}
            {/* ========================================================== */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        
        {/* StructureInfo reste en import statique car il gère le tiroir persistant en dehors des routes */}
        <StructureInfo />
      </div>
    </BrowserRouter>
  );
}