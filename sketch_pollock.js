// VOICE CANVAS 61.0 - ENGLISH (FIXED BUTTONS)
// Author: [Your Name]

let audioContext, mic, pitch;
let isModelReady = false;
let isRunning = false;
let pg; 

let pos, vel, acc, prevPos;
let currentFreq = 0;
let currentNote = "--";
let pitchHistory = [];
let wasSilent = true;
let silenceTimer = 0;

let ui = {};
let visCtx;
let visCanvas;
let pendingAction = null; // Proměnná pro modal okno

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PALETTES = {
    'pollock': ['#E6DFCD', '#A4A2AD', '#CA762E', '#A44A28', '#E7AC2A', '#242754', '#1F1724'],
    'rainbow': ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    'autumn':  ['#8B4513', '#D2691E', '#DAA520', '#CD853F', '#800000', '#FF8C00', '#556B2F'],
    'spring':  ['#FFB6C1', '#98FB98', '#87CEFA', '#FFFFE0', '#DDA0DD', '#F0E68C', '#E0FFFF'],
    'neon':    ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000', '#7B68EE', '#FF1493'],
    'ocean':   ['#000080', '#0000FF', '#1E90FF', '#00CED1', '#4682B4', '#5F9EA0', '#B0C4DE']
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(windowWidth, windowHeight);
  pg.clear();

  restoreDrawing();
  setInterval(saveToLocalStorage, 2000);

  // Bezpečnější výběr prvků (čistý JS nebo p5 select)
  ui.bg = select('#bg-color');
  ui.gain = select('#gain-slider');
  ui.speed = select('#speed-slider');
  ui.chaos = select('#chaos-slider');
  ui.friction = select('#friction-slider');
  ui.gravity = select('#pitch-gravity-slider');
  ui.alpha = select('#alpha-slider');
  ui.minW = select('#min-width');
  ui.maxW = select('#max-width');
  ui.palette = select('#palette-select');
  
  ui.colors = {};
  NOTES.forEach(n => {
      let clean = n.replace("#", "");
      // Použijeme select, ale s ošetřením, kdyby prvek neexistoval
      let el = select(`#col-${clean}`);
      if(el) ui.colors[clean] = el;
  });

  loadConfig();
  attachSettingsListeners();

  visCanvas = document.getElementById('vis-canvas');
  if (visCanvas) visCtx = visCanvas.getContext('2d');

  mic = new p5.AudioIn();
  
  pos = createVector(width/2, height/2);
  prevPos = pos.copy();
  vel = createVector(0, 0);
  acc = createVector(0, 0);
  
  for(let i=0; i<330; i++) pitchHistory.push(0);
  
  console.log("Voice Canvas Ready.");
}

function draw() {
  background(ui.bg.value());
  image(pg, 0, 0);

  if (!isRunning || !isModelReady) { if(visCtx) updateGraph(0, 0); return; }

  let vol = mic.getLevel();
  let gain = ui.gain.value();
  vol = vol * gain; 
  if (vol > 1) vol = 1;

  updateGraph(currentFreq, vol);
  if(currentFreq > 0) {
      select('#note-display').html(currentNote);
      select('#freq-display').html(Math.round(currentFreq) + " Hz");
  }

  if (vol < 0.05) {
      silenceTimer++;
      if (silenceTimer > 15) { wasSilent = true; vel.mult(0.9); }
      pos.add(vel); return; 
  }

  if (wasSilent) {
      pos = createVector(random(100, width-100), random(100, height-100));
      prevPos = pos.copy(); 
      vel.mult(0);
      wasSilent = false;
  }
  silenceTimer = 0;

  applyPhysics(vol, currentFreq);
  let c = getMixedColor(currentNote);
  c.setAlpha(parseInt(ui.alpha.value()));

  let minW = parseInt(ui.minW.value());
  let maxW = parseInt(ui.maxW.value());
  let sw = map(vol, 0.05, 1, minW, maxW);
  let viscosity = map(ui.friction.value(), 0, 100, 0, 1);
  let speed = vel.mag();

  pg.stroke(c); pg.strokeWeight(sw); pg.strokeCap(ROUND);

  if (speed > 25 && viscosity < 0.5) {
      if (random() < 0.5) pg.line(prevPos.x, prevPos.y, pos.x, pos.y);
      else {
           pg.noStroke(); pg.fill(c);
           let dots = floor(random(1, 4));
           for(let i=0; i<dots; i++) {
               let r = random(sw * 0.5, sw * 1.5);
               let offset = p5.Vector.random2D().mult(random(5, 20));
               pg.ellipse(pos.x + offset.x, pos.y + offset.y, r);
           }
      }
  } else {
      pg.line(prevPos.x, prevPos.y, pos.x, pos.y);
  }

  if (vol > 0.85 && random() < 0.15) {
      pg.noStroke(); pg.fill(c);
      let splatSize = sw * random(2, 5);
      pg.ellipse(pos.x, pos.y, splatSize);
      if (viscosity < 0.7) {
          for(let i=0; i<5; i++) {
              let dVec = p5.Vector.random2D().mult(splatSize * random(1, 2));
              pg.ellipse(pos.x + dVec.x, pos.y + dVec.y, random(2, splatSize/3));
          }
      }
  }
  prevPos = pos.copy();
}

function applyPhysics(vol, freq) {
    let chaosVal = ui.chaos.value();
    let gravityVal = ui.gravity.value(); 
    
    let angleChangeSpeed = map(chaosVal, 0, 100, 0.0001, 0.2); 
    let n = noise(pos.x * 0.005, pos.y * 0.005, frameCount * angleChangeSpeed);
    let angle = n * TWO_PI * 4; 

    if (freq > 500) { angle += random(-0.5, 0.5) * (freq/1000); }

    let speedVal = ui.speed.value();
    let power = map(vol, 0, 1, 0.5, map(speedVal, 1, 150, 2, 25));
    
    let force = p5.Vector.fromAngle(angle);
    force.mult(power);
    acc.add(force);

    if (gravityVal > 0 && freq > 50) {
        let m = freqToMidi(freq);
        let minHuman = 45; 
        let maxHuman = 75; 
        let targetY = map(m, minHuman, maxHuman, height - 50, 50);
        targetY = constrain(targetY, 0, height);
        let strength = map(gravityVal, 0, 100, 0, 0.8); 
        let gravityForce = createVector(0, (targetY - pos.y) * strength * 0.1);
        acc.add(gravityForce);
        let xWander = (noise(frameCount * 0.1) - 0.5) * map(gravityVal, 0, 100, 0, 10);
        acc.add(createVector(xWander, 0));
    }

    let border = 100;
    let repulsion = createVector(0, 0);
    if (pos.x < border) repulsion.x = 1;      
    if (pos.x > width - border) repulsion.x = -1;
    if (pos.y < border) repulsion.y = 1;       
    if (pos.y > height - border) repulsion.y = -1;
    repulsion.mult(5); 
    acc.add(repulsion);

    vel.add(acc);
    let friction = map(ui.friction.value(), 0, 100, 0.98, 0.85); 
    vel.mult(friction); 
    vel.limit(60); 
    
    pos.add(vel);
    acc.mult(0);
}

function attachSettingsListeners() {
    let allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(el => {
        el.addEventListener('input', saveConfig);
        el.addEventListener('change', saveConfig);
    });
}

function saveConfig() {
    let config = {
        gain: ui.gain.value(),
        speed: ui.speed.value(),
        chaos: ui.chaos.value(),
        friction: ui.friction.value(),
        gravity: ui.gravity.value(),
        alpha: ui.alpha.value(),
        minW: ui.minW.value(),
        maxW: ui.maxW.value(),
        bg: ui.bg.value(),
        paletteIdx: ui.palette.value(),
        colors: {}
    };
    let keys = ["C", "D", "E", "F", "G", "A", "B"];
    keys.forEach(k => { 
        if(ui.colors[k]) config.colors[k] = ui.colors[k].value(); 
    });
    localStorage.setItem('voice_canvas_config', JSON.stringify(config));
}

function loadConfig() {
    let raw = localStorage.getItem('voice_canvas_config');
    if (!raw) return;
    try {
        let c = JSON.parse(raw);
        if(c.gain) ui.gain.value(c.gain);
        if(c.speed) ui.speed.value(c.speed);
        if(c.chaos) ui.chaos.value(c.chaos);
        if(c.friction) ui.friction.value(c.friction);
        if(c.gravity) ui.gravity.value(c.gravity);
        if(c.alpha) ui.alpha.value(c.alpha);
        if(c.minW) ui.minW.value(c.minW);
        if(c.maxW) ui.maxW.value(c.maxW);
        if(c.bg) ui.bg.value(c.bg);
        if(c.paletteIdx) ui.palette.value(c.paletteIdx);
        if (c.colors) {
            for (let k in c.colors) { if (ui.colors[k]) ui.colors[k].value(c.colors[k]); }
        }
    } catch (e) {}
}

function saveToLocalStorage() {
    try {
        let data = pg.canvas.toDataURL();
        localStorage.setItem('voice_canvas_autosave', data);
    } catch (e) {}
}
function restoreDrawing() {
    let savedData = localStorage.getItem('voice_canvas_autosave');
    if (savedData) {
        loadImage(savedData, (img) => { pg.image(img, 0, 0, width, height); });
    }
}

// --- FUNKCE PRO TLAČÍTKA (PŘIDÁNO) ---
function askConfirm(action) {
    let title = select('#confirm-title');
    let text = select('#confirm-text'); // V HTML má být id="confirm-text" nebo jen p
    let modal = select('#confirm-modal');
    let overlay = select('#help-overlay');
    
    // Pokud používáme select(), musíme zajistit, že prvky existují
    if (!title || !modal || !overlay) return;

    pendingAction = action;
    if (action === 'clear') { 
        title.html('CLEAR CANVAS'); 
        // Pokud text element existuje, nastavíme ho
        if(text) text.html('Delete the entire artwork?'); 
    } 
    else if (action === 'save') { 
        title.html('SAVE IMAGE'); 
        if(text) text.html('Download PNG?'); 
    }
    modal.style('display', 'block'); 
    overlay.style('display', 'block');
}

function performConfirmedAction() {
    if (pendingAction === 'clear') { clearLayer(); } 
    else if (pendingAction === 'save') { saveArt(); }
    closeAllModals();
}

function closeAllModals() {
    let hm = select('#help-modal');
    let cm = select('#confirm-modal');
    let ho = select('#help-overlay');
    if(hm) hm.style('display', 'none');
    if(cm) cm.style('display', 'none');
    if(ho) ho.style('display', 'none');
}

function keyPressed() { 
    if (key === 'c' || key === 'C') { askConfirm('clear'); } 
    if (key === 's' || key === 'S') { askConfirm('save'); } 
    if (key === ' ') { toggleMic(); return false; } 
}

function toggleMic() {
    if (!isModelReady && !isRunning) {
        userStartAudio().then(() => { select('#status').html("Starting..."); startPitchDetection(); }); return;
    } 
    isRunning = !isRunning;
    let btn = select('#start-btn');
    if (isRunning) { btn.html("⏸ PAUSE"); btn.style('background-color', '#A44A28'); getAudioContext().resume(); } 
    else { btn.html("▶ RESUME"); btn.style('background-color', '#242754'); }
}

function startPitchDetection() {
  mic.start(() => {
      const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
      pitch = ml5.pitchDetection(modelUrl, getAudioContext(), mic.stream, modelLoaded);
  });
}

function modelLoaded() {
  isModelReady = true; isRunning = true;
  select('#status').html("Ready!");
  select('#start-btn').html("⏸ PAUSE");
  select('#start-btn').style('background-color', '#A44A28');
  getPitch();
}

function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) { currentFreq = frequency; currentNote = midiToNoteName(freqToMidi(frequency)); } else { currentFreq = 0; }
    if (isModelReady) getPitch();
  });
}

function updateGraph(freq, vol) {
    if (!visCtx) return;
    let w = visCanvas.width;
    let h = visCanvas.height;
    
    pitchHistory.push(freq);
    if (pitchHistory.length > w) pitchHistory.shift();

    visCtx.fillStyle = '#1F1724'; 
    visCtx.fillRect(0, 0, w, h);
    
    let minMidi = 36; let maxMidi = 83;
    visCtx.textAlign = "left";

    for (let m = minMidi; m <= maxMidi; m++) {
        let y = map(m, minMidi, maxMidi, h - 10, 10);
        let noteName = midiToNoteName(m); 
        let cleanName = noteName.replace(/[0-9-]/g, ''); 
        let isSharp = cleanName.includes("#");
        let baseName = cleanName.replace("#", "");
        
        let hexColor = '#555';
        if(ui.colors[baseName]) hexColor = ui.colors[baseName].value();
        
        visCtx.beginPath();
        if (baseName === "C" && !isSharp) {
            visCtx.strokeStyle = hexColor; visCtx.globalAlpha = 0.6; visCtx.lineWidth = 1; visCtx.moveTo(0, y); visCtx.lineTo(w, y);
            visCtx.globalAlpha = 1.0; visCtx.font = "bold 14px monospace"; visCtx.fillStyle = hexColor; visCtx.fillText(noteName, 5, y + 4);
        } else if (!isSharp) {
            visCtx.strokeStyle = hexColor; visCtx.globalAlpha = 0.2; visCtx.lineWidth = 1; visCtx.moveTo(0, y); visCtx.lineTo(w, y);
        }
        visCtx.stroke();
    }
    visCtx.lineWidth = 3; visCtx.lineJoin = "round"; visCtx.globalAlpha = 1.0;
    for (let i = 1; i < pitchHistory.length; i++) {
        let f1 = pitchHistory[i-1]; let f2 = pitchHistory[i];
        if (f1 < 50 || f2 < 50) continue;
        let m1 = 69 + 12 * Math.log2(f1 / 440); let m2 = 69 + 12 * Math.log2(f2 / 440);
        let y1 = map(m1, minMidi, maxMidi, h - 10, 10); let y2 = map(m2, minMidi, maxMidi, h - 10, 10);
        let noteName = midiToNoteName(Math.round(m2));
        visCtx.strokeStyle = getMixedColor(noteName).toString();
        visCtx.beginPath(); visCtx.moveTo(i-1, y1); visCtx.lineTo(i, y2); visCtx.stroke();
    }
    // VOLUME BAR
    let barW = 15; let barX = w - barW;
    visCtx.fillStyle = '#111'; visCtx.fillRect(barX, 0, barW, h);
    let barH = vol * h; 
    visCtx.fillStyle = '#43b581'; visCtx.fillRect(barX, h - barH, barW, barH);
    let threshY = h - (0.05 * h);
    visCtx.strokeStyle = '#f04747'; visCtx.lineWidth = 2;
    visCtx.beginPath(); visCtx.moveTo(barX, threshY); visCtx.lineTo(w, threshY); visCtx.stroke();
}

function randomizeBg() { let r = random(1)>0.5?random(20,50):random(200,250); let g = random(1)>0.5?random(20,50):random(200,250); let b = random(1)>0.5?random(20,50):random(200,250); let hexC = '#'+hex(r,2)+hex(g,2)+hex(b,2); ui.bg.value(hexC); saveConfig(); }
function randomizePalette() { let keys = ["C","D","E","F","G","A","B"]; keys.forEach(k => { let r=floor(random(255)); let g=floor(random(255)); let b=floor(random(255)); ui.colors[k].value('#'+hex(r,2)+hex(g,2)+hex(b,2)); }); saveConfig(); }
function changePalette() { let key = ui.palette.value(); if (key === 'custom') return; let colors = PALETTES[key]; if (!colors) return; let noteKeys = ["C", "D", "E", "F", "G", "A", "B"]; for(let i=0; i<7; i++) { if (ui.colors[noteKeys[i]]) ui.colors[noteKeys[i]].value(colors[i]); } saveConfig(); }
function updateBackground() { saveConfig(); }
function getMixedColor(note) { if (note === "--") return color(50); let noteBase = note.replace(/[0-9-]/g, ''); let isSharp = noteBase.includes("#"); let cleanNote = noteBase.replace("#", ""); 
    // Pojistka, kdyby barva nebyla načtená
    if(!ui.colors[cleanNote]) return color(100); 
    let c1 = color(ui.colors[cleanNote].value()); 
    if (!isSharp) return c1; 
    else { 
        let wholeNotes = ["C", "D", "E", "F", "G", "A", "B"]; 
        let idx = wholeNotes.indexOf(cleanNote); 
        let nextNote = wholeNotes[(idx + 1) % 7]; 
        let c2 = color(ui.colors[nextNote].value()); 
        return lerpColor(c1, c2, 0.5); 
    } 
}
function freqToMidi(f) { return Math.round(69 + 12 * Math.log2(f / 440)); }
function midiToNoteName(midi) { let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; let octave = Math.floor(midi / 12) - 1; return notes[midi % 12] + octave; }
function clearLayer() { pg.clear(); localStorage.removeItem('voice_canvas_autosave'); pos=createVector(width/2,height/2); prevPos=pos.copy(); vel.mult(0); }
function saveArt() { let finalCanvas = createGraphics(width, height); finalCanvas.background(ui.bg.value()); finalCanvas.image(pg, 0, 0); save(finalCanvas, 'pollock_art.png'); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); let oldPg = pg; pg = createGraphics(windowWidth, windowHeight); pg.image(oldPg, 0, 0); }