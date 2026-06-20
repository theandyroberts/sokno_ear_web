/* @ds-bundle: {"format":3,"namespace":"TheSouthKnoxvilleEarDesignSystem_0be224","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"Ribbon","sourcePath":"components/core/Ribbon.jsx"},{"name":"SectionHeader","sourcePath":"components/core/SectionHeader.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"Article","sourcePath":"components/editorial/Article.jsx"},{"name":"AudioBriefing","sourcePath":"components/editorial/AudioBriefing.jsx"},{"name":"CalendarItem","sourcePath":"components/editorial/CalendarItem.jsx"},{"name":"StoryCard","sourcePath":"components/editorial/StoryCard.jsx"},{"name":"Tipline","sourcePath":"components/editorial/Tipline.jsx"}],"sourceHashes":{"components/core/Button.jsx":"76bbf2395ae7","components/core/Divider.jsx":"baa19dc2a1f0","components/core/Ribbon.jsx":"3c21876751f0","components/core/SectionHeader.jsx":"e4a2855cf196","components/core/Tag.jsx":"ee06b1a477a4","components/editorial/Article.jsx":"66c6e7ab9f01","components/editorial/AudioBriefing.jsx":"571bf9e4cd0c","components/editorial/CalendarItem.jsx":"31d17e79a9d6","components/editorial/StoryCard.jsx":"ff31645ba927","components/editorial/Tipline.jsx":"e1480bbcc648","ui_kits/sokno-ear/Masthead.jsx":"b19f63edce50","ui_kits/sokno-ear/WeeklyPaper.jsx":"335d44f45b15"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.TheSouthKnoxvilleEarDesignSystem_0be224 = window.TheSouthKnoxvilleEarDesignSystem_0be224 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — a stamped, slightly distressed print button.
 * Primary fills Bridge Green; secondary is an inked outline on paper;
 * ghost is a quiet text link with arrow. Labels are condensed caps.
 */
function Button({
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
    sm: {
      padding: "7px 14px",
      font: "var(--label-sm)"
    },
    md: {
      padding: "11px 22px",
      font: "var(--label-md)"
    },
    lg: {
      padding: "15px 30px",
      font: "var(--label-lg)"
    }
  };
  const s = sizes[size] || sizes.md;
  const palettes = {
    primary: {
      bg: "var(--green-bridge)",
      fg: "var(--on-green)",
      border: "var(--ink-black)",
      bgHover: "var(--rust-dark)"
    },
    secondary: {
      bg: "var(--paper-bright)",
      fg: "var(--ink-black)",
      border: "var(--ink-black)",
      bgHover: "var(--paper-shadow)"
    },
    rust: {
      bg: "var(--rust)",
      fg: "var(--on-rust)",
      border: "var(--ink-black)",
      bgHover: "var(--rust-dark)"
    }
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
    ...style
  };
  const skin = isGhost ? {
    ...base,
    padding: `${s.padding.split(" ")[0]} 0`,
    background: "transparent",
    border: "none",
    color: hover ? "var(--link-hover)" : "var(--link)",
    borderRadius: 0
  } : {
    ...base,
    padding: s.padding,
    background: hover && !disabled ? p.bgHover : p.bg,
    color: hover && !disabled && variant === "secondary" ? "var(--ink-black)" : hover && !disabled ? "var(--on-rust)" : p.fg,
    borderColor: p.border,
    boxShadow: press ? "1px 1px 0 0 var(--ink-black)" : "var(--shadow-press)",
    transform: press ? "translate(1px, 1px)" : "none"
  };
  const handlers = disabled ? {} : {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setPress(false);
    },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    onClick
  };
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, children, arrow && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 700
    }
  }, "\u2192"));
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: skin
    }, handlers, rest), content);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: skin,
    disabled: disabled
  }, handlers, rest), content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Divider — a decorative newspaper rule. Keeps the old-print rhythm between
 * sections. Choose an ornament: star, diamond, or a plain double rule.
 */
function Divider({
  ornament = "star",
  color = "ink",
  thickness = 2,
  style = {},
  ...rest
}) {
  const colors = {
    ink: "var(--ink-black)",
    rust: "var(--rust)",
    teal: "var(--green-bridge)"
  };
  const line = colors[color] || colors.ink;
  const rule = {
    flex: 1,
    height: 0,
    borderTop: `${thickness}px solid ${line}`,
    borderBottom: ornament === "double" ? `${thickness}px solid ${line}` : "none",
    minHeight: ornament === "double" ? `${thickness + 3}px` : 0
  };
  const marks = {
    star: "★",
    diamond: "◆",
    flourish: "❧",
    triple: "✦ ✦ ✦"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "separator",
    style: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      margin: "var(--space-5) 0",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: rule
  }), ornament !== "double" && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: color === "ink" ? "var(--rust)" : line,
      fontSize: "14px",
      lineHeight: 1,
      letterSpacing: "0.3em"
    }
  }, marks[ornament] || marks.star), /*#__PURE__*/React.createElement("span", {
    style: rule
  }));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/core/Ribbon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Ribbon — a teal handbill banner with notched ends and flanking stars,
 * like the "South Knoxville Events & Rumors" strip under the masthead.
 */
function Ribbon({
  children,
  color = "teal",
  style = {},
  ...rest
}) {
  const colors = {
    teal: {
      bg: "var(--teal)",
      fg: "var(--on-teal)"
    },
    rust: {
      bg: "var(--rust)",
      fg: "var(--on-rust)"
    },
    green: {
      bg: "var(--green-bridge)",
      fg: "var(--on-green)"
    }
  };
  const c = colors[color] || colors.teal;
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "0.7em",
      background: c.bg,
      color: c.fg,
      border: "var(--border-ink) solid var(--ink-black)",
      padding: "8px 30px",
      fontFamily: "var(--font-display)",
      fontSize: "var(--rubric-md)",
      letterSpacing: "0.01em",
      lineHeight: 1.1,
      position: "relative",
      // notched handbill ends
      clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 50%, 100% 100%, 0 100%, 16px 50%)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)",
      fontSize: "0.7em"
    }
  }, "\u2605"), children, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)",
      fontSize: "0.7em"
    }
  }, "\u2605"));
}
Object.assign(__ds_scope, { Ribbon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Ribbon.jsx", error: String((e && e.message) || e) }); }

// components/core/SectionHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SectionHeader — a printed rubric like "TOP STORIES & EVENTS", centered or
 * left-aligned, flanked by ornamental rules. The backbone of the one-page
 * scroll: each section of the weekly page opens with one of these.
 */
function SectionHeader({
  children,
  align = "center",
  ornament = "diamond",
  id,
  style = {},
  ...rest
}) {
  const marks = {
    diamond: "◆",
    star: "★",
    flourish: "❧"
  };
  const mark = marks[ornament] || marks.diamond;
  const rule = {
    flex: align === "center" ? 1 : "none",
    width: align === "center" ? "auto" : "56px",
    height: 0,
    borderTop: "2px solid var(--ink-black)"
  };
  const orn = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)",
      fontSize: "13px",
      letterSpacing: "0.25em",
      lineHeight: 1
    }
  }, mark);
  return /*#__PURE__*/React.createElement("div", _extends({
    id: id,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: align === "center" ? "center" : "flex-start",
      gap: "16px",
      margin: "0 0 var(--space-5)",
      ...style
    }
  }, rest), align === "center" && /*#__PURE__*/React.createElement("span", {
    style: rule
  }), align === "center" && orn, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "var(--rubric-lg)",
      letterSpacing: "var(--tracking-rubric)",
      textTransform: "uppercase",
      color: "var(--ink-black)",
      margin: 0,
      lineHeight: 1.05,
      whiteSpace: "nowrap"
    }
  }, children), orn, /*#__PURE__*/React.createElement("span", {
    style: rule
  }));
}
Object.assign(__ds_scope, { SectionHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SectionHeader.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tag — a small stamped print label. Use for section rubrics ("RUMOR MILL"),
 * "HOT" flags, and category chips. Solid (filled) or outline.
 */
function Tag({
  children,
  color = "rust",
  variant = "solid",
  size = "md",
  star = false,
  style = {},
  ...rest
}) {
  const colors = {
    rust: {
      bg: "var(--rust)",
      fg: "var(--on-rust)",
      line: "var(--rust)"
    },
    teal: {
      bg: "var(--teal)",
      fg: "var(--on-teal)",
      line: "var(--green-bridge)"
    },
    green: {
      bg: "var(--green-bridge)",
      fg: "var(--on-green)",
      line: "var(--green-bridge)"
    },
    ink: {
      bg: "var(--ink-black)",
      fg: "var(--paper-cream)",
      line: "var(--ink-black)"
    },
    gold: {
      bg: "var(--gold)",
      fg: "var(--on-gold)",
      line: "var(--gold)"
    }
  };
  const c = colors[color] || colors.rust;
  const sizes = {
    sm: {
      padding: "2px 8px",
      font: "11px"
    },
    md: {
      padding: "4px 11px",
      font: "var(--label-sm)"
    }
  };
  const s = sizes[size] || sizes.md;
  const solid = variant === "solid";
  const skin = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4em",
    fontFamily: "var(--font-label)",
    fontWeight: "var(--weight-label)",
    fontSize: s.font,
    letterSpacing: "var(--tracking-label)",
    textTransform: "uppercase",
    padding: s.padding,
    borderRadius: "var(--radius-sm)",
    border: `var(--border-hair) solid ${solid ? "var(--ink-black)" : c.line}`,
    background: solid ? c.bg : "transparent",
    color: solid ? c.fg : c.line,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    ...style
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: skin
  }, rest), star && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: "0.85em"
    }
  }, "\u2605"), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/editorial/Article.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Article — a full inline story for the one-page weekly paper. Everything is
 * right there: section rubric, engraving, headline, deck, optional event facts,
 * and the full body. No "read more", no new page. Lay images and body in a
 * two-column print measure on wide screens.
 */
function Article({
  id,
  label,
  labelColor = "rust",
  image,
  imageCaption,
  title,
  deck,
  facts = [],
  children,
  layout = "wrap",
  style = {},
  ...rest
}) {
  const figure = image && /*#__PURE__*/React.createElement("figure", {
    style: {
      margin: 0,
      float: layout === "wrap" ? "left" : "none",
      width: layout === "wrap" ? "min(42%, 340px)" : "100%",
      marginRight: layout === "wrap" ? "var(--space-5)" : 0,
      marginBottom: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: "var(--border-ink) solid var(--ink-black)",
      background: "var(--paper-cream)",
      padding: "6px",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-lift)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: "100%",
      display: "block",
      borderRadius: "calc(var(--radius-md) - 4px)",
      filter: "saturate(0.9) contrast(1.05)"
    }
  })), imageCaption && /*#__PURE__*/React.createElement("figcaption", {
    style: {
      fontFamily: "var(--font-label)",
      fontSize: "var(--label-sm)",
      letterSpacing: "var(--tracking-label-tight)",
      textTransform: "uppercase",
      color: "var(--ink-faded)",
      marginTop: "6px",
      textAlign: "center"
    }
  }, imageCaption));
  return /*#__PURE__*/React.createElement("article", _extends({
    id: id,
    style: {
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: "10px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    color: labelColor
  }, label)), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: "var(--display-3)",
      lineHeight: 1.12,
      letterSpacing: "0",
      color: "var(--ink-black)",
      margin: "0 0 10px",
      textWrap: "balance"
    }
  }, title), deck && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: "var(--text-deck)",
      lineHeight: 1.35,
      color: "var(--ink-black)",
      margin: "0 0 var(--space-4)"
    }
  }, deck), facts.length > 0 && /*#__PURE__*/React.createElement("dl", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px 22px",
      margin: "0 0 var(--space-4)",
      padding: "10px 14px",
      background: "var(--paper-shadow)",
      border: "var(--border-hair) solid var(--ink-black)",
      borderRadius: "var(--radius-sm)"
    }
  }, facts.map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: "0.5em",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      fontFamily: "var(--font-label)",
      fontWeight: "var(--weight-label)",
      fontSize: "var(--label-sm)",
      letterSpacing: "var(--tracking-label-tight)",
      textTransform: "uppercase",
      color: "var(--rust)",
      margin: 0
    }
  }, f.label), /*#__PURE__*/React.createElement("dd", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--ink-black)",
      margin: 0
    }
  }, f.value)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-base)",
      lineHeight: "var(--leading-body)",
      color: "var(--ink-black)"
    }
  }, figure, children, /*#__PURE__*/React.createElement("div", {
    style: {
      clear: "both"
    }
  })));
}
Object.assign(__ds_scope, { Article });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/editorial/Article.jsx", error: String((e && e.message) || e) }); }

// components/editorial/AudioBriefing.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AudioBriefing — the recurring neighborhood radio dispatch, built to match the
 * paper: a stamped header, a bold serif intro, a big round teal play button, a
 * hand-set waveform, a timeline with a draggable-looking progress dot, a short
 * description, and a rust "LISTEN NOW →" cue. Never a glossy podcast embed.
 */
function AudioBriefing({
  title = "Weekend Audio Briefing",
  intro = "What's happening in SoKno. The 90-second roundup.",
  description = "Your quick listen for events, closures, tips, and the latest local buzz.",
  duration = "01:30",
  listenLabel = "Listen now",
  style = {},
  ...rest
}) {
  const [playing, setPlaying] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const [progress, setProgress] = React.useState(0.34);
  const bars = React.useMemo(() => Array.from({
    length: 52
  }, (_, i) => 18 + Math.round(30 * Math.abs(Math.sin(i * 1.4) * Math.cos(i * 0.5)))), []);
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: "var(--paper-bright)",
      border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)",
      padding: "var(--space-5)",
      boxShadow: "var(--shadow-lift)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "10px",
      fontFamily: "var(--font-label)",
      fontSize: "var(--label-md)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--ink-black)",
      paddingBottom: "10px",
      marginBottom: "14px",
      borderBottom: "var(--border-hair) solid var(--paper-edge)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)"
    }
  }, "\u2605"), title, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)"
    }
  }, "\u2605")), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: "var(--text-deck)",
      lineHeight: 1.3,
      color: "var(--ink-black)",
      margin: "0 0 var(--space-4)"
    }
  }, intro), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": playing ? "Pause" : "Play",
    onClick: () => setPlaying(p => !p),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      flex: "none",
      width: "64px",
      height: "64px",
      borderRadius: "var(--radius-pill)",
      border: "var(--border-heavy) solid var(--ink-black)",
      background: hover ? "var(--green-bridge)" : "var(--teal)",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 120ms ease",
      boxShadow: "var(--shadow-press)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontSize: "23px",
      lineHeight: 1,
      marginLeft: playing ? 0 : "3px",
      color: hover ? "var(--paper-cream)" : "var(--ink-black)"
    }
  }, playing ? "❚❚" : "▶")), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      gap: "2px",
      height: "54px"
    }
  }, bars.map((h, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      flex: 1,
      height: `${h}px`,
      background: i / bars.length < progress ? "var(--rust)" : "var(--ink-black)",
      opacity: i / bars.length < progress ? 0.9 : 0.55,
      borderRadius: "1px"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: "12px 0 14px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: timeStyle
  }, fmt(progress, duration)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: "3px",
      background: "var(--paper-edge)",
      borderRadius: "999px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: `${progress * 100}%`,
      background: "var(--ink-black)",
      borderRadius: "999px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: `${progress * 100}%`,
      top: "50%",
      width: "13px",
      height: "13px",
      marginLeft: "-6px",
      transform: "translateY(-50%)",
      background: "var(--rust)",
      border: "2px solid var(--ink-black)",
      borderRadius: "999px"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: timeStyle
  }, duration)), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      lineHeight: 1.5,
      color: "var(--ink-faded)",
      margin: "0 0 var(--space-4)"
    }
  }, description), /*#__PURE__*/React.createElement("a", {
    href: "#listen",
    style: {
      fontFamily: "var(--font-label)",
      fontSize: "var(--label-md)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--link)",
      display: "inline-flex",
      alignItems: "center",
      gap: "0.5em"
    }
  }, listenLabel, " ", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2192")));
}
const timeStyle = {
  fontFamily: "var(--font-label)",
  fontSize: "var(--label-sm)",
  letterSpacing: "0.04em",
  color: "var(--ink-faded)",
  whiteSpace: "nowrap"
};
function fmt(progress, duration) {
  // turn the duration "mm:ss" + progress into an elapsed readout
  const parts = String(duration).split(":").map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return "00:00";
  const total = parts[0] * 60 + parts[1];
  const el = Math.round(total * progress);
  const m = String(Math.floor(el / 60)).padStart(2, "0");
  const s = String(el % 60).padStart(2, "0");
  return `${m}:${s}`;
}
Object.assign(__ds_scope, { AudioBriefing });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/editorial/AudioBriefing.jsx", error: String((e && e.message) || e) }); }

// components/editorial/CalendarItem.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * CalendarItem — one row of the "What's Happening Soon" calendar: a stamped
 * date block, the event title and meta, and a star. Stack several inside a
 * bordered well.
 */
function CalendarItem({
  month,
  day,
  title,
  meta,
  starred = false,
  divider = true,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "12px 4px",
      borderBottom: divider ? "var(--border-hair) solid var(--paper-edge)" : "none",
      background: hover ? "var(--paper-shadow)" : "transparent",
      transition: "background-color 120ms ease",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "none",
      width: "52px",
      textAlign: "center",
      border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-sm)",
      background: "var(--paper-cream)",
      padding: "4px 0 5px",
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-label)",
      fontWeight: 600,
      fontSize: "11px",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--rust)"
    }
  }, month), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "22px",
      color: "var(--ink-black)",
      marginTop: "2px"
    }
  }, day)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-label)",
      fontWeight: 600,
      fontSize: "var(--label-md)",
      letterSpacing: "var(--tracking-label-tight)",
      textTransform: "uppercase",
      color: "var(--ink-black)",
      lineHeight: 1.2
    }
  }, title), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      color: "var(--ink-faded)",
      marginTop: "2px"
    }
  }, meta)), starred && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: "none",
      color: "var(--rust)",
      fontSize: "15px"
    }
  }, "\u2605"));
}
Object.assign(__ds_scope, { CalendarItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/editorial/CalendarItem.jsx", error: String((e && e.message) || e) }); }

// components/editorial/StoryCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * StoryCard — a bordered paper card with an engraving thumbnail, headline, and
 * a short blurb. Built for the "Top Stories & Events" scanner grid. On the
 * one-page paper it can jump to a section (href="#anchor") instead of a new
 * page — keep everything on the same scroll.
 */
function StoryCard({
  label,
  labelColor = "rust",
  hot = false,
  image,
  title,
  blurb,
  cue,
  href,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("article", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      background: "var(--paper-bright)",
      border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)",
      boxShadow: hover ? "var(--shadow-press)" : "none",
      transform: hover ? "translate(-1px,-1px)" : "none",
      transition: "transform 120ms ease, box-shadow 120ms ease",
      overflow: "hidden",
      ...style
    },
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, rest), image && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      borderBottom: "var(--border-hair) solid var(--ink-black)",
      background: "var(--paper-cream)",
      aspectRatio: "4 / 3",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
      filter: "saturate(0.92) contrast(1.04)"
    }
  }), hot && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 8,
      left: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    color: "rust",
    size: "sm",
    star: true
  }, "Hot"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      flex: 1
    }
  }, label && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(__ds_scope.Tag, {
    color: labelColor,
    size: "sm"
  }, label)), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-body)",
      fontWeight: 700,
      fontSize: "1.1875rem",
      lineHeight: 1.14,
      margin: 0,
      color: "var(--ink-black)"
    }
  }, title), blurb && /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      lineHeight: 1.5,
      color: "var(--ink-faded)",
      margin: 0
    }
  }, blurb), cue && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto"
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: href || "#",
    style: {
      fontFamily: "var(--font-label)",
      fontWeight: "var(--weight-label)",
      fontSize: "var(--label-sm)",
      letterSpacing: "var(--tracking-label-tight)",
      textTransform: "uppercase",
      color: "var(--link)",
      display: "inline-flex",
      gap: "0.4em",
      alignItems: "center"
    }
  }, cue, " ", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2192")))));
}
Object.assign(__ds_scope, { StoryCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/editorial/StoryCard.jsx", error: String((e && e.message) || e) }); }

// components/editorial/Tipline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tipline — the "Get the Ear Delivered" / "Have a Tip?" module. A bordered
 * paper box with a rubric heading, a line of copy, and either an email signup
 * (mode="subscribe") or a tip prompt (mode="tip").
 */
function Tipline({
  mode = "subscribe",
  title,
  blurb,
  placeholder,
  cta,
  onSubmit,
  style = {},
  ...rest
}) {
  const isTip = mode === "tip";
  const heading = title || (isTip ? "Have a Tip? We're All Ears." : "Get the Ear Delivered");
  const copy = blurb || (isTip ? "Send a rumor, a tip, or a neighborhood heads-up. We hear things." : "Sign up for our weekly dispatch of events, rumors, and all things SoKno.");
  const ph = placeholder || (isTip ? "What did you hear?" : "Your email address");
  const label = cta || (isTip ? "Submit a Tip" : "Subscribe");
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: "var(--paper-bright)",
      border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-sm)",
      padding: "var(--space-5)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-label)",
      fontWeight: "var(--weight-label)",
      fontSize: "var(--label-md)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      color: "var(--rust)",
      marginBottom: "8px"
    }
  }, "\u2605 ", heading), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "var(--text-sm)",
      lineHeight: 1.5,
      color: "var(--ink-black)",
      margin: "0 0 var(--space-4)"
    }
  }, copy), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(e);
    },
    style: {
      display: "flex",
      gap: "8px",
      flexWrap: "wrap"
    }
  }, isTip ? /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    placeholder: ph,
    style: {
      ...inputStyle,
      flex: "1 1 100%",
      resize: "vertical",
      minHeight: "48px"
    }
  }) : /*#__PURE__*/React.createElement("input", {
    type: "email",
    placeholder: ph,
    style: {
      ...inputStyle,
      flex: "1 1 160px"
    }
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: isTip ? "rust" : "primary",
    arrow: isTip,
    size: "md",
    style: {
      flex: isTip ? "1 1 100%" : "none",
      justifyContent: "center"
    }
  }, label)));
}
const inputStyle = {
  fontFamily: "var(--font-body)",
  fontSize: "var(--text-sm)",
  color: "var(--ink-black)",
  background: "var(--paper-cream)",
  border: "var(--border-ink) solid var(--ink-black)",
  borderRadius: "var(--radius-sm)",
  padding: "10px 12px",
  outline: "none"
};
Object.assign(__ds_scope, { Tipline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/editorial/Tipline.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sokno-ear/Masthead.jsx
try { (() => {
// Masthead.jsx — full-width SoKno Ear masthead + dateline + in-page nav.
// No weather block. The nav links jump within the single weekly page.
function Masthead({
  assets = "../../assets",
  sections = []
}) {
  const dateline = "Weekend Edition · Saturday, May 17, 2025 · South Knoxville, TN";
  return /*#__PURE__*/React.createElement("header", {
    style: {
      borderBottom: "var(--border-heavy) solid var(--ink-black)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
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
      background: "var(--paper-shadow)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "Vol. 4 \u2014 No. 17 \xB7 25\xA2"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--ink-black)"
    }
  }, dateline), /*#__PURE__*/React.createElement("a", {
    href: "https://soknoear.com",
    style: {
      color: "var(--rust)",
      textDecoration: "none",
      letterSpacing: "0.06em"
    }
  }, "\u2605 soknoear.com")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--paper-cream)",
      padding: "18px 16px 14px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: `${assets}/masthead.jpg`,
    alt: "The South Knoxville Ear \u2014 We Hear Things.",
    style: {
      width: "100%",
      maxWidth: 1180,
      height: "auto",
      margin: "0 auto"
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      background: "var(--paper-shadow)",
      borderTop: "var(--border-ink) solid var(--ink-black)",
      borderBottom: "var(--border-ink) solid var(--ink-black)",
      display: "flex",
      alignItems: "stretch",
      justifyContent: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: navStar
  }, "\u2605"), sections.map((s, i) => /*#__PURE__*/React.createElement(NavLink, {
    key: s.id,
    href: `#${s.id}`,
    label: s.label,
    first: i === 0
  })), /*#__PURE__*/React.createElement("span", {
    style: navStar
  }, "\u2605")));
}
const navStar = {
  display: "flex",
  alignItems: "center",
  padding: "0 16px",
  color: "var(--rust)",
  fontSize: 14
};
function NavLink({
  href,
  label,
  first
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
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
      whiteSpace: "nowrap"
    }
  }, label);
}
window.Masthead = Masthead;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sokno-ear/Masthead.jsx", error: String((e && e.message) || e) }); }

// ui_kits/sokno-ear/WeeklyPaper.jsx
try { (() => {
// WeeklyPaper.jsx — the full one-page weekly. Everything is right there on the
// scroll: a woodtype feature, the audio dispatch, the calendar, and every
// section's full story inline with its own cropped engraving. No "read more".
(function () {
  const NS = window.TheSouthKnoxvilleEarDesignSystem_0be224;
  const {
    SectionHeader,
    Divider,
    Tag,
    Article,
    AudioBriefing,
    CalendarItem,
    Tipline,
    StoryCard
  } = NS;
  const A = "../../assets";
  const S = "../../assets/spots";
  const Page = ({
    children,
    style
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: "0 24px",
      ...style
    }
  }, children);
  const Well = ({
    children,
    title
  }) => /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--paper-bright)",
      border: "var(--border-ink) solid var(--ink-black)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
      boxShadow: "var(--shadow-lift)"
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--teal)",
      color: "var(--on-teal)",
      borderBottom: "var(--border-ink) solid var(--ink-black)",
      padding: "10px 16px",
      fontFamily: "var(--font-label)",
      fontSize: "var(--label-md)",
      letterSpacing: "var(--tracking-label)",
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: "var(--rust)"
    }
  }, "\u2605"), title), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "4px 16px 8px"
    }
  }, children));

  // a framed engraving clipping
  const Spot = ({
    src,
    alt,
    w,
    float,
    mb = 14
  }) => /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      float: float || "none",
      width: w || "100%",
      marginRight: float === "left" ? "var(--space-5)" : 0,
      marginLeft: float === "right" ? "var(--space-5)" : 0,
      marginBottom: mb
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      border: "var(--border-ink) solid var(--ink-black)",
      background: "var(--paper-cream)",
      borderRadius: "var(--radius-md)",
      padding: "6px",
      boxShadow: "var(--shadow-lift)"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt || "",
    style: {
      width: "100%",
      display: "block",
      borderRadius: "calc(var(--radius-md) - 4px)"
    }
  })));
  const pStyle = {
    fontFamily: "var(--font-body)",
    fontSize: "var(--text-base)",
    lineHeight: "var(--leading-body)",
    margin: "0 0 14px",
    color: "var(--ink-black)"
  };
  function WeeklyPaper() {
    return /*#__PURE__*/React.createElement("main", {
      id: "top"
    }, /*#__PURE__*/React.createElement("div", {
      id: "events",
      style: {
        borderBottom: "var(--border-rule) double var(--ink-black)",
        padding: "28px 0 32px"
      }
    }, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)",
        gap: 36,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("article", null, /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Tag, {
      color: "rust",
      star: true
    }, "Feature Story \xB7 Pride Weekend")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 22,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: "none",
        width: 168
      }
    }, /*#__PURE__*/React.createElement(Spot, {
      src: `${S}/feature_flag.png`,
      alt: "Pride flag on a Sevier Avenue streetlamp",
      mb: 0
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: "clamp(2.4rem, 4.4vw, 3.4rem)",
        lineHeight: 1.02,
        color: "var(--ink-black)",
        margin: "0 0 6px",
        textTransform: "uppercase"
      }
    }, "Pride Day Double Feature"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: "1.5rem",
        color: "var(--ink-black)",
        textTransform: "uppercase",
        lineHeight: 1.1
      }
    }, "Noon Street Celebration"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: "1.5rem",
        color: "var(--rust)",
        textTransform: "uppercase",
        lineHeight: 1.1,
        marginTop: 2
      }
    }, "6 PM Afterglow"))), /*#__PURE__*/React.createElement("p", {
      style: {
        ...pStyle,
        fontWeight: 700,
        fontSize: "var(--text-deck)",
        lineHeight: 1.35,
        margin: "18px 0 14px"
      }
    }, "A noon street celebration and a 6 PM afterglow keep the good vibes rolling long after the sun drops behind the ridge."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "It starts the way the best South Knoxville things start: a little homemade, a little loud, and entirely ours. At noon the avenue closes to cars and opens to everybody else \u2014 a parade of neighbors, dogs in bandanas, and at least one possum costume we have been promised is \"very tasteful.\""), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "Local bands take the corner stage through the afternoon while vendors line up toward the river. Then, because one party is never enough down here, the ", /*#__PURE__*/React.createElement("em", null, "6 PM Afterglow"), " brings string lights, a disco ball of uncertain origin, and dancing that lasts as long as the neighbors allow. Bring a chair. Bring a friend. Bring the friend who never comes out \u2014 this is the one.")), /*#__PURE__*/React.createElement("aside", {
      id: "listen",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 22,
        position: "sticky",
        top: 16
      }
    }, /*#__PURE__*/React.createElement(AudioBriefing, null), /*#__PURE__*/React.createElement(Well, {
      title: "What's Happening Soon"
    }, /*#__PURE__*/React.createElement(CalendarItem, {
      month: "MAY",
      day: "17",
      title: "SoKno Pride Day",
      meta: "Noon \xB7 Sevier Ave",
      starred: true
    }), /*#__PURE__*/React.createElement(CalendarItem, {
      month: "MAY",
      day: "17",
      title: "Pride Afterglow",
      meta: "6:00\u201311:00 PM \xB7 Sevier Ave",
      starred: true
    }), /*#__PURE__*/React.createElement(CalendarItem, {
      month: "MAY",
      day: "18",
      title: "Riverfront Cleanup",
      meta: "9:00 AM \xB7 Volunteer Landing"
    }), /*#__PURE__*/React.createElement(CalendarItem, {
      month: "MAY",
      day: "22",
      title: "Old Sevier Trolley Tour",
      meta: "6:00 PM \xB7 Island Home Park",
      divider: false
    })))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "30px 0",
        borderBottom: "var(--border-hair) solid var(--paper-edge)"
      }
    }, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement(SectionHeader, null, "Top Stories & Events"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))",
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(StoryCard, {
      label: "Old Sevier",
      hot: true,
      image: `${S}/s1_flag.png`,
      title: "Pride at Noon on Sevier Avenue",
      blurb: "Parade, performances, vendors, and community celebration, all day long.",
      cue: "Jump to story",
      href: "#pride-noon"
    }), /*#__PURE__*/React.createElement(StoryCard, {
      label: "Old Sevier",
      image: `${S}/s2_disco.png`,
      title: "Pride Afterglow at 6 PM",
      blurb: "Evening music, drag, dancing, and dazzling nighttime festivities.",
      cue: "Jump to story",
      href: "#afterglow"
    }), /*#__PURE__*/React.createElement(StoryCard, {
      label: "Rumor Mill",
      image: `${S}/s3_perc.png`,
      title: "What We're Hearing",
      blurb: "The whispers, the maybe-true things, and what's making waves in SoKno.",
      cue: "Jump to story",
      href: "#rumors"
    }), /*#__PURE__*/React.createElement(StoryCard, {
      label: "Waterfront",
      image: `${S}/s4_bridge.png`,
      title: "South Waterfront Update",
      blurb: "Riverfront projects, recreational access, and what's next for the docks.",
      cue: "Jump to story",
      href: "#waterfront"
    }), /*#__PURE__*/React.createElement(StoryCard, {
      label: "Wilderness",
      image: `${S}/s5_fire.png`,
      title: "Urban Wilderness: Fireflies Are Back",
      blurb: "Trail tips, glow times, and where to catch the magic this weekend.",
      cue: "Jump to story",
      href: "#wilderness"
    })))), /*#__PURE__*/React.createElement(Section, {
      id: "pride-noon",
      heading: "Old Sevier"
    }, /*#__PURE__*/React.createElement(Article, {
      label: "Old Sevier",
      image: `${S}/s1_flag.png`,
      imageCaption: "Sevier Ave, flags up",
      title: "Pride at Noon on Sevier Avenue",
      deck: "The street closes, the flags go up, and the whole neighborhood turns out to celebrate.",
      facts: [{
        label: "When",
        value: "Sat, May 17 · Noon"
      }, {
        label: "Where",
        value: "Sevier Ave"
      }, {
        label: "Cost",
        value: "Free"
      }]
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "By noon the barricades are up and the avenue belongs to the people. A proper small-town parade rolls through first \u2014 the high-school band, a fire truck doing its slow ceremonial creep, and a float that is, on close inspection, a flatbed trailer with excellent taste in bunting."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "After that it's all vendors and visiting: kettle corn, hand-printed tees, a booth where someone will paint a tiny possum on your cheek for a dollar. Stick around for the afternoon sets \u2014 and pace yourself, because the night is only getting started."))), /*#__PURE__*/React.createElement(Section, {
      id: "afterglow",
      heading: "After Dark"
    }, /*#__PURE__*/React.createElement(Article, {
      label: "Events",
      labelColor: "teal",
      image: `${S}/s2_disco.png`,
      imageCaption: "The disco ball returns",
      title: "Pride Afterglow at 6 PM",
      deck: "Evening music, drag, dancing, and the return of the famously mysterious disco ball.",
      facts: [{
        label: "When",
        value: "Sat, May 17 · 6–11 PM"
      }, {
        label: "Where",
        value: "Sevier Ave"
      }, {
        label: "Ages",
        value: "All welcome"
      }]
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "When the sun ducks behind the ridge, the string lights flick on and the afternoon's polite street fair quietly becomes a block party. The disco ball \u2014 whose owner remains unconfirmed despite our best reporting \u2014 goes up over the intersection and throws little squares of light onto every happy face below."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "There's a drag set at eight, a DJ after, and dancing for as long as the neighbors stay charmed. Past experience suggests that's later than you'd think."))), /*#__PURE__*/React.createElement(Section, {
      id: "rumors",
      heading: "What We're Hearing"
    }, /*#__PURE__*/React.createElement(Article, {
      label: "Rumor Mill",
      image: `${S}/s3_perc.png`,
      imageCaption: "Fresh pot, fresh gossip",
      title: "The Percolator Report",
      deck: "What we've heard, what we can sort of confirm, and what we're still side-eyeing from across the street."
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Confirmed:"), " the taco truck that vanished in March is back, parked by the old bank, and acting like nothing happened. We have questions. We also have an order in."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Probably true:"), " someone is repainting the mural by the bridge, and the possum is reportedly getting a fresh mic. As the city's most photographed marsupial, he's earned it."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, /*#__PURE__*/React.createElement("strong", null, "Filed under \"we'll see\":"), " a rumor that a new bakery is eyeing the corner storefront. The only source so far is a very confident golden retriever named Biscuit, so calibrate accordingly."))), /*#__PURE__*/React.createElement(Section, {
      id: "waterfront",
      heading: "South Waterfront"
    }, /*#__PURE__*/React.createElement(Article, {
      label: "South Waterfront",
      image: `${A}/photo_bridge.png`,
      imageCaption: "The Gay Street Bridge, ironwork and all",
      title: "South Waterfront Update",
      deck: "New access, new railings, and the eternal South Knoxville question: but where will everyone park?"
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "The latest waterfront update is, in the grand SoKno tradition, both exciting and a little vague. There are plans for improved riverbank access, a stretch of new boardwalk railing, and renderings that feature suspiciously well-behaved children."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "What we know for sure: the views haven't changed, the bridge still photographs like a movie set, and the herons remain unbothered by all of it. We'll keep an ear on the timeline and a foot on the dock."))), /*#__PURE__*/React.createElement(Section, {
      id: "wilderness",
      heading: "Urban Wilderness"
    }, /*#__PURE__*/React.createElement(Article, {
      label: "Urban Wilderness",
      image: `${S}/s5_fire.png`,
      imageCaption: "Dusk, the good hour",
      title: "The Fireflies Are Back, and They're Showing Off",
      deck: "Where to stand still, when to look up, and how to keep the magic going for the rest of us.",
      facts: [{
        label: "Best window",
        value: "9:00–9:45 PM"
      }, {
        label: "Where",
        value: "Ijams & trailheads"
      }, {
        label: "Rule",
        value: "No flashlights"
      }]
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "For a couple of perfect weeks, the trails put on a show no ticket can buy. The fireflies come up out of the grass around full dark, and if you stand still long enough you'll feel like you wandered into a snow globe someone forgot to shake."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "A few neighborly asks: skip the flashlight, keep the dog leashed, and let the little glowers do their thing. Bring a mason jar only for the photo, then let them go. We hear things \u2014 and what we hear is that the magic lasts longer when everyone behaves."))), /*#__PURE__*/React.createElement("div", {
      id: "more",
      style: {
        padding: "30px 0",
        borderTop: "var(--border-hair) solid var(--paper-edge)"
      }
    }, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)",
        gap: 36,
        alignItems: "start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      id: "paws"
    }, /*#__PURE__*/React.createElement(SectionHeader, {
      align: "left",
      ornament: "star"
    }, "Paws of SoKno"), /*#__PURE__*/React.createElement(Article, {
      label: "Paws of SoKno",
      labelColor: "teal",
      image: `${S}/m2_paw.png`,
      imageCaption: "Reporting for duty",
      title: "This Week's Very Good Dog: Biscuit",
      deck: "A neighborhood fixture, a porch enthusiast, and \u2014 allegedly \u2014 our most reliable rumor source."
    }, /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "You've seen him. Everyone's seen him. Biscuit holds court on the second porch past the corner, supervising foot traffic and accepting tribute in the form of ear scratches. The humans who love him say he's \"mostly retired.\" Biscuit disagrees and reports for duty daily."), /*#__PURE__*/React.createElement("p", {
      style: pStyle
    }, "Got a good dog, a rescue story, or a cat who runs a block? Send it our way. We're always taking nominations for the next very good dog."))), /*#__PURE__*/React.createElement("aside", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 22
      }
    }, /*#__PURE__*/React.createElement(Tipline, {
      mode: "tip"
    }), /*#__PURE__*/React.createElement(Tipline, {
      mode: "subscribe"
    }))))), /*#__PURE__*/React.createElement("footer", {
      style: {
        background: "var(--ink-black)",
        color: "var(--paper-cream)",
        borderTop: "var(--border-heavy) solid var(--ink-black)"
      }
    }, /*#__PURE__*/React.createElement(Page, {
      style: {
        padding: "30px 24px 28px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: `${S}/foot_dog.png`,
      alt: "",
      style: {
        height: 84,
        width: "auto",
        filter: "invert(1) brightness(1.05) sepia(0.15)"
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        flex: 1,
        minWidth: 240
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: "var(--rubric-lg)",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\u2605"), " South Knoxville. We Hear Things. ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\u2605")), /*#__PURE__*/React.createElement("a", {
      href: "https://soknoear.com",
      style: {
        fontFamily: "var(--font-label)",
        fontSize: "var(--label-md)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        color: "var(--teal)",
        textDecoration: "none"
      }
    }, "soknoear.com")), /*#__PURE__*/React.createElement("img", {
      src: `${S}/foot_bridge.png`,
      alt: "",
      style: {
        height: 70,
        width: "auto",
        filter: "invert(1) brightness(1.05) sepia(0.15)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        justifyContent: "center",
        flexWrap: "wrap",
        fontFamily: "var(--font-label)",
        fontSize: "var(--label-md)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--paper-shadow)",
        marginTop: 22,
        paddingTop: 18,
        borderTop: "var(--border-hair) solid var(--faded-ink, #4A4740)"
      }
    }, /*#__PURE__*/React.createElement("span", null, "About the Ear"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Contact"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Advertise"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Tipline"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--rust)"
      }
    }, "\xB7"), /*#__PURE__*/React.createElement("span", null, "Archives")), /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: "center",
        marginTop: 14,
        fontFamily: "var(--font-body)",
        fontSize: "var(--text-xs)",
        color: "var(--paper-edge)"
      }
    }, "Read by locals. Loved by locals. South Knoxville, all the way."))));
  }
  function Section({
    id,
    heading,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      id: id,
      style: {
        padding: "32px 0",
        borderBottom: "var(--border-hair) solid var(--paper-edge)"
      }
    }, /*#__PURE__*/React.createElement(Page, null, /*#__PURE__*/React.createElement(SectionHeader, null, heading), children));
  }
  window.WeeklyPaper = WeeklyPaper;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/sokno-ear/WeeklyPaper.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Ribbon = __ds_scope.Ribbon;

__ds_ns.SectionHeader = __ds_scope.SectionHeader;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Article = __ds_scope.Article;

__ds_ns.AudioBriefing = __ds_scope.AudioBriefing;

__ds_ns.CalendarItem = __ds_scope.CalendarItem;

__ds_ns.StoryCard = __ds_scope.StoryCard;

__ds_ns.Tipline = __ds_scope.Tipline;

})();
