// ai.js — Claude AI assistant
window.AI = (function(){
  let history=[], panelOpen=false, targetFieldId=null;

  const FIELD_LABELS={
    mse_notes:'Observaciones del estado mental',
    session_topics:'Temas abordados en sesión',
    pt_response:'Respuesta del paciente',
    homework:'Tareas terapéuticas',
    safety_plan:'Plan de seguridad',
    extra_notes:'Notas adicionales',
  };
  const FIELD_MAP={
    mse_notes:'n-mse-notes', session_topics:'n-topics',
    pt_response:'n-response', homework:'n-homework',
    safety_plan:'n-safety', extra_notes:'n-extra',
  };

  function getApiKey(){ return localStorage.getItem('cpc_anthropic_key')||''; }

  function buildSystem(){
    const d=Note.collectData();
    const pt=Patients.getById(d.patient_id)||{};
    let age=null;
    if(pt.dob){ age=Math.floor((Date.now()-new Date(pt.dob))/(1000*60*60*24*365.25)); }
    const pronRef=pt.pronouns==='él/le'||pt.gender==='Masculino'?'el paciente':
      pt.pronouns==='ella/le'||pt.gender==='Femenino'?'la paciente':'le paciente';

    return `Eres un asistente clínico experto integrado en el sistema de notas de Caribbean Psychology Wellness Center, San Juan, Puerto Rico. Ayudas a psicólogos licenciados a redactar notas de progreso clínico con lenguaje profesional, preciso y conforme a APA, HIPAA y la Ley 408 de Puerto Rico.

REGLAS:
1. Responde SIEMPRE en español clínico formal.
2. Cuando generes texto para un campo específico, termina con [CAMPO:field_id] donde field_id es el identificador del campo.
3. Texto conciso (2-5 oraciones), tercera persona, sin encabezados extra.
4. Usa pronombres correctos: usa "${pronRef}".
5. Personaliza basándote en los datos del formulario. No inventes datos.

DATOS DEL PACIENTE:
- Nombre: ${pt.name||d.diagnosis||'No especificado'}
- Género: ${pt.gender||'No especificado'}
- Pronombres: ${pt.pronouns||'No especificados'}
- Edad: ${age?age+' años':'No especificada'}
- Diagnóstico: ${pt.diagnosis||d.diagnosis||'No especificado'}
- Notas del expediente: ${pt.notes||'Ninguna'}

CONTEXTO DEL FORMULARIO:
- Tipo sesión: ${d.session_type||'No especificado'}
- GAF: ${d.gaf_score} (${document.getElementById('gaf-lbl')?.textContent||''})
- Apariencia: ${d.mse_appearance||'—'} | Actitud: ${d.mse_behavior||'—'}
- Estado ánimo: ${d.mse_mood||'—'} | Afecto: ${d.mse_affect||'—'}
- Pensamiento: ${d.mse_thought||'—'} | Orientación: ${d.mse_orientation||'—'}
- Riesgo suicida: ${d.risk_suicide} | Riesgo homicida: ${d.risk_homicide}
- Técnicas: ${d.techniques||'—'}
- Temas: ${d.session_topics||'—'}
- Progreso: ${d.progress||'—'}`;
  }

  async function send(){
    const key=getApiKey();
    const input=document.getElementById('ai-input');
    const msg=(input?.value||'').trim();
    if(!msg) return;
    input.value='';

    if(!key){ showKeyPrompt(); return; }

    appendMsg(msg,'user');
    const loadId=appendMsg('','ai',true);
    const btn=document.querySelector('.ai-input-wrap button');
    if(btn) btn.disabled=true;

    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':key,
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true'
        },
        body:JSON.stringify({
          model:'claude-sonnet-4-5',
          max_tokens:1000,
          system:buildSystem(),
          messages:[...history,{role:'user',content:msg}]
        })
      });
      if(!resp.ok){
        const err=await resp.json().catch(()=>({}));
        if(resp.status===401){ localStorage.removeItem('cpc_anthropic_key'); showKeyPrompt(); return; }
        throw new Error(err?.error?.message||'Error '+resp.status);
      }
      const data=await resp.json();
      const text=data.content?.[0]?.text||'Sin respuesta.';
      history.push({role:'user',content:msg},{role:'assistant',content:text});
      if(history.length>20) history.splice(0,2);
      renderAIResponse(loadId, text);
    }catch(e){
      updateMsg(loadId,'⚠ '+e.message);
    }
    if(btn) btn.disabled=false;
  }

  function renderAIResponse(loadId, text){
    const fieldTagRe=/\[CAMPO:([a-z_]+)\]/gi;
    const match=fieldTagRe.exec(text);
    const clean=text.replace(/\[CAMPO:[a-z_]+\]/gi,'').trim();
    if(match){
      const fid=match[1];
      const lbl=FIELD_LABELS[fid]||fid;
      const html=formatText(clean)+`<button class="apply-btn" onclick="AI.applyToField('${fid}',this)">✅ Insertar en "${lbl}"</button>`;
      updateMsg(loadId,html,true);
    } else {
      updateMsg(loadId,formatText(clean),true);
    }
  }

  function applyToField(fieldId, btn){
    const htmlId=FIELD_MAP[fieldId]||fieldId;
    const el=document.getElementById(htmlId); if(!el) return;
    const bubble=btn.closest('.ai-msg-bubble').cloneNode(true);
    bubble.querySelectorAll('button').forEach(b=>b.remove());
    el.value=bubble.innerText.trim();
    el.style.borderColor='var(--teal)';
    setTimeout(()=>el.style.borderColor='',1800);
    btn.textContent='✔ Insertado'; btn.disabled=true;
    el.scrollIntoView({behavior:'smooth',block:'center'});
  }

  function fillField(fieldId){
    if(!panelOpen) togglePanel();
    const lbl=FIELD_LABELS[fieldId]||fieldId;
    const cur=(document.getElementById(FIELD_MAP[fieldId]||fieldId)||{}).value||'';
    const hint=cur?`\n\nTexto actual: "${cur}"\n\nMejora o reemplaza.`:'';
    const q=`Redacta el texto para el campo "${lbl}" basándote en el contexto del formulario.${hint}\n\n[CAMPO:${fieldId}]`;
    const inp=document.getElementById('ai-input');
    if(inp){ inp.value=q; send(); }
  }

  function reviewNote(){
    if(!panelOpen) togglePanel();
    const d=Note.collectData();
    const filled=Object.entries({
      'Temas':d.session_topics,'Respuesta':d.pt_response,
      'MSE':d.mse_notes,'Tareas':d.homework,'Plan seguridad':d.safety_plan
    }).filter(([,v])=>v).map(([k,v])=>`${k}: "${v}"`).join('\n');
    const q=filled
      ?`Revisa estos campos de la nota y sugiere mejoras:\n\n${filled}`
      :'La nota no tiene texto en los campos. Sugiere qué documentar según el diagnóstico y contexto.';
    const inp=document.getElementById('ai-input');
    if(inp){ inp.value=q; send(); }
  }

  function resetChat(){
    history=[];
    const msgs=document.getElementById('ai-msgs');
    if(msgs){
      msgs.innerHTML='';
      appendMsg('Chat reiniciado. Historial borrado para proteger la confidencialidad del paciente.','ai');
    }
    targetFieldId=null;
  }

  function togglePanel(){
    panelOpen=!panelOpen;
    const panel=document.getElementById('ai-panel');
    if(panel) panel.classList.toggle('closed',!panelOpen);
    if(panelOpen && document.getElementById('ai-msgs')?.children.length===0){
      appendMsg('Hola. Puedo ayudarte a redactar campos de la nota con lenguaje clínico. Usa los botones rápidos o escríbeme.','ai');
    }
    updateContext();
  }

  function updateContext(){
    const d=Note?.collectData?.();
    const el=document.getElementById('ai-ctx');
    if(!el||!d) return;
    const parts=[];
    const pt=Patients.getById(d.patient_id);
    if(pt?.name) parts.push(pt.name);
    if(pt?.gender) parts.push(pt.gender);
    if(d.diagnosis||pt?.diagnosis) parts.push(d.diagnosis||pt?.diagnosis);
    if(d.gaf_score) parts.push('GAF: '+d.gaf_score);
    el.textContent=parts.join(' · ')||'Sin datos ingresados';
  }

  function appendMsg(text, role, loading){
    const msgs=document.getElementById('ai-msgs'); if(!msgs) return null;
    const id='msg-'+Date.now()+Math.random().toString(36).slice(2,6);
    const div=document.createElement('div');
    div.className='ai-msg ai-msg-'+role; div.id=id;
    div.innerHTML=`<div class="ai-msg-bubble${loading?' loading':''}">${loading?'<span class="dots"><span></span><span></span><span></span></span>':formatText(text)}</div>`;
    msgs.appendChild(div);
    msgs.scrollTop=99999;
    return id;
  }

  function updateMsg(id, html, isHtml){
    const el=document.getElementById(id); if(!el) return;
    const b=el.querySelector('.ai-msg-bubble');
    b.classList.remove('loading');
    if(isHtml) b.innerHTML=html; else b.innerHTML=formatText(html);
    document.getElementById('ai-msgs').scrollTop=99999;
  }

  function formatText(t){
    return (t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  }

  function showKeyPrompt(){
    App.showModal('keyModal');
  }

  return { send, fillField, reviewNote, togglePanel, applyToField, updateContext, resetChat, getApiKey };
})();
