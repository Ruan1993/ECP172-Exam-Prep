export interface RestartableActivity<T>{position:number;local:T}
export const needsRestartConfirmation=(position:number)=>position>0;
export function cancelRestart<T,P>(activity:RestartableActivity<T>,progress:P){return{activity,progress}}
export function confirmRestart<T,P>(activity:RestartableActivity<T>,progress:P){return{activity:{...activity,position:0},progress}}
