import {useRef,useState} from 'react';
import {ReadAloud} from './ReadAloud';
import {examFormat2026,pastPaperSummaries,questionSourceNotice,type PastPaperTopic} from './pastPaperQuestions';
import './pastPaperQuestions.css';

export function ExamQuestionPanel({topic}:{topic:PastPaperTopic}) {
 const [expanded,setExpanded]=useState(false);
 const content=useRef<HTMLDivElement>(null);
 const question=pastPaperSummaries[topic];
 return <details className="past-paper-panel" open={expanded} onToggle={event=>setExpanded(event.currentTarget.open)}>
  <summary>Show past-paper question</summary>
  {expanded&&<div ref={content} className="past-paper-content">
   <h3>Past-paper question summary</h3>
   <p className="past-paper-source">{questionSourceNotice}</p>
   <h4>{question.title}</h4>
   <p>{question.summary}</p>
   <h3>How to prepare for the 2026 exam</h3>
   <p>{examFormat2026}</p>
   <p>{question.preparation}</p>
   <ReadAloud label="past-paper summary and 2026 preparation" scope={()=>content.current}/>
  </div>}
 </details>;
}
