import { useState, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Compass,
  Menu,
  X,
  Sparkles,
  Heart,
  UserRound,
  LogOut,
  Instagram,
  MapPin,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { useScrollReveal } from "../lib/motion";
export function Logo() {
  return (
    <Link to="/" className="logo">
      <Compass size={31} strokeWidth={1.7} />
      roamly<span>®</span>
    </Link>
  );
}
export function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantPage = location.pathname.startsWith("/assistant");
  const main = useRef<HTMLElement>(null);
  useScrollReveal(main);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="announcement">
        A little further from ordinary. A little closer to you.{" "}
        <Link to="/tours">
          Find your adventure <ArrowUpRight size={13} />
        </Link>
      </div>
      <header className="header">
        <div className="container nav">
          <Logo />
          <nav
            id="main-navigation"
            className={open ? "nav-links open" : "nav-links"}
            aria-label="Main navigation"
            onClick={() => setOpen(false)}
          >
            <NavLink to="/tours">Explore tours</NavLink>
            <NavLink to="/destinations">Destinations</NavLink>
            <NavLink to="/about">Our story</NavLink>
            <NavLink to="/contact">Get in touch</NavLink>
          </nav>
          <div className="nav-actions">
            <Link to="/wishlist" aria-label="Wishlist" className="icon-button">
              <Heart size={20} />
            </Link>
            {user ? (
              <>
                <Link
                  className="account-link"
                  to={user.role === "ADMIN" ? "/admin" : "/dashboard"}
                >
                  <UserRound size={18} />
                  <span>{user.name.split(" ")[0]}</span>
                </Link>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <Link className="btn btn-small" to="/login">
                Let’s go <ArrowUpRight size={16} />
              </Link>
            )}
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle menu"
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main
        ref={main}
        id="main-content"
        tabIndex={-1}
        className={isAssistantPage ? "main-assistant" : ""}
      >
        <Outlet />
      </main>
      {!isAssistantPage && (
        <footer>
          <div className="container footer-grid">
            <div>
              <Logo />
              <p>
                For the places you’ll go.
                <br />
                And the person you’ll become.
              </p>
              <span className="footer-location">
                <MapPin size={14} /> Made for the curious, everywhere.
              </span>
            </div>
            <div>
              <h4>Find your way</h4>
              <Link to="/tours">Explore tours</Link>
              <Link to="/destinations">Destinations</Link>
              <Link to="/wishlist">Your wishlist</Link>
            </div>
            <div>
              <h4>A little about us</h4>
              <Link to="/about">Our story</Link>
              <Link to="/contact">Talk to us</Link>
              <Link to="/assistant">Travel assistant</Link>
            </div>
            <div>
              <h4>Your next chapter awaits.</h4>
              <p>
                Small groups. Local connections.
                <br />
                Extraordinary memories.
              </p>
              <Link to="/tours" className="footer-cta">
                Find your next adventure <ArrowUpRight size={18} />
              </Link>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>
              © {new Date().getFullYear()} Roamly. All journeys welcome.
            </span>
            <span>Thoughtfully planned. Beautifully lived.</span>
          </div>
        </footer>
      )}
      {!isAssistantPage && (
        <Link className="assistant-fab" to="/assistant" aria-label="Open travel assistant">
          <Sparkles size={19} />
          <span>Ask Roamly</span>
        </Link>
      )}
    </>
  );
}
const customerLinks = [
  ["/dashboard", "Overview"],
  ["/bookings", "My bookings"],
  ["/trips", "My trips"],
  ["/wishlist", "Wishlist"],
  ["/reviews", "My reviews"],
  ["/notifications", "Notifications"],
  ["/assistant", "Travel assistant"],
  ["/profile", "My profile"],
];
export function AccountLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAssistant = location.pathname.startsWith("/assistant");
  return (
    <div className={`container account-shell ${isAssistant ? "account-shell-assistant" : ""}`}>
      <aside className="account-sidebar">
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h2>Hello, {user?.name.split(" ")[0]}.</h2>
        <p>Good things are on the horizon.</p>
        <nav>
          {customerLinks.map(([to, label]) => (
            <NavLink end key={to} to={to}>
              {label}
              {to === "/assistant" && <Sparkles size={15} />}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="account-content">
        <Outlet />
      </div>
    </div>
  );
}
