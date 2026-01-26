// SCREAMING POLLOCK
// Autor: [Tvé Jméno]
// Koncept: Action Painting řízená hlasitostí zvuku

let mic;
// Pollockova barevná paleta (černá, krémová, červená, modrá, žlutá)
let colors = ['#000000', '#F2F2F2', '#A63333', '#264D8C', '#F2C641']; 
let isRunning = false;
let startBtn;

function setup() {
  // Vytvoří plátno přes celé okno
  createCanvas(windowWidth, windowHeight);
  background('#F0EAD6'); // Béžový podklad
  
  // Vytvoření tlačítka pro start (prohlížeče vyžadují interakci pro spuštění mikrofonu)
  startBtn = createButton('ZAČÍT TVOŘIT (Povolit mikrofon)');
  startBtn.position(width / 2 - 100, height / 2);
  startBtn.mousePressed(startAudioContext);
  
  // Instrukce na konzoli
  console.log("Aplikace spuštěna. Čekám na povolení mikrofonu.");
}

function startAudioContext() {
  userStartAudio(); // Povolí audio v prohlížeči
  mic = new p5.AudioIn();
  mic.start();
  isRunning = true;
  startBtn.hide(); // Schová tlačítko
}

function draw() {
  if (!isRunning) return;

  // 1. ANALÝZA: Získání hlasitosti (hodnota 0.0 až 1.0)
  let vol = mic.getLevel();

  // 2. LOGIKA: Rozhodování podle intenzity
  
  // A) ŠEPOT / KLIDNÁ ŘEČ -> Tenké linie (Dripping)
  // Práh 0.01 filtruje úplné ticho a šum pozadí
  if (vol > 0.01 && vol < 0.15) {
    stroke(random(colors));
    strokeWeight(random(1, 4));
    noFill();
    
    // Náhodná pozice
    let x = random(width);
    let y = random(height);
    
    // Bézierova křivka simuluje švih ruky se štětcem
    bezier(
      x, y, 
      x + random(-60, 60), y + random(-60, 60), 
      x + random(-60, 60), y + random(-60, 60), 
      x + random(-150, 150), y + random(-150, 150)
    );
  }

  // B) KŘIK / TLESKNUTÍ -> Cákance (Splashing)
  if (vol > 0.15) {
    // Velikost cákance závisí na hlasitosti
    let size = map(vol, 0.15, 1.0, 30, 200); 
    
    let x = random(width);
    let y = random(height);
    let col = random(colors);
    
    noStroke();
    fill(col);
    
    // Vykreslení hlavního cákance jako shluku kruhů
    for (let i = 0; i < 25; i++) {
      let splashX = x + random(-size/2, size/2);
      let splashY = y + random(-size/2, size/2);
      // Velikost jednotlivých kapek je náhodná
      let dropSize = random(2, size/2.5); 
      ellipse(splashX, splashY, dropSize);
    }
  }
}

// Interaktivita klávesnice
function keyPressed() {
  // 'S' pro uložení díla
  if (key === 's' || key === 'S') {
    saveCanvas('muj_pollock', 'png');
  }
  // 'C' pro vymazání plátna (Clear)
  if (key === 'c' || key === 'C') {
    background('#F0EAD6');
  }
}

// Responsivita: Co dělat při změně velikosti okna
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background('#F0EAD6'); // Bohužel při změně velikosti musíme smazat plátno
}