import type{Area,Progress,Understanding}from'./types';

const titles:Record<Area,string[]>={
 Q1:['Start with the learner’s right','Use the Constitution as the foundation','Apply school law and policy','Understand language policy','Separate law from implementation','Build the applied answer'],
 Q2:['Begin with one research problem','Turn the issue into a neutral title','Ask one main question','Mirror the question in the aim','Break the study into aligned pairs','Choose evidence before method','Protect participants before collecting data'],
 Q3:['Find the barrier before choosing support','Use the Language in Education Policy','Teach language across the curriculum','Make classroom participation safer','Use practical scaffolds','Use SIAS as a support process'],
 Q4:['Begin with difference without stereotyping','Knowledge construction','Content integration','Prejudice reduction','Equity pedagogy','Choose the approach from the teacher action']
};

export const topicId=(area:Area,index:number)=>`${area.toLowerCase()}:lesson:${index}`;
export function rateTopic(progress:Progress,id:string,confidence:Understanding,now=new Date().toISOString()):Progress{const old=progress.learningTopics?.[id];return{...progress,learningTopics:{...progress.learningTopics,[id]:{...old,studiedAt:old?.studiedAt||now,confidence,updatedAt:now}}}}
export function studyTopic(progress:Progress,id:string,now=new Date().toISOString(),meta?:{area:Area;title:string;routeIndex?:number}):Progress{const old=progress.learningTopics?.[id];return{...progress,learningTopics:{...progress.learningTopics,[id]:old||{studiedAt:now,updatedAt:now,...meta}}}}
export function learningSummary(progress:Progress){const core=(Object.keys(titles)as Area[]).flatMap(area=>titles[area].map((title,index)=>({area,index,id:topicId(area,index),title,progress:progress.learningTopics?.[topicId(area,index)]}))),known=new Set(core.map(x=>x.id)),extras=Object.entries(progress.learningTopics||{}).filter(([id,p])=>!known.has(id)&&p.area&&p.title).map(([id,p])=>({id,area:p.area!,index:p.routeIndex||0,title:p.title!,progress:p})),topics=[...core,...extras],studied=topics.filter(x=>x.progress),understood=topics.filter(x=>x.progress?.confidence==='understood'),revision=topics.filter(x=>x.progress?.confidence==='revisit'||x.progress?.confidence==='confused');return{topics,studied,understood,revision,completionPercent:Math.round(core.filter(x=>x.progress).length/core.length*100),understandingPercent:studied.length?Math.round(understood.length/studied.length*100):0}}
