import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AktivitaetenPage from '@/pages/AktivitaetenPage';
import StimmungskategorienPage from '@/pages/StimmungskategorienPage';
import TaeglicheStimmungPage from '@/pages/TaeglicheStimmungPage';
import PositiveMomentePage from '@/pages/PositiveMomentePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="aktivitaeten" element={<AktivitaetenPage />} />
          <Route path="stimmungskategorien" element={<StimmungskategorienPage />} />
          <Route path="taegliche-stimmung" element={<TaeglicheStimmungPage />} />
          <Route path="positive-momente" element={<PositiveMomentePage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}