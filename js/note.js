// note.js — Progress note form
window.Note = (function(){
  let _note={}, _patient=null, _noteId=null;
  const riskVals={suicide:'Ninguno',homicide:'Ninguno'};

  const CHECKS={
    appearance:['Apropiada','Bien arreglada','Descuidada','Inapropiada','Higiénica'],
    behavior:['Cooperador','Ansioso','Retraído','Resistente','Agitado','Hostil'],
    affect:['Eutímico','Deprimido','Ansioso','Lábil','Plano','Elevado','Irritable'],
    thought:['Lógico y coherente','Desorganizado','Ideas rumiativas','Pensamiento mágico','Alucinaciones reportadas','Delusiones reportadas'],
    orientation:['Orientado ×3','Insight adecuado','Juicio intacto','Memoria intacta','Concentración disminuida','Insight limitado'],
    technique:['TCC','ACT','DBT','EMDR','Psicodinámico','Mindfulness','Psicoeducación','Activación conductual','Narrativa','Terapia de juego','Gestalt','Sistémica','Exposición','E. motivacional'],
    progress:['Notable mejoría','Mejoría moderada','Sin cambios','Deterioro leve','Deterioro significativo','No aplica (1ra sesión)'],
    changes:['Sin cambios','Ajuste de frecuencia','Nuevo objetivo','Referido a psiquiatría','Referido a otro esp.','Alta clínica'],
  };
  const RISK_LEVELS=['Ninguno','Bajo','Moderado','Alto','Inminente'];
  const GAF_LABELS=[[91,'Funcionalidad excelente'],[81,'Síntomas mínimos'],[71,'Síntomas leves'],[61,'Dificultad leve-moderada'],[51,'Síntomas moderados'],[41,'Deterioro serio'],[31,'Deterioro marcado'],[1,'Riesgo severo']];

  function gafLabel(v){ for(const[min,lbl] of GAF_LABELS) if(v>=min) return lbl; return ''; }

  function checksHTML(name, type='checkbox'){
    return `<div class="check-grid">${CHECKS[name].map(v=>`
      <label class="ci" id="ci-${name}-${v.replace(/\s/g,'_')}">
        <input type="${type}" name="${name}" value="${v}"> ${v}
      </label>`).join('')}</div>`;
  }
  function riskBtns(type){
    return `<div class="risk-row" id="risk-${type}">${RISK_LEVELS.map(lv=>`
      <button type="button" class="rb rb-${lv.toLowerCase()}" onclick="Note.setRisk('${type}','${lv}')">${lv}</button>`).join('')}</div>`;
  }

  function render(patientId, noteId){
    _noteId = noteId||null;
    _patient = Patients.getById(patientId)||null;
    const today=new Date().toISOString().split('T')[0];
    const pt=_patient||{};
    return `
    <div class="note-topbar">
      <button class="btn-icon" onclick="App.navigate('patient',{id:'${patientId}'})"><i class="ti ti-arrow-left"></i></button>
      <div class="note-patient-info">
        <strong>${pt.name||'Paciente'}</strong>
        <span>${pt.record_num?'Exp: '+pt.record_num:''} ${pt.diagnosis?'· '+pt.diagnosis:''}</span>
      </div>
      <div class="note-actions">
        <button onclick="Note.saveDraft()"><i class="ti ti-device-floppy"></i> Guardar</button>
        <button class="btn-primary" onclick="Note.signNote()"><i class="ti ti-writing-sign"></i> Firmar</button>
      </div>
    </div>

    <div class="note-body">
      <!-- AI ASSISTANT TOGGLE -->
      <div class="ai-bar">
        <span class="ai-badge"><i class="ti ti-sparkles"></i> Asistente IA</span>
        <div class="ai-quick-btns">
          <button onclick="AI.fillField('mse_notes')">MSE narrativo</button>
          <button onclick="AI.fillField('session_topics')">Temas de sesión</button>
          <button onclick="AI.fillField('pt_response')">Respuesta paciente</button>
          <button onclick="AI.fillField('homework')">Tareas terapéuticas</button>
          <button onclick="AI.reviewNote()">Revisar nota</button>
        </div>
        <button class="btn-icon" onclick="AI.togglePanel()"><i class="ti ti-message"></i></button>
      </div>

      <!-- ① ENCUENTRO -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">1</span><span class="sec-title">Datos del Encuentro</span></div>
        <div class="note-clinician-bar">
          <div class="form-group">
            <label class="lbl">Clínico</label>
            <select id="n-clinician"><option value="">— Cargando —</option></select>
          </div>
          <div class="form-group">
            <label class="lbl">Tipo de sesión</label>
            <select id="n-type">
              <option value="">—</option>
              <option>Individual</option><option>Pareja</option><option>Familiar</option>
              <option>Grupal</option><option>Evaluación</option><option>Telehealth</option>
            </select>
          </div>
          <div class="form-group">
            <label class="lbl">Modalidad</label>
            <select id="n-modality">
              <option value="">—</option>
              <option>Presencial</option><option>Telehealth – Video</option><option>Telehealth – Teléfono</option>
            </select>
          </div>
        </div>
        <div class="form-row-4">
          <div class="form-group"><label class="lbl">Fecha *</label><input type="date" id="n-date" value="${today}"></div>
          <div class="form-group"><label class="lbl">Inicio</label><input type="time" id="n-start" oninput="Note.autoEndTime()"></div>
          <div class="form-group"><label class="lbl">Fin</label><input type="time" id="n-end" oninput="Note.calcDur()"></div>
          <div class="form-group"><label class="lbl">Duración (min)</label><input type="number" id="n-dur" readonly style="background:var(--bg2)"></div>
        </div>
      </div>

      <!-- ② PACIENTE -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">2</span><span class="sec-title">Datos del Paciente</span></div>
        <div class="form-section">
          <div class="form-group"><label class="lbl">Nombre</label><input id="n-ptname" value="${pt.name||''}" readonly style="background:var(--bg2)"></div>
          <div class="form-group"><label class="lbl">Núm. sesión</label><input type="number" id="n-sesnum" min="1" placeholder="1"></div>
          <div class="form-group"><label class="lbl">Seguro</label><input id="n-ins" value="${pt.insurance||''}"></div>
          <div class="form-group"><label class="lbl">Código CPT</label>
            <select id="n-cpt">
              <option value="">—</option>
              <option>90791 – Evaluación psiquiátrica</option>
              <option>90834 – Psicoterapia individual 45 min</option>
              <option>90837 – Psicoterapia individual 60 min</option>
              <option>90847 – Psicoterapia familiar</option>
              <option>90853 – Psicoterapia grupal</option>
              <option>96130 – Pruebas psicológicas 1ra hr</option>
            </select>
          </div>
          <div class="form-group span-2"><label class="lbl">Diagnóstico DSM-5</label><input id="n-diag" value="${pt.diagnosis||''}"></div>
        </div>
      </div>

      <!-- ③ MSE -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">3</span><span class="sec-title">Estado Mental (MSE)</span>
          <button class="sec-ai-btn" onclick="AI.fillField('mse_notes')">✦ IA</button></div>
        <div class="form-section">
          <div class="form-group">
            <label class="lbl">Apariencia general</label>${checksHTML('appearance')}
          </div>
          <div class="form-group">
            <label class="lbl">Actitud / Comportamiento</label>${checksHTML('behavior')}
          </div>
          <div class="form-group">
            <label class="lbl">Estado de ánimo (autoreportado)</label>
            <input id="n-mood" placeholder='"me siento ansioso y sin energía"'>
          </div>
          <div class="form-group">
            <label class="lbl">Afecto observado</label>${checksHTML('affect','radio')}
          </div>
          <div class="form-group">
            <label class="lbl">Pensamiento / Cognición</label>${checksHTML('thought')}
          </div>
          <div class="form-group">
            <label class="lbl">Orientación / Insight</label>${checksHTML('orientation')}
          </div>
          <div class="form-group span-2">
            <label class="lbl">Observaciones narrativas del MSE</label>
            <textarea id="n-mse-notes" placeholder="Descripción clínica del estado mental observado..."></textarea>
          </div>
        </div>
      </div>

      <!-- ④ GAF -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">4</span><span class="sec-title">Funcionalidad Global (GAF)</span></div>
        <div class="gaf-box">
          <div class="gaf-left">
            <div class="gaf-score" id="gaf-val">65</div>
            <div class="gaf-lbl" id="gaf-lbl">Síntomas moderados</div>
          </div>
          <div class="gaf-right">
            <div class="gaf-guide">91–100: Excelente&nbsp; 81–90: Mínimos&nbsp; 71–80: Leves<br>
            61–70: Leve-moderado&nbsp; 51–60: Moderados&nbsp; 41–50: Serio<br>
            31–40: Marcado&nbsp; 1–30: Severo</div>
          </div>
        </div>
        <input type="range" id="gaf-slider" min="1" max="100" value="65" oninput="Note.updateGAF(this.value)">
        <div class="gaf-marks"><span>1</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span></div>
      </div>

      <!-- ⑤ RIESGO -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">5</span><span class="sec-title">Evaluación de Riesgo</span></div>
        <div class="form-section">
          <div class="form-group">
            <label class="lbl">Riesgo suicida</label>${riskBtns('suicide')}
          </div>
          <div class="form-group">
            <label class="lbl">Riesgo homicida / violencia</label>${riskBtns('homicide')}
          </div>
          <div class="form-group span-2">
            <label class="lbl">Plan de seguridad / Acciones tomadas</label>
            <textarea id="n-safety" placeholder="Plan de seguridad, recursos contactados, notificaciones..."></textarea>
          </div>
        </div>
      </div>

      <!-- ⑥ SESIÓN -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">6</span><span class="sec-title">Contenido e Intervenciones</span>
          <button class="sec-ai-btn" onclick="AI.fillField('session_topics')">✦ IA</button></div>
        <div class="form-section">
          <div class="form-group span-2">
            <label class="lbl">Temas abordados</label>
            <textarea id="n-topics" placeholder="Temas principales trabajados en la sesión..."></textarea>
          </div>
          <div class="form-group span-2">
            <label class="lbl">Técnicas utilizadas</label>${checksHTML('technique')}
          </div>
          <div class="form-group span-2">
            <label class="lbl">Respuesta del paciente a las intervenciones</label>
            <textarea id="n-response" placeholder="Respuesta a las técnicas e intervenciones..."></textarea>
          </div>
        </div>
      </div>

      <!-- ⑦ PLAN -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">7</span><span class="sec-title">Progreso y Plan</span>
          <button class="sec-ai-btn" onclick="AI.fillField('homework')">✦ IA</button></div>
        <div class="form-section">
          <div class="form-group"><label class="lbl">Progreso hacia objetivos</label>${checksHTML('progress','radio')}</div>
          <div class="form-group"><label class="lbl">Cambios al plan</label>${checksHTML('changes')}</div>
          <div class="form-group span-2">
            <label class="lbl">Tareas / Asignaciones</label>
            <textarea id="n-homework" placeholder="Tareas entre sesiones..."></textarea>
          </div>
          <div class="form-group"><label class="lbl">Próxima cita</label><input type="date" id="n-next"></div>
          <div class="form-group"><label class="lbl">Frecuencia</label>
            <select id="n-freq">
              <option value="">—</option>
              <option>Semanal</option><option>Cada dos semanas</option>
              <option>Mensual</option><option>Según necesidad</option><option>Alta</option>
            </select>
          </div>
        </div>
      </div>

      <!-- ⑧ NOTAS -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">8</span><span class="sec-title">Notas Adicionales</span></div>
        <textarea id="n-extra" placeholder="Coordinaciones, aspectos legales, comunicaciones interprofesionales..."></textarea>
      </div>

      <!-- ⑨ FIRMA -->
      <div class="note-section">
        <div class="sec-head"><span class="sec-num">9</span><span class="sec-title">Certificación y Firma</span></div>
        <div class="sig-box">
          <div>
            <div class="sig-line" id="sig-name">—</div>
            <div class="sig-sub">Clínico · Credencial · Licencia</div>
          </div>
          <div>
            <div class="sig-line" id="sig-date">—</div>
            <div class="sig-sub">Fecha y hora de firma</div>
          </div>
        </div>
        <div class="cert-note">Certificación: La información es correcta y completa, en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.</div>
      </div>

    </div><!-- end note-body -->

    <!-- AI PANEL -->
    <div class="ai-panel closed" id="ai-panel">
      <div class="ai-panel-header">
        <span>Claude · Asistente Clínico</span>
        <button class="btn-icon" onclick="AI.togglePanel()"><i class="ti ti-x"></i></button>
      </div>
      <div class="ai-context" id="ai-ctx">Sin contexto</div>
      <div class="ai-msgs" id="ai-msgs"></div>
      <div class="ai-input-wrap">
        <textarea id="ai-input" placeholder="Escribe tu consulta o instrucción para Claude..." rows="2"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();AI.send()}"></textarea>
        <button class="btn-primary" onclick="AI.send()"><i class="ti ti-send"></i></button>
      </div>
    </div>`;
  }

  function updateGAF(v){
    document.getElementById('gaf-val').textContent=v;
    document.getElementById('gaf-lbl').textContent=gafLabel(parseInt(v));
  }

  function autoEndTime(){
    const s=document.getElementById('n-start').value;
    const e=document.getElementById('n-end');
    if(s && (!e.value || e.dataset.auto==='true')){
      const[h,m]=s.split(':').map(Number);
      const total=h*60+m+60;
      e.value=String(Math.floor(total/60)%24).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
      e.dataset.auto='true';
    }
    calcDur();
  }

  function calcDur(){
    const s=document.getElementById('n-start')?.value;
    const e=document.getElementById('n-end')?.value;
    if(s&&e){
      const[sh,sm]=s.split(':').map(Number),[eh,em]=e.split(':').map(Number);
      const d=(eh*60+em)-(sh*60+sm);
      const dur=document.getElementById('n-dur');
      if(dur) dur.value=d>0?d:'';
    }
  }

  function setRisk(type, val){
    document.querySelectorAll(`#risk-${type} .rb`).forEach(b=>b.classList.remove('active'));
    const btn=document.querySelector(`#risk-${type} .rb-${val.toLowerCase()}`);
    if(btn) btn.classList.add('active');
    riskVals[type]=val;
  }

  function collectData(){
    const g=id=>(document.getElementById(id)||{}).value||'';
    const getChecked=name=>[...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i=>i.value).join(', ');
    return {
      patient_id: _patient?.id,
      clinician_id: Auth.getUser()?.id,
      session_date: g('n-date'),
      session_type: g('n-type'), modality: g('n-modality'),
      time_start: g('n-start'), time_end: g('n-end'),
      duration_min: parseInt(g('n-dur'))||null,
      session_num: parseInt(g('n-sesnum'))||null,
      cpt_code: g('n-cpt'), diagnosis: g('n-diag'),
      mse_appearance: getChecked('appearance'), mse_behavior: getChecked('behavior'),
      mse_mood: g('n-mood'), mse_affect: getChecked('affect'),
      mse_thought: getChecked('thought'), mse_orientation: getChecked('orientation'),
      mse_notes: g('n-mse-notes'),
      gaf_score: parseInt(document.getElementById('gaf-slider')?.value)||65,
      risk_suicide: riskVals.suicide, risk_homicide: riskVals.homicide,
      safety_plan: g('n-safety'),
      session_topics: g('n-topics'), techniques: getChecked('technique'),
      pt_response: g('n-response'),
      progress: getChecked('progress'), plan_changes: getChecked('changes'),
      homework: g('n-homework'), next_appt: g('n-next')||null,
      frequency: g('n-freq'), extra_notes: g('n-extra'),
    };
  }

  async function saveDraft(){
    try{
      const data={...collectData(), status:'draft'};
      if(_noteId) data.id=_noteId;
      const saved=await DB.saveNote(data);
      _noteId=saved.id;
      App.toast('Borrador guardado');
    }catch(e){ App.toast('Error: '+e.message,'err'); }
  }

  async function signNote(){
    if(!g('n-date')){ App.toast('La fecha es requerida','err'); return; }
    App.confirm('¿Firmar electrónicamente esta nota de progreso?', async()=>{
      try{
        const cli=Auth.getClinician();
        const name=cli?`${cli.full_name}, ${cli.title} — Lic. ${cli.license_num}`:'';
        const data={...collectData(), status:'signed'};
        if(_noteId) data.id=_noteId;
        const saved=await DB.saveNote(data);
        await DB.signNote(saved.id, name);
        const now=new Date().toLocaleString('es-PR',{timeZone:'America/Puerto_Rico'});
        document.getElementById('sig-name').textContent=name||'Clínico';
        document.getElementById('sig-date').textContent=now;
        App.toast('Nota firmada');
      }catch(e){ App.toast('Error: '+e.message,'err'); }
    });
  }

  // helper for confirm (inline)
  function g(id){ return (document.getElementById(id)||{}).value||''; }

  async function loadClinicians(){
    try{
      const clis=await DB.getAllClinicians();
      const sel=document.getElementById('n-clinician');
      if(!sel) return;
      const myId=Auth.getUser()?.id;
      sel.innerHTML=clis.map(c=>`<option value="${c.id}"${c.id===myId?' selected':''}>${c.full_name}, ${c.title||''} — Lic. ${c.license_num||''}</option>`).join('');
    }catch(e){}
  }

  function initChecks(){
    document.querySelectorAll('.ci').forEach(el=>{
      el.querySelector('input')?.addEventListener('change',function(){
        if(this.type==='radio'){
          document.querySelectorAll(`input[name="${this.name}"]`).forEach(r=>{
            r.closest('.ci').classList.toggle('active',r.checked);
          });
        } else { el.classList.toggle('active',this.checked); }
        AI.updateContext();
      });
    });
  }

  return { render, updateGAF, autoEndTime, calcDur, setRisk, collectData, saveDraft, signNote, initChecks, loadClinicians };
})();
