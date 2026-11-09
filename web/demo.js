/* Browser-only demo for static hosting. NOT a security boundary or real LLM. */
window.workloomBrowser = (path, body, role) => {
  const key = 'workloom-demo-v1';
  const seed = window.WORKLOOM_SEEDS;
  let db;
  try { db = JSON.parse(localStorage.getItem(key)); } catch {}
  if(!db) db = {documents:seed.documents,profiles:{},roles:{},runs:[],feedback:[],revisions:[],nextId:100};
  db.roles={...seed.roles,...(db.roles||{})};
  Object.entries(db.roles).forEach(([r,v])=>{if(!db.profiles[r])db.profiles[r]={name:v.employee+'的办公助手',owner:r,instructions:'先给结论，再给行动清单；引用依据；资料不足时明确说明。',version:1};});
  const persist=()=>localStorage.setItem(key,JSON.stringify(db));
  const allowed=()=>db.documents.filter(d=>d.scope==='all'||(d.owner==='seed'&&d.scope===role)||d.owner===role);
  const terms=text=>new Set((text.toLowerCase().match(/[a-z0-9_]+/g)||[]).concat(Array.from(text).slice(0,-1).map((_,i)=>text.slice(i,i+2)).filter(t=>/^[\u4e00-\u9fff]{2}$/.test(t))));
  if(path==='health')return {mode:'browser',demo:true};
  if(path==='state')return {roles:db.roles,profile:db.profiles[role],documents:allowed(),runs:db.runs.filter(r=>r.owner===role).slice(-20).reverse(),revisions:db.revisions.filter(r=>r.owner===role).slice(-10).reverse(),feedback_count:db.feedback.filter(r=>r.owner===role).length};
  if(path==='roles'){
    const id='custom_'+crypto.randomUUID(),steps=body.steps.split('\n').map(s=>s.trim()).filter(Boolean);
    if(steps.length<1||steps.length>10)throw new Error('请填写1到10条工作步骤');
    db.roles[id]={name:body.name,employee:body.employee,focus:body.focus,steps};
    db.profiles[id]={owner:id,name:body.employee+'的办公助手',instructions:'围绕岗位职责回答；提供引用，证据不足时明确说明。',version:1};
    persist();return {id,role:db.roles[id]};
  }
  if(path==='profile'){const p=db.profiles[role];p.name=body.name;p.instructions=body.instructions;p.version++;db.revisions.push({...p,created:Date.now()/1000});persist();return {version:p.version};}
  if(path==='documents'){db.documents.push({...body,id:db.nextId++,scope:'private',owner:role});persist();return {ok:true};}
  if(path==='documents/delete'){db.documents=db.documents.filter(d=>!(d.id===body.id&&d.owner===role));persist();return {ok:true};}
  if(path==='feedback'){db.feedback.push({...body,owner:role});persist();return {message:'浏览器反馈已保存；请人工审核后修改助手配置。'};}
  if(path==='chat'){
    const q=terms(body.question), refs=[];
    for(const doc of allowed())for(let start=0;start<doc.content.length;start+=380){const text=doc.content.slice(start,start+480), docTerms=terms(doc.title+text);const score=[...q].filter(t=>docTerms.has(t)).length/Math.max(1,q.size);if(score>0)refs.push({id:doc.id,title:doc.title,text,score,offset:start});}
    refs.sort((a,b)=>b.score-a.score);const citations=refs.slice(0,4);
    const answer=(citations.length?'浏览器演示 · 以下为授权知识摘录（未调用大模型）：\n\n'+citations.map((r,i)=>'['+(i+1)+'] '+r.title+'\n'+r.text).join('\n\n'):'授权演示资料中没有找到相关依据，请补充知识。')+'\n\n岗位工作步骤（来自配置，需人工完善）：\n'+db.roles[role].steps.map((s,i)=>(i+1)+'. '+s).join('\n')+'\n\n当前个人指令：'+db.profiles[role].instructions;
    const run={id:db.nextId++,owner:role,question:body.question,answer,citations,mode:'browser',created:Date.now()/1000,version:db.profiles[role].version,trace:[{step:'浏览器演示',detail:'使用本机 localStorage，岗位隔离仅为交互示意'},{step:'知识检索',detail:'词项匹配，命中 '+citations.length+' 个片段'},{step:'输出',detail:'原文摘录，未调用大模型'}]};db.runs.push(run);persist();return run;
  }
  throw new Error('不支持此操作');
};
