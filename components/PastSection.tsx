import { Flourish } from "@/components/ds/Flourish";
import { PastEvents } from "@/components/PastEvents";

/**
 * The bottom half of every results page: the big break (a filigree), the "See past
 * events" rubric, then the past rows collapsed behind the fade. `count` is how many
 * rows sit inside; with none, one dim line instead of the fade.
 */
export function PastSection({ count, defaultOpen, children }: { count: number; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <>
      <div className="ear-past-break"><Flourish /></div>
      <section aria-labelledby="past-events">
        <h2 id="past-events" className="ear-results-h2">See past events</h2>
        {count === 0 ? (
          <p className="ear-results-none">None yet.</p>
        ) : (
          <PastEvents count={count} defaultOpen={defaultOpen}>{children}</PastEvents>
        )}
      </section>
    </>
  );
}
