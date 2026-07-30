import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useLogout, useMe } from "../api/queries";
import { ThemeToggle } from "./ThemeToggle";
import {
  IconLayers,
  IconLogOut,
  IconMenu,
  IconMonitor,
  IconPanelLeft,
  IconPlaySquare,
  IconSliders,
} from "./Icons";

const NAV = [
  { to: "/devices", label: "Devices", icon: IconMonitor },
  { to: "/groups", label: "Groups", icon: IconLayers },
  { to: "/profiles", label: "Profiles", icon: IconSliders },
  { to: "/signage", label: "Signage", icon: IconPlaySquare },
];

const COLLAPSE_KEY = "kioskhub.sidebarCollapsed";

/** Longest matching prefix wins, so /devices/:id resolves to the detail title. */
function pageTitle(pathname: string): string {
  if (pathname.startsWith("/devices/")) return "Device detail";
  const match = NAV.find((item) => pathname.startsWith(item.to));
  return match?.label ?? "KioskHub";
}

export function Layout() {
  const { data: me } = useMe();
  const logout = useLogout();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Navigating on mobile should dismiss the drawer rather than leave it over the page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const shellClass = ["app-shell", collapsed && "collapsed", drawerOpen && "drawer-open"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <IconMonitor size={19} />
          </span>
          <span className="brand-name">
            Kiosk<span>Hub</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Fleet</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} title={label}>
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar">{me?.email?.[0] ?? "?"}</span>
            <span className="user-meta">
              <span className="user-email">{me?.email}</span>
              <span className="user-role">Administrator</span>
            </span>
          </div>
          <button className="ghost" onClick={() => logout.mutate()} title="Log out">
            <IconLogOut />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Tapping outside the mobile drawer closes it. */}
      <div className="sidebar-scrim" onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      <div className="main-col">
        <header className="topbar">
          <button
            className="ghost icon-only mobile-only"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <IconMenu />
          </button>
          <button
            className="ghost icon-only desktop-only"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <IconPanelLeft />
          </button>

          <div className="topbar-title">
            <div className="crumb">KioskHub</div>
            <h1>{pageTitle(location.pathname)}</h1>
          </div>

          <div className="topbar-actions">
            <ThemeToggle />
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
