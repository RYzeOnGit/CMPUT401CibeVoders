/** Main App component */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { useApplicationStore } from './store/applicationStore';

function App() {
  const fetchApplications = useApplicationStore((state) => state.fetchApplications);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/table" replace />} />
        <Route path="/table" element={<Dashboard viewMode="table" />} />
        <Route path="/kanban" element={<Dashboard viewMode="kanban" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
