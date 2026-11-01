# email-compatibility

An agent skill that scores the HTML of emails against email-client support using Mailpit's HTML check, and checks the result visually with Playwright screenshots at 900, 390 and 320px.

Mailpit only checks support data. It does not render, so the skill pairs every score with before and after screenshots.

## Requirements

| Need | Why | Install | Check |
| --- | --- | --- | --- |
| Mailpit | Receives the emails and runs the HTML check | `brew install mailpit`, or `docker run -d -p 8025:8025 -p 1025:1025 axllent/mailpit` | `curl -s localhost:8025/api/v1/info` |
| The app sending to Mailpit | Puts the emails in front of the check | Point the app's SMTP at `localhost:1025`, no auth, no TLS | Send one email, then `curl -s localhost:8025/api/v1/messages` lists it |
| Ruby (standard library only) | `bin/score.rb` | any recent Ruby | `ruby -v` |
| Node and Playwright | `bin/shoot.js` screenshots | `npm install --save-dev playwright`, then `npx playwright install chromium` if no Chromium is installed | `node -e "require('playwright')"` |
| `MAIL_SEND_CMD` | Delivers one of every email | a command from your project, such as a rake task, a script or a test run | run it, then check Mailpit has one message per email |
| URLs of the emails' HTML | What `shoot.js` photographs | a dev route, a preview page or a saved `.html` served locally | open one in a browser |

Mailpit's web UI is at `http://localhost:8025`. Set `MAILPIT_URL` if it runs elsewhere.

## Layout

```
SKILL.md                         what the agent follows
bin/send.sh                      empties Mailpit, then runs $MAIL_SEND_CMD
bin/score.rb                     MailpitScore.call: per-email and average support, weakest features
bin/shoot.js                     EmailShots.call: screenshots of the given URLs at three widths, flags horizontal overflow
review-screenshots.workflow.js   optional Workflow script: one agent per email reviews the before/after pairs
```

## Usage

With an agent, ask it to score or improve the compatibility of your emails. It follows [SKILL.md](SKILL.md).

By hand, from the project root:

```bash
export MAIL_SEND_CMD="<command that delivers one of every email to Mailpit>"
mkdir -p tmp/email/before
NODE_PATH=$PWD/node_modules node <skill>/bin/shoot.js tmp/email/before <url> [<url> ...]   # or one URL per line on stdin
<skill>/bin/send.sh
ruby <skill>/bin/score.rb
```

| Variable | Default | Used by |
| --- | --- | --- |
| `MAILPIT_URL` | `http://localhost:8025` | `send.sh`, `score.rb` |
| `MAIL_SEND_CMD` | required | `send.sh` |

## Install

Clone it to `skills/email-compatibility` in a skills directory (`~/.claude/skills`, `~/.agents/skills`).
