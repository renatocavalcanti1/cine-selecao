// A bounded per-instance budget. Multi-instance hosting also needs edge rate limits.
export function createRequestBudget(limit=60,windowMs=60_000){
 let start=0,count=0;
 return (now=Date.now())=>{
  if(now-start>=windowMs){start=now;count=0;}
  if(count>=limit)return {allowed:false,retryAfter:Math.max(1,Math.ceil((windowMs-(now-start))/1000))};
  count++;return {allowed:true,retryAfter:0};
 };
}
export const catalogBudget=createRequestBudget();
