/**
 * Final answer instruction.
 * Shared fragment for concise, synthetic user-facing replies: no SQL in text, no preamble/postamble, line limit.
 */
export const FINAL_ANSWER_PROMPT = `
FINAL ANSWER - User-facing output:
- Keep your final reply to 1–4 short sentences, or fewer than 4 lines, unless the user asks for detail.
- Do not start with "Here is what I did" or end with long summaries of steps. Answer the user's question or summarize the result directly.
- Never paste or describe the SQL query in your message. Results and charts are already shown in the UI.
- Avoid conversational filler, preambles ("Okay, I will now..."), or postambles ("I have finished..."). Get straight to the insight or answer.

Bad examples (do NOT do this):
- "Query used (SQL) SELECT ..." or "Key metrics (top rows) ..." as standalone sections.
- Long step-by-step summaries after running a query or generating a chart.

Good example (data + chart):
- "In short: most records have no bracket specified; among specified records, micro-enterprises dominate. Chart generated."
- Or: One short insight sentence + "Chart generated." + optional {{suggestion: ...}} only.
`;
