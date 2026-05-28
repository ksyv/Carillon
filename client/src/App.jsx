import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import des pages extraites
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SessionView from './pages/SessionView';
import Report from './pages/Report';
import ChildrenManager from './pages/ChildrenManager';
import UserManager from './pages/UserManager';
import PlannedNotesManager from './pages/PlannedNotesManager';
import BillingManager from './pages/BillingManager';
import FamilyManager from './pages/FamilyManager';
import CafStats from './pages/CafStats'; 
import Mailing from './pages/Mailing';
import AdminTariffs from './pages/AdminTariffs';
import CalendarExceptionManager from './pages/CalendarExceptionManager';
// Ton nouveau portail famille connecté
import FamilyPortal from './pages/FamilyPortal';

export default function App() {
  const [auth, setAuth] = useState({ 
    token: localStorage.getItem('token'), 
    role: localStorage.getItem('role') 
  });
  
  return (
    <BrowserRouter>
      <Routes>
        {/* ========================================================== */}
        {/* ROUTE PUBLIC : LE PORTAIL FAMILLE PARENT (ACCESSIBLE À TOUS) */}
        {/* ========================================================== */}
        <Route path="/parent/portal" element={<FamilyPortal />} />

        {/* ========================================================== */}
        {/* ROUTES PRIVÉES : RÉSERVÉES AU STAFF (PROTÉGÉES)             */}
        {/* ========================================================== */}
        <Route 
          path="/" 
          element={auth.token ? <Dashboard /> : <Login setAuth={setAuth} />} 
        />
        <Route 
          path="/session/:date/:type" 
          element={auth.token ? <SessionView /> : <Navigate to="/" />} 
        />
        <Route 
          path="/report" 
          element={auth.token ? <Report /> : <Navigate to="/" />} 
        />
        <Route 
          path="/admin/children" 
          element={auth.token ? <ChildrenManager /> : <Navigate to="/" />} 
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

        {/* Filet de sécurité global */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}