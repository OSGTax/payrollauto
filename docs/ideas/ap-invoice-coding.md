# AP Invoice Coding — PM Review Tool

> Status: brainstorm only. Not designed, not scheduled. Captured 2026-04-27 from a conversation. Re-read with fresh eyes before designing.

## Today's process (the pain)

1. AP invoices arrive as PDFs.
2. Each PDF has form-fillable dropdowns containing job cost codes.
3. Project manager opens the PDF, picks a code from each dropdown, saves the file, and tells me they're done.
4. I open each PDF and re-key the codes into Computerease (the accounting system).

The PM is doing all the judgment work. I'm doing manual data entry on top of it.

## What I want to build

A tool that:

1. **Reads each invoice** and pulls out:
   - Vendor name
   - Line items
   - Total amount
   - PO number / job name / job number
2. **Suggests job cost codes** using whatever logic makes sense (rules, ML, LLM — TBD). Inputs the suggester can lean on:
   - The **master code skeleton** — the canonical set of job cost codes that encompasses everything used across jobs.
   - The **historical invoice library** — past invoices and how they were coded.
   - The **job ledgers** — what actually ended up posted to each job.
3. **Presents a review UI** — PDF thumbnails plus the same dropdown choices the PMs use today. PMs review, accept the suggestion, or override it.
4. **Exports** the reviewed batch as Excel / CSV / XML, mapped to the Computerease import format.

## Known gotchas

- **Training data is dirty.** Costs get moved around in the accounting system after the fact for legitimate reasons. The historical library and the ledgers do not always agree, and neither is ground truth on its own.
- **Codes vary per job.** There's a master skeleton but the active set on any given job is a subset, and the subset isn't necessarily known up front.
- **PMs already trust the current PDF dropdowns.** Whatever replaces them needs to feel at least as fast.

## Open questions for next pass

- Where does the extraction step live? OCR + parser? LLM-based extraction? Hybrid?
- How do we represent "the master skeleton" so the suggester and the UI share it?
- How do we treat the dirty training data — discard moved entries, weight them down, learn the move patterns?
- What exactly does Computerease want in the import file? (Format, required columns, identifiers.)
- Authentication and access — PMs aren't the same user set as the payroll workers in this app today.
- Where does this live? See `payroll-tool-vs-conversion.md` for the same-repo-or-not question.

## Things explicitly out of scope right now

- Picking the AI model or extraction stack.
- UI design.
- Integration mechanics with Computerease.
- How PMs are onboarded.

The point of this file is to remember the shape of the problem, not to pre-decide the solution.
