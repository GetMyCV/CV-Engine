/**
 * Prompts for the AI writing assistant. Each task returns plain text so the
 * editor can drop it straight into a field.
 */
export type AiTask = 'improve-bullets' | 'summary' | 'tailor' | 'letter' | 'linkedin-about' | 'linkedin-headline' | 'proofread';

export const SYSTEM = `You are an expert CV writer, recruiter and career coach who writes for applicant tracking systems (ATS) and human recruiters.
Rules you always follow:
- Never invent employers, dates, degrees, numbers or achievements. When a metric would help but is not given, insert a bracketed placeholder such as [X%] or [number] for the user to fill in.
- CV text uses the implied first person (no "I", "my"), starts bullets with strong past-tense action verbs (present tense for a current role), and stays concise: bullets of 1–2 lines.
- Use the exact wording of skills and job titles from the job description when the candidate genuinely has them.
- Avoid clichés ("team player", "results-driven", "hard-working") and filler.
- Match the requested English variant (US, UK or Canadian spelling).
- Output only the requested text, with no preamble, headings, quotes or markdown unless asked.`;

type Input = Record<string, string>;

export function buildPrompt(task: AiTask, i: Input): { prompt: string; maxTokens: number } {
  const ctx = [
    i.targetRole && `Target role: ${i.targetRole}`,
    i.company && `Company: ${i.company}`,
    i.region && `Region / CV standard: ${i.region}`,
    i.locale && `English variant: ${i.locale}`,
    i.jobDescription && `<job_description>\n${i.jobDescription}\n</job_description>`,
    i.cv && `<candidate_cv>\n${i.cv}\n</candidate_cv>`,
  ]
    .filter(Boolean)
    .join('\n');
  switch (task) {
    case 'improve-bullets':
      return {
        maxTokens: 2000,
        prompt: `${ctx}\n\nRole being described: ${i.roleTitle ?? ''}${i.current === 'true' ? ' (current role — use present tense)' : ' (past role — use past tense)'}\n\n<bullets>\n${i.text}\n</bullets>\n\nRewrite these CV bullet points to be achievement-focused, quantified (placeholders where numbers are missing) and keyword-aligned. Keep the same facts and roughly the same number of bullets. Return one bullet per line, with no bullet symbols.`,
      };
    case 'summary':
      return {
        maxTokens: 1000,
        prompt: `${ctx}\n\n${i.text ? `Current summary:\n${i.text}\n\n` : ''}Write a professional summary for the top of this CV: 3–4 sentences, 45–90 words. Include the target job title, years of experience if known, 2–3 core specialisms using job-ad keywords, and one headline achievement from the CV. Return only the summary paragraph.`,
      };
    case 'tailor':
      return {
        maxTokens: 2500,
        prompt: `${ctx}\n\nCompare the CV with the job description and give the candidate a concise tailoring plan in plain text with these sections, each a short list starting with "- ":\nMISSING KEYWORDS (only ones the CV suggests they could honestly claim)\nSUMMARY REWRITE (one rewritten summary)\nBULLETS TO STRENGTHEN (quote the original, then the improved version)\nSECTIONS TO ADD OR REORDER\nKeep it under 350 words.`,
      };
    case 'letter':
      return {
        maxTokens: 3000,
        prompt: `${ctx}\n\nDocument type: ${i.kind}\nStructure to follow (one paragraph per item):\n${i.structure}\n\n${i.text ? `Current draft:\n${i.text}\n\n` : ''}Write the ${i.kind === 'sop' ? 'statement of purpose' : i.kind === 'motivation' ? 'motivation letter' : 'cover letter'} body only (no address block, salutation or sign-off), ${i.words ? `about ${i.words} words` : 'under 380 words'}, in the candidate's voice (first person is fine for letters). Be specific to the company/programme, use concrete evidence from the CV, and keep [bracketed placeholders] where facts are unknown. Separate paragraphs with a blank line${i.headings === 'true' ? ' and start each paragraph with its heading on its own line followed by a colon' : ''}.`,
      };
    case 'linkedin-about':
      return {
        maxTokens: 1500,
        prompt: `${ctx}\n\nWrite a LinkedIn "About" section (200–300 words, first person, warm but professional): a hook line, what the candidate does and for whom, 3 proof points as lines starting with "▸ ", a "Skills:" line of keywords separated by " · ", and a short call to action.`,
      };
    case 'linkedin-headline':
      return {
        maxTokens: 600,
        prompt: `${ctx}\n\nWrite 5 alternative LinkedIn headlines (each under 220 characters) that are keyword-rich for recruiter search. Use formats like "Role | Specialism | Proof". One per line, no numbering.`,
      };
    case 'proofread':
      return {
        maxTokens: 3000,
        prompt: `${i.locale ? `English variant: ${i.locale}\n` : ''}<text>\n${i.text}\n</text>\n\nCorrect spelling, grammar and punctuation, and lightly improve clarity, without changing the meaning, facts or line structure. Return only the corrected text.`,
      };
  }
}
