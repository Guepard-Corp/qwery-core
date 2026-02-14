import { Link, Outlet } from "react-router";

export default function Layout() {
  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <nav style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <Link to="/" style={{ color: "#3b82f6" }}>
          Home
        </Link>
        <Link to="/about" style={{ color: "#3b82f6" }}>
          About
        </Link>
        <Link to="/extensions" style={{ color: "#3b82f6" }}>
          Extensions
        </Link>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
