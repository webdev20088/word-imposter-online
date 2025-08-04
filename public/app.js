(() => {
  // ==== Elements ====
  const landing = document.getElementById('landing');
  const setup = document.getElementById('setup');
  const game = document.getElementById('game');

  const hostBtn = document.getElementById('hostBtn');
  const addPlayerBtn = document.getElementById('addPlayerBtn');
  const startBtn = document.getElementById('startBtn');
  const backToLandingBtn = document.getElementById('backToLandingBtn');

  const playersContainer = document.getElementById('playersContainer');
  const categorySelect = document.getElementById('categorySelect');
  const roundsInput = document.getElementById('roundsInput');
  const impostersInput = document.getElementById('impostersInput');

  const gameCategory = document.getElementById('gameCategory');
  const roundLabel = document.getElementById('roundLabel');
  const roundsTotal = document.getElementById('roundsTotal');
  const playerList = document.getElementById('playerList');
  const nextRoundBtn = document.getElementById('nextRoundBtn');
  const restartBtn = document.getElementById('restartBtn');

  const revealModal = document.getElementById('revealModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalWord = document.getElementById('modalWord');

  // ==== State ====
  const MAX_PLAYERS = 16;
  let players = [];           // [{id,name}]
  let seenThisRound = new Set();
  let currentRound = 1;
  let totalRounds = 1;
  let selectedCategoryKey = '';
  let numImposters = 1;
  let assignment = {};        // playerId -> word
  let impostersSet = new Set();

  // ==== Utilities ====
  function show(el){ el.classList.remove('hidden'); }
  function hide(el){ el.classList.add('hidden'); }
  function uid(){ return Math.random().toString(36).slice(2,9); }
  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }
  function pickDistinctTwo(items){
    if(items.length < 2) return null;
    const i1 = Math.floor(Math.random()*items.length);
    let i2 = Math.floor(Math.random()*items.length);
    while(i2 === i1){ i2 = Math.floor(Math.random()*items.length); }
    return [items[i1], items[i2]];
  }

  // ==== Players UI ====
  function renderPlayerInputs(){
    playersContainer.innerHTML = '';
    players.forEach((p, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'player-input';
      wrap.innerHTML = `
        <div class="index">${idx+1}</div>
        <input type="text" class="input" placeholder="Player ${idx+1}" value="${p.name}" data-id="${p.id}" />
        ${players.length > 3 ? `<button class="btn subtle remove" data-id="${p.id}" title="Remove">−</button>`:''}
      `;
      playersContainer.appendChild(wrap);
    });

    // Wire input changes
    playersContainer.querySelectorAll('input.input').forEach(inp=>{
      inp.addEventListener('input', (e)=>{
        const id = e.target.getAttribute('data-id');
        const p = players.find(x=>x.id===id);
        if(p) p.name = e.target.value;
      });
    });

    // Wire remove (only if >3)
    playersContainer.querySelectorAll('button.remove').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        if(players.length <= 3) return;
        players = players.filter(p=>p.id!==id);
        renderPlayerInputs();
      });
    });
  }

  function ensureThreePlayers(){
    while(players.length < 3){
      players.push({id: uid(), name: ''});
    }
    renderPlayerInputs();
  }

  function addPlayer(){
    if(players.length >= MAX_PLAYERS){ alert(`Max ${MAX_PLAYERS} players`); return; }
    players.push({id: uid(), name: ''});
    renderPlayerInputs();
  }

  // ==== Game UI ====
  function renderPlayerChips(){
    playerList.innerHTML = '';
    players.forEach(p=>{
      const chip = document.createElement('div');
      chip.className = 'player-chip';
      chip.textContent = p.name || 'Unnamed';
      chip.setAttribute('data-id', p.id);
      chip.addEventListener('click', onPlayerChipClick);
      playerList.appendChild(chip);
    });
  }

  function onPlayerChipClick(e){
    const id = e.currentTarget.getAttribute('data-id');
    if(seenThisRound.has(id)){
      alert('Already shown for this round.');
      return;
    }
    const word = assignment[id];
    if(!word){
      alert('No word set. (Fill the category list in categories.js)');
      return;
    }
    seenThisRound.add(id);
    modalWord.textContent = word;
    show(revealModal);
  }

  function closeModal(){ hide(revealModal); }

  // ==== Round assignment ====
  function assignRound(){
    seenThisRound.clear();
    assignment = {};
    impostersSet = new Set();

    const items = (window.CATEGORIES[selectedCategoryKey] || []).map(s=>String(s).trim()).filter(Boolean);
    if(items.length < 2){
      alert('Selected category has fewer than 2 items.\nPlease open categories.js and add common items first.');
      return false;
    }

    // Choose two distinct words: one for crew, one for imposters
    const pair = pickDistinctTwo(items);
    if(!pair){
      alert('Need at least 2 unique words in the category.');
      return false;
    }
    const [crewWord, imposterWord] = pair;

    // Pick imposters (k unique players)
    if(numImposters >= players.length || numImposters < 1){
      alert('Number of imposters must be at least 1 and less than total players.');
      return false;
    }
    const shuffledPlayers = shuffle(players);
    for(let i=0;i<numImposters;i++){
      impostersSet.add(shuffledPlayers[i].id);
    }

    // Assign words
    players.forEach(p=>{
      assignment[p.id] = impostersSet.has(p.id) ? imposterWord : crewWord;
    });

    // Update top info
    gameCategory.textContent = labelForCategory(selectedCategoryKey);
    roundLabel.textContent = String(currentRound);
    roundsTotal.textContent = String(totalRounds);

    // Update Next/Finish button
    if(currentRound < totalRounds){
      nextRoundBtn.textContent = 'Next Round';
    }else{
      nextRoundBtn.textContent = 'Hopefully you had fun! (Finish)';
    }
    return true;
  }

  function labelForCategory(key){
    const opt = Array.from(categorySelect.options).find(o=>o.value===key);
    return opt ? opt.textContent : '—';
  }

  function startRoundFlow(){
    if(!assignRound()) return; // guard if category empty
    renderPlayerChips();
    hide(setup);
    show(game);
  }

  function nextRound(){
    if(currentRound < totalRounds){
      currentRound += 1;
      assignRound();
    } else {
      // End of game
      alert('Hopefully you had fun! 🎉');
      // Reset to setup so you can tweak quickly
      goToSetup();
    }
  }

  function goToSetup(){
    hide(game);
    show(setup);
  }

  function restartAll(){
    // Fresh start: back to landing
    hide(game); hide(setup); show(landing);
    // Keep players as-is for convenience; comment next line to wipe
    // players = [];
    // If you want a full reset uncomment:
    // players = []; ensureThreePlayers(); categorySelect.value=''; roundsInput.value=3; impostersInput.value=1;
  }

  // ==== Event wiring ====
  hostBtn.addEventListener('click', ()=>{
    hide(landing);
    show(setup);
  });
  backToLandingBtn.addEventListener('click', restartAll);
  addPlayerBtn.addEventListener('click', addPlayer);

  startBtn.addEventListener('click', ()=>{
    // Sync from inputs
    players = players.map((p, idx) => {
      const input = playersContainer.querySelector(`input[data-id="${p.id}"]`);
      return { ...p, name: (input?.value || `Player ${idx+1}`).trim() };
    });

    // Validate players
    const named = players.filter(p=>p.name.length>0);
    if(named.length < 3){ alert('Please enter at least 3 player names.'); return; }

    selectedCategoryKey = categorySelect.value;
    if(!selectedCategoryKey){ alert('Please select a category.'); return; }

    totalRounds = parseInt(roundsInput.value,10) || 1;
    if(totalRounds < 1){ alert('Rounds must be at least 1.'); return; }

    if (impostersInput.value.trim() === "") {
  // If user left it empty, auto pick a random number (1 to players-1)
  numImposters = Math.floor(Math.random() * (named.length - 1)) + 1;
} else {
  numImposters = parseInt(impostersInput.value, 10);
}
    if(numImposters < 1){ alert('Imposters must be at least 1.'); return; }
    if(numImposters >= named.length){ alert('Imposters must be less than total players.'); return; }

    currentRound = 1;
    startRoundFlow();
  });

  nextRoundBtn.addEventListener('click', nextRound);
  restartBtn.addEventListener('click', restartAll);
  modalCloseBtn.addEventListener('click', closeModal);
  revealModal.addEventListener('click', (e)=>{ if(e.target===revealModal) closeModal(); });

  // ==== Init ====
  ensureThreePlayers();
})();
