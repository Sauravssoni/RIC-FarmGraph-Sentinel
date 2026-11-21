/* RIC Oracle Voice v0.1: opt-in, same-origin Oracle ASR, human-confirmed native action. */
(() => {
  "use strict";
  if (window.__RIC_ORACLE_VOICE_LOADED__) return;
  window.__RIC_ORACLE_VOICE_LOADED__ = true;
  const script = document.currentScript || document.querySelector("script[data-ric-project]");
  const project = (script && script.getAttribute("data-ric-project")) || "";
  const endpoint = "/_ric-voice";
  const uri = verb => endpoint + "/" + verb + (project === "farmgraph" || project === "agrisetu" ? "/" : "");
  const config = {
    urvara: [
      ["Run fertilizer jury mission", ["demo","jury","mission","डेमो","प्रदर्शन","शुरू"], "#jury", "", ""],
      ["Analyze fertilizer demand", ["demand","forecast","requirement","मांग","पूर्वानुमान"], '[data-page="demand"]', "", ""],
      ["Review fertilizer formulation", ["fertilizer","nutrient","formulation","खाद","उर्वरक","पोषक"], '[data-page="formulation"]', "", ""],
      ["Review stock and distribution", ["stock","supply","distribution","गोदाम","वितरण"], '[data-page="supply"]', "", ""],
      ["Review traceability", ["trace","quality","batch","tracking","गुणवत्ता","ट्रैकिंग"], '[data-page="trace"]', "", ""]
    ],
    rajhaq: [
      ["Run scheme-guidance demonstration",["demo","guide","डेमो","मार्गदर्शन"],"#guide","",""],
      ["Open citizen scheme guidance",["scheme","eligibility","citizen","योजना","पात्रता","नागरिक"],'[data-page="citizen"]',"",""],
      ["Open evidence controls",["evidence","document","proof","दस्तावेज","सबूत"],'[data-page="evidence"]',"",""]
    ],
    shwas: [
      ["Open clinical screening demonstration",["demo","judge","screen","डेमो","जांच"],"","", "Judge Mode"],
      ["Open triage workbench",["triage","risk","screening","जोखिम","जांच"],"",'',"Screening"],
      ["Open referrals",["referral","hospital","board","रेफरल","अस्पताल"],"","", "Referral"]
    ],
    dhool: [
      ["Analyze mine dust",["dust","intelligence","prediction","धूल","प्रदूषण"],'[data-view="intelligence"]',"",""],
      ["Review exposure",["exposure","workers","संपर्क","मजदूर"],'[data-view="exposure"]',"",""],
      ["Review corrective actions",["action","closure","control","कार्रवाई","नियंत्रण"],'[data-view="operations"]',"",""]
    ],
    sakhi: [
      ["Find suitable women's work",["women","work","job","employment","महिला","नौकरी","काम"],"","","Women Discovery"],
      ["Review employer safety",["safety","employer","trust","सुरक्षा","नियोक्ता"],"","","Trust & Safety"],
      ["Review childcare and travel",["childcare","travel","transport","बच्चे","यात्रा"],"","","Care & Mobility Map"]
    ],
    jal: [
      ["Open groundwater evaluator",["demo","evaluator","water","groundwater","जल","पानी"],"","/evaluator",""],
      ["Analyze priority block",["risk","block","priority","संकट","ब्लॉक"],"","/cases/demo-block",""],
      ["Review recharge interventions",["recharge","intervention","भूजल","रिचार्ज"],"","/cases/demo-block/interventions",""]
    ],
    agrisetu: [
      ["Run AgriStack guided demo",["demo","guided","डेमो","प्रदर्शन"],"#judgeMode","/mission-control/",""],
      ["Analyze farm records",["farmgraph","land","parcel","खसरा","जमीन","खेत"],'[data-view="farmgraph"]',"/mission-control/",""],
      ["Review record mismatches",["care","mutation","mismatch","reconcile","अंतर","मिलान"],'[data-view="care"]',"/mission-control/",""],
      ["Open farmer service",["farmer","citizen","किसान"],"","/farmer/",""]
    ],
    farmgraph: [
      ["Open crop-health guided demo",["demo","judge","डेमो","प्रदर्शन"],"","/demo/",""],
      ["Capture crop evidence",["camera","image","photo","disease","scan","फोटो","रोग","जांच"],"","/field/scan/",""],
      ["Analyze suspected outbreaks",["outbreak","cluster","spread","प्रकोप","फैलाव"],"","/outbreaks/",""],
      ["Review plot digital twins",["twin","field","farm","खेत","डिजिटल"],"","/digital-twins/",""],
      ["Open expert KVK referral",["expert","kvk","referral","विशेषज्ञ","सलाह"],"","/support/",""]
    ],
    aushadhi: [
      ["Open medicine shortage assessment",["shortage","risk","medicine","दवा","कमी","जोखिम"],"","/risk",""],
      ["Run guided medicine rescue",["demo","guided","mission","डेमो","अभियान"],"","/dashboard","Run Guided Mission"],
      ["Plan medicine rescue",["rescue","transfer","stock","स्टॉक","हस्तांतरण"],"","/rescue",""],
      ["Review delivery evidence",["proof","receipt","evidence","रसीद","प्रमाण"],"","/evidence",""]
    ],
    agripay: [
      ["Review invoice claims",["invoice","claim","bill","payment","बिल","भुगतान"],"","/intake",""],
      ["Open dealer onboarding",["dealer","onboarding","registration","डीलर","पंजीकरण"],"","/onboarding",""],
      ["Analyze financial impact",["impact","analytics","money","प्रभाव","विश्लेषण"],"","/impact",""]
    ],
    rajkisan: [
      ["Discover agriculture services",["service","scheme","application","सेवा","योजना","आवेदन"],"","","Services"],
      ["Find eligibility guidance",["eligibility","document","पात्रता","दस्तावेज"],"","","Eligibility"],
      ["Show department analytics",["analytics","dashboard","विश्लेषण"],"","","Analytics"]
    ],
    taap: [
      ["Open field heat safety",["field","worker","heat","गर्मी","मजदूर"],"","/field",""],
      ["Review heat forecast",["forecast","risk","warning","पूर्वानुमान","चेतावनी"],"","","Forecast"],
      ["Open protected shift planning",["shift","planning","schedule","शिफ्ट","समय"],"","","Protected Shift"]
    ],
    janani: [
      ["Review maternal case and care",["case","mother","pregnancy","maternal","गर्भ","माँ","माता"],"","","Case & Care"],
      ["Analyze referral readiness",["referral","hospital","transport","रेफरल","अस्पताल"],"","","Referral"],
      ["Review district intelligence",["district","forecast","risk","जिला","जोखिम"],"","","Intelligence"]
    ],
    heritage: [
      ["Run heritage crowd scenario",["demo","demand","recovery","डेमो","भीड़"],"","","Start guided incident replay"],
      ["Analyze visitor load",["forecast","capacity","footfall","पर्यटक","क्षमता"],'[data-view="recovery"]',"",""],
      ["Review conservation actions",["heritage","conservation","clean","संरक्षण","सफाई"],'[data-view="cleanliness"]',"",""]
    ],
    drone: [
      ["Enter drone services MVP",["demo","prototype","start","डेमो","शुरू"],"","","Enter MVP Prototype"],
      ["Analyze drone service demand",["demand","service","request","मांग","सेवा"],"","","Demand"],
      ["Review drone compliance",["compliance","safety","pilot","सुरक्षा","नियम"],"","","Compliance"]
    ]
  };
  const actions = config[project];
  if (!actions) { console.warn("RIC Oracle Voice: unknown dashboard key"); return; }
  const langOptions = [
    ["hi","हिंदी (Hindi)"],["en","English"],["auto","Auto-detect"],
    ["raj-marwari","मारवाड़ी · experimental Hindi-assisted"],
    ["raj-mewari","मेवाड़ी · experimental Hindi-assisted"],
    ["raj-dhundhari","ढूंढाड़ी · experimental Hindi-assisted"],
    ["raj-harauti","हाड़ौती · experimental Hindi-assisted"],
    ["raj-wagdi","वागड़ी · experimental Hindi-assisted"],
    ["raj-bagri","बागड़ी · experimental Hindi-assisted"]
  ];
  function text(el, value) { if(el) el.textContent = String(value); }
  const css = document.createElement("style");
  css.textContent = '#ricv{position:fixed;bottom:14px;left:14px;z-index:2147483000;color:#14283c;font:14px/1.45 system-ui,Arial,sans-serif;max-width:calc(100vw - 28px)}'+
   '#ricv *{box-sizing:border-box}#ricv button,#ricv select,#ricv textarea{font:inherit}#ricv .trigger{min-width:56px;min-height:48px;border:2px solid #fff;background:#063b69;color:white;border-radius:30px;padding:9px 16px;box-shadow:0 7px 30px #071c3550;cursor:pointer;font-weight:750}'+
   '#ricv .pane{width:min(370px,calc(100vw - 28px));max-height:min(610px,calc(100dvh - 84px));overflow:auto;background:#fff;border:1px solid #bbccdc;border-radius:16px;box-shadow:0 12px 50px #071c3550;margin-bottom:8px;padding:16px;display:none}'+
   '#ricv.open .pane{display:block}#ricv h2{font-size:16px!important;margin:0 0 6px!important;color:#143c60!important}#ricv small{display:block;color:#415872;font-size:11px;line-height:1.5;margin:5px 0}#ricv select,#ricv textarea{width:100%;border:1px solid #97adbe;border-radius:9px;background:white;color:#14283c;padding:9px;margin:5px 0}'+
   '#ricv textarea{min-height:76px;resize:vertical}#ricv .controls{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}#ricv .controls button{padding:9px 11px;border-radius:9px;border:1px solid #345775;color:#133958;background:#edf5fa;cursor:pointer;min-height:42px}#ricv .controls button.primary{background:#0d527d;color:white}#ricv button:disabled{opacity:.45;cursor:not-allowed}#ricv .status{background:#eef4f8;color:#1f4057;border-radius:8px;padding:9px;font-size:12px;min-height:33px;white-space:pre-wrap}#ricv label{font-size:12px;font-weight:650;color:#284660}#ricv .consent{display:flex;gap:9px;align-items:start}#ricv .consent input{margin-top:4px;flex-shrink:0}'+
   '@media(max-width:480px){#ricv{bottom:8px;left:8px;max-width:calc(100vw - 16px)}#ricv .pane{width:calc(100vw - 16px);max-height:calc(100dvh - 74px)}#ricv .trigger{min-height:46px}}@media print{#ricv{display:none}}';
  document.head.appendChild(css);
  const host = document.createElement("div");host.id="ricv";
  host.innerHTML = '<div class="pane" role="dialog" aria-label="Syntheon Oracle voice controls" aria-modal="false">'+
   '<h2>🎙 Oracle Voice · '+project.toUpperCase()+'</h2>'+
   '<small>Consent-based speech input. Oracle Whisper returns an UNVERIFIED transcript; edit it before running any action. No Government decision occurs automatically.</small>'+
   '<label for="ricv-lang">Spoken language</label><select id="ricv-lang"></select>'+
   '<label class="consent"><input id="ricv-consent" type="checkbox"><span>I agree to send one short audio clip to Syntheon’s Oracle ASR for temporary transcription.</span></label>'+
   '<div class="controls"><button id="ricv-record" class="primary">● Record</button><button id="ricv-stop" disabled>■ Stop</button><button id="ricv-refresh">Check Oracle</button><label for="ricv-file" style="cursor:pointer;border:1px solid #345775;border-radius:9px;padding:9px;background:#edf5fa">Choose audio clip</label><input id="ricv-file" type="file" accept="audio/*,.wav,.mp3,.m4a,.webm,.ogg" style="max-width:100%;font-size:11px" aria-label="Upload an existing audio clip"></div>'+
   '<label for="ricv-transcript">Review or correct transcript</label><textarea id="ricv-transcript" placeholder="Your editable transcript appears here. You can also type a command."></textarea>'+
   '<label for="ricv-action">Approved dashboard workflow</label><select id="ricv-action"></select>'+
   '<div class="controls"><button id="ricv-run" class="primary">Run selected native workflow</button><button id="ricv-close">Close</button></div>'+
   '<div id="ricv-status" class="status" role="status" aria-live="polite">Checking Oracle capability…</div>'+
   '<small>Microphone permission is requested only when you press Record. Max 14 seconds. Hindi/English supported; regional dialects are experimental Hindi-assisted decoding, not native certified ASR.</small></div>'+
   '<button class="trigger" id="ricv-open" aria-label="Open Oracle voice assistant" aria-expanded="false">🎙 Voice</button>';
  const get=(id)=>host.querySelector("#"+id), setStatus=(msg)=>text(get("ricv-status"),msg);
  const lng=get("ricv-lang"), act=get("ricv-action"), open=get("ricv-open");
  langOptions.forEach(([value,label])=>{const o=document.createElement("option");o.value=value;o.textContent=label;lng.appendChild(o)});
  const opt=document.createElement("option");opt.value="auto";opt.textContent="Detect from transcript";act.appendChild(opt);
  actions.forEach((item,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=item[0];act.appendChild(o)});
  function normalize(s){return String(s||"").toLocaleLowerCase().trim().replace(/\s+/g," ")}
  function matches(item,s){const norm=normalize(s);return item[1].some(x=>norm.includes(normalize(x)))}
  function guessed(textValue){const q=normalize(textValue);if(!q)return -1;const ix=actions.findIndex(a=>matches(a,q));return ix}
  function updateGuess(){const ix=guessed(get("ricv-transcript").value);if(act.value==="auto"){setStatus(ix>=0?"Suggested action: "+actions[ix][0]+". Verify and press Run.":"Transcript ready; choose a supported workflow from the list or rephrase.");}}
  get("ricv-transcript").addEventListener("input",updateGuess);
  async function checkCapability(){
    try {const r=await fetch(uri("capabilities"),{method:"GET",cache:"no-store",credentials:"same-origin"});
      if(!r.ok)throw Error("gateway HTTP "+r.status);
      const j=await r.json();setStatus(j.available?"Oracle ASR online. Consent and tap Record.":"Oracle reached but Whisper unavailable. Typed commands remain usable.");
      return !!j.available;
    } catch(e){setStatus("Oracle voice gateway unavailable: "+String(e.message||e)+". Typed commands still work.");return false;}
  }
  let recorder=null, stream=null, chunks=[], clipTimer=null, active=false;
  function release(){if(clipTimer){clearTimeout(clipTimer);clipTimer=null;}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
  function state(recording){active=recording;get("ricv-record").disabled=recording;get("ricv-stop").disabled=!recording;}
  async function record(){
    if(active)return;
    if(!get("ricv-consent").checked){setStatus("Recording blocked: explicit consent is required.");return;}
    if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){setStatus("Microphone API unavailable. Use HTTPS and a modern browser, or type a command.");return;}
    if(!(await checkCapability()))return;
    try {
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
      const formats=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg;codecs=opus"];
      const mime=formats.find(m=>MediaRecorder.isTypeSupported(m))||"";
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];
      recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onerror=()=>{setStatus("Recording failed; retry or type.");release();state(false)};
      recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder?.mimeType||mime||"audio/webm"});chunks=[];release();state(false);await transcribe(blob)};
      recorder.start(250);state(true);setStatus("Recording… speak clearly. Automatically stops at 14 seconds.");
      clipTimer=setTimeout(stop,14000);
    }catch(e){release();state(false);setStatus(e.name==="NotAllowedError"?"Microphone denied. Enable it in browser site settings and retry.":"Microphone error: "+String(e.name||e.message||e))}
  }
  function stop(){if(recorder&&recorder.state==="recording"){setStatus("Preparing audio…");try{recorder.requestData()}catch{}recorder.stop()}else{release();state(false)}}
  async function transcribe(blob){
    if(blob.size<200){setStatus("No audio received. Please record again.");return;}
    if(blob.size>2500000){setStatus("Clip exceeded Oracle's 2.5 MB maximum. Please record a shorter clip.");return;}
    const lang=lng.value;
    const mime=blob.type.includes("mp4")?"audio/mp4":blob.type.includes("ogg")?"audio/ogg":blob.type.includes("mpeg")?"audio/mpeg":blob.type.includes("wav")?"audio/wav":"audio/webm";
    const ext=mime==="audio/mp4"?"m4a":mime==="audio/ogg"?"ogg":mime==="audio/wav"?"wav":mime==="audio/mpeg"?"mp3":"webm";
    const fd=new FormData();fd.append("file",blob,"ric_voice."+ext);
    setStatus("Transcribing through Oracle Whisper… audio is not saved by this app.");
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),150000);
    try{
      const r=await fetch(uri("transcribe")+"?consent=true&lang="+encodeURIComponent(lang),{method:"POST",body:fd,signal:controller.signal,credentials:"same-origin",cache:"no-store"});
      let j={};try{j=await r.json()}catch{}
      if(!r.ok){throw Error("Oracle HTTP "+r.status+" "+String(j.detail||""));}
      const word=String(j.text||"").slice(0,1000);
      if(!word){setStatus("Oracle detected no usable speech. Retry or type.");return}
      get("ricv-transcript").value=word;act.value="auto";updateGuess();
      const k=guessed(word);
      setStatus("Oracle transcription received (UNVERIFIED). Review the text"+(k>=0?" and proposed native workflow: "+actions[k][0]:"; choose a workflow")+".");
    }catch(e){setStatus("Transcription failed or timed out: "+String(e.message||e)+". No workflow was executed. You can type the command.");}
    finally{clearTimeout(timer)}
  }
  function visible(el){const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=="hidden"&&!el.disabled}
  function findNativeByText(phrase){
    const q=normalize(phrase);
    const els=Array.from(document.querySelectorAll('button,a,[role="button"]')).filter(visible);
    return els.find(x=>normalize(x.textContent).includes(q))||null;
  }
  function run(){
    const content=get("ricv-transcript").value.trim();if(!content){setStatus("No transcript. Speak or type what you want to do.");return;}
    const idx=act.value==="auto"?guessed(content):Number(act.value);
    if(idx<0||idx>=actions.length){setStatus("No safe matching action. Choose a native workflow explicitly; nothing was executed.");return;}
    const a=actions[idx],selector=a[2],route=a[3],button=a[4];
    // Only allow fixed built-in routes and known controls. Never build navigation from transcript.
    if(route&&location.pathname.replace(/\/$/,"")!==route.replace(/\/$/,"")){
      setStatus("Opening native "+a[0]+" page; use its own controls for analysis.");
      location.assign(route);
      return;
    }
    const el=(selector&&document.querySelector(selector))||(button&&findNativeByText(button));
    if(el&&visible(el)){el.click();setStatus("Native dashboard workflow opened: "+a[0]+". Inspect its actual results and status.");host.classList.remove("open");open.setAttribute("aria-expanded","false");}
    else if(route){setStatus("Native "+a[0]+" page is already open. Use its workflow controls; no simulated results were created.");}
    else{setStatus("Native control not currently visible for "+a[0]+". Navigate to that module manually; no false analysis was created.");}
  }
  const init=()=>{
    document.body.appendChild(host);
    open.addEventListener("click",()=>{const shown=host.classList.toggle("open");open.setAttribute("aria-expanded",String(shown));if(shown)checkCapability()});
    get("ricv-close").addEventListener("click",()=>host.classList.remove("open"));
    get("ricv-record").addEventListener("click",record);
    get("ricv-stop").addEventListener("click",stop);
    get("ricv-refresh").addEventListener("click",checkCapability);
    get("ricv-file").addEventListener("change",async()=>{const file=get("ricv-file").files?.[0];if(!file)return;if(!get("ricv-consent").checked){setStatus("Explicit consent required before uploading audio.");return;}if(!/^audio\//.test(file.type) && !/\.(wav|mp3|m4a|webm|ogg)$/i.test(file.name)){setStatus("Unsupported audio type.");return;}await transcribe(file);});
    get("ricv-run").addEventListener("click",run);
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&active)stop()});
    window.addEventListener("pagehide",release);
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
