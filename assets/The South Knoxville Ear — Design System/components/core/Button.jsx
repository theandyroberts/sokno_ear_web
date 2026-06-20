import React from "react";

/**
 * Button — a stamped, slightly distressed print button.
 * Primary fills Bridge Green; secondary is an inked outline on paper;
 * ghost is a quiet text link with arrow. Labels are condensed caps.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  arrow = false,
  href,
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const sizes = {
    sm: { padding: "7px 14px", font: "var(--label-sm)" },
    md: { padding: "11px 22px", font: "var(--label-md)" },
    lg: { padding: "15px 30px", font: "var(--label-lg)" },
  };
  const s = sizes[size] || sizes.md;

  const palettes = {
    primary: {
      bg: "var(--green-bridge)",
      fg: "var(--on-green)",
      border: "var(--ink-black)",
      bgHover: "var(--rust-dark)",
    },
    secondary: {
      bg: "var(--paper-bright)",
      fg: "var(--ink-black)",
      border: "var(--ink-black)",
      bgHover: "var(--paper-shadow)",
    },
    rust: {
      bg: "var(--rust)",
      fg: "var(--on-rust)",
      border: "var(--ink-black)",
      bgHover: "var(--rust-dark)",
    },
  };

  const isGhost = variant === "ghost";
  const p = palettes[variant] || palettes.primary;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5em",
    fontFamily: "var(--font-label)",
    fontWeight: "var(--weight-label)",
    fontSize: s.font,
    letterSpacing: "var(--tracking-label)",
    textTransform: "uppercase",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    userSelect: "none",
    transition: "transform 90ms ease, background-color 120ms ease, color 120ms ease",
    textDecoration: "none",
    border: "var(--border-ink) solid",
    borderRadius: "var(--radius-sm)",
    ...style,
  };

  const skin = isGhost
    ? {
        ...base,
        padding: `${s.padding.split(" ")[0]} 0`,
        background: "transparent",
        border: "none",
        color: hover ? "var(--link-hover)" : "var(--link)",
        borderRadius: 0,
      }
    : {
        ...base,
        padding: s.padding,
        background: hover && !disabled ? p.bgHover : p.bg,
        color: hover && !disabled && variant === "secondary" ? "var(--ink-black)" : (hover && !disabled ? "var(--on-rust)" : p.fg),
        borderColor: p.border,
        boxShadow: press ? "1px 1px 0 0 var(--ink-black)" : "var(--shadow-press)",
        transform: press ? "translate(1px, 1px)" : "none",
      };

  const handlers = disabled
    ? {}
    : {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => { setHover(false); setPress(false); },
        onMouseDown: () => setPress(true),
        onMouseUp: () => setPress(false),
        onClick,
      };

  const content = (
    <>
      {children}
      {arrow && <span aria-hidden="true" style={{ fontFamily: "var(--font-body)", fontWeight: 700 }}>→</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} style={skin} {...handlers} {...rest}>{content}</a>
    );
  }
  return (
    <button type="button" style={skin} disabled={disabled} {...handlers} {...rest}>{content}</button>
  );
}
