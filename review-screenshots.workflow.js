export const meta = {
  name: 'email-screenshot-review',
  description: 'One agent per email compares before/after screenshots at three widths and reports regressions',
  whenToUse: 'After editing email HTML when many emails changed and reading every before/after pair inline is too much',
  phases: [{ title: 'Scout', detail: 'list the email names shot in both directories' }, { title: 'Review', detail: 'one agent per email' }],
}

// args: { before: 'tmp/email/before', after: 'tmp/email/after', change: 'what was edited, in one sentence' }
const { before, after, change } = args
const WIDTHS = ['desktop', 'mobile', 'narrow']

const NAMES = { type: 'object', properties: { emails: { type: 'array', items: { type: 'string' } } }, required: ['emails'] }
const REPORT = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    regressions: {
      type: 'array',
      items: {
        type: 'object',
        properties: { width: { type: 'string' }, problem: { type: 'string' } },
        required: ['width', 'problem'],
      },
    },
    identical: { type: 'boolean' },
  },
  required: ['email', 'regressions', 'identical'],
}

phase('Scout')
const scout = await agent(
  `List the email names that have screenshots in both ${before} and ${after}. Files are named <email>.<width>.png with width one of ${WIDTHS.join(', ')}. Return each <email> once. Also log any name present in only one directory by returning it nowhere.`,
  { schema: NAMES, effort: 'low' }
)
const emails = scout.emails
log(`${emails.length} emails to review`)

const reports = await pipeline(emails, email =>
  agent(
    `Compare the before and after screenshots of the email "${email}" at ${WIDTHS.join(', ')} widths: ${before}/${email}.<width>.png against ${after}/${email}.<width>.png. Run \`cmp\` first; if all three pairs are byte-identical, return identical: true with no regressions, without viewing them.\n` +
      `Otherwise read each differing pair and report only regressions: doubled or collapsed gaps where two elements meet, text wrapping badly, a clipped or collapsed button, horizontal overflow, changed colours or alignment that the change did not intend.\n` +
      `The change under review: ${change || 'not stated'}. Intended differences are not regressions. Be specific: name the element and the width.`,
    { label: `review:${email}`, phase: 'Review', schema: REPORT }
  )
)

const done = reports.filter(Boolean)
const missed = emails.filter(e => !done.some(r => r.email === e))
if (missed.length) log(`no report for: ${missed.join(', ')}`)

return {
  regressions: done.filter(r => r.regressions.length),
  unchanged: done.filter(r => r.identical).map(r => r.email),
  missed,
}
