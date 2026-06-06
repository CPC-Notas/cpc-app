// print.js — generates print view and Word export
window.Print = (function(){

  function buildPrintView(){
    const d=Note.collectData();
    const pt=Patients.getById(d.patient_id)||{};
    const getChecked=n=>[...document.querySelectorAll(`input[name="${n}"]:checked`)].map(i=>i.value).join(', ');
    const row=(lbl,val)=>val&&String(val).trim()?`<div class="pr-row"><span class="pr-lbl">${lbl}</span><span class="pr-val">${val}</span></div>`:'';
    const riskClass=v=>v==='Inminente'?'risk-imm':v==='Alto'?'risk-high':v==='Moderado'?'risk-mod':v==='Bajo'?'risk-low':'risk-none';

    return `
    <div class="pr-header">
      <img src="assets/logo.png" alt="Caribbean Psychology Wellness Center" class="pr-logo">
      <div class="pr-clinic">Caribbean Psychology Wellness Center<br>
        <small>San Juan, Puerto Rico · caribbeanpsychology.com</small></div>
      <div class="pr-doctype">NOTA DE PROGRESO CLÍNICO<br><small>Confidencial – HIPAA · Ley 408 PR</small></div>
    </div>

    <div class="pr-body">
      <div class="pr-cols">
        <div class="pr-col">
          <div class="pr-sec"><div class="pr-sec-title">1. Encuentro</div>
            ${row('Clínico',document.getElementById('n-clinician')?.options[document.getElementById('n-clinician')?.selectedIndex]?.text)}
            ${row('Tipo',d.session_type)} ${row('Modalidad',d.modality)} ${row('Fecha',d.session_date)}
            ${row('Hora',d.time_start&&d.time_end?d.time_start+' – '+d.time_end+(d.duration_min?' ('+d.duration_min+' min)':''):'')}
          </div>
          <div class="pr-sec"><div class="pr-sec-title">2. Paciente</div>
            ${row('Nombre',pt.name)} ${row('Género',pt.gender)} ${row('Pronombres',pt.pronouns)}
            ${row('Expediente',pt.record_num)} ${row('Seguro',d.insurance||pt.insurance)}
            ${row('CPT',d.cpt_code)} ${row('Diagnóstico',d.diagnosis)}
          </div>
          <div class="pr-sec"><div class="pr-sec-title">4. GAF</div>
            <div style="display:flex;align-items:baseline;gap:8pt">
              <span style="font-size:20pt;font-weight:bold;color:#1a2c4e">${d.gaf_score}</span>
              <span style="font-size:8pt;color:#1D9E75;font-weight:bold">${document.getElementById('gaf-lbl')?.textContent||''}</span>
            </div>
          </div>
          <div class="pr-sec"><div class="pr-sec-title">5. Riesgo</div>
            <div class="pr-row"><span class="pr-lbl">Riesgo suicida</span><span class="pr-val ${riskClass(d.risk_suicide)}">${d.risk_suicide}</span></div>
            <div class="pr-row"><span class="pr-lbl">Riesgo homicida</span><span class="pr-val ${riskClass(d.risk_homicide)}">${d.risk_homicide}</span></div>
            ${row('Plan seguridad',d.safety_plan)}
          </div>
          <div class="pr-sec"><div class="pr-sec-title">7. Progreso y Plan</div>
            ${row('Progreso',d.progress)} ${row('Cambios',d.plan_changes)}
            ${row('Tareas',d.homework)} ${row('Próxima cita',d.next_appt)} ${row('Frecuencia',d.frequency)}
          </div>
        </div>
        <div class="pr-col">
          <div class="pr-sec"><div class="pr-sec-title">3. Estado Mental (MSE)</div>
            ${row('Apariencia',d.mse_appearance)} ${row('Actitud',d.mse_behavior)}
            ${row('Estado de ánimo',d.mse_mood)} ${row('Afecto',d.mse_affect)}
            ${row('Pensamiento',d.mse_thought)} ${row('Orientación',d.mse_orientation)}
            ${row('Observaciones',d.mse_notes)}
          </div>
          <div class="pr-sec"><div class="pr-sec-title">6. Contenido e Intervenciones</div>
            ${row('Temas',d.session_topics)} ${row('Técnicas',d.techniques)}
            ${row('Respuesta del paciente',d.pt_response)}
          </div>
          ${d.extra_notes?`<div class="pr-sec"><div class="pr-sec-title">8. Notas Adicionales</div>${row('Notas',d.extra_notes)}</div>`:''}
        </div>
      </div>

      <div class="pr-sig">
        <div class="pr-sec-title">9. Certificación y Firma</div>
        <div class="pr-sig-row">
          <div><div class="pr-sig-line">${document.getElementById('sig-name')?.textContent||'—'}</div>
            <div class="pr-sig-sub">Clínico · Credencial · Licencia</div></div>
          <div><div class="pr-sig-line">${document.getElementById('sig-date')?.textContent||'—'}</div>
            <div class="pr-sig-sub">Fecha y hora de firma</div></div>
        </div>
        <div class="pr-cert">Certifica que la información es correcta y completa, documentada en cumplimiento con HIPAA y la Ley Núm. 408 de Puerto Rico.</div>
      </div>
    </div>
    <div class="pr-footer">Caribbean Psychology Wellness Center · Nota de Progreso Clínico · Confidencial HIPAA</div>`;
  }

  function print(){
    const view=document.getElementById('print-view');
    if(view) view.innerHTML=buildPrintView();
    window.print();
  }

  function exportWord(){
    const d=Note.collectData();
    const pt=Patients.getById(d.patient_id)||{};
    const gc=n=>[...document.querySelectorAll(`input[name="${n}"]:checked`)].map(i=>i.value).join(', ');
    const row=(lbl,val)=>(val&&String(val).trim())?`<tr><td style="font-weight:bold;background:#f0faf5;width:36%;padding:5pt 8pt;border:0.5px solid #ccc;font-size:10pt;color:#1a2c4e">${lbl}</td><td style="padding:5pt 8pt;border:0.5px solid #ccc;font-size:10pt">${val}</td></tr>`:'';

    const html=`<html><head><meta charset="UTF-8"><style>
body{font-family:Calibri,sans-serif;font-size:11pt;color:#1e2530;margin:2cm 2.5cm}
h2{font-size:11pt;color:#1D9E75;border-bottom:1.5px solid #1D9E75;padding-bottom:3pt;margin:14pt 0 6pt;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;margin-bottom:8pt}
.cert{background:#e1f5ee;border:1px solid #9FE1CB;padding:8pt 10pt;font-size:9.5pt;color:#0F6E56;margin-top:14pt}
.footer{text-align:center;font-size:8pt;color:#aaa;margin-top:20pt;border-top:0.5px solid #ccc;padding-top:6pt}
</style></head><body>
<div style="text-align:center;border:1.5px solid #1a2c4e;border-radius:4px;padding:10pt;margin-bottom:14pt">
<div style="font-size:14pt;font-weight:bold;color:#1a2c4e">Caribbean Psychology Wellness Center</div>
<div style="font-size:9pt;color:#666">San Juan, Puerto Rico · caribbeanpsychology.com</div>
<div style="font-size:12pt;font-weight:bold;color:#1D9E75;margin-top:6pt">NOTA DE PROGRESO CLINICO</div>
<div style="font-size:9pt;color:#666">Confidencial – HIPAA – Ley 408 PR</div></div>
<h2>1. Datos del Encuentro</h2><table>
${row('Clinico',document.getElementById('n-clinician')?.options[document.getElementById('n-clinician')?.selectedIndex]?.text)}
${row('Tipo de sesion',d.session_type)}${row('Modalidad',d.modality)}${row('Fecha',d.session_date)}
${row('Hora',d.time_start+' - '+d.time_end+(d.duration_min?' ('+d.duration_min+' min)':''))}
</table><h2>2. Datos del Paciente</h2><table>
${row('Nombre',pt.name)}${row('Genero',pt.gender)}${row('Pronombres',pt.pronouns)}
${row('Expediente',pt.record_num)}${row('Seguro',d.insurance)}${row('CPT',d.cpt_code)}${row('Diagnostico DSM-5',d.diagnosis)}
</table><h2>3. Estado Mental (MSE)</h2><table>
${row('Apariencia',d.mse_appearance)}${row('Actitud',d.mse_behavior)}${row('Estado de animo',d.mse_mood)}
${row('Afecto',d.mse_affect)}${row('Pensamiento',d.mse_thought)}${row('Orientacion',d.mse_orientation)}${row('Observaciones',d.mse_notes)}
</table><h2>4. GAF</h2><table>${row('Puntuacion GAF',d.gaf_score)}</table>
<h2>5. Evaluacion de Riesgo</h2><table>
${row('Riesgo suicida',d.risk_suicide)}${row('Riesgo homicida',d.risk_homicide)}${row('Plan de seguridad',d.safety_plan)}
</table><h2>6. Contenido e Intervenciones</h2><table>
${row('Temas abordados',d.session_topics)}${row('Tecnicas',gc('technique'))}${row('Respuesta del paciente',d.pt_response)}
</table><h2>7. Progreso y Plan</h2><table>
${row('Progreso',gc('progress'))}${row('Cambios al plan',gc('changes'))}
${row('Tareas',d.homework)}${row('Proxima cita',d.next_appt)}${row('Frecuencia',d.frequency)}
</table><h2>8. Notas Adicionales</h2><table>${row('Notas',d.extra_notes)}</table>
<h2>9. Firma</h2><table>
${row('Clinico firmante',document.getElementById('sig-name')?.textContent)}
${row('Fecha y hora de firma',document.getElementById('sig-date')?.textContent)}
</table><div class="cert">El clinico firmante certifica que la informacion es correcta y completa, en cumplimiento con HIPAA y la Ley 408 de Puerto Rico.</div>
<div class="footer">Caribbean Psychology Wellness Center · Nota de Progreso Clinico · Confidencial HIPAA</div>
</body></html>`;

    const patient=(pt.name||'Paciente').replace(/[^a-zA-Z0-9]/g,'_');
    const blob=new Blob(['\ufeff',html],{type:'application/msword'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`NotaProgreso_${patient}_${(d.session_date||'').replace(/-/g,'')}.doc`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    App.toast('Documento Word descargado');
  }

  return { print, exportWord };
})();
