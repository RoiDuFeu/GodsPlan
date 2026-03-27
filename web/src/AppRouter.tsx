import { useEffect, useState } from 'react';
import App from './App';
import { AdminDashboard } from './pages/AdminDashboard';

export function AppRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen to popstate (back/forward buttons)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Route matching
  if (currentPath === '/admindashboard' || currentPath === '/admindashboard/') {
    return <AdminDashboard />;
  }

  // Default route (main app)
  return <App />;
}
