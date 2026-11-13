# 2026-11-13 Brain grounding: vendor answers come from the catalogues, and a made-up code is caught

## The ask

J: "Make sure the brain can never make stuff up it always grounds in facts. Like the vendor stuff especially it needs to cite the actual vendor catalogues and never hallucinate."

## What was open

- The Brain prompt said "NEVER say you don't have the data" (rule 2), which pushes a model to fill a gap, and "answer like a world-class AI assistant" with no line between general knowledge and Midwest records or vendor products.
- Nothing told the Brain to open a catalogue before answering a vendor question, and nothing checked an answer after it was written. A short question ("does WB make a standing desk?") could be answered from training with a plausible model code.
- A catalogue search that found nothing gave the Brain no instruction, the moment a model is most likely to fill in.

## What changed

- `src/App2.jsx` system prompt: a GROUNDING section first, over every other rule: every Midwest fact from the context or a tool result; vendor products, model codes, sizes, colors, options, prices, warranty and ordering only from the catalogue tools, called before answering; each catalogue fact cited with vendor, catalogue, edition and PDF page; "not in the loaded catalogue" is the answer when the tools do not show it; never a code, dimension or price that is in no source; web answers labeled as web. Rule 2 now says to say plainly when the data is not there. Rule 5 and the memory block say general knowledge and memory are never evidence for a vendor's products.
- `src/brainGrounding.js` (new): after the Brain writes an answer about vendor products (a catalogue was opened, the answer talks about catalogues or model codes, or it names a vendor with a catalogue loaded), every model code in it, read with the same patterns the catalogue reader uses, must be in the context, what the user typed, or a tool result. After a catalogue lookup every dollar figure must be printed in a source (worked-out totals excepted). The Brain's own earlier answers and the check's own note never count as a source.
- When something is in no source the Brain is sent back once, privately, to look it up or take it out and rewrite the answer with citations; the made-up answer is taken off the screen. If it still will not, the answer carries "Not verified: ... Treat it as unconfirmed."
- An empty catalogue search now tells the Brain not to answer from general knowledge or the web.

## Proof

- `tests/reliability/brain-grounding-test.mjs` (new, 9 mutants): grounded codes, code families, number-sign items, hyphenated series, user-typed and context codes pass; made-up codes, made-up number-sign items and unprinted prices are caught; bookkeeping answers are left alone; the check's own note never grounds anything.
- `vendor-catalog-brain-test.mjs` drives the real Brain page (9 new mutants): grounded answer goes straight through with no warning; a made-up code sends the Brain back once and never reaches the screen; a stubborn one is flagged; an answer with no lookup is still checked; an unprinted price is caught; a streamed made-up answer is removed and the corrected one shows once; the empty-search note; the prompt rules.
- Full battery green, every mutant rejected. `vite build` passes.

## Honest limit

A model can still word a product description wrongly without a code or price in it. The prompt rules, the catalogue page shown to the user under every catalogue answer, and the citation keep that visible and checkable; the automatic check covers model codes and catalogue prices, the facts that cause wrong orders.
