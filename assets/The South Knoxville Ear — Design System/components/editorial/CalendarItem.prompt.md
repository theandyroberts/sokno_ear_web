One row of the "What's Happening Soon" calendar — a stamped date block, event title and meta, and an optional star. Stack several inside a bordered well.

```jsx
<CalendarItem month="MAY" day="17" title="SoKno Pride Day" meta="Noon · Sevier Ave" starred />
<CalendarItem month="MAY" day="18" title="Riverfront Cleanup" meta="9:00 AM · Volunteer Landing" />
<CalendarItem month="MAY" day="22" title="Old Sevier Trolley Tour" meta="6:00 PM · Island Home Park" divider={false} />
```

Set `divider={false}` on the last row. Hover tints the row Warm Paper Shadow.
