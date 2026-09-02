(function () {
  "use strict";
  const BASE = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん"];
  const VARIANTS = {
    か:["が"],き:["ぎ"],く:["ぐ"],け:["げ"],こ:["ご"],さ:["ざ"],し:["じ"],す:["ず"],せ:["ぜ"],そ:["ぞ"],
    た:["だ"],ち:["ぢ"],つ:["づ","っ"],て:["で"],と:["ど"],は:["ば","ぱ"],ひ:["び","ぴ"],ふ:["ぶ","ぷ"],へ:["べ","ぺ"],ほ:["ぼ","ぽ"],
    あ:["ぁ"],い:["ぃ"],う:["ぅ"],え:["ぇ"],お:["ぉ"],や:["ゃ"],ゆ:["ゅ"],よ:["ょ"],わ:["ゎ"]
  };
  const $ = (id) => document.getElementById(id);
  const screens = ["setup-screen","game-screen","result-screen"];
  const state = { total:0, people:[], phase:"surname", surname:null, given:null, slots:[], base:"", letter:"", locked:false, lengths:{surname:4,given:3} };
  const dictionaries = {
    surname:new Map(NAME_GAME_DATA.surnames.map(x=>[x.reading,x])),
    given:new Map(NAME_GAME_DATA.givenNames.map(x=>[x.reading,x]))
  };

  function show(id) { screens.forEach(x=>$(x).classList.toggle("hidden",x!==id)); }
  function scoreFor(rank) { return rank<=10?1000:rank<=100?600:rank<=500?300:100; }
  function labelFor(rank) { return rank<=10?"TOP 10!":rank<=100?"TOP 100!":"CLEAR"; }
  function updateStats() {
    $("total-score").textContent=state.total.toLocaleString(); $("people-count").textContent=state.people.length;
    $("history-count").textContent=`${state.people.length} PEOPLE`;
  }
  function fillSelect(id, selected) {
    $(id).innerHTML=[2,3,4,5,6].map(n=>`<option value="${n}" ${n===selected?"selected":""}>${n}</option>`).join("");
  }
  function startGame() {
    state.total=0; state.people=[]; state.surname=null; state.given=null;
    state.lengths={surname:+$("surname-length").value,given:+$("given-length").value};
    updateStats(); renderHistory(); show("game-screen"); startPhase("surname");
  }
  function startPhase(phase) {
    state.phase=phase; state.slots=Array(state.lengths[phase]).fill(""); state.locked=false;
    $("phase-number").textContent=phase==="surname"?"PHASE 1 / 2":"PHASE 2 / 2";
    $("phase-title").textContent=phase==="surname"?"苗字を作成":"名前を作成";
    renderSlots(); drawLetter();
  }
  function drawLetter() {
    state.base=BASE[Math.floor(Math.random()*BASE.length)]; state.letter=state.base;
    renderLetter();
  }
  function renderLetter() {
    $("current-letter").textContent=state.letter;
    const choices=[state.base,...(VARIANTS[state.base]||[])];
    $("transform-buttons").innerHTML=choices.map((v,i)=>`<button class="transform ${v===state.letter?"active":""}" data-letter="${v}">${i===0?"そのまま":variantLabel(v)}</button>`).join("");
    document.querySelectorAll(".transform").forEach(b=>b.onclick=()=>{ if(!state.locked){state.letter=b.dataset.letter;renderLetter();} });
  }
  function variantLabel(v) { if("ぱぴぷぺぽ".includes(v))return "半濁点"; if("ぁぃぅぇぉゃゅょっゎ".includes(v))return "小文字"; return "濁点"; }
  function renderSlots() {
    $("slots").innerHTML=state.slots.map((v,i)=>`<button class="slot ${v?"filled":""}" data-index="${i}" ${v?"disabled":""} aria-label="${i+1}文字目${v?` ${v}`:" 空き"}">${v||""}</button>`).join("");
    document.querySelectorAll(".slot:not(.filled)").forEach(b=>b.onclick=()=>place(+b.dataset.index));
  }
  function place(index) {
    if(state.locked||state.slots[index])return;
    state.slots[index]=state.letter; renderSlots();
    const placed=document.querySelector(`[data-index="${index}"]`); if(placed)placed.classList.add("pop");
    if(state.slots.every(Boolean)){ state.locked=true; setTimeout(judge,350); } else drawLetter();
  }
  function judge() {
    const reading=state.slots.join(""); const match=dictionaries[state.phase].get(reading);
    if(!match)return gameOver(reading);
    const points=scoreFor(match.rank); match.points=points;
    if(state.phase==="surname") { state.surname=match; phaseClear(match,()=>startPhase("given")); }
    else { state.given=match; completePerson(); }
  }
  function phaseClear(match,next) {
    showResult(labelFor(match.rank),`${state.phase==="surname"?"苗字":"名前"} CLEAR`,`${match.kanji}（${match.reading}）`,`${match.points.toLocaleString()} PTS`,"NEXT →",next,false);
  }
  function completePerson() {
    const points=state.surname.points+state.given.points;
    const person={name:`${state.surname.kanji} ${state.given.kanji}`,reading:`${state.surname.reading} ${state.given.reading}`,points};
    state.people.push(person); state.total+=points; updateStats(); renderHistory();
    showResult("人物完成！",person.name,person.reading,`+ ${points.toLocaleString()} PTS`,"NEXT PERSON →",()=>{show("game-screen");startPhase("surname");},false);
  }
  function gameOver(reading) {
    const type=state.phase==="surname"?"苗字":"名前"; const best=Math.max(state.total,+(localStorage.getItem("nameGameBest")||0));
    localStorage.setItem("nameGameBest",best);
    showResult("GAME OVER",`「${reading}」`,`この${type}は登録されていません`,"","RETRY ↻",reset,true,best);
  }
  function showResult(badge,title,detail,score,button,next,isFinal,best=0) {
    show("result-screen"); $("result-badge").textContent=badge; $("result-title").textContent=title; $("result-detail").textContent=detail;
    $("completed-name").classList.toggle("hidden",!score); $("completed-name").textContent=score?title:"";
    if(score)$("result-title").textContent=badge;
    $("earned-score").classList.toggle("hidden",!score); $("earned-score").textContent=score;
    $("final-summary").classList.toggle("hidden",!isFinal); $("final-history").classList.toggle("hidden",!isFinal);
    if(isFinal){$("final-score").textContent=state.total.toLocaleString();$("final-people").textContent=`${state.people.length}人`;$("best-score").textContent=best.toLocaleString();renderFinalHistory();}
    $("action-button").innerHTML=button; $("action-button").onclick=next;
  }
  function renderHistory() {
    $("history-list").innerHTML=state.people.length?state.people.map((p,i)=>`<li><span><b>${i+1}</b>${p.name}</span><strong>+${p.points.toLocaleString()}</strong></li>`).join(""):'<li class="empty-history">まだ人物は完成していません</li>';
  }
  function renderFinalHistory(){ $("final-history").innerHTML=state.people.length?state.people.map((p,i)=>`<li>${i+1}. ${p.name}<strong>${p.points.toLocaleString()} PTS</strong></li>`).join(""):'<li>完成した人物はいません</li>'; }
  function reset(){show("setup-screen");state.total=0;state.people=[];updateStats();renderHistory();}
  fillSelect("surname-length",4);fillSelect("given-length",3);updateStats();$("start-button").onclick=startGame;
  document.querySelector(".brand").onclick=(e)=>{e.preventDefault();reset();};
})();
