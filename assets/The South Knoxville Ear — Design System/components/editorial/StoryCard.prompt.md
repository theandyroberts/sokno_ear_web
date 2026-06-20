A bordered paper card with an engraving thumbnail, rubric label, headline, and short blurb — the "Top Stories & Events" scanner grid. On the one-page paper, point `cue`/`href` at an in-page `#anchor` so nothing leaves the scroll.

```jsx
<StoryCard
  label="Rumor Mill"
  hot
  image="assets/possum_street_art.png"
  title="Pride at Noon on Sevier Avenue"
  blurb="Parade, performances, vendors, and community celebration all day long."
  cue="Jump to story"
  href="#pride"
/>
```

Lifts with a hard offset shadow on hover. Set `hot` for a ★ HOT flag over the image. Omit `cue` for a pure scannable card. Use `labelColor` to match the section.
