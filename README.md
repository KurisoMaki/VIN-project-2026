# Audio Improvisation

**Author:** Sofiia Kucherenko
**Course:** VIN (Visual Informatics), FIT VUT

**Audio Improvisation** is an experimental web tool that transforms your voice (or any sound) into abstract visual art in real-time. It uses AI to detect pitch and volume, allowing you to paint without hands.

**[LAUNCH APP](https://kurisomaki.github.io/VIN/)**

---

## Quick Start

1. **Open the link** in a modern browser (Chrome, Edge, Safari).
2. **Allow microphone access** when prompted.
3. Click the **START** button.
4. **Make noise!** Sing, whistle, clap, or play music.
   * **Loudness** controls the **Size** of the brush/shape.
   * **Pitch** (High/Low notes) controls the **Color** and **Shape**.

---

## Creative Modes

You can switch between two distinct artistic styles:

### 1. POLLOCK MODE (Action Painting)
Simulates the "drip painting" technique. The brush moves physically across the canvas.
* **Physics:** The brush has momentum and viscosity.
* **Pitch Gravity:** Low notes can pull the brush down, high notes pull it up.
* **Speed:** Controls how fast the brush flies based on your volume.

### 2. KANDINSKY MODE (Geometric Abstraction)
Focuses on the relationship between geometry and sound.
* **Musical Shapes:** Specific notes trigger specific shapes (e.g., C = Circle, E = Triangle).
* **Geometry:** Generates overlapping shapes, wireframes, and auras.
* **Static:** Shapes appear where they land; they do not move around.

---

## Parameters Guide

Open the menu to adjust settings:

### Colors & Customization
* **Custom Note Colors:** You are not limited to presets! Click on any note color box (C, D, E...) in the menu to assign a specific color to that pitch.
* **Background:** Click the background color picker to change the canvas color.
* **Randomize:** Use the Random buttons to instantly generate a random color palette or background.

### Global Settings
* **SENSITIVITY:** Microphone gain. Increase if the app doesn't react to your voice.
* **OPACITY:** Transparency of the paint.
* **CHAOS:** Adds randomness to position or line jitter.
* **MIN/MAX SIZE:** Sets the range of brush sizes based on volume.

### Kandinsky Specifics
* **AURA %:** Chance to draw a soft, transparent shadow.
* **OUTLINE %:** Chance to draw a contrasting border around the shape.
* **NO FILL %:** Chance to draw a wireframe (empty) shape.
* **HALF %:** Chance to draw only a semi-circle (arc).

---

## Keyboard Shortcuts

* **SPACEBAR**: Start / Pause listening.
* **S**: Save the current artwork as an image.
* **C**: Clear the canvas.

---

## Technologies & Tools Used

This project utilizes modern web technologies and creative coding libraries:

* **p5.js:** Main library used for canvas rendering, visual generation, and audio input handling (p5.sound).
* **ml5.js:** Machine learning library used for pitch detection.
* **CREPE Model:** A high-accuracy pitch detection model (Deep Convolutional Neural Network) utilized within ml5.js to identify musical notes from the audio stream in real-time.

---

### Note on Pitch Detection
The app detects musical notes (C, D, E...).
* **Low Pitch** (Deep voice) = Colors like Blue/Purple (Default).
* **High Pitch** (High voice) = Colors like Yellow/White (Default).