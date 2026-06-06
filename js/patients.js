// patients.js — Patient list, create, edit UI
window.Patients = (function(){
  const MONTHS=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const GENDERS=['','Masculino','Femenino','No binario','Transgénero (FTM)','Transgénero (MTF)','Género fluido','Prefiere no indicar'];
  const PRONOUNS=['','él/le','ella/le','elle/le','they/them','Prefiere no indicar'];
  const INSURE=['','MCS','Triple S','Privado / Pago directo','Psicología Para Todos','Otro'];
  const DIAGS=['F32.1 – Ep. depresivo mayor, moderado','F32.9 – Ep. depresivo mayor, NE',
    'F41.0 – T. de pánico','F41.1 – T. ansiedad generalizada','F41.9 – T. ansiedad NE',
    'F43.10 – TEPT','F43.23 – T. adaptativo mixto','F90.0 – TDAH inatento',
    'F90.2 – TDAH combinado','F60.3 – T. limítrofe personalidad','F31.9 – T. bipolar NE'];

  let pts=[], editId=null, searchQ='';

  function age(dob){
    if(!dob) return null;
    return Math.floor((Date.now()-new Date(dob))/(1000*60*60*24*365.25));
  }
  function initials(name){
    return (name||'').split(' ').slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');
  }
  function gBadge(g){
    if(!g) return '';
    const cls=g==='Masculino'?'badge-info':g==='Femenino'?'badge-pink':'badge-purple';
    return `<span class="badge ${cls}">${g}</span>`;
  }
  function selOpts(arr, val){
    return arr.map(o=>`<option value="${o}"${val===o?' selected':''}>${o||'— Seleccionar —'}</option>`).join('');
  }
  function dayOpts(v){ let o='<option value="">Día</option>'; for(let i=1;i<=31;i++){const s=String(i).padStart(2,'0');o+=`<option value="${s}"${v===s?' selected':''}>${i}</option>`;}return o; }
  function monOpts(v){ return '<option value="">Mes</option>'+MONTHS.map((m,i)=>{const s=String(i+1).padStart(2,'0');return`<option value="${s}"${v===s?' selected':''}>${m}</option>`;}).join(''); }
  function yrOpts(v){ let o='<option value="">Año</option>',cy=new Date().getFullYear();for(let y=cy;y>=1920;y--)o+=`<option value="${y}"${String(v)===String(y)?' selected':''}>${y}</option>`;return o; }

  async function load(){
    try{ pts = await DB.getPatients(searchQ); }catch(e){ App.toast('Error cargando pacientes','err'); }
  }

  function renderList(){
    const filtered=pts;
    return `
    <div class="page-header">
      <div>
        <h1>Pacientes</h1>
        <p class="subtitle">${pts.length} paciente${pts.length!==1?'s':''} registrado${pts.length!==1?'s':''}</p>
      </div>
      <button class="btn-primary" onclick="Patients.openForm(null)">
        <i class="ti ti-plus"></i> Nuevo paciente
      </button>
    </div>
    <div class="search-bar">
      <i class="ti ti-search"></i>
      <input id="pt-search" placeholder="Buscar por nombre, expediente, diagnóstico..."
        value="${searchQ}" oninput="Patients.onSearch(this.value)">
    </div>
    ${filtered.length===0 ? `
      <div class="empty-state">
        <i class="ti ti-users"></i>
        <p>${searchQ?`Sin resultados para "${searchQ}"`:'Aún no hay pacientes. Crea el primero.'}</p>
        ${!searchQ?`<button class="btn-primary" onclick="Patients.openForm(null)">Crear paciente</button>`:''}
      </div>` : `
      <div class="card p-0">
        ${filtered.map(p=>{
          const a=age(p.dob);
          return `
          <div class="list-row" onclick="App.navigate('patient',{id:'${p.id}'})">
            <div class="avatar">${initials(p.name)}</div>
            <div class="list-row-body">
              <div class="list-row-name">${p.name} ${gBadge(p.gender)}</div>
              <div class="list-row-meta">
                ${p.record_num?`<span><i class="ti ti-folder"></i>${p.record_num}</span>`:''}
                ${a!==null?`<span><i class="ti ti-cake"></i>${a} años</span>`:''}
                ${p.insurance?`<span><i class="ti ti-building-hospital"></i>${p.insurance}</span>`:''}
                ${p.diagnosis?`<span class="clip"><i class="ti ti-stethoscope"></i>${p.diagnosis}</span>`:''}
              </div>
            </div>
            <div class="list-row-actions" onclick="event.stopPropagation()">
              <button class="btn-icon" onclick="Patients.copyData('${p.id}')" title="Copiar datos"><i class="ti ti-copy"></i></button>
              <button class="btn-icon" onclick="Patients.openForm('${p.id}')" title="Editar"><i class="ti ti-edit"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>`}`;
  }

  function renderForm(){
    const p = editId ? (pts.find(x=>x.id===editId)||{}) : {};
    const isEdit=!!editId;
    const dob=(p.dob||'').split('-');
    const dy=dob[0]||'',dm=String(parseInt(dob[1]||'')||'').padStart(2,'0')||'',dd=dob[2]||'';
    return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn-icon" onclick="App.navigate('patients')"><i class="ti ti-arrow-left"></i></button>
        <h1>${isEdit?'Editar paciente':'Nuevo paciente'}</h1>
      </div>
      ${isEdit?`<button class="btn-danger-outline" onclick="Patients.confirmDelete('${editId}')"><i class="ti ti-trash"></i> Eliminar</button>`:''}
    </div>
    <div class="card">
      <div class="form-section">
        <div class="form-group span-2">
          <label class="lbl">Nombre completo *</label>
          <input id="pf-name" value="${(p.name||'').replace(/"/g,'&quot;')}" placeholder="Apellido, Nombre">
        </div>
        <div class="form-group">
          <label class="lbl">Género</label>
          <select id="pf-gender">${selOpts(GENDERS,p.gender||'')}</select>
        </div>
        <div class="form-group">
          <label class="lbl">Pronombres</label>
          <select id="pf-pronouns">${selOpts(PRONOUNS,p.pronouns||'')}</select>
        </div>
        <div class="form-group span-2">
          <label class="lbl">Fecha de nacimiento</label>
          <div class="dob-row">
            <select id="pf-dob-d">${dayOpts(dd)}</select>
            <select id="pf-dob-m">${monOpts(dm)}</select>
            <select id="pf-dob-y">${yrOpts(dy)}</select>
          </div>
        </div>
        <div class="form-group">
          <label class="lbl">Núm. expediente</label>
          <input id="pf-rec" value="${(p.record_num||'').replace(/"/g,'&quot;')}" placeholder="EXP-0000">
        </div>
        <div class="form-group">
          <label class="lbl">Seguro / Plan</label>
          <select id="pf-ins">${selOpts(INSURE,p.insurance||'')}</select>
        </div>
        <div class="form-group span-2">
          <label class="lbl">Diagnóstico DSM-5 principal</label>
          <input id="pf-diag" value="${(p.diagnosis||'').replace(/"/g,'&quot;')}" placeholder="Ej. F41.1 – T. ansiedad generalizada" list="diag-list">
          <datalist id="diag-list">${DIAGS.map(d=>`<option value="${d}">`).join('')}</datalist>
        </div>
        <div class="form-group">
          <label class="lbl">Teléfono</label>
          <input id="pf-phone" value="${(p.phone||'').replace(/"/g,'&quot;')}" placeholder="(787) 000-0000">
        </div>
        <div class="form-group">
          <label class="lbl">Email</label>
          <input id="pf-email" value="${(p.email||'').replace(/"/g,'&quot;')}" placeholder="correo@ejemplo.com">
        </div>
        <div class="form-group span-2">
          <label class="lbl">Notas adicionales</label>
          <textarea id="pf-notes">${p.notes||''}</textarea>
        </div>
      </div>
      <div class="form-actions">
        <button onclick="App.navigate('patients')">Cancelar</button>
        <button class="btn-primary" onclick="Patients.save()">
          <i class="ti ti-device-floppy"></i> ${isEdit?'Guardar cambios':'Guardar paciente'}
        </button>
      </div>
    </div>`;
  }

  async function onSearch(q){
    searchQ=q;
    try{ pts=await DB.searchPatients(q)||await DB.getPatients(q); } catch(e){}
    const el=document.getElementById('patients-list');
    if(el) el.innerHTML=renderList();
  }

  function openForm(id){ editId=id; App.navigate('patient-form'); }

  async function save(){
    const g=id=>(document.getElementById(id)||{}).value||'';
    const name=g('pf-name').trim();
    if(!name){ App.toast('El nombre es requerido','err'); return; }
    const d=g('pf-dob-d'),m=g('pf-dob-m'),y=g('pf-dob-y');
    const dob=(y&&m&&d)?`${y}-${m}-${d}`:null;
    const payload={
      name, dob, gender:g('pf-gender'), pronouns:g('pf-pronouns'),
      record_num:g('pf-rec'), insurance:g('pf-ins'), diagnosis:g('pf-diag'),
      clinician_id: Auth.getUser()?.id,
      phone:g('pf-phone'), email:g('pf-email'), notes:g('pf-notes'),
    };
    if(editId) payload.id=editId;
    try{
      await DB.savePatient(payload);
      App.toast(editId?'Paciente actualizado':'Paciente guardado');
      await load();
      App.navigate('patients');
    }catch(e){ App.toast('Error: '+e.message,'err'); }
  }

  function confirmDelete(id){
    const p=pts.find(x=>x.id===id);
    App.confirm(`¿Eliminar a ${p?.name}? Esta acción no se puede deshacer.`, async()=>{
      try{ await DB.deletePatient(id); App.toast('Paciente eliminado'); await load(); App.navigate('patients'); }
      catch(e){ App.toast('Error: '+e.message,'err'); }
    });
  }

  function copyData(id){
    const p=pts.find(x=>x.id===id); if(!p) return;
    const a=age(p.dob);
    const lines=['Nombre: '+p.name];
    if(p.gender) lines.push('Género: '+p.gender);
    if(p.pronouns) lines.push('Pronombres: '+p.pronouns);
    if(p.dob) lines.push('F. Nacimiento: '+p.dob+(a?' ('+a+' años)':''));
    if(p.record_num) lines.push('Expediente: '+p.record_num);
    if(p.insurance) lines.push('Seguro: '+p.insurance);
    if(p.diagnosis) lines.push('Diagnóstico: '+p.diagnosis);
    if(p.phone) lines.push('Teléfono: '+p.phone);
    navigator.clipboard.writeText(lines.join('\n')).then(()=>App.toast('Datos copiados'));
  }

  return { load, renderList, renderForm, openForm, save, confirmDelete, copyData, onSearch,
    getAll:()=>pts, getById:(id)=>pts.find(p=>p.id===id) };
})();
