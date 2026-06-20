A full inline newspaper story for the one-page weekly paper. Everything is right there — rubric, engraving, headline, deck, optional event facts, and the complete body. No "read more", no second page.

```jsx
<Article
  id="pride"
  label="Old Sevier"
  image="assets/SoKnoEAR_Page.png"
  imageCaption="Sevier Ave, last spring"
  title="Pride Day Double Feature on Sevier Avenue"
  deck="A noon street celebration and a 6 PM afterglow keep the good vibes rolling long after sunset."
  facts={[
    { label: "When", value: "Sat, May 17 · Noon" },
    { label: "Where", value: "Sevier Ave" },
    { label: "Cost", value: "Free" },
  ]}
>
  <p>The whispers started at the coffee shop…</p>
  <p>By all accounts…</p>
</Article>
```

`layout="wrap"` (default) floats the framed image into the text column like a real clipping; `layout="stack"` runs it full-width above the body. The `facts` strip renders a Warm-Paper-Shadow metadata box. Separate stacked articles with `<Divider />`.
