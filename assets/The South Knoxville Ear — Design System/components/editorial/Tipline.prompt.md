The "Get the Ear Delivered" newsletter signup or the "Have a Tip? We're All Ears" prompt — a bordered paper module with a rubric heading, a line of copy, and a form.

```jsx
<Tipline mode="subscribe" />
<Tipline mode="tip" />
```

`mode="subscribe"` shows an email field + primary Subscribe button; `mode="tip"` shows a textarea + rust Submit-a-Tip button. All copy (`title`, `blurb`, `placeholder`, `cta`) has on-brand defaults but can be overridden. Pass `onSubmit` for behavior.
