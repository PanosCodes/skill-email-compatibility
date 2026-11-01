---
name: email-compatibility
description: Score and visually validate the HTML of transactional or marketing emails against email-client support, using Mailpit's HTML check plus Playwright screenshots at desktop, mobile and narrow widths. Use when editing email layouts, templates or inline styles, when asked about email client compatibility or Outlook/Gmail rendering, or when asked to raise or hold a Mailpit HTML check score. Works with any stack that can deliver its emails to Mailpit.
---

# Email compatibility

Mailpit's HTML check scores a message's HTML and CSS against caniemail support data. It does not render anything, so always pair the score with screenshots, and say so when reporting a number.

Agree a floor with the user before editing (a project that has already been tuned usually records one) and do not let a change drop the average below it.

## Setup

Check these before the first run. Install steps are in the README.

| Need | Check |
| --- | --- |
| Mailpit running | `curl -s ${MAILPIT_URL:-http://localhost:8025}/api/v1/info` |
| App delivers to Mailpit | send one email, then `curl -s ${MAILPIT_URL:-http://localhost:8025}/api/v1/messages` lists it |
| Playwright | `node -e "require('playwright')"` with `NODE_PATH=$PWD/node_modules` |
| Chromium | `shoot.js` fails to launch without one. Prefer a Chromium the project already has. Otherwise `npx playwright install chromium` downloads one, so ask the user first. |

Ask the user to start Mailpit if it is not running. Never start containers yourself. The scripts live in this skill's `bin/` directory. Run them from the project root.

| Variable | Default | Used by |
| --- | --- | --- |
| `MAILPIT_URL` | `http://localhost:8025` | `send.sh`, `score.rb` |
| `MAIL_SEND_CMD` | none, required | `send.sh`: shell command that delivers one of every email |

The agent works out `MAIL_SEND_CMD` and the preview URLs from the project: whatever command delivers one of every email to Mailpit, and whatever serves each email's HTML in a browser. If the project has neither, ask the user.

`shoot.js` takes the URLs as arguments after the output directory, or one per line on stdin. Prefer stdin for a list, because a list held in a shell variable is split differently by bash and zsh. Anything that is not a single `http(s)` URL is rejected, and a response that is not OK stops the run.

```bash
node <skill>/bin/shoot.js tmp/email/before <url-of-welcome-email> <url-of-receipt-email>
printf '%s\n' "$url_one" "$url_two" | node <skill>/bin/shoot.js tmp/email/before
```

## The validation loop

1. **Baseline** before editing:
   ```bash
   mkdir -p tmp/email/before tmp/email/after
   NODE_PATH=$PWD/node_modules node <skill>/bin/shoot.js tmp/email/before <url> [<url> ...]
   <skill>/bin/send.sh
   ruby <skill>/bin/score.rb
   ```
   `shoot.js` shoots 900, 390 and 320px and prints `OVERFLOW` for any horizontal scroll. `send.sh` empties Mailpit and delivers everything. `score.rb` prints each email's supported/partial/unsupported percentages, the average, and the weakest features.
2. **Edit**, then repeat `send.sh` and `score.rb` after each change. `score.rb` scores whatever is in Mailpit, so skip `send.sh` and a stale message hides a regression.
3. **After** screenshots into `tmp/email/after`. Read the before and after pairs at desktop and mobile. Byte-identical PNGs (`cmp`) prove a pure refactor changed nothing.
   With many emails, only when the user has asked for a workflow, run `review-screenshots.workflow.js` from this skill with the `Workflow` tool's `scriptPath` and `args: {before: 'tmp/email/before', after: 'tmp/email/after', change: '<what you edited>'}`. It runs one agent per email, skips byte-identical pairs, and returns the regressions per email and width. Check what it flags yourself before acting on it.
4. Run the project's specs and linters.

Keep `tmp/` out of commits.

## How the score behaves

- **It counts distinct CSS features, not occurrences.** Removing the fifth `line-height` changes nothing. Only eliminating a whole property kind from every email moves it.
- **HTML attributes count as CSS.** `bgcolor="..."` registers as `css-background-color` and `border="0"` as `css-border`, so swapping a style for the attribute gains nothing.
- **Emails with fewer features score lower.** Fewer well-supported features dilute the fixed costs, so a plain notice scores below an email with a button. Compare like with like.
- **Per-email, not just the average.** Read the weakest features to see what is shared by every email.

## Changes that raised the score (one project: 88.2% to 94.7%)

- `background` shorthand to `background-color`.
- Remove `display:inline-block`. Put button padding on the `<td>`, not the `<a>`, otherwise the link collapses vertically.
- `<p>` to `<div>` with `padding-bottom` instead of `margin`. A `<div>` has no default margin to cancel.
- Headings as `<div role="heading" aria-level="N"><b>` instead of `<h1>`/`<h2>` with `margin:0` and `font-weight`.
- Drop `font-weight` where `<b>` does the job.
- Drop `text-decoration:underline` on links (the default).
- A `●` glyph instead of a rounded `display:inline-block` span.
- Button vertical gap via an outer cell with padding, not `height` spacer rows.

## Regressions to watch for

- **Padding does not collapse like margin.** Swapping margins for padding doubles gaps where two elements meet. Compare screenshots and rebalance.
- **Body margin.** A `<body>` without `margin:0` gets the browser's 8px. Absorb it in the outer gutter instead of adding a `margin` kind back.
- **`<ul>` needs `margin:0`.** Removing it brings back browser list margins.
- **Dropping `border` on a card rarely raises the score.** Keep it.

## Floor

What remains is usually structural: the `<body>` element (~39% supported, every email has one), `border-radius` (~64%), `max-width` for a responsive column (~79%), `line-height`, `padding`, background colours. Going further means square corners or a fixed-width column that overflows on phones. Do not change the design for a number without the user's say-so.

## Mobile

Check 390px and 320px for every change, not just desktop. Read the email with the longest heading (translations often run long) and any button whose label can wrap.

## Out of scope

Mailpit does not render in real clients. For Outlook or Gmail fidelity use a rendering service, and state that limit when reporting a score.
