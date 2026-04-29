  // == CHANGE THIS PASSWORD ==
  const ADMIN_PASSWORD = 'SUBMERGE_ADMIN';

  // Standalone storage fallback: uses ChatGPT storage when available, otherwise browser localStorage.
  if (!window.storage) {
    window.storage = {
      async get(key) {
        const value = localStorage.getItem(key);
        return value === null ? null : { value };
      },
      async set(key, value) {
        localStorage.setItem(key, value);
        return { value };
      }
    };
  }

  const DEFAULT_MISSIONS = [
    {id:'SMRG-015',name:'Coral Health Survey - Tide Ridge',status:'active',date:'Jun 14, 2025 08:32 UTC',location:'Tide Ridge Reef, Zone 4B',progress:62,sensors:[{label:'Depth',value:'12 m',cls:'highlight'},{label:'Temp',value:'26.4 C',cls:''},{label:'Salinity',value:'35.1 PSU',cls:''},{label:'DO',value:'7.8 mg/L',cls:'highlight'}],ticker:'LIVE Thruster 3 nominal Video feed 1080p Coral canopy detected'},
    {id:'SMRG-014',name:'Bleaching Event Transect',status:'complete',date:'May 29, 2025',location:'Shallows East, Marker 7',progress:100,sensors:[{label:'Max Depth',value:'18 m',cls:''},{label:'Temp Delta',value:'+2.1 C',cls:'warn'},{label:'Duration',value:'3h 44m',cls:''},{label:'DO Avg',value:'7.2 mg/L',cls:''}]},
    {id:'SMRG-013',name:'Sediment Flow - Lagoon Mouth',status:'complete',date:'May 10, 2025',location:'Kettleford Lagoon Inlet',progress:100,sensors:[{label:'Max Depth',value:'9 m',cls:''},{label:'Turbidity',value:'22 NTU',cls:'warn'},{label:'Duration',value:'2h 20m',cls:''},{label:'Samples',value:'940',cls:''}]},
    {id:'SMRG-016',name:'Night Survey - Reef Flat',status:'planned',date:'Jun 28, 2025 (est.)',location:'Nightshore Reef Flat',progress:0,sensors:[{label:'Target Depth',value:'6 m',cls:''},{label:'Duration',value:'~2h',cls:''},{label:'Cameras',value:'Low-light',cls:''},{label:'Team',value:'5 members',cls:''}]},
  ];
  const DEFAULT_SENSOR_ROWS = [
    {ts:'2025-06-14 09:14:22',mission:'SMRG-015',depth:12,temp:26.4,sal:35.1,DO:7.8,turb:4.1,status:'nominal'},
    {ts:'2025-06-14 08:52:10',mission:'SMRG-015',depth:8,temp:27.0,sal:35.0,DO:7.5,turb:3.6,status:'nominal'},
    {ts:'2025-06-14 08:34:05',mission:'SMRG-015',depth:4,temp:28.2,sal:34.8,DO:8.1,turb:2.9,status:'nominal'},
    {ts:'2025-05-29 14:10:44',mission:'SMRG-014',depth:18,temp:28.5,sal:35.3,DO:7.2,turb:3.0,status:'archived'},
    {ts:'2025-05-29 11:22:33',mission:'SMRG-014',depth:12,temp:29.1,sal:35.2,DO:7.0,turb:3.4,status:'archived'},
    {ts:'2025-05-10 10:04:17',mission:'SMRG-013',depth:9,temp:27.6,sal:34.5,DO:6.9,turb:22.0,status:'flagged'},
  ];

  let missions=[], sensorRows=[], heroData={}, aboutData={}, activeFilter='all';

  function route(){
    const adminMode = window.location.search.includes('admin') || window.location.hash==='#admin';
    if(adminMode){
      document.body.classList.add('admin-mode');
      document.body.classList.remove('public-mode');
      document.getElementById('public-site').style.display='none';
      document.body.classList.add('admin-mode'); document.body.classList.remove('public-mode'); document.getElementById('admin-site').style.display='block';
    } else {
      document.body.classList.add('public-mode');
      document.body.classList.remove('admin-mode');
      document.getElementById('public-site').style.display='block';
      document.getElementById('admin-site').style.display='none';
      initPublic();
    }
  }

  function switchToPublic(){
    document.body.classList.add('public-mode');
    document.body.classList.remove('admin-mode');
    document.getElementById('admin-site').style.display='none';
    document.getElementById('public-site').style.display='block';
    loadPublicData();
  }

  // PUBLIC
  function initPublic(){
    const cursor=document.getElementById('cursor'),ring=document.getElementById('cursor-ring');
    let mx=0,my=0,rx=0,ry=0;
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});
    (function ac(){cursor.style.left=mx+'px';cursor.style.top=my+'px';rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(ac);})();
    let td=12,cd=0;
    const de=document.getElementById('depth-counter');
    function ad(){if(cd<td){cd=Math.min(cd+Math.ceil((td-cd)*.04)+1,td);if(de) de.textContent=cd;setTimeout(ad,16);}}
    setTimeout(ad,1000);
    setInterval(()=>{td=8+Math.round(Math.random()*10);ad();},5000);
    loadPublicData();
    setupMemberArea();
  }

  async function loadPublicData(){
    missions=JSON.parse(JSON.stringify(DEFAULT_MISSIONS));
    sensorRows=JSON.parse(JSON.stringify(DEFAULT_SENSOR_ROWS));
    try{const r=await window.storage.get('submergo:missions',true);if(r&&r.value)missions=JSON.parse(r.value);}catch(e){}
    try{const r=await window.storage.get('submergo:sensorRows',true);if(r&&r.value)sensorRows=JSON.parse(r.value);}catch(e){}
    try{
      const r=await window.storage.get('submergo:hero',true);
      if(r&&r.value){
        const h=JSON.parse(r.value);
        const t=document.getElementById('hero-title-el');
        if(h.line1&&t.childNodes[0]) t.childNodes[0].textContent=h.line1;
        if(h.line2) document.getElementById('hero-title-line2').textContent=h.line2;
        if(h.sub) document.getElementById('hero-sub-el').textContent=h.sub;
        if(h.label) document.getElementById('hero-label').textContent=h.label;
      }
    }catch(e){}
    try{
      const r=await window.storage.get('submergo:about',true);
      if(r&&r.value){
        const a=JSON.parse(r.value);
        if(a.heading) document.getElementById('about-heading').textContent=a.heading;
        if(a.p1) document.getElementById('about-p1').innerHTML=a.p1;
        if(a.p2) document.getElementById('about-p2').textContent=a.p2;
        if(a.p3) document.getElementById('about-p3').textContent=a.p3;
      }
    }catch(e){}
    document.getElementById('last-updated').textContent=new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    renderPublicMissions();
    renderSensorTable();
  }

  function filterMissions(f,btn){activeFilter=f;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderPublicMissions();}

  function renderPublicMissions(){
    const grid=document.getElementById('missions-grid');
    const filtered=activeFilter==='all'?missions:missions.filter(m=>m.status===activeFilter);
    if(!filtered.length){grid.innerHTML='<div style="padding:40px;color:var(--text-dim);">No missions found.</div>';return;}
    grid.innerHTML=filtered.map(m=>`
      <div class="mission-card ${m.status==='active'?'active-mission':''}">
        <div class="mission-header"><div class="mission-id">${m.id}</div><div class="mission-badge ${m.status==='active'?'badge-active':m.status==='complete'?'badge-complete':'badge-planned'}">${m.status}</div></div>
        <div class="mission-name">${m.name}</div>
        <div class="mission-date">${m.date}</div>
        <div class="sensor-grid">${m.sensors.map(s=>`<div class="sensor-item"><div class="sensor-label">${s.label}</div><div class="sensor-value ${s.cls}">${s.value}</div></div>`).join('')}</div>
        ${m.status!=='planned'?`<div class="mission-progress"><div class="progress-header"><span>Mission Progress</span><span>${m.progress}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${m.progress}%"></div></div></div>`:''}
        <div class="mission-location">${m.location}</div>
        ${m.ticker?`<div class="live-ticker"><div class="live-dot"></div><div class="ticker-text">${m.ticker}</div></div>`:''}
      </div>`).join('');
  }

  function renderSensorTable(){
    document.getElementById('data-table-body').innerHTML=sensorRows.map(r=>{
      const sc=r.status==='nominal'?'td-success':r.status==='flagged'?'td-warn':'';
      return `<tr><td>${r.ts}</td><td class="td-accent">${r.mission}</td><td>${r.depth}</td><td>${r.temp}</td><td>${r.sal}</td><td>${r.DO}</td><td class="${r.turb>10?'td-warn':''}">${r.turb}</td><td class="${sc}">${r.status}</td></tr>`;
    }).join('');
  }

  // ADMIN
  function tryLogin(){
    if(document.getElementById('pw-input').value===ADMIN_PASSWORD){
      document.getElementById('login-screen').style.display='none';
      document.getElementById('admin-shell').style.display='block';
      loadAdminData();
    } else {
      document.getElementById('login-error').style.display='block';
      document.getElementById('pw-input').value='';
      document.getElementById('pw-input').focus();
    }
  }
  function logout(){document.getElementById('login-screen').style.display='flex';document.getElementById('admin-shell').style.display='none';document.getElementById('pw-input').value='';document.getElementById('login-error').style.display='none';}

  const tabMeta={missions:['Missions','Manage mission cards on the public site'],hero:['Hero Section','Edit the headline and subtitle'],about:['About','Edit the team description'],sensordata:['Sensor Data','Edit the sensor readings table']};
  function showTab(n,el){document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.remove('active'));document.getElementById('tab-'+n).classList.add('active');el.classList.add('active');document.getElementById('topbar-title').textContent=tabMeta[n][0];document.getElementById('topbar-meta').textContent=tabMeta[n][1];}

  async function loadAdminData(){
    try{const r=await window.storage.get('submergo:missions',true);missions=r&&r.value?JSON.parse(r.value):JSON.parse(JSON.stringify(DEFAULT_MISSIONS));}catch(e){missions=JSON.parse(JSON.stringify(DEFAULT_MISSIONS));}
    try{const r=await window.storage.get('submergo:sensorRows',true);sensorRows=r&&r.value?JSON.parse(r.value):JSON.parse(JSON.stringify(DEFAULT_SENSOR_ROWS));}catch(e){sensorRows=JSON.parse(JSON.stringify(DEFAULT_SENSOR_ROWS));}
    try{const r=await window.storage.get('submergo:hero',true);heroData=r&&r.value?JSON.parse(r.value):{};}catch(e){heroData={};}
    try{const r=await window.storage.get('submergo:about',true);aboutData=r&&r.value?JSON.parse(r.value):{};}catch(e){aboutData={};}
    renderMissionList();renderSensorTableEditor();populateHeroForm();populateAboutForm();
  }

  async function publishAll(){
    heroData={label:document.getElementById('h-label').value,line1:document.getElementById('h-line1').value,line2:document.getElementById('h-line2').value,sub:document.getElementById('h-sub').value};
    aboutData={heading:document.getElementById('a-heading').value,p1:document.getElementById('a-p1').value,p2:document.getElementById('a-p2').value,p3:document.getElementById('a-p3').value};
    const btn=document.getElementById('publish-btn');btn.disabled=true;btn.textContent='Publishing...';
    try{
      await window.storage.set('submergo:missions',JSON.stringify(missions),true);
      await window.storage.set('submergo:sensorRows',JSON.stringify(sensorRows),true);
      await window.storage.set('submergo:hero',JSON.stringify(heroData),true);
      await window.storage.set('submergo:about',JSON.stringify(aboutData),true);
      showToast('Published! Click "View Public Site" to see changes');
    }catch(e){showToast('Publish failed: '+e.message,true);}
    btn.disabled=false;btn.innerHTML='<span>&#8593;</span> Publish Changes';
  }

  function showToast(msg,isError=false){const t=document.getElementById('toast');t.textContent=msg;t.className=isError?'error':'';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500);}

  function renderMissionList(){
    const list=document.getElementById('mission-list');
    if(!missions.length){list.innerHTML='<div style="color:var(--text-dim);font-size:.75rem;padding:16px 0;">No missions yet.</div>';return;}
    list.innerHTML=missions.map((m,i)=>`
      <div class="mission-row">
        <div class="mission-row-info"><div class="mission-row-id">${m.id} <span class="abadge abadge-${m.status}">${m.status}</span></div><div class="mission-row-name">${m.name}</div></div>
        <div class="mission-row-actions"><button class="icon-btn" onclick="openEditMission(${i})">Edit</button><button class="icon-btn danger" onclick="deleteMission(${i})">Delete</button></div>
      </div>`).join('');
  }

  let sic=0;
  function openAddMission(){document.getElementById('modal-title').textContent='Add Mission';document.getElementById('edit-index').value='-1';['m-id','m-name','m-date','m-location','m-ticker'].forEach(id=>document.getElementById(id).value='');document.getElementById('m-status').value='planned';document.getElementById('m-progress').value='0';document.getElementById('sensor-inputs').innerHTML='';sic=0;addSensorInput();addSensorInput();addSensorInput();addSensorInput();document.getElementById('modal-overlay').classList.add('open');}
  function openEditMission(i){const m=missions[i];document.getElementById('modal-title').textContent='Edit Mission';document.getElementById('edit-index').value=i;document.getElementById('m-id').value=m.id;document.getElementById('m-name').value=m.name;document.getElementById('m-status').value=m.status;document.getElementById('m-date').value=m.date;document.getElementById('m-location').value=m.location;document.getElementById('m-progress').value=m.progress;document.getElementById('m-ticker').value=m.ticker||'';document.getElementById('sensor-inputs').innerHTML='';sic=0;m.sensors.forEach(s=>addSensorInput(s.label,s.value,s.cls));while(sic<4)addSensorInput();document.getElementById('modal-overlay').classList.add('open');}
  function closeModal(){document.getElementById('modal-overlay').classList.remove('open');}
  function addSensorInput(label='',value='',cls=''){if(sic>=4)return;sic++;const d=document.createElement('div');d.className='sensor-editor-row';d.innerHTML=`<input class="form-input" placeholder="Label" value="${label}"/><input class="form-input" placeholder="Value" value="${value}"/><select class="form-select" style="width:110px;"><option value="" ${cls===''?'selected':''}>Normal</option><option value="highlight" ${cls==='highlight'?'selected':''}>Accent</option><option value="warn" ${cls==='warn'?'selected':''}>Warn</option></select>`;document.getElementById('sensor-inputs').appendChild(d);}
  function saveMission(){const idx=parseInt(document.getElementById('edit-index').value);const sensors=Array.from(document.querySelectorAll('#sensor-inputs .sensor-editor-row')).map(d=>{const inp=d.querySelectorAll('input,select');return{label:inp[0].value,value:inp[1].value,cls:inp[2].value};}).filter(s=>s.label&&s.value);const m={id:document.getElementById('m-id').value||'SMRG-???',name:document.getElementById('m-name').value||'Unnamed',status:document.getElementById('m-status').value,date:document.getElementById('m-date').value,location:document.getElementById('m-location').value,progress:parseInt(document.getElementById('m-progress').value)||0,ticker:document.getElementById('m-ticker').value,sensors};if(idx===-1)missions.push(m);else missions[idx]=m;renderMissionList();closeModal();showToast('Saved - click Publish to go live');}
  function deleteMission(i){const rows=document.querySelectorAll('#mission-list .mission-row');const row=rows[i];if(!row||row.querySelector('.confirm-ui'))return;const actions=row.querySelector('.mission-row-actions');actions.innerHTML=`<span style="font-size:.65rem;color:var(--text-dim);margin-right:4px;">Sure?</span><button class="icon-btn danger confirm-ui" onclick="confirmDelete(${i})">Yes, delete</button><button class="icon-btn" onclick="renderMissionList()">Cancel</button>`;}
  function confirmDelete(i){missions.splice(i,1);renderMissionList();showToast('Deleted - click Publish to go live');}

  function populateHeroForm(){document.getElementById('h-label').value=heroData.label||'Team Submerge - Est. 2024';document.getElementById('h-line1').value=heroData.line1||'READING';document.getElementById('h-line2').value=heroData.line2||'THE REEF';document.getElementById('h-sub').value=heroData.sub||"Coastal reef survey and environmental monitoring from the water's surface down.";}
  function populateAboutForm(){document.getElementById('a-heading').value=aboutData.heading||'Built for the reef';document.getElementById('a-p1').value=aboutData.p1||'Team Submerge is a student-led ROV research group focused on coastal reef monitoring.';document.getElementById('a-p2').value=aboutData.p2||'We deploy along coastal reef systems, collecting high-resolution sensor data.';document.getElementById('a-p3').value=aboutData.p3||'Our mission feed updates in real time as we deploy, surface, and process data.';}

  function renderSensorTableEditor(){document.getElementById('sensor-tbody').innerHTML=sensorRows.map((r,i)=>`<tr><td><input value="${r.ts}" oninput="sensorRows[${i}].ts=this.value"/></td><td><input value="${r.mission}" oninput="sensorRows[${i}].mission=this.value"/></td><td><input value="${r.depth}" type="number" oninput="sensorRows[${i}].depth=+this.value"/></td><td><input value="${r.temp}" type="number" step="0.1" oninput="sensorRows[${i}].temp=+this.value"/></td><td><input value="${r.sal}" type="number" step="0.1" oninput="sensorRows[${i}].sal=+this.value"/></td><td><input value="${r.DO}" type="number" step="0.1" oninput="sensorRows[${i}].DO=+this.value"/></td><td><input value="${r.turb}" type="number" step="0.1" oninput="sensorRows[${i}].turb=+this.value"/></td><td><select onchange="sensorRows[${i}].status=this.value"><option ${r.status==='nominal'?'selected':''}>nominal</option><option ${r.status==='archived'?'selected':''}>archived</option><option ${r.status==='flagged'?'selected':''}>flagged</option></select></td><td><button class="remove-btn" onclick="deleteSensorRow(${i})">x</button></td></tr>`).join('');}
  function addSensorRow(){const ts=new Date().toISOString().replace('T',' ').slice(0,19);sensorRows.unshift({ts,mission:'SMRG-???',depth:0,temp:0,sal:0,DO:0,turb:0,status:'nominal'});renderSensorTableEditor();showToast('Row added - fill in and Publish');}
  function deleteSensorRow(i){sensorRows.splice(i,1);renderSensorTableEditor();}

  function setupMemberArea(){
    const registerForm=document.getElementById('register-form');
    const loginForm=document.getElementById('member-login-form');
    const chatForm=document.getElementById('chat-form');
    if(registerForm) registerForm.addEventListener('submit',registerMember);
    if(loginForm) loginForm.addEventListener('submit',loginMember);
    if(chatForm) chatForm.addEventListener('submit',sendChatMessage);
    const logoutBtn=document.getElementById('member-logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click',logoutMember);
    document.querySelectorAll('[data-member-tab]').forEach(btn=>btn.addEventListener('click',()=>switchMemberTab(btn.dataset.memberTab)));
    document.body.classList.remove('member-logged-in');
    renderNews();
    renderChat();
  }
  function getMembers(){return JSON.parse(localStorage.getItem('submergo:members')||'[]');}
  function setMembers(members){localStorage.setItem('submergo:members',JSON.stringify(members));}
  function registerMember(e){
    e.preventDefault();
    const name=document.getElementById('reg-name').value.trim();
    const email=document.getElementById('reg-email').value.trim().toLowerCase();
    const password=document.getElementById('reg-password').value;
    const members=getMembers();
    if(members.some(m=>m.email===email)) return setMemberMsg('Account already exists for that email.', true);
    const member={name,email,password,createdAt:new Date().toISOString()};
    members.push(member); setMembers(members); localStorage.setItem('submergo:activeMember',JSON.stringify(member));
    setMemberMsg('Registration successful. Redirecting to your personal homepage.');
    window.location.href='member.html';
  }
  function loginMember(e){
    e.preventDefault();
    const email=document.getElementById('login-email').value.trim().toLowerCase();
    const password=document.getElementById('login-password').value;
    const member=getMembers().find(m=>m.email===email&&m.password===password);
    if(!member) return setMemberMsg('Invalid login credentials.', true);
    localStorage.setItem('submergo:activeMember',JSON.stringify(member));
    setMemberMsg('Login successful. Redirecting to your personal homepage.');
    window.location.href='member.html';
  }
  function logoutMember(){
    localStorage.removeItem('submergo:activeMember');
    window.location.href='index.html';
  }
  function setMemberMsg(msg,isError=false){const el=document.getElementById('member-auth-msg');if(!el)return;el.textContent=msg;el.style.color=isError?'var(--danger)':'var(--success)';}
  function renderNews(){
    const items=[
      'ROV firmware v2.4 deployed with improved low-light stabilization.',
      'Coral health survey expanded to Zone 5A this week.',
      'Live telemetry now includes dissolved oxygen variance alerts.'
    ];
    const list=document.getElementById('member-news-list'); if(!list)return;
    list.innerHTML=items.map(i=>`<li>${i}</li>`).join('');
  }
  function switchMemberTab(tab){
    document.querySelectorAll('[data-member-tab]').forEach(b=>b.classList.toggle('active',b.dataset.memberTab===tab));
    document.getElementById('member-tab-chat').classList.toggle('active',tab==='chat');
    document.getElementById('member-tab-rov').classList.toggle('active',tab==='rov');
  }
  function sendChatMessage(e){
    e.preventDefault();
    const input=document.getElementById('chat-input');
    const text=input.value.trim(); if(!text) return;
    const active=JSON.parse(localStorage.getItem('submergo:activeMember')||'null');
    const messages=JSON.parse(localStorage.getItem('submergo:chatMessages')||'[]');
    messages.push({user:active?active.name:'Guest',text,ts:new Date().toISOString()});
    localStorage.setItem('submergo:chatMessages',JSON.stringify(messages));
    input.value=''; renderChat();
  }
  function renderChat(){
    const shell=document.getElementById('chat-messages'); if(!shell) return;
    const messages=JSON.parse(localStorage.getItem('submergo:chatMessages')||'[]');
    shell.innerHTML=messages.slice(-30).map(m=>`<div class="chat-msg"><strong>${m.user}</strong>: ${m.text}</div>`).join('');
  }
  function initMemberPage(){
    if(!document.getElementById('member-home')) return;
    const active=JSON.parse(localStorage.getItem('submergo:activeMember')||'null');
    if(!active){window.location.href='index.html'; return;}
    document.getElementById('member-home-title').textContent=`Welcome, ${active.name}`;
    const logoutBtn=document.getElementById('member-logout-btn');
    if(logoutBtn) logoutBtn.addEventListener('click',logoutMember);
    const chatForm=document.getElementById('chat-form');
    if(chatForm) chatForm.addEventListener('submit',sendChatMessage);
    document.querySelectorAll('[data-member-tab]').forEach(btn=>btn.addEventListener('click',()=>switchMemberTab(btn.dataset.memberTab)));
    renderNews(); renderChat(); switchMemberTab('chat');
  }


  // EXTRA BUTTON FIXES: use real event listeners too, so clicks work even if inline onclick is ignored.
  function bindButtonFixes(){
    const adminNav = document.querySelector('a[href="?admin"]');
    if(adminNav){
      adminNav.addEventListener('click', function(e){
        e.preventDefault();
        history.replaceState(null, '', '#admin');
        document.getElementById('public-site').style.display='none';
        document.body.classList.add('admin-mode'); document.body.classList.remove('public-mode'); document.getElementById('admin-site').style.display='block';
        const pw = document.getElementById('pw-input');
        if(pw) setTimeout(()=>pw.focus(), 50);
      });
    }

    document.addEventListener('click', function(e){
      const el = e.target.closest('button, .sidebar-link, .view-site-btn, .logout-btn, .filter-btn');
      if(!el) return;
      if(el.classList.contains('filter-btn')){
        const txt = el.textContent.trim().toLowerCase();
        if(['all','active','complete','planned'].includes(txt)){ e.preventDefault(); filterMissions(txt, el); return; }
      }
      if(el.classList.contains('login-btn')){ e.preventDefault(); tryLogin(); return; }
      if(el.classList.contains('view-site-btn')){ e.preventDefault(); switchToPublic(); return; }
      if(el.classList.contains('logout-btn')){ e.preventDefault(); logout(); return; }
      if(el.id === 'publish-btn'){ e.preventDefault(); publishAll(); return; }
      if(el.classList.contains('sidebar-link')){
        const text = el.textContent.toLowerCase();
        if(text.includes('missions')) showTab('missions', el);
        else if(text.includes('hero')) showTab('hero', el);
        else if(text.includes('about')) showTab('about', el);
        else if(text.includes('sensor')) showTab('sensordata', el);
        return;
      }
      if(el.textContent.includes('+ Add Mission')){ e.preventDefault(); openAddMission(); return; }
      if(el.textContent.includes('+ Add Row')){ e.preventDefault(); addSensorRow(); return; }
      if(el.textContent.includes('+ Add Sensor Reading')){ e.preventDefault(); addSensorInput(); return; }
      if(el.textContent.trim() === 'Cancel'){ e.preventDefault(); closeModal(); return; }
      if(el.classList.contains('modal-close')){ e.preventDefault(); closeModal(); return; }
      if(el.classList.contains('save-mission-btn')){ e.preventDefault(); saveMission(); return; }
    });
  }
  bindButtonFixes();
  initMemberPage();
  route();
