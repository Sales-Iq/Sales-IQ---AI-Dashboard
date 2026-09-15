import { requireAuth, initAppShell, fetchAll, $, toast, setBusy } from '../../js/shared.js';
import { getGeminiKey, setGeminiKey, hasGeminiKey, GEMINI_MODEL, GEMINI_FALLBACK_MODELS, GEMINI_PROXY_URL } from '../../js/firebase-config.js';
const { profile } = await requireAuth(['Admin']); initAppShell('admin','ai-insights',profile);
const examples=['Which product should I restock first?','Why are sales low this week?','Which category is performing best?','How can I increase profit?','Which product is slow-moving?'];
$('#exampleQuestions').innerHTML=examples.map(q=>`<button class="btn btn-ghost w-full justify-start" data-question="${q}">${q}</button>`).join('');
document.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>{$('#aiQuestion').value=b.dataset.question});

// --- API key UI (key lives only in this browser's localStorage, never in git) ---
function renderKeyStatus(){
  const ok = hasGeminiKey() || GEMINI_PROXY_URL.length > 0;
  const badge = $('#geminiKeyStatus');
  if (badge) badge.innerHTML = ok
    ? '<span class="badge badge-ok">Ready</span>'
    : '<span class="badge badge-danger">No key</span>';
  const input = $('#geminiKeyInput');
  if (input && !input.value && hasGeminiKey()) input.value = getGeminiKey();
}
$('#saveGeminiKeyBtn')?.addEventListener('click', () => {
  const v = $('#geminiKeyInput')?.value || '';
  if (!v.trim()) { toast('Paste a Gemini API key first.', 'err'); return; }
  setGeminiKey(v);
  if ($('#geminiKeyInput')) $('#geminiKeyInput').value = getGeminiKey();
  renderKeyStatus();
  toast('Gemini key saved in this browser only.');
});
$('#clearGeminiKeyBtn')?.addEventListener('click', () => {
  setGeminiKey('');
  if ($('#geminiKeyInput')) $('#geminiKeyInput').value = '';
  renderKeyStatus();
  toast('Gemini key removed from this browser.');
});
renderKeyStatus();

async function buildContext(){ const [products,sales,customers]=await Promise.all([fetchAll('products'),fetchAll('sales'),fetchAll('customers')]); return JSON.stringify({products:products.slice(0,50),sales:sales.slice(0,80),customers:customers.slice(0,30)},null,2); }
async function askGemini(question, btn){
  setBusy(btn,true,'Thinking...');
  $('#aiAnswer').textContent='Analyzing your Firestore data...';
  try{
    const context=await buildContext();
    const prompt=`You are an AI business analyst for SalesIQ. Use only the provided JSON data. If data is empty, say what data is needed. Provide concise practical advice.\n\nDATA:\n${context}\n\nQUESTION:\n${question}`;
    const body=JSON.stringify({contents:[{parts:[{text:prompt}]}]});
    let res;
    if (GEMINI_PROXY_URL) {
      // Preferred: backend holds the secret, browser never sees a key.
      res = await fetch(GEMINI_PROXY_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:GEMINI_MODEL,prompt})});
    } else {
      // Fallback: use textbox value if user pasted but forgot to click Save.
      let key = getGeminiKey();
      if (!key) {
        key = ($('#geminiKeyInput')?.value || '').trim();
        if (key) { setGeminiKey(key); renderKeyStatus(); }
      }
      if(!key) throw new Error('No Gemini API key saved. Paste your key above (stored only in this browser), or configure GEMINI_PROXY_URL for production.');
      const models = [GEMINI_MODEL, ...((GEMINI_FALLBACK_MODELS || []).filter(m => m !== GEMINI_MODEL))];
      let lastErr = null;
      for (const model of models) {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body});
        const data = await res.json().catch(() => ({}));
        if (res.ok) { res = { ok: true, json: async () => data }; break; }
        lastErr = new Error(data.error?.message || `Gemini request failed (${model})`);
        // Only try next model on 404 / not-found / not-supported. Otherwise fail fast (bad key, quota, etc).
        if (!/not found|not supported|404/i.test(lastErr.message)) throw lastErr;
        res = null;
      }
      if (!res) throw lastErr || new Error('No supported Gemini model found');
    }
    const data=await res.json(); if(!res.ok) throw new Error(data.error?.message || 'Gemini request failed');
    $('#aiAnswer').textContent=data.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer returned.';
  }catch(err){ $('#aiAnswer').textContent=`AI error: ${err.message}\n\nGet a free key at Google AI Studio, restrict it (HTTP referrers / API: Generative Language), and save it above. For hosting, use a backend proxy instead of a browser key.`; toast(err.message,'err'); } finally{setBusy(btn,false);}
}
$('#askAiBtn').onclick=e=>askGemini($('#aiQuestion').value.trim() || 'Give me a business summary.', e.currentTarget);
document.querySelectorAll('[data-ai-question]').forEach(b=>b.onclick=()=>{const type=b.dataset.aiQuestion; const q= type==='summary'?'Give AI sales summary, inventory suggestions, slow-moving product analysis and customer trend explanation.': type==='restock'?'Which products should I restock first and why?':'Give profit improvement tips based on price, cost and sales.'; $('#aiQuestion').value=q; askGemini(q,b);});
