A stamped, lightly distressed print button with a hard letterpress offset shadow — use for "Read the full guide", "Listen now", "Submit a tip", and other story/CTA affordances.

```jsx
<Button variant="primary" arrow>Read the full guide</Button>
<Button variant="secondary" size="sm">Subscribe</Button>
<Button variant="rust" arrow>Submit a tip</Button>
<Button variant="ghost" arrow>Read more</Button>
```

Variants: `primary` (Bridge Green fill, the default CTA), `secondary` (inked outline on paper), `rust` (Rust Red, for emphasis/tips), `ghost` (quiet rust text link, ideal inside cards). Sizes `sm` / `md` / `lg`. Set `arrow` for the → "read more" affordance. Pass `href` to render an anchor. Hover deepens the fill toward Dark Rust; press sinks the offset shadow.
