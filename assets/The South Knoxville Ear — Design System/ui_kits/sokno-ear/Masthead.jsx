// Masthead.jsx — full-width SoKno Ear masthead + dateline + in-page nav.
// No weather block. The nav links jump within the single weekly page.
function Masthead({ assets = "../../assets", sections = [] }) {
  const dateline = "Weekend Edition · Saturday, May 17, 2025 · South Knoxville, TN";
  return (
    <header style={{ borderBottom: "var(--border-heavy) solid var(--ink-black)" }}>
      {/* Super-header dateline strip (soknoear.com locks in the association) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "7px 24px",
          borderBottom: "var(--border-hair) solid var(--ink-black)",
          fontFamily: "var(--font-label)",
          fontSize: "var(--label-sm)",
          letterSpacing: "var(--tracking-label-tight)",
          textTransform: "uppercase",
          color: "var(--ink-faded)",
          background: "var(--paper-shadow)",
        }}
      >
        <span>Vol. 4 — No. 17 · 25¢</span>
        <span style={{ color: "var(--ink-black)" }}>{dateline}</span>
        <a href="https://soknoear.com" style={{ color: "var(--rust)", textDecoration: "none", letterSpacing: "0.06em" }}>★ soknoear.com</a>
      </div>

      {/* Full-width masthead lockup */}
      <div style={{ background: "var(--paper-cream)", padding: "18px 16px 14px", textAlign: "center" }}>
        <img
          src={`${assets}/masthead.jpg`}
          alt="The South Knoxville Ear — We Hear Things."
          style={{ width: "100%", maxWidth: 1180, height: "auto", margin: "0 auto" }}
        />
      </div>

      {/* In-page navigation */}
      <nav
        style={{
          background: "var(--paper-shadow)",
          borderTop: "var(--border-ink) solid var(--ink-black)",
          borderBottom: "var(--border-ink) solid var(--ink-black)",
          display: "flex",
          alignItems: "stretch",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={navStar}>★</span>
        {sections.map((s, i) => (
          <NavLink key={s.id} href={`#${s.id}`} label={s.label} first={i === 0} />
        ))}
        <span style={navStar}>★</span>
      </nav>
    </header>
  );
}

const navStar = {
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  color: "var(--rust)",
  fontSize: 14,
};

function NavLink({ href, label, first }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "var(--font-label)",
        fontWeight: 600,
        fontSize: "var(--label-md)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: hover ? "var(--rust)" : "var(--ink-black)",
        textDecoration: "none",
        padding: "12px 18px",
        borderLeft: "var(--border-hair) solid var(--ink-black)",
        background: hover ? "var(--paper-bright)" : "transparent",
        transition: "background-color 120ms ease, color 120ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </a>
  );
}

window.Masthead = Masthead;
