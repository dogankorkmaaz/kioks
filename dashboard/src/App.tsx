import { Navigate, Route, Routes } from "react-router-dom";
import { useMe } from "./api/queries";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DevicesPage } from "./pages/DevicesPage";
import { DeviceDetailPage } from "./pages/DeviceDetailPage";
import { GroupsPage } from "./pages/GroupsPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { SignagePage } from "./pages/SignagePage";
import "./App.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) return <div className="centered">Loading…</div>;
  if (isError || !me) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/devices" replace />} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:id" element={<DeviceDetailPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/profiles" element={<ProfilesPage />} />
        <Route path="/signage" element={<SignagePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
