// SCREAMING POLLOCK 50.0 - FIXED
// Autor: [Tvé Jméno]

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

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PALETTES = {
    'pollock': ['#E6DFCD', '#A4A2AD', '#CA762E', '#A44A28', '#E7AC2A', '#242754', '#1F1724'],
    'autumn':  ['#8B4513', '#D2691E', '#DAA520', '#CD853F', '#800000', '#FF8C00', '#556B2F'],
    'spring':  ['#FFB6C1', '#98FB98', '#87CEFA', '#FFFFE0', '#DDA0DD', '#F0E68C', '#E0FFFF'],
    'neon':    ['#FF00FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000', '#7B68EE', '#FF1493'],
    'ocean':   ['#000080', '#0000FF', '#1E90FF', '#00CED1', '#4682B4', '#5F9EA0', '#B0C4DE']
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  pg = createGraphics(windowWidth, windowHeight);
  pg.clear();

  ui.bg = select('#bg-color');
  ui.gain = select('#gain-slider');
  ui.speed = select('#speed-slider');
  ui.chaos = select('#chaos-slider');
  ui.friction = select('#friction-slider');
  ui.alpha = select('#alpha-slider');
  ui.minW = select('#min-width');
  ui.maxW = select('#max-width');
  ui.palette = select('#palette-select');
  
  ui.colors = {};
  NOTES.forEach(n => {
      let clean = n.replace("#", "");
      if(!ui.colors[clean]) ui.colors[clean] = select(`#col-${clean}`);
  });

  visCanvas = document.getElementById('vis-canvas');
  if (visCanvas) visCtx = visCanvas.getContext('2d');

  mic = new p5.AudioIn();
  
  pos = createVector(width/2, height/2);
  prevPos = pos.copy();
  vel = createVector(0, 0);
  acc = createVector(0, 0);
  
  for(let i=0; i<320; i++) pitchHistory.push(0);
  
  console.log("Verze 50.0 Ready.");
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

  // Ticho
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
    let angleChangeSpeed = map(chaosVal, 0, 100, 0.0001, 0.2); 
    let n = noise(pos.x * 0.005, pos.y * 0.005, frameCount * angleChangeSpeed);
    let angle = n * TWO_PI * 4; 

    if (freq > 500) {
        angle += random(-0.5, 0.5) * (freq/1000);
    }

    let speedVal = ui.speed.value();
    let power = map(vol, 0, 1, 0.5, map(speedVal, 1, 150, 2, 25));
    
    let force = p5.Vector.fromAngle(angle);
    force.mult(power);
    acc.add(force);

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

function toggleMic() {
    if (!isModelReady && !isRunning) {
        userStartAudio().then(() => {
            select('#status').html("Startuji...");
            startPitchDetection(); 
        });
        return;
    } 
    isRunning = !isRunning;
    let btn = select('#start-btn');
    let status = select('#status');
    if (isRunning) { 
        btn.html("⏸ PAUZA"); btn.style('background-color', '#A44A28'); 
        status.html("Naslouchám..."); getAudioContext().resume(); 
    } else { 
        btn.html("▶ POKRAČOVAT"); btn.style('background-color', '#242754'); 
        status.html("Pozastaveno."); 
    }
}

function startPitchDetection() {
  mic.start(() => {
      select('#status').html("Načítám AI...");
      const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
      pitch = ml5.pitchDetection(modelUrl, getAudioContext(), mic.stream, modelLoaded);
  });
}

function modelLoaded() {
  isModelReady = true; isRunning = true;
  select('#status').html("Připraveno!");
  select('#start-btn').html("⏸ PAUZA");
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
    
    let minLog = Math.log(65); let maxLog = Math.log(1050);
    let notes = ["C", "D", "E", "F", "G", "A", "B"];
    
    visCtx.textAlign = "left";

    for (let oct = 2; oct <= 5; oct++) {
        for (let n of notes) {
             let offsets = {"C":0, "D":2, "E":4, "F":5, "G":7, "A":9, "B":11};
             let midi = (12 * (oct + 1)) + offsets[n];
             let f = 440 * Math.pow(2, (midi - 69) / 12);
             let y = map(Math.log(f), minLog, maxLog, h-10, 10);
             
             let hexColor = ui.colors[n].value();
             
             visCtx.beginPath(); 
             
             if (n === "C") {
                 visCtx.strokeStyle = hexColor; 
                 visCtx.globalAlpha = 0.6;
                 visCtx.lineWidth = 1;
                 visCtx.moveTo(0, y); visCtx.lineTo(w, y);
                 
                 visCtx.globalAlpha = 1.0; 
                 visCtx.font = "bold 12px monospace";
                 visCtx.fillStyle = hexColor; 
                 visCtx.fillText(n + oct, 5, y - 2);
             } else {
                 visCtx.strokeStyle = hexColor; 
                 visCtx.globalAlpha = 0.15;
                 visCtx.lineWidth = 1;
                 visCtx.moveTo(0, y); visCtx.lineTo(w, y);
             }
             visCtx.stroke();
        }
    }
    
    visCtx.lineWidth = 3; 
    visCtx.lineJoin = "round";
    visCtx.globalAlpha = 1.0;
    
    for (let i = 1; i < pitchHistory.length; i++) {
        let f1 = pitchHistory[i-1]; let f2 = pitchHistory[i];
        if (f1 < 50 || f2 < 50) continue;
        let y1 = map(Math.log(f1), minLog, maxLog, h-10, 10);
        let y2 = map(Math.log(f2), minLog, maxLog, h-10, 10);
        let noteName = midiToNoteName(Math.round(69 + 12 * Math.log2(f2/440)));
        visCtx.strokeStyle = getMixedColor(noteName).toString();
        visCtx.beginPath(); visCtx.moveTo(i-1, y1); visCtx.lineTo(i, y2); visCtx.stroke();
    }
}

function randomizeBg() { let r = random(1)>0.5?random(20,50):random(200,250); let g = random(1)>0.5?random(20,50):random(200,250); let b = random(1)>0.5?random(20,50):random(200,250); let hexC = '#'+hex(r,2)+hex(g,2)+hex(b,2); ui.bg.value(hexC); }
function randomizePalette() { let keys = ["C","D","E","F","G","A","B"]; keys.forEach(k => { let r=floor(random(255)); let g=floor(random(255)); let b=floor(random(255)); ui.colors[k].value('#'+hex(r,2)+hex(g,2)+hex(b,2)); }); }
function changePalette() { let key = ui.palette.value(); if (key === 'custom') return; let colors = PALETTES[key]; if (!colors) return; let noteKeys = ["C", "D", "E", "F", "G", "A", "B"]; for(let i=0; i<7; i++) { if (ui.colors[noteKeys[i]]) ui.colors[noteKeys[i]].value(colors[i]); } }
function updateBackground() { /* Input auto-update */ }
function getMixedColor(note) { if (note === "--") return color(50); let noteBase = note.replace(/[0-9-]/g, ''); let isSharp = noteBase.includes("#"); let cleanNote = noteBase.replace("#", ""); let c1 = color(ui.colors[cleanNote].value()); if (!isSharp) return c1; else { let wholeNotes = ["C", "D", "E", "F", "G", "A", "B"]; let idx = wholeNotes.indexOf(cleanNote); let nextNote = wholeNotes[(idx + 1) % 7]; let c2 = color(ui.colors[nextNote].value()); return lerpColor(c1, c2, 0.5); } }
function freqToMidi(f) { return Math.round(69 + 12 * Math.log2(f / 440)); }
function midiToNoteName(midi) { let notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]; let octave = Math.floor(midi / 12) - 1; return notes[midi % 12] + octave; }
function keyPressed() { if (key === 'c' || key === 'C') { clearLayer(); } if (key === 's' || key === 'S') { saveArt(); } if (key === ' ') { toggleMic(); return false; } }
function clearLayer() { pg.clear(); pos=createVector(width/2,height/2); prevPos=pos.copy(); vel.mult(0); }
function saveArt() { let finalCanvas = createGraphics(width, height); finalCanvas.background(ui.bg.value()); finalCanvas.image(pg, 0, 0); save(finalCanvas, 'pollock_art.png'); }
function windowResized() { resizeCanvas(windowWidth, windowHeight); let oldPg = pg; pg = createGraphics(windowWidth, windowHeight); pg.image(oldPg, 0, 0); }