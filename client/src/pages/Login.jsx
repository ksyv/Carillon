import React, { useState } from 'react';
import api from '../api';
import LogoTexte from '../components/LogoTexte';



const Login = ({ setAuth }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(`/login`, creds);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('categoryAccess', data.categoryAccess);
      setAuth({ token: data.token, role: data.role, categoryAccess: data.categoryAccess });
    } catch (err) { setError('Identifiants incorrects'); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-car-blue/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-car-pink/10 rounded-full blur-3xl"></div>
      <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-sm border border-slate-100 relative z-10">
        <div className="mb-8"><LogoTexte className="text-4xl mb-2" /><p className="text-center text-slate-400 font-semibold tracking-widest text-xs uppercase mt-2">Périscolaire</p></div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div><input type="text" placeholder="Identifiant" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.username} onChange={e => setCreds({...creds, username: e.target.value})} /></div>
          <div><input type="password" placeholder="Mot de passe" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-car-teal/20 focus:border-car-teal transition-all outline-none text-car-dark font-medium placeholder:text-slate-400" value={creds.password} onChange={e => setCreds({...creds, password: e.target.value})} /></div>
          {error && <p className="text-car-pink text-sm font-bold text-center bg-car-pink/10 p-3 rounded-xl">{error}</p>}
          <button type="submit" className="w-full bg-car-dark text-white p-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl shadow-car-dark/20 hover:-translate-y-1 mt-4">Connexion</button>
        </form>
      </div>
    </div>
  );
};

export default Login;