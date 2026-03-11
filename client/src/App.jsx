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

export default function App() {
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), role: localStorage.getItem('role') });
  
  if (!auth.token) return <Login setAuth={setAuth} />;
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/session/:date/:type" element={<SessionView />} />
        <Route path="/report" element={<Report />} />
        <Route path="/admin/children" element={<ChildrenManager />} />
        <Route path="/admin/users" element={<UserManager />} />
        <Route path="/admin/planned-notes" element={<PlannedNotesManager />} />
        <Route path="/admin/billing" element={<BillingManager />} />
        <Route path="/admin/families" element={<FamilyManager />} />
        <Route path="/admin/caf" element={<CafStats />} />
        <Route path="/admin/mailing" element={<Mailing />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}