import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import AddStudent from './pages/AddStudent';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Attendance from './pages/Attendance';
import Tuition from './pages/Tuition';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/add-student" element={<AddStudent />} />
            <Route path="/students" element={<Students />} />
            <Route path="/students/:studentId" element={<StudentDetail />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/tuition" element={<Tuition />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
