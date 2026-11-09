'use strict';
const $ = id => document.getElementById(id);
let role = 'pm', state, busy = false, browserMode = false;
const prompts = {
  pm: ['为员工办公助手整理 PRD 和验收标准', '发布前需要哪些产品验收步骤？', '如何配置属于自己的办公助手？', '需求变更时应该确认哪些边界？'],
  dev: ['梳理创建任务接口的设计与异常路径', '发布失败时如何回滚？', '知识资料缺失时助手应怎样回答？', '工作仓库的权限校验应该放在哪里？'],
  qa: ['为工作仓库生成测试用例检查清单', '发布前有哪些回归与验收要求？', '怎样验证岗位知识的访问隔离？', '模型超时和无检索结果如何测试？']
};
const panels = {dashboard:'工作台', assistant:'我的助手', knowledge:'知识仓库', history:'运行记录', guide:'产品说明'};
function node(tag, text, cls) { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; }
function toast(text, error = false) { document.querySelector('.toast')?.remove(); const el = node('div', text, 'toast' + (error ? ' error' : '')); el.setAttribute('role', 'status'); document.body.append(el); setTimeout(() => el.remove(), 6500); }
async function api(path, body, selectedRole = role) {
  if (browserMode) return window.workloomBrowser(path, body, selectedRole);
  const res = await fetch('/api/' + path, { method: body === undefined ? 'GET' : 'POST', headers: {'Content-Type':'application/json','X-Demo-Role':selectedRole}, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
  if (!res.headers.get('content-type')?.includes('application/json')) throw new Error('请运行 python server.py 后访问本地地址；静态托管仅展示个人网站。');
  const data = await res.json(); if (!res.ok) throw new Error(data.error || '请求失败'); return data;
}
function navigate(id) { if (busy && id !== 'dashboard') return toast('请等待当前回答完成'); Object.keys(panels).forEach(key => $(key).classList.toggle('active', key === id)); document.querySelectorAll('[data-panel]').forEach(el => { el.classList.toggle('active', el.dataset.panel === id); el.setAttribute('aria-current', el.dataset.panel === id ? 'page' : 'false'); }); $('page-name').textContent = panels[id]; }
document.querySelectorAll('[data-panel]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.panel)));
document.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.goto)));
function date(value) { return new Date(value*1000).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }
async function refresh() {
  state = await api('state');
  const r = state.roles[role];
  $('role').replaceChildren(...Object.entries(state.roles).map(([id, value]) => { const opt = node('option',value.name + ' · ' + value.employee); opt.value=id; return opt; }));
  $('role').value = role;
  $('employee').textContent = r.employee; $('avatar').textContent = r.employee[0]; $('employee-role').textContent = r.name + ' · 演示员工'; $('greeting-name').textContent = r.employee;
  $('agent-name').textContent = state.profile.name; $('agent-focus').textContent = r.focus;
  $('stat-docs').textContent = state.documents.length; $('stat-version').textContent = 'v' + state.profile.version; $('stat-feedback').textContent = state.feedback_count;
  $('assistant-name').value = state.profile.name; $('instructions').value = state.profile.instructions;
  const questions = prompts[role] || ['如何配置属于自己的办公助手？','请梳理当前岗位的工作步骤与注意事项','根据授权资料整理材料清单','资料不足时如何核实业务规则？'];
  $('suggestions')?.replaceChildren(...questions.map(text => { const b = node('button',text + ' ↗'); b.type = 'button'; b.onclick = () => { $('question').value = text; $('question').focus(); }; return b; }));
  $('knowledge-preview').replaceChildren(...state.documents.slice(0,3).map(doc => { const row=node('div',undefined,'knowledge-item'); row.append(node('span','▤')); const copy=node('div',doc.title); copy.append(node('small',doc.owner === 'seed' ? '\n演示知识 · ' + (doc.scope === 'all'?'公共':'当前岗位') : '\n个人知识 · 仅当前员工')); row.append(copy); return row; }));
  $('documents').replaceChildren(...state.documents.map(doc => { const card=node('article',undefined,'card'); card.append(node('span',doc.owner==='seed'?(doc.scope==='all'?'公共演示资料':'岗位演示资料'):'个人知识','tag'),node('h3',doc.title),node('p',doc.content)); if(doc.owner===role){const b=node('button','删除个人文档','secondary small'); b.onclick=async()=>{if(!confirm('删除这份个人文档？此操作不会删除历史回答。'))return;try{await api('documents/delete',{id:doc.id});await refresh();toast('个人文档已删除');}catch(e){toast(e.message,true);}};card.append(b);}return card;}));
  $('recent-runs').replaceChildren(...state.runs.slice(0,4).map(run=>{const tr=node('tr'); [run.question.slice(0,45),run.mode==='live'?'模型生成':'离线检索',date(run.created),'已完成'].forEach(text=>tr.append(node('td',text)));return tr;}));
  if(!state.runs.length){const row=node('tr');const cell=node('td','还没有运行记录，从一个工作问题开始。','empty');cell.colSpan=4;row.append(cell);$('recent-runs').append(row);}
  $('history-list').replaceChildren(...state.runs.map(run=>{const card=node('details',undefined,'card');card.style.marginBottom='12px';card.append(node('summary',run.question+' · '+date(run.created)),node('p',run.mode==='live'?'模型生成':'离线检索','hint'),node('div',run.answer,'history-answer'));return card;}));
  if(!state.runs.length)$('history-list').append(node('div','还没有运行记录。','card empty'));
  $('revisions').replaceChildren(...state.revisions.map(rev=>{const el=node('details',undefined,'revision');el.append(node('summary','v'+rev.version+' · '+date(rev.created)),node('p',rev.instructions));return el;}));
  if(!state.revisions.length)$('revisions').append(node('p','尚未产生新版本。首次保存将生成 v2。','hint'));
}
$('role').addEventListener('change',async event=>{if(busy){event.target.value=role;return;}role=event.target.value;document.querySelectorAll('.message,.trace').forEach(el=>el.remove());$('chat-area').replaceChildren(node('div','已切换岗位。选择一个问题，开始新的对话。','empty'));const suggestions=node('div',undefined,'suggestions');suggestions.id='suggestions';$('chat-area').append(suggestions);$('question').value='';$('document-form').reset();try{await refresh();}catch(e){toast(e.message,true);}});
$('chat-form').addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const question=$('question').value.trim();if(!question)return;busy=true;$('send').disabled=true;$('role').disabled=true;const selectedRole=role;$('chat-area').querySelector('.welcome')?.remove();$('chat-area').append(node('div',question,'message user'));const waiting=node('div','正在校验岗位、检索知识并准备回答…','message assistant');$('chat-area').append(waiting);$('question').value='';waiting.scrollIntoView({block:'nearest'});
  try{const data=await api('chat',{question},selectedRole);waiting.replaceChildren(node('div',data.mode==='live'?'✳ 基于授权知识的模型回答':'✳ 离线检索 · 原文摘录与岗位模板','answer-label'),node('div',data.answer));
    data.citations.forEach((ref,i)=>{const details=node('details',undefined,'citation');details.append(node('summary','['+(i+1)+'] '+ref.title+' · 片段起点 '+ref.offset),node('p',ref.text));waiting.append(details);});
    const trace=node('details',undefined,'trace');trace.append(node('summary','查看运行链路 · 指令 v'+data.version));data.trace.forEach(step=>trace.append(node('p',step.step+' → '+step.detail)));waiting.append(trace);
    const actions=node('div',undefined,'feedback-actions');[ ['有帮助',1],['需要改进',-1] ].forEach(([text,rating])=>{const button=node('button',text,'secondary');button.type='button';button.onclick=async()=>{const correction=rating===-1?prompt('记录改进建议（人工审核后再调整助手配置）：',''):'';if(correction===null)return;try{const result=await api('feedback',{run_id:data.id,rating,correction},selectedRole);actions.querySelectorAll('button').forEach(b=>b.disabled=true);toast(result.message);await refresh();}catch(e){toast(e.message,true);}};actions.append(button);});waiting.append(actions);await refresh();
  }catch(e){waiting.textContent='未完成：'+e.message;toast(e.message,true);}finally{busy=false;$('send').disabled=false;$('role').disabled=false;}
});
$('question').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('chat-form').requestSubmit();}});
async function submitForm(event, action) {event.preventDefault();const button=event.target.querySelector('button[type=submit]');button.disabled=true;try{await action();}catch(e){toast(e.message,true);}finally{button.disabled=false;}}
$('profile-form').addEventListener('submit',e=>submitForm(e,async()=>{const result=await api('profile',{name:$('assistant-name').value,instructions:$('instructions').value});await refresh();toast('配置已保存为 v'+result.version+'，后续回答将加载此版本。');}));
$('role-form').addEventListener('submit',e=>submitForm(e,async()=>{
  const result=await api('roles',{name:$('new-role-name').value,employee:$('new-role-employee').value,focus:$('new-role-focus').value,steps:$('new-role-steps').value});
  role=result.id;$('role-form').reset();$('document-form').reset();$('question').value='';
  $('chat-area').replaceChildren(node('div','已创建你的工作身份。添加个人知识，然后开始提问。','empty'));
  const suggestions=node('div',undefined,'suggestions');suggestions.id='suggestions';$('chat-area').append(suggestions);
  await refresh();toast('工作身份已创建，可以使用独立知识与助手配置。');
}));
$('document-form').addEventListener('submit',e=>submitForm(e,async()=>{await api('documents',{title:$('doc-title').value,content:$('doc-content').value});$('document-form').reset();await refresh();toast('已添加个人知识；仅当前演示员工可检索。');}));
$('doc-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>160000||!(/\.(txt|md)$/i.test(file.name))){toast('请选择不超过160 KB的TXT / Markdown文件',true);e.target.value='';return;}const text=await file.text();if(text.length>40000){toast('正文超出40,000字限制',true);return;}$('doc-content').value=text;if(!$('doc-title').value)$('doc-title').value=file.name;});
$('export-history').onclick=()=>{if(!state)return;const url=URL.createObjectURL(new Blob([JSON.stringify({role,runs:state.runs},null,2)],{type:'application/json'}));const a=node('a');a.href=url;a.download='workloom-'+role+'-runs.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
(async()=>{try{let health;try{health=await api('health');}catch(error){if(!window.WORKLOOM_SEEDS)throw error;browserMode=true;health={mode:'browser'};document.querySelector('.demo-banner').textContent='浏览器演示：资料保存在本机，不调用大模型。岗位隔离仅为交互示意。完整后端请运行 GitHub 项目。';}$('mode').textContent=health.mode==='live'?'● 模型服务已配置':health.mode==='browser'?'● 浏览器演示 · 无大模型':'● 离线检索模式';await refresh();}catch(e){$('mode').textContent='服务未连接';toast(e.message,true);$('send').disabled=true;}})();
