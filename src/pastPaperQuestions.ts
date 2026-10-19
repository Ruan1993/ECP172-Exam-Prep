// Source audit: src/data.ts contains adapted historical summaries, not verified quotations.
// No original paper is present. Do not promote its source labels or marks to verified metadata.
export const examFormat2026 = 'The 2026 exam has four compulsory questions worth 25 marks each. There are no essays. Q1–Q3 are scenario-based (Q2 builds a proposal from a given issue); Q4 is theory-based.';
export const questionSourceNotice = 'Original source paper unavailable. The original wording, exam year, paper, question number and marks have not been verified. This is a summary of existing study material, not an original quotation or a prediction of the 2026 question.';
export const pastPaperSummaries = {
 bela: {
  title: 'Rural school: implementing BELA',
  sourceId: 's-bela',
  summary: 'Consider how a rural school could address missing Grade R space, unsafe sanitation, long journeys to school, limited SGB participation and delayed district support. The study summary asks for measures to address these implementation challenges.',
  preparation: 'For Q1, identify the policy or duty relevant to each fact, explain it, propose a feasible action with a responsible actor, and justify how it addresses that fact. Use separate structured points that answer the command words. Do not copy the historical essay format.'
 },
 cyberbullying: {
  title: 'Cyberbullying: research components',
  sourceId: 's-cyber',
  summary: 'Use a study of the emotional and academic effects of cyberbullying in a rural high school to consider a justified research approach, research questions and aim, data-collection methods and tools, and ethical safeguards.',
  preparation: 'For Q2, work from the given issue. Keep the population, setting and problem aligned across the title, main question, aim, secondary questions and objectives. Justify the approach and instrument using the evidence needed; explain consent, assent, confidentiality and protection from harm. Answer the requested components rather than writing an essay or assuming every cyberbullying study uses the same design.'
 },
 sias: {
  title: 'Language competence and SIAS support',
  sourceId: 's-lolt',
  summary: 'Consider how English-medium barriers and teachers’ difficulty recognising language-acquisition errors can affect support. Explain SIAS, its objectives and teachers’ responsibilities without assuming that difficulty in the teaching language is a learning disability.',
  preparation: 'For Q3, identify the specific language barrier in the scenario, explain the relevant concept, recommend classroom support and justify why it helps. Where SIAS is relevant, connect screening, support planning, monitoring and referral to the facts. Prioritise the language issues in Unit 3, with inclusion strategies as supporting knowledge.'
 },
 multilingual: {
  title: 'A multilingual Grade 5 classroom',
  sourceId: 's-multi',
  summary: 'Consider a class with several home languages, English as the language of learning and teaching, limited resources and uneven parent involvement. Relate the barriers to LiEP, Language Across the Curriculum, equity and practical language-support strategies.',
  preparation: 'For Q3, link each identified barrier to a relevant principle and a concrete teacher action. Explain how multilingual resources, subject vocabulary teaching, scaffolding and accessible family communication support participation. Justify each choice from the scenario; do not reproduce the historical essay format. Q4 remains a theory question even when these topics connect to multicultural education.'
 }
} as const;
export type PastPaperTopic = keyof typeof pastPaperSummaries;
export const readingQuestionTopics:Readonly<Record<string,PastPaperTopic>> = {
 'q1-school':'bela', 'q2-b-proposal':'cyberbullying', 'q3-a':'multilingual', 'q3-d':'sias'
};
export const guidedQuestionTopics:Readonly<Record<string,PastPaperTopic>> = {
 'Q1:4':'bela', 'Q2:5':'cyberbullying', 'Q2:6':'cyberbullying',
 'Q3:1':'multilingual', 'Q3:2':'multilingual', 'Q3:5':'sias'
};
