import { NavLink, Outlet } from "react-router-dom";
import { useLogout, useMe } from "../api/queries";

export function Layout() {
  const { data: me } = useMe();
  const logout = useLogout();

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">KioskHub</span>
        <nav>
          <NavLink to="/devices">Devices</NavLink>
          <NavLink to="/groups">Groups</NavLink>
          <NavLink to="/profiles">Profiles</NavLink>
          <NavLink to="/signage">Signage</NavLink>
        </nav>
        <div className="topbar-right">
          <span className="me">{me?.email}</span>
          <button onClick={() => logout.mutate()}>Log out</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
