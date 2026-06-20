import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import {
  IconBox,
  IconCart,
  IconChevronRight,
  IconDashboard,
  IconMenu,
  IconClose,
  IconMoon,
  IconSun,
  IconUsers,
} from "./icons.jsx";

const NAV = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/products", label: "Products", icon: IconBox },
  { to: "/customers", label: "Customers", icon: IconUsers },
  { to: "/orders", label: "Orders", icon: IconCart },
];

const TITLES = {
  "/": "Dashboard",
  "/products": "Products",
  "/customers": "Customers",
  "/orders": "Orders",
};

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const title = TITLES[location.pathname] || "Inventory";

  return (
    <div className="app-shell">
      <div
        className={`overlay ${open ? "overlay--show" : ""}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">
            <IconBox width={22} height={22} />
          </div>
          <div className="brand__text">
            <strong>StockFlow</strong>
            <span>Inventory &amp; Orders</span>
          </div>
          <button
            className="icon-btn sidebar__close"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <IconClose />
          </button>
        </div>

        <nav className="nav">
          <div className="nav__section">Manage</div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav__link ${isActive ? "nav__link--active" : ""}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon width={20} height={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span className="dot dot--ok" /> API connected
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn topbar__menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu />
          </button>
          <div className="topbar__crumb">
            <span>StockFlow</span>
            <IconChevronRight width={14} height={14} />
            <span className="topbar__title">{title}</span>
          </div>
          <div className="topbar__spacer" />
          <button
            className="icon-btn icon-btn--bordered"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
          </button>
        </header>
        <main className="content" key={location.pathname}>
          {children}
        </main>
      </div>
    </div>
  );
}
