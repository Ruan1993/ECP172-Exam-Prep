// Match an explicit concept label, never a passing mention in a mixed paragraph.
export const learningConcepts=[
 {id:'knowledge-construction',label:'Knowledge construction',number:1,tone:'yellow'},
 {id:'content-integration',label:'Content integration',number:2,tone:'green'},
 {id:'prejudice-reduction',label:'Prejudice reduction',number:3,tone:'blue'},
 {id:'equity-pedagogy',label:'Equity pedagogy',number:4,tone:'purple'},
 {id:'equality',label:'Equality',number:1,tone:'yellow'},
 {id:'equity',label:'Equity',number:2,tone:'green'},
 {id:'discrimination',label:'Discrimination',number:3,tone:'blue'},
] as const;
export function conceptForText(text:string){return learningConcepts.find(c=>text.startsWith(`${c.number}. ${c.label} `))}
