/** A plain GET form to /search: works with no JavaScript, in the nav or on the search page. */
export function SearchForm({ q = "", className = "ear-nav-search", autoFocus = false }: { q?: string; className?: string; autoFocus?: boolean }) {
  return (
    <form className={className} action="/search" method="get" role="search">
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search the Ear"
        aria-label="Search the Ear"
        autoComplete="off"
        autoFocus={autoFocus}
      />
    </form>
  );
}
