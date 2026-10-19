import guide from './guide.json';
import type {Question} from './readingProgress';

export type RevisionQuestion={id:string;section:Question;sourceIds:string[];prompt:string;hint:string;points:string[];remember?:string};
const cards=Object.values(guide).flat();
const source=(id:string,...indices:number[])=>{const c=cards.find(c=>c.id===id)!;return indices.map(i=>c.body[i])};
const entry=(section:Question,key:string,sourceIds:string[],prompt:string,hint:string,points:string[],remember?:string):RevisionQuestion=>({id:`rev-${section}-${key}`,section,sourceIds,prompt,hint,points,remember});
export const revisionBank:RevisionQuestion[]=[
 entry('q1','rights',['q1-intro','q1-rights'],'Which constitutional rights should guide a decision that excludes a learner from school?','Connect access, equal treatment and dignity.',source('q1-rights',0),'Name the right, apply it to a fact, then justify an action.'),
 entry('q1','governance',['q1-school'],'Explain the roles of SASA and the BELA amendments in admission and language decisions.','School governance has legal limits.',source('q1-school',0,1)),
 entry('q1','language-access',['q1-access'],'A school refuses admission because a learner speaks a different home language. Which policies apply, and why?','Distinguish admission procedures from meaningful language access.',source('q1-access',0,1),'Home language must not become an unfair barrier.'),
 entry('q1','inclusive-support',['q1-inclusion'],'Explain how White Paper 6 and SIAS support inclusion beyond simply placing a learner in a classroom.','Think about barriers, a support plan and monitoring.',source('q1-inclusion',1,2)),
 entry('q1','religion',['q1-inclusion'],'How should a teacher distinguish education about religion from compulsory religious practice?','Respect different beliefs.',source('q1-inclusion',0)),
 entry('q1','professional-conduct',['q1-teachers'],'A teacher humiliates a learner. Explain the relevant professional and employment responsibilities.','Separate ethical duties from misconduct processes.',source('q1-teachers',0,1)),
 entry('q1','safety-dignity',['q1-safety'],'Explain how school safety measures and HIV/AIDS policy should protect learner dignity.','Consider safeguards, confidentiality and discrimination.',source('q1-safety',0,1)),
 entry('q1','grade-r-response',['q1-scenario'],'A rural school excludes Grade R learners on language grounds and lacks classrooms. Recommend a lawful, practical response.','Apply rights, investigate real capacity and assign practical actions.',[
  'Sections 9 and 29 require equality and access to basic education. SASA, the BELA amendments and language policy guide lawful admission and governance.',
  'Review the refusals with the governing body, parents and provincial department. Assess actual capacity, language support and realistic alternatives; follow lawful procedures and give clear reasons.',
  'Document shortages of classrooms, teachers, funding and transport. The principal and district should plan staffing, resources and safe, age-appropriate Grade R facilities in phases.',
  'Communicate accessible arrangements to parents. Practical constraints need a response, rather than becoming a blanket justification for unfair exclusion.'
 ],'Rights, relevant law, actual barriers, practical action.'),
 entry('q2','alignment',['q2-essentials','q2-a-proposal'],'Explain how a research problem, research question, aim and objectives should fit together.','Keep the same learners, setting and educational issue.',[
  'The problem describes the educational issue that needs investigation. The research question asks what the study needs to find out.',
  'The aim states what the study will do. Objectives identify specific actions that help achieve that aim.',
  'In Scenario A, the problem is difficulty understanding English instructions and Social Sciences terminology. The question investigates effects on Grade 8 understanding and participation; the aim investigates difficulties and suitable support.',
  'Objectives identify language difficulties, explore experiences and recommend strategies. Do not change the focus or invent findings.'
 ]),
 entry('q2','approaches',['q2-essentials'],'Compare qualitative, quantitative and mixed-methods research.','What kind of evidence does each approach need?',source('q2-essentials',2,3,4)),
 entry('q2','sampling',['q2-essentials','q2-a-proposal'],'Distinguish a population from a sample, using Scenario A to illustrate a participant selection.','The whole group differs from the selected participants.',[...source('q2-essentials',5,6),'Scenario A proposes a purposive sample of approximately 10–12 Grade 8 learners and two Social Sciences teachers. These are the selected participants, rather than the whole group.']),
 entry('q2','language-proposal',['q2-a-intro','q2-a-proposal'],'Construct a research question, aim and objectives for the Grade 8 Social Sciences language-barrier scenario.','Think first, then compare your wording with the aligned example.',[
  'Research question: '+source('q2-a-proposal',5)[0],
  'Aim: '+source('q2-a-proposal',7)[0],
  'Objectives: '+source('q2-a-proposal',9)[0]
 ],'Keep the language barrier and Grade 8 Social Sciences focus throughout.'),
 entry('q2','qualitative-design',['q2-a-intro','q2-a-proposal'],'Justify Scenario A’s approach, data collection and data analysis.','Experiences require detailed accounts, followed by themes.',[
  ...source('q2-a-proposal',11),
  'Data collection: '+source('q2-a-proposal',15)[0],
  'Data analysis: '+source('q2-a-proposal',17)[0],
  'Interviews explore experiences, while observations show classroom difficulties and support in context.'
 ]),
 entry('q2','cyberbullying-design',['q2-b-intro','q2-b-proposal'],'Why does the Grade 9 cyberbullying scenario use mixed methods? Explain how its data will be collected and analysed.','Combine extent and patterns with learners’ experiences.',[
  ...source('q2-b-proposal',11),
  'Anonymous questionnaires provide numerical information; semi-structured interviews explore learners’ experiences and support needs.',
  ...source('q2-b-proposal',17),
  'The findings can inform reporting, awareness and learner-support strategies.'
 ]),
 entry('q2','cyberbullying-construction',['q2-b-proposal'],'Construct a research question, aim and objectives for the existing Grade 9 cyberbullying study.','Do not assume the results before conducting the study.',[
  'Research question: '+source('q2-b-proposal',5)[0],
  'Aim: '+source('q2-b-proposal',7)[0],
  'Objectives: '+source('q2-b-proposal',9)[0]
 ]),
 entry('q2','ethics',['q2-a-proposal','q2-b-proposal','q2-final'],'What ethical protections are needed in these two school research proposals?','Permissions, consent, assent, choice and protection.',[
  ...source('q2-a-proposal',19),
  'For cyberbullying, also plan appropriate safeguarding procedures for sensitive experiences.',
  'Adapt the proposal to the actual question and scenario. Never invent findings before research is conducted.'
 ]),
 entry('q3','lolt',['q3-intro','q3-a'],'Define LoLT and explain why limited proficiency can hide subject understanding.','Distinguish knowing a concept from expressing it.',source('q3-a',0),'Language difficulty does not automatically mean weak subject knowledge.'),
 entry('q3','liep-lac',['q3-a'],'Distinguish LiEP from Language Across the Curriculum. How do they support subject learning?','One is a language policy; the other makes language development every teacher’s responsibility.',source('q3-a',1,2)),
 entry('q3','multilingual-support',['q3-b'],'Compare additive bilingualism, code-switching and translanguaging.','Describe what happens to the learner’s languages in each case.',source('q3-b',0,1,2)),
 entry('q3','scaffolding',['q3-c'],'Compare scaffolding and differentiation, giving practical forms of support.','Temporary support differs from adjusting teaching to learner needs.',source('q3-c',0,1),'Remove barriers while retaining meaningful learning goals.'),
 entry('q3','sias',['q3-d','q3-story-b'],'When classroom adjustments are insufficient, how should a teacher use SIAS and support teams?','Document what has been tried, involve support structures and monitor.',[
  ...source('q3-d',1),
  'Document classroom support and work with the school-based support team through SIAS. Involve district structures as needed; identify barriers and suitable assistance rather than simply labelling the learner.'
 ]),
 entry('q3','geography-application',['q3-story-a'],'Grade 9 learners understand diagrams but cannot explain Geography processes in English. Recommend and justify three strategies.','Connect every recommendation to the language barrier.',[
  'Teach key vocabulary with labelled diagrams, photographs and a word bank. Model an explanation and provide sentence starters so learners can connect concepts to academic language.',
  'Allow a brief partner discussion in a stronger language before reporting in English. Purposeful code-switching or translanguaging supports understanding while developing the LoLT.',
  'Check understanding through diagrams, oral explanations, short written responses and feedback. Gradually remove scaffolds as confidence and independence improve.'
 ]),
 entry('q3','accent-inclusion',['q3-story-b'],'A learner is mocked for an accent and the caregiver cannot understand school letters. Explain an inclusive response.','Address safety, teaching, communication and support.',[
  'Stop bullying and reinforce respectful classroom expectations. Learners need safety and belonging to participate.',
  'Assess subject understanding separately from language fluency. Use visuals, vocabulary, short instructions, worked examples and safe speaking practice.',
  'Communicate in an accessible language or format where feasible. Learn about the learner’s strengths and previous schooling; use SIAS and the support team if difficulties persist.',
  'Monitor participation, learner feedback and how well the learner demonstrates subject knowledge.'
 ]),
 entry('q3','feedback',['q3-d','q3-story-a'],'Explain formative assessment and how it can give a fairer picture of understanding.','Assessment should guide support during learning.',[
  ...source('q3-d',0),
  'Use diagrams, oral explanations and short written responses with feedback, rather than relying on one lengthy written test. Adjust support using the evidence and gradually reduce it as learners become more independent.'
 ]),
 entry('q4','multicultural-education',['q4-intro','q4-a','q4-f'],'Define multicultural education and explain why celebrating special days is insufficient.','Consider curriculum, relationships, teaching and participation.',source('q4-a',0,1),'Representation, respect and fair opportunities belong in ordinary school life.'),
 entry('q4','equality-equity',['q4-b','q4-answer-b'],'Compare equality and equity, using language support as an example.','Equal rights do not always require identical support.',source('q4-answer-b',1,2)),
 entry('q4','belief-attitude-action',['q4-c','q4-answer-b'],'Distinguish a stereotype, prejudice and discrimination with a classroom example.','Separate a belief, an attitude and an action.',['Stereotype: A generalised belief about a group. For example, assuming a learner from a particular background is less capable is stereotyping.','Prejudice: An unfair attitude based on such assumptions. Holding a negative attitude towards that learner is prejudice.',...source('q4-answer-b',4)],'Belief can shape attitude, which can influence behaviour.'),
 entry('q4','knowledge-construction',['q4-e','q4-answer-a'],'Explain knowledge construction and show how a History teacher could apply it.','Whose perspectives shape an account?',source('q4-answer-a',2)),
 entry('q4','content-integration',['q4-e','q4-answer-a'],'Explain content integration and give a Geography example.','Whose examples and experiences appear in ordinary lessons?',source('q4-answer-a',3)),
 entry('q4','prejudice-reduction',['q4-e','q4-answer-a'],'Explain prejudice reduction and recommend suitable classroom actions.','Challenge unsupported assumptions with evidence and reflection.',source('q4-answer-a',4)),
 entry('q4','equity-pedagogy',['q4-e','q4-answer-a'],'Explain equity pedagogy and distinguish it from content integration.','Changing teaching for access differs from including diverse content.',[...source('q4-answer-a',5),...source('q4-e',1)],'1. Knowledge construction. 2. Content integration. 3. Prejudice reduction. 4. Equity pedagogy.'),
 entry('q4','responsive-culture',['q4-d','q4-f','q4-c'],'How can culturally responsive teaching address classroom differences without stereotyping?','Learner identities are resources; possible cultural patterns are not fixed individual traits.',[
  ...source('q4-d',0),...source('q4-f',1),
  'Challenge unfair power relations and exclusion. Racism involves racial prejudice or discrimination, while xenophobia involves hostility towards perceived foreigners.'
 ])
];
