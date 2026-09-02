(function () {
  "use strict";
  const BASE = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん"];
  const VARIANTS = {
    か:["が"],き:["ぎ"],く:["ぐ"],け:["げ"],こ:["ご"],さ:["ざ"],し:["じ"],す:["ず"],せ:["ぜ"],そ:["ぞ"],
    た:["だ"],ち:["ぢ"],つ:["づ","っ"],て:["で"],と:["ど"],は:["ば","ぱ"],ひ:["び","ぴ"],ふ:["ぶ","ぷ"],へ:["べ","ぺ"],ほ:["ぼ","ぽ"],
    あ:["ぁ"],い:["ぃ"],う:["ぅ"],え:["ぇ"],お:["ぉ"],や:["ゃ"],ゆ:["ゅ"],よ:["ょ"],わ:["ゎ"]
  };
  const $ = (id) => document.getElementById(id);
  const screens = ["setup-screen","game-screen","result-screen"];
  const state = { total:0, people:[], slots:[], boundary:2, base:"", letter:"", locked:false, length:5, lastIndex:null, complete:false };
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
  function renderDebug() {
    $("debug-slots").textContent=`slots: ${JSON.stringify(state.slots)}`;
    $("debug-filled-count").textContent=`filledCount: ${state.slots.filter(Boolean).length} / ${state.slots.length}`;
    $("debug-boundary").textContent=`boundary: ${state.boundary}`;
    $("debug-current-letter").textContent=`currentLetter: ${state.letter}`;
    $("debug-locked").textContent=`locked: ${state.locked}`;
    $("debug-last-index").textContent=`lastIndex: ${state.lastIndex===null?"null":state.lastIndex}`;
    $("debug-complete").textContent=`complete: ${state.complete}`;
  }
  function fillSelect() {
    $("full-name-length").innerHTML=[4,5,6,7,8,9,10,11,12].map(n=>`<option value="${n}" ${n===5?"selected":""}>${n}</option>`).join("");
  }
  function startGame() {
    state.total=0; state.people=[]; state.length=+$("full-name-length").value;
    updateStats(); renderHistory(); show("game-screen"); startPerson();
  }
  function startPerson() {
    state.base=""; state.letter=""; state.lastIndex=null; state.complete=false;
    $("complete-button").classList.add("hidden"); $("draw-area").classList.remove("hidden");
    state.slots=Array(state.length).fill("");
    state.boundary=Math.max(1,Math.floor(state.length/2));
    state.locked=false;
    drawLetter();
    renderSlots(); renderLetter();
    logPlacement("startPerson",null);
  }
  function drawLetter() {
    state.base=BASE[Math.floor(Math.random()*BASE.length)]; state.letter=state.base;
    logPlacement("drawLetter",null);
  }
  function renderLetter() {
    $("current-letter").textContent=state.letter;
    renderDebug();
    const choices=[state.base,...(VARIANTS[state.base]||[])];
    $("transform-buttons").innerHTML=choices.map((v,i)=>`<button class="transform ${v===state.letter?"active":""}" data-letter="${v}">${i===0?"そのまま":variantLabel(v)}</button>`).join("");
    document.querySelectorAll(".transform").forEach(b=>b.onclick=()=>{ if(!state.locked){state.letter=b.dataset.letter;renderLetter();} });
  }
  function variantLabel(v) { if("ぱぴぷぺぽ".includes(v))return "半濁点"; if("ぁぃぅぇぉゃゅょっゎ".includes(v))return "小文字"; return "濁点"; }
  function renderSlots() {
    const container=$("slots");
    let buttons=[...container.querySelectorAll(".slot")];
    let boundary=container.querySelector(".name-boundary");
    if(buttons.length!==state.length){
      buttons=state.slots.map((_,i)=>{
        const button=document.createElement("button");
        button.type="button"; button.className="slot"; button.dataset.index=i;
        button.addEventListener("click",()=>place(i));
        return button;
      });
      boundary=document.createElement("span"); boundary.className="name-boundary"; boundary.ariaHidden="true"; boundary.textContent="｜";
      container.replaceChildren(...buttons,boundary);
    }
    // Preserve the tapped button while its click is being dispatched. Replacing
    // that subtree caused iOS WebKit to discard the first visual update.
    container.insertBefore(boundary,buttons[state.boundary]);
    buttons.forEach((button,i)=>{
      const value=state.slots[i];
      button.textContent=value; button.disabled=Boolean(value);
      button.classList.toggle("filled",Boolean(value));
      button.setAttribute("aria-label",`${i+1}文字目${value?` ${value}`:" 空き"}`);
    });
    $("surname-count").textContent=state.boundary; $("given-count").textContent=state.length-state.boundary;
    $("boundary-left").disabled=state.boundary<=1; $("boundary-right").disabled=state.boundary>=state.length-1;
    renderDebug();
  }
  function moveBoundary(amount) {
    const next=state.boundary+amount;
    if(next<1||next>=state.length)return;
    state.boundary=next; renderSlots();
  }
  function place(index) {
    if(!state.letter)return;
    logPlacement("before place",index);
    if(state.locked||state.slots[index]){ logPlacement("ignored place",index); return; }
    const nextSlots=[...state.slots];
    nextSlots[index]=state.letter;
    state.slots=nextSlots; state.lastIndex=index; state.complete=nextSlots.every(Boolean); renderSlots();
    const placed=$("slots").querySelector(`[data-index="${index}"]`); if(placed)placed.classList.add("pop");
    if(nextSlots.every(Boolean)){
      state.locked=true; logPlacement("final place",index);
      $("draw-area").classList.add("hidden"); judge(nextSlots);
    } else { logPlacement("after place",index); drawLetter(); renderLetter(); }
  }
  function logPlacement(phase,index) {
    console.debug("[name-game]",phase,{slots:[...state.slots],index,letter:state.letter,locked:state.locked});
  }
  function judge(slots=state.slots) {
    const surnameReading=slots.slice(0,state.boundary).join("");
    const givenReading=slots.slice(state.boundary).join("");
    const surname=dictionaries.surname.get(surnameReading); const given=dictionaries.given.get(givenReading);
    if(!surname||!given)return gameOver(surnameReading,givenReading,!surname,!given);
    completePerson(surname,given);
  }
  function completePerson(surname,given) {
    const points=scoreFor(surname.rank)+scoreFor(given.rank);
    const person={name:`${surname.kanji} ${given.kanji}`,reading:`${surname.reading} ${given.reading}`,points};
    state.people.push(person); state.total+=points; updateStats(); renderHistory();
    showResult(labelFor(Math.min(surname.rank,given.rank)),person.name,person.reading,`+ ${points.toLocaleString()} PTS`,"NEXT PERSON →",()=>{show("game-screen");startPerson();},false);
  }
  function gameOver(surnameReading,givenReading,invalidSurname,invalidGiven) {
    const invalid=[invalidSurname?`苗字「${surnameReading}」`:"",invalidGiven?`名前「${givenReading}」`:""].filter(Boolean).join("・");
    const best=Math.max(state.total,+(localStorage.getItem("nameGameBest")||0));
    localStorage.setItem("nameGameBest",best);
    showResult("GAME OVER",invalid,"辞書に登録されていません","","RETRY ↻",reset,true,best);
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
  fillSelect(); updateStats(); renderDebug(); $("start-button").onclick=startGame;
  $("boundary-left").onclick=()=>moveBoundary(-1); $("boundary-right").onclick=()=>moveBoundary(1);
  $("complete-button").onclick=judge;
  document.querySelector(".brand").onclick=(e)=>{e.preventDefault();reset();};
})();
