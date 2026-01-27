// VOICE CANVAS - KANDINSKY MODE (FULL SETTINGS SYNC)

let audioContext, mic, pitch;
let isModelReady = false;
let isRunning = false;
let pg;

let currentFreq = 0;
let currentNote = "--";
let pitchHistory = [];
let colorHistory = [];
let lastDrawTime = 0;

let visCtx, visCanvas;
let pendingAction = null;

const NOTES_LIST = ["C", "D", "E", "F", "G", "A", "B"];

const KANDINSKY_MAPPING = {
    'C': { col: '#0000FF', shape: 'circle' },
    'D': { col: '#FF0000', shape: 'rect' },
    'E': { col: '#FFD700', shape: 'triangle' },
    'F': { col: '#000000', shape: 'line' },
    'G': { col: '#FFFFFF', shape: 'spiral' },
    'A': { col: '#FFA500', shape: 'triangle' },
    'B': { col: '#800080', shape: 'rect' }
};

const PALETTES = {
    'kandinsky_true': [],
    'pollock': ['#E6DFCD', '#A4A2AD', '#CA762E', '#A44A28', '#E7AC2A', '#242754', '#1F1724'],
    'rainbow': ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'],
    'autumn':  ['#8B4513', '#D2691E', '#DAA520', '#CD853F', '#800000', '#FF8C00', '#556B2F'],
    'neon':    ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000', '#7B68EE', '#FF1493'],
    'ocean':   ['#000080', '#0000FF', '#1E90FF', '#00CED1', '#4682B4', '#5F9EA0', '#B0C4DE']
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(windowWidth, windowHeight);
  pg.clear();

  restoreDrawing();
  loadConfig(); 
  attachSettingsListeners();

  setInterval(saveToLocalStorage, 2000);

  visCanvas = document.getElementById('vis-canvas');
  if (visCanvas) visCtx = visCanvas.getContext('2d');

  mic = new p5.AudioIn();
  for(let i=0; i<330; i++) {
      pitchHistory.push(0);
      colorHistory.push('#E6DFCD');
  }
  
  console.log("Kandinsky Final Version Ready.");
}

function draw() {
  let bgEl = document.getElementById('bg-color');
  if(bgEl) background(bgEl.value);
  else background('#E6DFCD');
  
  image(pg, 0, 0);

  if (!isRunning || !isModelReady) { if(visCtx) updateGraph(0, 0); return; }

  let rawVol = mic.getLevel();
  let gainEl = document.getElementById('gain-slider');
  let gain = gainEl ? parseFloat(gainEl.value) : 15;
  let vol = rawVol * gain; 
  if (vol > 1) vol = 1;

  updateGraph(currentFreq, vol);
  
  if(currentFreq > 0) {
      let noteEl = document.getElementById('note-display');
      let freqEl = document.getElementById('freq-display');
      if(noteEl) noteEl.innerText = currentNote;
      if(freqEl) freqEl.innerText = Math.round(currentFreq) + " Hz";
  }

  if (vol > 0.1 && currentFreq > 0 && millis() - lastDrawTime > 120) {
      spawnKandinskyShape(vol, currentNote);
      lastDrawTime = millis();
  }
}

// --- PERSISTENCE ---
function attachSettingsListeners() {
    let inputs = document.querySelectorAll('input, select');
    inputs.forEach(el => {
        el.addEventListener('change', saveConfig);
        el.addEventListener('input', saveConfig);
    });
}

function saveConfig() {
    let config = {
        bg: document.getElementById('bg-color').value,
        gain: document.getElementById('gain-slider').value,
        alpha: document.getElementById('alpha-slider').value,
        minW: document.getElementById('min-width').value,
        maxW: document.getElementById('max-width').value,
        chaos: document.getElementById('chaos-slider').value,
        lines: document.getElementById('lines-slider').value,
        aura: document.getElementById('aura-slider').value,
        outline: document.getElementById('outline-slider').value,
        half: document.getElementById('half-slider').value,
        nofill: document.getElementById('nofill-slider').value,
        palette: document.getElementById('palette-select').value,
        notes: {}
    };
    NOTES_LIST.forEach(n => {
        config.notes[n] = {
            col: document.getElementById(`col-${n}`).value,
            shape: document.getElementById(`shape-${n}`).value
        };
    });
    localStorage.setItem('kandinsky_settings', JSON.stringify(config));
}

function loadConfig() {
    let raw = localStorage.getItem('kandinsky_settings');
    if (!raw) return; 

    try {
        let c = JSON.parse(raw);
        if(c.bg) document.getElementById('bg-color').value = c.bg;
        if(c.gain) document.getElementById('gain-slider').value = c.gain;
        if(c.alpha) document.getElementById('alpha-slider').value = c.alpha;
        if(c.minW) document.getElementById('min-width').value = c.minW;
        if(c.maxW) document.getElementById('max-width').value = c.maxW;
        if(c.chaos) document.getElementById('chaos-slider').value = c.chaos;
        if(c.lines) document.getElementById('lines-slider').value = c.lines;
        if(c.aura) document.getElementById('aura-slider').value = c.aura;
        if(c.outline) document.getElementById('outline-slider').value = c.outline;
        if(c.half) document.getElementById('half-slider').value = c.half;
        if(c.nofill) document.getElementById('nofill-slider').value = c.nofill;
        if(c.palette) document.getElementById('palette-select').value = c.palette;

        if (c.notes) {
            NOTES_LIST.forEach(n => {
                if (c.notes[n]) {
                    document.getElementById(`col-${n}`).value = c.notes[n].col;
                    document.getElementById(`shape-${n}`).value = c.notes[n].shape;
                }
            });
        }
    } catch (e) { console.error("Error loading settings", e); }
}

function keyPressed() {
    if (key === 's' || key === 'S') askConfirm('save');
    if (key === 'c' || key === 'C') askConfirm('clear');
    if (key === ' ') { toggleMic(); return false; }
}

// --- KRESLENÍ ---
function spawnKandinskyShape(vol, note) {
    if (!note) return;
    let cleanNote = note.replace(/[0-9-]/g, '').replace('#', ''); 
    if (!NOTES_LIST.includes(cleanNote)) cleanNote = random(NOTES_LIST);

    let colEl = document.getElementById(`col-${cleanNote}`);
    let shapeEl = document.getElementById(`shape-${cleanNote}`);
    if (!colEl || !shapeEl) return;

    let assignedShape = shapeEl.value;
    let mainColor = color(colEl.value);
    
    // Načítání hodnot
    let alphaEl = document.getElementById('alpha-slider');
    let sliderAlpha = alphaEl ? parseInt(alphaEl.value) : 255;
    
    let minWEl = document.getElementById('min-width');
    let maxWEl = document.getElementById('max-width');
    let minS = minWEl ? parseInt(minWEl.value) : 5;
    let maxS = maxWEl ? parseInt(maxWEl.value) : 250;
    let size = map(vol, 0.1, 1, minS, maxS);

    let chaosEl = document.getElementById('chaos-slider');
    let chaos = chaosEl ? parseInt(chaosEl.value) : 80;
    
    let outlineEl = document.getElementById('outline-slider');
    let outlineProb = (outlineEl ? parseInt(outlineEl.value) : 30) / 100.0;
    
    let halfEl = document.getElementById('half-slider');
    let halfProb = (halfEl ? parseInt(halfEl.value) : 20) / 100.0;

    let noFillEl = document.getElementById('nofill-slider');
    let noFillProb = (noFillEl ? parseInt(noFillEl.value) : 0) / 100.0;

    // Pozice
    let x, y;
    if (chaos > 80) { x = random(width); y = random(height); } 
    else {
        let spread = map(chaos, 0, 80, 40, width/2);
        x = width/2 + random(-spread, spread);
        y = height/2 + random(-spread, spread);
    }

    pg.push();
    pg.translate(x, y);
    pg.rotate(random(TWO_PI)); 

    // 1. HLAVNÍ FIGURA
    let isHollow = random() < noFillProb;
    if (isHollow) {
        pg.noFill();
    } else {
        mainColor.setAlpha(sliderAlpha);
        pg.fill(mainColor);
    }
    applyStyleAndDraw(assignedShape, size, mainColor, outlineProb, halfProb, isHollow);

    // 2. AURA (BEZ OBRYSU, VŽDY VÝPLŇ)
    let auraEl = document.getElementById('aura-slider');
    let auraProb = (auraEl ? parseInt(auraEl.value) : 30) / 100.0;
    
    if (random() < auraProb) {
        let auraCol = color(mainColor);
        // Aura má průhlednost vypočítanou ze slideru
        auraCol.setAlpha(sliderAlpha * 0.4); 
        
        pg.noStroke(); // Aura nikdy nemá obrys
        pg.fill(auraCol); // Aura má vždy výplň

        let auraSize = size * random(1.3, 2.0);
        let auraShapes = ['circle', 'rect', 'triangle'];
        let availableShapes = auraShapes.filter(s => s !== assignedShape);
        if(availableShapes.length === 0) availableShapes = auraShapes;
        let auraShape = random(availableShapes);
        
        pg.push();
        pg.translate(size*0.1, size*0.1);
        // Vykreslíme auru jako "obyčejnou" figuru bez efektů
        drawShape(auraShape, auraSize, auraCol); 
        pg.pop();
    }

    // 3. EXTRA LINKY
    let linesEl = document.getElementById('lines-slider');
    let lineProb = (linesEl ? parseInt(linesEl.value) : 30) / 100.0;
    
    if (random() < lineProb) {
        pg.stroke(0, 180); 
        pg.strokeWeight(random(1, 3));
        let lLen = size * random(1.5, 3);
        pg.push();
        pg.translate(random(-size/3, size/3), random(-size/3, size/3));
        pg.rotate(random(TWO_PI));
        pg.line(-lLen/2, 0, lLen/2, 0); 
        pg.pop();
    }
    pg.pop();
}

function getRandomContrastColor(baseColor) {
    colorMode(HSB);
    let h = hue(baseColor);
    let s = saturation(baseColor);
    let b = brightness(baseColor);
    let newH = (h + 180 + random(-60, 60)) % 360;
    let newB = b > 50 ? b : 80; 
    let newCol = color(newH, s, newB);
    colorMode(RGB);
    return newCol;
}

function applyStyleAndDraw(type, s, fillCol, outlineP, halfP, isHollow) {
    let needsOutline = isHollow || (random() < outlineP && type !== 'line' && type !== 'spiral');

    if (needsOutline) {
        let contrastCol = getRandomContrastColor(fillCol);
        contrastCol.setAlpha(alpha(fillCol) + 50); 
        pg.stroke(contrastCol);
        pg.strokeWeight(isHollow ? s * 0.08 : s * 0.03);
    } else {
        pg.noStroke();
    }

    if (type === 'circle' && random() < halfP) {
        let start = random(TWO_PI);
        let stop = start + random(PI, PI + HALF_PI);
        let mode = isHollow ? OPEN : PIE; 
        pg.arc(0, 0, s, s, start, stop, mode);
    } else {
        drawShape(type, s, fillCol);
    }
}

function drawShape(type, s, col) {
    if (type === 'circle') { pg.ellipse(0, 0, s); } 
    else if (type === 'rect') { pg.rectMode(CENTER); pg.rect(0, 0, s, s * random(0.6, 1.4)); } 
    else if (type === 'triangle') { let r = s * 0.7; pg.triangle(-r, r, r, r, 0, -r); } 
    else if (type === 'line') { 
        pg.noStroke(); 
        pg.fill(col);
        pg.rectMode(CENTER); 
        pg.rect(0, 0, s * 2, s * 0.15); 
    } 
    else if (type === 'spiral') {
        pg.noFill();
        pg.stroke(col); 
        pg.strokeWeight(s * 0.05);
        pg.strokeCap(ROUND);
        pg.beginShape();
        for(let i=0; i<30; i++) {
            let angle = 0.4 * i; let rad = (s/40) * i * 1.5; 
            pg.vertex(rad * cos(angle), rad * sin(angle));
        }
        pg.endShape();
        pg.noStroke(); 
    }
}

// --- AUDIO & GRAPH ---
function toggleMic() {
    let statusEl = document.getElementById('status');
    let btnEl = document.getElementById('start-btn');
    if (!isModelReady && !isRunning) {
        userStartAudio().then(() => {
            if(statusEl) statusEl.innerText = "Starting...";
            mic.start(() => {
                if(statusEl) statusEl.innerText = "Loading AI...";
                const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
                pitch = ml5.pitchDetection(modelUrl, getAudioContext(), mic.stream, modelLoaded);
            });
        });
        return;
    } 
    isRunning = !isRunning;
    if (isRunning) { 
        if(btnEl) { btnEl.innerText = "⏸ PAUSE"; btnEl.style.backgroundColor = '#A44A28'; }
        getAudioContext().resume(); 
        if(statusEl) statusEl.innerText = "Listening...";
        getPitch();
    } else { 
        if(btnEl) { btnEl.innerText = "▶ RESUME"; btnEl.style.backgroundColor = '#242754'; }
        if(statusEl) statusEl.innerText = "Paused"; 
    }
}
function modelLoaded() {
  isModelReady = true; isRunning = true;
  let statusEl = document.getElementById('status');
  let btnEl = document.getElementById('start-btn');
  if(statusEl) statusEl.innerText = "Ready! Sing now.";
  if(btnEl) { btnEl.innerText = "⏸ PAUSE"; btnEl.style.backgroundColor = '#A44A28'; }
  getPitch();
}
function getPitch() {
  pitch.getPitch(function(err, frequency) {
    if (frequency) { currentFreq = frequency; currentNote = midiToNoteName(freqToMidi(frequency)); } else { currentFreq = 0; }
    if (isModelReady && isRunning) getPitch();
  });
}
function updateGraph(freq, vol) {
    if (!visCtx) return;
    let w = visCanvas.width; let h = visCanvas.height;
    pitchHistory.push(freq); if (pitchHistory.length > w) pitchHistory.shift();
    let currentColorStr = '#E6DFCD';
    if (currentNote !== "--") {
        let base = currentNote.replace(/[0-9-]/g, '').replace("#", "");
        let colEl = document.getElementById(`col-${base}`);
        if(colEl) currentColorStr = colEl.value;
    }
    colorHistory.push(currentColorStr); if (colorHistory.length > w) colorHistory.shift();
    visCtx.fillStyle = '#1F1724'; visCtx.fillRect(0, 0, w, h);
    let minMidi = 36; let maxMidi = 83; visCtx.textAlign = "left";
    for (let m = minMidi; m <= maxMidi; m++) {
        let y = map(m, minMidi, maxMidi, h - 10, 10);
        let noteName = midiToNoteName(m); 
        let cleanName = noteName.replace(/[0-9-]/g, ''); 
        let isSharp = cleanName.includes("#");
        let baseName = cleanName.replace("#", "");
        let hexColor = '#555';
        let colEl = document.getElementById(`col-${baseName}`);
        if(colEl) hexColor = colEl.value;
        visCtx.beginPath();
        if (baseName === "C" && !isSharp) {
            visCtx.strokeStyle = hexColor; visCtx.globalAlpha = 0.6; visCtx.lineWidth = 1; visCtx.moveTo(0, y); visCtx.lineTo(w, y);
            visCtx.globalAlpha = 1.0; visCtx.font = "bold 12px monospace"; visCtx.fillStyle = hexColor; visCtx.fillText(noteName, 5, y + 4);
        } else if (!isSharp) {
            visCtx.strokeStyle = hexColor; visCtx.globalAlpha = 0.2; visCtx.lineWidth = 1; visCtx.moveTo(0, y); visCtx.lineTo(w, y);
        }
        visCtx.stroke();
    }
    visCtx.lineWidth = 3; visCtx.lineJoin = "round"; visCtx.globalAlpha = 1.0;
    for (let i = 1; i < pitchHistory.length; i++) {
        let f1 = pitchHistory[i-1]; let f2 = pitchHistory[i];
        if (f1 < 50 || f2 < 50) continue;
        visCtx.strokeStyle = colorHistory[i];
        visCtx.beginPath();
        let m1 = 69 + 12 * Math.log2(f1 / 440); let m2 = 69 + 12 * Math.log2(f2 / 440);
        let y1 = map(m1, minMidi, maxMidi, h - 10, 10); let y2 = map(m2, minMidi, maxMidi, h - 10, 10);
        visCtx.moveTo(i-1, y1); visCtx.lineTo(i, y2);
        visCtx.stroke();
    }
    let barW = 15; let barX = w - barW;
    visCtx.fillStyle = '#111'; visCtx.fillRect(barX, 0, barW, h);
    let barH = vol * h; visCtx.fillStyle = '#43b581'; visCtx.fillRect(barX, h - barH, barW, barH);
    let threshY = h - (0.05 * h);
    visCtx.strokeStyle = '#f04747'; visCtx.lineWidth = 2;
    visCtx.beginPath(); visCtx.moveTo(barX, threshY); visCtx.lineTo(w, threshY); visCtx.stroke();
}
function freqToMidi(f) { return Math.round(69 + 12 * Math.log2(f / 440)); }
function midiToNoteName(midi) { const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; return notes[midi % 12] + (Math.floor(midi / 12) - 1); }
function saveToLocalStorage() { try { localStorage.setItem('kandinsky_autosave', pg.canvas.toDataURL()); } catch(e){} }
function restoreDrawing() { let saved = localStorage.getItem('kandinsky_autosave'); if(saved) loadImage(saved, img => pg.image(img, 0, 0, width, height)); }
function clearLayer() { pg.clear(); localStorage.removeItem('kandinsky_autosave'); }
function saveArt() { save(pg, 'kandinsky_art.png'); }
function randomizePalette() { 
    NOTES_LIST.forEach(n => {
        let colEl = document.getElementById(`col-${n}`);
        let shapeEl = document.getElementById(`shape-${n}`);
        if(colEl) colEl.value = '#' + hex(random(255), 2) + hex(random(255), 2) + hex(random(255), 2);
        if(shapeEl) { let shapes = ['circle', 'rect', 'triangle', 'line', 'spiral']; shapeEl.value = shapes[floor(random(shapes.length))]; }
    });
    saveConfig();
}
function changePalette() { 
    let sel = document.getElementById('palette-select');
    if(!sel) return;
    let key = sel.value;
    if (key === 'kandinsky_true') {
        NOTES_LIST.forEach(n => {
            if(KANDINSKY_MAPPING[n]) {
                document.getElementById(`col-${n}`).value = KANDINSKY_MAPPING[n].col;
                document.getElementById(`shape-${n}`).value = KANDINSKY_MAPPING[n].shape;
            }
        });
    } else if(PALETTES[key]) {
        let colors = PALETTES[key];
        NOTES_LIST.forEach((n, i) => { document.getElementById(`col-${n}`).value = colors[i % colors.length]; });
    }
    saveConfig();
}
function updateBackground() { saveConfig(); }
function randomizeBg() { 
    let bgEl = document.getElementById('bg-color');
    if(bgEl) bgEl.value = '#' + hex(random(255), 2) + hex(random(255), 2) + hex(random(255), 2);
    saveConfig();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); let oldPg = pg; pg = createGraphics(windowWidth, windowHeight); pg.image(oldPg, 0, 0); }
function askConfirm(action) { pendingAction = action; let title = document.getElementById('confirm-title'); let modal = document.getElementById('confirm-modal'); let overlay = document.getElementById('help-overlay'); if(action === 'clear') title.innerText = 'CLEAR CANVAS?'; if(action === 'save') title.innerText = 'SAVE IMAGE?'; if(modal) modal.style.display = 'block'; if(overlay) overlay.style.display = 'block'; }
function performConfirmedAction() { if (pendingAction === 'clear') { clearLayer(); } else if (pendingAction === 'save') { saveArt(); } closeAllModals(); }
function closeAllModals() { let m1 = document.getElementById('help-modal'); let m2 = document.getElementById('confirm-modal'); let ov = document.getElementById('help-overlay'); if(m1) m1.style.display = 'none'; if(m2) m2.style.display = 'none'; if(ov) ov.style.display = 'none'; }