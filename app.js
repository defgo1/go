const DEFAULT_TASKS = [
  {id:"breakfast-prep", title:"Prepare breakfast", note:"Night before: porridge + Scott's beans", type:"daily", time:"20:00"},
  {id:"apple-juice", title:"Alfie's apple juice", note:"Have it ready for the morning", type:"daily", time:"07:00"},
  {id:"water-bottles", title:"Fill all water bottles", note:"Everyone's bottles ready", type:"daily", time:"07:10"},
  {id:"water-tank", title:"Check the water tank", note:"Ongoing — keep it topped up / dealt with as needed", type:"ongoing", time:""},
  {id:"kids-snacks", title:"Prepare kids' snacks", note:"Daily snack prep", type:"daily", time:"20:10"},
  {id:"weekend-bake", title:"Bake the kids' weekly snack", note:"Saturday or Sunday: one large loaf/slice to last until Wednesday", type:"weekly", time:""},
  {id:"utility-bills", title:"Utility bills", note:"Check and pay household utilities", type:"ongoing", time:""},
  {id:"car-admin", title:"Cars — service + registration", note:"Keep servicing and rego up to date", type:"ongoing", time:""}
];

const $ = s => document.querySelector(s);
const dateKey = d => d.toISOString().slice(0,10);
const mondayKey = (d = new Date()) => {
  const x = new Date(d);
  const day = (x.getDay()+6)%7;
  x.setHours(0,0,0,0); x.setDate(x.getDate()-day);
  return dateKey(x);
};

let tasks = JSON.parse(localStorage.getItem("homeTasks") || "null") || DEFAULT_TASKS;
let state = JSON.parse(localStorage.getItem("homeTaskState") || "{}");

function save(){
  localStorage.setItem("homeTasks", JSON.stringify(tasks));
  localStorage.setItem("homeTaskState", JSON.stringify(state));
}

function stateKey(task){
  if(task.type === "daily") return `${task.id}|d|${dateKey(new Date())}`;
  if(task.type === "weekly") return `${task.id}|w|${mondayKey()}`;
  return `${task.id}|o`;
}
function isDone(t){ return !!state[stateKey(t)]; }
function toggle(t){
  state[stateKey(t)] = !isDone(t);
  save(); render();
}
function timeLabel(t){
  if(!t.time) return t.type === "weekly" ? "Weekend" : "Ongoing";
  const [h,m]=t.time.split(":").map(Number);
  const d=new Date(); d.setHours(h,m,0,0);
  return d.toLocaleTimeString([], {hour:"numeric", minute:"2-digit"});
}
function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function taskEl(t){
  const el=document.createElement("div");
  el.className="task"+(isDone(t)?" done":"");
  el.innerHTML=`
    <button class="check" aria-label="${isDone(t)?"Mark not done":"Mark done"}">${isDone(t)?"✓":""}</button>
    <div class="task-main">
      <div class="task-title">${escapeHtml(t.title)}</div>
      <div class="task-note">${escapeHtml(t.note||"")}</div>
    </div>
    <div class="time-pill">${escapeHtml(timeLabel(t))}</div>`;
  el.querySelector(".check").onclick=()=>toggle(t);
  return el;
}
function renderList(selector, type){
  const box=$(selector); box.innerHTML="";
  const list=tasks.filter(t=>t.type===type);
  if(!list.length){ box.innerHTML='<div class="all-done">No tasks here.</div>'; return; }
  list.forEach(t=>box.appendChild(taskEl(t)));
}
function nextTask(){
  const now=new Date();
  const daily=tasks.filter(t=>t.type==="daily" && !isDone(t) && t.time).map(t=>{
    const [h,m]=t.time.split(":").map(Number);
    const d=new Date(now); d.setHours(h,m,0,0);
    return {task:t, due:d};
  }).sort((a,b)=>a.due-b.due);

  const future=daily.find(x=>x.due>=now);
  if(future) return future;
  if(daily.length) return daily[0]; // overdue item
  const weekly=tasks.find(t=>t.type==="weekly"&&!isDone(t));
  if(weekly) return {task:weekly,due:null};
  const ongoing=tasks.find(t=>t.type==="ongoing"&&!isDone(t));
  return ongoing ? {task:ongoing,due:null} : null;
}
function renderUpNext(){
  const target=$("#upNext");
  const n=nextTask();
  if(!n){
    target.innerHTML='<div class="all-done">Everything is checked off. Nice.</div>';
    $("#nextTime").textContent="All done";
    return;
  }
  let label=timeLabel(n.task);
  if(n.due && n.due < new Date()) label="Overdue · "+label;
  $("#nextTime").textContent=label;
  target.innerHTML=`
    <div class="up-next-card">
      <div class="up-next-time">${escapeHtml(label)}</div>
      <div class="up-next-title">${escapeHtml(n.task.title)}</div>
      <div class="up-next-note">${escapeHtml(n.task.note||"")}</div>
    </div>`;
}
function render(){
  $("#todayLabel").textContent=new Date().toLocaleDateString([], {weekday:"long", day:"numeric", month:"long"});
  renderList("#dailyTasks","daily");
  renderList("#weeklyTasks","weekly");
  renderList("#ongoingTasks","ongoing");
  const daily=tasks.filter(t=>t.type==="daily");
  $("#doneCount").textContent=`${daily.filter(isDone).length} / ${daily.length}`;
  renderUpNext();
}
$("#resetTodayBtn").onclick=()=>{
  tasks.filter(t=>t.type==="daily").forEach(t=>delete state[stateKey(t)]);
  save(); render();
};

const dialog=$("#settingsDialog");
$("#settingsBtn").onclick=()=>{ buildEditor(); dialog.showModal(); };
$("#addTaskBtn").onclick=()=>{
  tasks.push({id:"task-"+Date.now(),title:"New responsibility",note:"",type:"ongoing",time:""});
  buildEditor();
};
$("#restoreBtn").onclick=()=>{
  tasks=structuredClone(DEFAULT_TASKS);
  buildEditor();
};
$("#saveBtn").onclick=(e)=>{
  e.preventDefault();
  document.querySelectorAll(".editor-row").forEach(row=>{
    const i=Number(row.dataset.index);
    tasks[i].title=row.querySelector(".ed-title").value.trim() || "Untitled task";
    tasks[i].note=row.querySelector(".ed-note").value.trim();
    tasks[i].type=row.querySelector(".ed-type").value;
    tasks[i].time=row.querySelector(".ed-time").value;
  });
  save(); render(); dialog.close();
};
function buildEditor(){
  const box=$("#editorRows"); box.innerHTML="";
  tasks.forEach((t,i)=>{
    const row=document.createElement("div");
    row.className="editor-row"; row.dataset.index=i;
    row.innerHTML=`
      <div class="editor-grid">
        <label>Task<input class="ed-title" value="${escapeHtml(t.title)}"></label>
        <label>Schedule
          <select class="ed-type">
            <option value="daily" ${t.type==="daily"?"selected":""}>Daily</option>
            <option value="weekly" ${t.type==="weekly"?"selected":""}>Weekly</option>
            <option value="ongoing" ${t.type==="ongoing"?"selected":""}>Ongoing</option>
          </select>
        </label>
      </div>
      <div class="editor-grid">
        <label>Note<input class="ed-note" value="${escapeHtml(t.note||"")}"></label>
        <label>Time<input class="ed-time" type="time" value="${escapeHtml(t.time||"")}"></label>
      </div>
      <button type="button" class="remove-btn">Remove task</button>`;
    row.querySelector(".remove-btn").onclick=()=>{
      tasks.splice(i,1); buildEditor();
    };
    box.appendChild(row);
  });
}

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
render();
setInterval(render, 60_000);
