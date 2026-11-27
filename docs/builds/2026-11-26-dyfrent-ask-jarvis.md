# 2026-11-26 DYFRENT Network >> Ask Jarvis about this screen

## The ask

J (Nov 26): the Midwest Enterprise Network slices, built and live. This one: from any Midwest screen, an approved person can ask Jarvis (J's build agent on the DYFRENT Network, `@j-claude`) about the screen they are on, and read the answer in Messages. DYFRENT issue 1488. DYFRENT already lets an enterprise member write to Jarvis as themself (issue 1451, `MEMBER_WIRE_OPS`), and Midwest is DYFRENT's client, so the message starts his session.

## How it works

- `api/enterprise-network.js`: new `ask` op `{ screen, text }`. Same session, origin and pilot/open-request checks as every op. The server fixes the recipient (`@j-claude`); anything else the page sends is ignored. The screen name must be plain (letters, digits, spaces, a few punctuation marks, at most 40), the question 1 to 4,000 characters. It signs one `net_wire_open` as the person: subject `Midwest: <screen>`, their words, and a last line naming the screen. No Midwest record, id or figure crosses. Each question carries a `ref` made from the person, screen, words and the draft's own nonce, so a retry of the same draft after a slow answer is one message (DYFRENT keeps the first); a new draft is a new message. It answers ok and the conversation id only; DYFRENT's refusals (daily caps and the like) come back as said.
- `src/enterprise.jsx`: the bell's panel opens with Ask Jarvis about this screen. It turns into a short composer naming the screen ("About the Job Records screen"), says Jarvis gets the question and the screen's name and nothing else from Midwest, and sends with Send or Cmd/Ctrl+Enter. The draft survives closing the panel and a failed send, and keeps the screen it was written about. While the question box has focus a phone keyboard's resize or scroll does not close the panel; a click into the Network frame still does. One press, one send. After a refusal focus returns to the box; after sending it moves to Done and the note is announced. Sent: says the answer arrives in Messages and on the bell, with Open Messages. `src/App.jsx` passes the menu label of the current page (or a readable name for pages not in the menu, like Customer 360).
- Same gate as the bell: only a person with a verified Network session whom DYFRENT answers for sees it.

## Order of release

Midwest only. DYFRENT needs no change.

## Rollback

Revert this commit.

## Proof

`tests/reliability/enterprise-network-test.mjs`: one signed `net_wire_open` as the session's person to `@j-claude` with only the words and the screen, whatever `to` or `subject` the page sent; empty, over-long, odd or missing screen names and empty or over-long questions refused before anything is sent; no session and another site refused; DYFRENT's refusal passed on; an odd conversation id not passed on. UI: offered in the panel, names the screen, says what is sent, focus in the box, Send disabled until written, a resize does not close it, closing keeps the draft, a refusal is shown and keeps the words, sent state and Open Messages, the next question starts empty, an unsent draft reopens where it was left. Also: a retry of the same draft is one message, the same words in a new draft are new, a double press sends once, a draft started on Job Records is still sent as Job Records from Tasks, focus after refusal and after sending, a frame click closes it while asking. 32 mutants, all rejected (7 new). An independent review found no blocking defect; its findings are fixed here. Phone 390 and desk 1440: the composer stays 16px inside the screen, buttons 40px, no sideways scroll. Full battery green; `vite build` passes.
