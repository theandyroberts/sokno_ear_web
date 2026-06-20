// WeeklyPaper.jsx — the full one-page weekly. Everything is right there on the
// scroll: a woodtype feature, the audio dispatch, the calendar, and every
// section's full story inline with its own cropped engraving. No "read more".
(function () {
  const NS = window.TheSouthKnoxvilleEarDesignSystem_0be224;
  const { SectionHeader, Divider, Tag, Article, AudioBriefing, CalendarItem, Tipline, StoryCard } = NS;
  const A = "../../assets";
  const S = "../../assets/spots";

  const Page = ({ children, style }) => (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>
  );

  const Well = ({ children, title }) => (
    <section style={{ background: "var(--paper-bright)", border: "var(--border-ink) solid var(--ink-black)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-lift)" }}>
      {title && (
        <div style={{ background: "var(--teal)", color: "var(--on-teal)", borderBottom: "var(--border-ink) solid var(--ink-black)", padding: "10px 16px", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden="true" style={{ color: "var(--rust)" }}>★</span>{title}
        </div>
      )}
      <div style={{ padding: "4px 16px 8px" }}>{children}</div>
    </section>
  );

  // a framed engraving clipping
  const Spot = ({ src, alt, w, float, mb = 14 }) => (
    <span style={{ display: "block", float: float || "none", width: w || "100%", marginRight: float === "left" ? "var(--space-5)" : 0, marginLeft: float === "right" ? "var(--space-5)" : 0, marginBottom: mb }}>
      <span style={{ display: "block", border: "var(--border-ink) solid var(--ink-black)", background: "var(--paper-cream)", borderRadius: "var(--radius-md)", padding: "6px", boxShadow: "var(--shadow-lift)" }}>
        <img src={src} alt={alt || ""} style={{ width: "100%", display: "block", borderRadius: "calc(var(--radius-md) - 4px)" }} />
      </span>
    </span>
  );

  const pStyle = { fontFamily: "var(--font-body)", fontSize: "var(--text-base)", lineHeight: "var(--leading-body)", margin: "0 0 14px", color: "var(--ink-black)" };

  function WeeklyPaper() {
    return (
      <main id="top">
        {/* ================= FEATURE BAND ================= */}
        <div id="events" style={{ borderBottom: "var(--border-rule) double var(--ink-black)", padding: "28px 0 32px" }}>
          <Page>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
              {/* Feature */}
              <article>
                <div style={{ marginBottom: 14 }}><Tag color="rust" star>Feature Story · Pride Weekend</Tag></div>
                <div style={{ display: "flex", gap: 22, alignItems: "flex-start" }}>
                  <div style={{ flex: "none", width: 168 }}>
                    <Spot src={`${S}/feature_flag.png`} alt="Pride flag on a Sevier Avenue streetlamp" mb={0} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.4rem, 4.4vw, 3.4rem)", lineHeight: 1.02, color: "var(--ink-black)", margin: "0 0 6px", textTransform: "uppercase" }}>
                      Pride Day Double Feature
                    </h1>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink-black)", textTransform: "uppercase", lineHeight: 1.1 }}>Noon Street Celebration</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--rust)", textTransform: "uppercase", lineHeight: 1.1, marginTop: 2 }}>6 PM Afterglow</div>
                  </div>
                </div>

                <p style={{ ...pStyle, fontWeight: 700, fontSize: "var(--text-deck)", lineHeight: 1.35, margin: "18px 0 14px" }}>
                  A noon street celebration and a 6 PM afterglow keep the good vibes rolling long after the sun drops behind the ridge.
                </p>
                <p style={pStyle}>It starts the way the best South Knoxville things start: a little homemade, a little loud, and entirely ours. At noon the avenue closes to cars and opens to everybody else — a parade of neighbors, dogs in bandanas, and at least one possum costume we have been promised is "very tasteful."</p>
                <p style={pStyle}>Local bands take the corner stage through the afternoon while vendors line up toward the river. Then, because one party is never enough down here, the <em>6 PM Afterglow</em> brings string lights, a disco ball of uncertain origin, and dancing that lasts as long as the neighbors allow. Bring a chair. Bring a friend. Bring the friend who never comes out — this is the one.</p>
              </article>

              {/* Sidebar */}
              <aside id="listen" style={{ display: "flex", flexDirection: "column", gap: 22, position: "sticky", top: 16 }}>
                <AudioBriefing />
                <Well title="What's Happening Soon">
                  <CalendarItem month="MAY" day="17" title="SoKno Pride Day" meta="Noon · Sevier Ave" starred />
                  <CalendarItem month="MAY" day="17" title="Pride Afterglow" meta="6:00–11:00 PM · Sevier Ave" starred />
                  <CalendarItem month="MAY" day="18" title="Riverfront Cleanup" meta="9:00 AM · Volunteer Landing" />
                  <CalendarItem month="MAY" day="22" title="Old Sevier Trolley Tour" meta="6:00 PM · Island Home Park" divider={false} />
                </Well>
              </aside>
            </div>
          </Page>
        </div>

        {/* ================= SCANNER GRID ================= */}
        <div style={{ padding: "30px 0", borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
          <Page>
            <SectionHeader>Top Stories &amp; Events</SectionHeader>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(176px, 1fr))", gap: 16 }}>
              <StoryCard label="Old Sevier" hot image={`${S}/s1_flag.png`} title="Pride at Noon on Sevier Avenue" blurb="Parade, performances, vendors, and community celebration, all day long." cue="Jump to story" href="#pride-noon" />
              <StoryCard label="Old Sevier" image={`${S}/s2_disco.png`} title="Pride Afterglow at 6 PM" blurb="Evening music, drag, dancing, and dazzling nighttime festivities." cue="Jump to story" href="#afterglow" />
              <StoryCard label="Rumor Mill" image={`${S}/s3_perc.png`} title="What We're Hearing" blurb="The whispers, the maybe-true things, and what's making waves in SoKno." cue="Jump to story" href="#rumors" />
              <StoryCard label="Waterfront" image={`${S}/s4_bridge.png`} title="South Waterfront Update" blurb="Riverfront projects, recreational access, and what's next for the docks." cue="Jump to story" href="#waterfront" />
              <StoryCard label="Wilderness" image={`${S}/s5_fire.png`} title="Urban Wilderness: Fireflies Are Back" blurb="Trail tips, glow times, and where to catch the magic this weekend." cue="Jump to story" href="#wilderness" />
            </div>
          </Page>
        </div>

        {/* ================= PRIDE AT NOON ================= */}
        <Section id="pride-noon" heading="Old Sevier">
          <Article label="Old Sevier" image={`${S}/s1_flag.png`} imageCaption="Sevier Ave, flags up"
            title="Pride at Noon on Sevier Avenue"
            deck="The street closes, the flags go up, and the whole neighborhood turns out to celebrate."
            facts={[{ label: "When", value: "Sat, May 17 · Noon" }, { label: "Where", value: "Sevier Ave" }, { label: "Cost", value: "Free" }]}>
            <p style={pStyle}>By noon the barricades are up and the avenue belongs to the people. A proper small-town parade rolls through first — the high-school band, a fire truck doing its slow ceremonial creep, and a float that is, on close inspection, a flatbed trailer with excellent taste in bunting.</p>
            <p style={pStyle}>After that it's all vendors and visiting: kettle corn, hand-printed tees, a booth where someone will paint a tiny possum on your cheek for a dollar. Stick around for the afternoon sets — and pace yourself, because the night is only getting started.</p>
          </Article>
        </Section>

        {/* ================= AFTERGLOW ================= */}
        <Section id="afterglow" heading="After Dark">
          <Article label="Events" labelColor="teal" image={`${S}/s2_disco.png`} imageCaption="The disco ball returns"
            title="Pride Afterglow at 6 PM"
            deck="Evening music, drag, dancing, and the return of the famously mysterious disco ball."
            facts={[{ label: "When", value: "Sat, May 17 · 6–11 PM" }, { label: "Where", value: "Sevier Ave" }, { label: "Ages", value: "All welcome" }]}>
            <p style={pStyle}>When the sun ducks behind the ridge, the string lights flick on and the afternoon's polite street fair quietly becomes a block party. The disco ball — whose owner remains unconfirmed despite our best reporting — goes up over the intersection and throws little squares of light onto every happy face below.</p>
            <p style={pStyle}>There's a drag set at eight, a DJ after, and dancing for as long as the neighbors stay charmed. Past experience suggests that's later than you'd think.</p>
          </Article>
        </Section>

        {/* ================= RUMOR MILL ================= */}
        <Section id="rumors" heading="What We're Hearing">
          <Article label="Rumor Mill" image={`${S}/s3_perc.png`} imageCaption="Fresh pot, fresh gossip"
            title="The Percolator Report"
            deck="What we've heard, what we can sort of confirm, and what we're still side-eyeing from across the street.">
            <p style={pStyle}><strong>Confirmed:</strong> the taco truck that vanished in March is back, parked by the old bank, and acting like nothing happened. We have questions. We also have an order in.</p>
            <p style={pStyle}><strong>Probably true:</strong> someone is repainting the mural by the bridge, and the possum is reportedly getting a fresh mic. As the city's most photographed marsupial, he's earned it.</p>
            <p style={pStyle}><strong>Filed under "we'll see":</strong> a rumor that a new bakery is eyeing the corner storefront. The only source so far is a very confident golden retriever named Biscuit, so calibrate accordingly.</p>
          </Article>
        </Section>

        {/* ================= SOUTH WATERFRONT ================= */}
        <Section id="waterfront" heading="South Waterfront">
          <Article label="South Waterfront" image={`${A}/photo_bridge.png`} imageCaption="The Gay Street Bridge, ironwork and all"
            title="South Waterfront Update"
            deck="New access, new railings, and the eternal South Knoxville question: but where will everyone park?">
            <p style={pStyle}>The latest waterfront update is, in the grand SoKno tradition, both exciting and a little vague. There are plans for improved riverbank access, a stretch of new boardwalk railing, and renderings that feature suspiciously well-behaved children.</p>
            <p style={pStyle}>What we know for sure: the views haven't changed, the bridge still photographs like a movie set, and the herons remain unbothered by all of it. We'll keep an ear on the timeline and a foot on the dock.</p>
          </Article>
        </Section>

        {/* ================= URBAN WILDERNESS ================= */}
        <Section id="wilderness" heading="Urban Wilderness">
          <Article label="Urban Wilderness" image={`${S}/s5_fire.png`} imageCaption="Dusk, the good hour"
            title="The Fireflies Are Back, and They're Showing Off"
            deck="Where to stand still, when to look up, and how to keep the magic going for the rest of us."
            facts={[{ label: "Best window", value: "9:00–9:45 PM" }, { label: "Where", value: "Ijams & trailheads" }, { label: "Rule", value: "No flashlights" }]}>
            <p style={pStyle}>For a couple of perfect weeks, the trails put on a show no ticket can buy. The fireflies come up out of the grass around full dark, and if you stand still long enough you'll feel like you wandered into a snow globe someone forgot to shake.</p>
            <p style={pStyle}>A few neighborly asks: skip the flashlight, keep the dog leashed, and let the little glowers do their thing. Bring a mason jar only for the photo, then let them go. We hear things — and what we hear is that the magic lasts longer when everyone behaves.</p>
          </Article>
        </Section>

        {/* ================= MORE LOCAL + TIPLINE ================= */}
        <div id="more" style={{ padding: "30px 0", borderTop: "var(--border-hair) solid var(--paper-edge)" }}>
          <Page>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1fr)", gap: 36, alignItems: "start" }}>
              <div id="paws">
                <SectionHeader align="left" ornament="star">Paws of SoKno</SectionHeader>
                <Article label="Paws of SoKno" labelColor="teal" image={`${S}/m2_paw.png`} imageCaption="Reporting for duty"
                  title="This Week's Very Good Dog: Biscuit"
                  deck="A neighborhood fixture, a porch enthusiast, and — allegedly — our most reliable rumor source.">
                  <p style={pStyle}>You've seen him. Everyone's seen him. Biscuit holds court on the second porch past the corner, supervising foot traffic and accepting tribute in the form of ear scratches. The humans who love him say he's "mostly retired." Biscuit disagrees and reports for duty daily.</p>
                  <p style={pStyle}>Got a good dog, a rescue story, or a cat who runs a block? Send it our way. We're always taking nominations for the next very good dog.</p>
                </Article>
              </div>
              <aside style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <Tipline mode="tip" />
                <Tipline mode="subscribe" />
              </aside>
            </div>
          </Page>
        </div>

        {/* ================= FOOTER ================= */}
        <footer style={{ background: "var(--ink-black)", color: "var(--paper-cream)", borderTop: "var(--border-heavy) solid var(--ink-black)" }}>
          <Page style={{ padding: "30px 24px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
              <img src={`${S}/foot_dog.png`} alt="" style={{ height: 84, width: "auto", filter: "invert(1) brightness(1.05) sepia(0.15)" }} />
              <div style={{ textAlign: "center", flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--rubric-lg)", letterSpacing: "0.02em", textTransform: "uppercase", marginBottom: 6 }}>
                  <span style={{ color: "var(--rust)" }}>★</span> South Knoxville. We Hear Things. <span style={{ color: "var(--rust)" }}>★</span>
                </div>
                <a href="https://soknoear.com" style={{ fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--teal)", textDecoration: "none" }}>soknoear.com</a>
              </div>
              <img src={`${S}/foot_bridge.png`} alt="" style={{ height: 70, width: "auto", filter: "invert(1) brightness(1.05) sepia(0.15)" }} />
            </div>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontFamily: "var(--font-label)", fontSize: "var(--label-md)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--paper-shadow)", marginTop: 22, paddingTop: 18, borderTop: "var(--border-hair) solid var(--faded-ink, #4A4740)" }}>
              <span>About the Ear</span><span style={{ color: "var(--rust)" }}>·</span>
              <span>Contact</span><span style={{ color: "var(--rust)" }}>·</span>
              <span>Advertise</span><span style={{ color: "var(--rust)" }}>·</span>
              <span>Tipline</span><span style={{ color: "var(--rust)" }}>·</span>
              <span>Archives</span>
            </div>
            <div style={{ textAlign: "center", marginTop: 14, fontFamily: "var(--font-body)", fontSize: "var(--text-xs)", color: "var(--paper-edge)" }}>
              Read by locals. Loved by locals. South Knoxville, all the way.
            </div>
          </Page>
        </footer>
      </main>
    );
  }

  function Section({ id, heading, children }) {
    return (
      <div id={id} style={{ padding: "32px 0", borderBottom: "var(--border-hair) solid var(--paper-edge)" }}>
        <Page>
          <SectionHeader>{heading}</SectionHeader>
          {children}
        </Page>
      </div>
    );
  }

  window.WeeklyPaper = WeeklyPaper;
})();
