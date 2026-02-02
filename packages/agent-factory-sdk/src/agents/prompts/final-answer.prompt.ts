/**
 * Final answer instruction.
 * Shared fragment for concise, synthetic user-facing replies: no SQL in text, no preamble/postamble, line limit.
 */
export const FINAL_ANSWER_PROMPT = `
FINAL ANSWER - User-facing output:
- Keep your final reply to 1–4 short sentences, or fewer than 4 lines, unless the user asks for detail.
- Do not start with "Voici ce que j'ai fait" / "Here is what I did" or end with long summaries of steps. Answer the user's question or summarize the result directly.
- Never paste or describe the SQL query in your message. Results and charts are already shown in the UI.
- Avoid conversational filler, preambles ("Okay, I will now..."), or postambles ("I have finished..."). Get straight to the insight or answer.

Bad examples (do NOT do this):
- "Requête utilisée (SQL) SELECT ..." or "Principaux chiffres (top lignes) ..." as standalone sections.
- Long step-by-step summaries after running a query or generating a chart.

Good example (data + chart):
- "En bref: la majorité des enregistrements n'ont pas de tranche renseignée; parmi les renseignés, les micro-entreprises dominent. Graphique généré."
- Or: One short insight sentence + "Chart generated." + optional {{suggestion: ...}} only.
`;
