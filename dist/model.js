// Deterministic UI fixtures. These are NOT solver or benchmark results.
export const scenarios = [
  {id:'SC1',name:'Critical supplier outage',short:'Base disruption',description:'S1 is offline for 7 days. Demand remains at the forecast level.',demand:0,capacity:100,stale:false},
  {id:'SC2',name:'Outage + demand surge',short:'Demand surge',description:'A 20% demand spike coincides with the S1 shutdown.',demand:20,capacity:100,stale:false},
  {id:'SC3',name:'Constrained alternate supply',short:'Capacity stress',description:'S2 is limited to 50% capacity while S1 is offline.',demand:0,capacity:50,stale:false},
  {id:'SC4',name:'Stale inventory snapshot',short:'Data quality',description:'Inventory data is 24 hours old. Confidence is reduced.',demand:0,capacity:100,stale:true}
];
export const agents = [
  {name:'Demand',icon:'chart',color:'blue',detail:'Prioritised 3 exposed SKUs',source:'demand_forecast · seed'},
  {name:'Inventory',icon:'box',color:'purple',detail:'Identified transferable stock',source:'inventory_position · D3'},
  {name:'Supplier risk',icon:'shield',color:'amber',detail:'Qualified S2 as alternate',source:'supplier_master · S2'},
  {name:'Logistics',icon:'truck',color:'green',detail:'Reserved an expedited lane',source:'lane_master · P1 → D1'}
];
export function makeRun(config={scenario:'SC1',seed:42},version=1){
  const s=scenarios.find(x=>x.id===config.scenario)||scenarios[0];
  const seed=Number(config.seed); const variation=((seed*9301+49297)%233280)/233280;
  const q=s.capacity===50?250:420;
  return {id:`${s.id}-${seed}-${version}`,version,config:{scenario:s.id,seed},scenario:s,status:'PENDING_APPROVAL',validated:true,edited:false,alternative:'balanced',confidence:s.stale?68:Math.round(91+variation*4),
    actions:[
      {id:'A01',type:'Alternate source',agent:'Supplier risk',sku:'SKU-01',from:'S2',to:'P1',quantity:q,original:q,max:s.capacity===50?300:600,min:100,unitCost:24,day:12,icon:'shuffle',rationale:'Qualified alternate S2 bridges the component shortage while S1 is offline. The order respects the supplier minimum of 100 units.',evidence:'supplier_master:S2 · supplier_capacity:D10',rejected:'S4 spot sourcing rejected: 28% higher unit cost and less available capacity.'},
      {id:'A02',type:'Expedite',agent:'Logistics',sku:'SKU-01',from:'P1',to:'D1',quantity:180,original:180,max:300,min:20,unitCost:8,day:11,icon:'truck',rationale:'Upgrade an existing shipment to protect the earliest priority orders at D1. This consumes the shared expedite budget.',evidence:'lane_master:P1-D1 · open_orders:1042',rejected:'Standard shipping arrives after the priority-order deadline.'},
      {id:'A03',type:'Reallocate',agent:'Inventory',sku:'SKU-02',from:'D3',to:'D2',quantity:120,original:120,max:200,min:10,unitCost:3,day:12,icon:'arrows',rationale:'Move available finished goods from D3 to D2. Keep the donor distribution centre above its protected stock floor.',evidence:'inventory_position:D3-SKU02 · service_constraints:D2',rejected:'A 240-unit transfer was rejected because only 200 units are available above the protected floor.'},
      {id:'A04',type:'Reschedule',agent:'Inventory',sku:'SKU-03',from:'P2',to:'P2',quantity:240,original:240,max:360,min:20,unitCost:5,day:13,icon:'calendar',rationale:'Bring forward a production run at P2 using available components. The reserved slot accounts for the changeover window.',evidence:'plant_capacity:P2-D13 · bom:SKU03',rejected:'P1 production rejected: it depends on the disrupted S1 component.'}
    ],variation};
}
export function metrics(run,planner='agentic'){
  const stress=run.scenario.demand?3.1:run.scenario.capacity===50?2.2:run.scenario.stale?1.8:0;
  const delta=run.actions.reduce((sum,a)=>sum+(a.quantity-a.original),0);
  const actionCost=run.actions.reduce((sum,a)=>sum+a.quantity*a.unitCost,0);
  const fill=Math.min(99.5,Math.max(60,96.8-stress+delta*.006+(run.variation-.5)*.4));
  const cost=Math.round(171120+actionCost+stress*2200+run.variation*360);
  const common={fill:+fill.toFixed(1),cost,backorders:Math.round(540+stress*110-delta*.5),recovery:Math.max(5,Math.round(8+stress-delta*.004)),inventory:+(16.4-stress*.5).toFixed(1),violations:validate(run).filter(c=>!c.pass).length,runtime:4.8,stability:run.scenario.stale?82:92};
  if(planner==='rules')return {...common,fill:+(fill-14.4).toFixed(1),cost:Math.round(cost*1.18),backorders:common.backorders+1980,recovery:common.recovery+6,inventory:21.7,violations:0,runtime:.2,stability:96};
  if(planner==='optimizer')return {...common,fill:+(fill-.6).toFixed(1),cost:Math.round(cost*.977),backorders:common.backorders+80,recovery:common.recovery+1,inventory:15.8,violations:0,runtime:2.1,stability:86};
  return common;
}
export function validate(run){
 const a=run.actions;
 return [
   {name:'Valid quantities',pass:a.every(x=>Number.isFinite(x.quantity)&&Number.isInteger(x.quantity)&&x.quantity>0),detail:'Positive, whole units only'},
   {name:'Supplier capacity & MOQ',pass:a[0].quantity>=a[0].min&&a[0].quantity<=a[0].max,detail:`S2: ${a[0].quantity} / ${a[0].max} units · MOQ 100`},
   {name:'Expedite budget',pass:a[1].quantity*8<=2400,detail:`$${(a[1].quantity*8).toLocaleString()} / $2,400 cap`},
   {name:'Lane capacity & pack size',pass:a.every(x=>x.quantity%10===0)&&a[1].quantity<=300,detail:'10-unit packs · expedited lane ≤ 300 units'},
   {name:'Inventory balance',pass:a[2].quantity<=200&&a[2].quantity>=10&&a[1].quantity<=a[0].quantity+100,detail:'D3 transfer ≤ 200 · shipment ≤ supply + 100 on hand'},
   {name:'Plant capacity',pass:a[3].quantity<=360&&a[3].quantity>=20,detail:`P2: ${a[3].quantity} / 360 units reserved`}
 ];
}
export function editQuantity(run,id,quantity){
 if(['APPROVED','APPROVED_WITH_EDITS','REJECTED'].includes(run.status))throw Error('Create a new run to edit a closed plan.');
 const action=run.actions.find(a=>a.id===id);if(!action)throw Error('Unknown action.');
 action.quantity=Number(quantity);run.version++;run.validated=false;run.edited=true;run.status='DRAFT';run.alternative='custom';
}
export function revalidate(run){run.validated=validate(run).every(c=>c.pass);run.status=run.validated?'PENDING_APPROVAL':'DRAFT';return run.validated;}
export function approve(run,identity){
 if(!identity?.trim())throw Error('An approver name is required.');
 if(run.status!=='PENDING_APPROVAL'||!run.validated||!validate(run).every(c=>c.pass))throw Error('Revalidate a feasible plan before approving.');
 run.status=run.edited?'APPROVED_WITH_EDITS':'APPROVED';
 return {id:globalThis.crypto?.randomUUID?.()||String(Date.now()),runId:run.id,version:run.version,scenario:run.scenario.id,seed:run.config.seed,decision:run.status,actor:identity.trim(),time:new Date().toISOString(),reason:'Reviewed actions, trade-offs and constraint checks.',actions:structuredClone(run.actions)};
}
export function chooseAlternative(run,key){
 const factor=key==='cost'?.8:key==='service'?1.2:1;
 for(const a of run.actions)a.quantity=Math.round(a.original*factor/10)*10;
 run.alternative=key;run.edited=key!=='balanced';run.version++;run.validated=false;revalidate(run);
}
