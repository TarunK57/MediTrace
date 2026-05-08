import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Scanner from './pages/Scanner';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import SuperAdmin from './pages/SuperAdmin';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Routes */}
        <Route path="/scan" element={<Scanner />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute adminOnly>
              <Admin />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/superadmin" 
          element={
            <ProtectedRoute superadminOnly>
              <SuperAdmin />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
