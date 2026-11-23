# The Forest Gate — Game Spec

A short, story-driven **text adventure with a light graphical interface**. The player wakes up in a mysterious forest, finds a locked exit gate, and must explore the forest to find and pull three levers. Each lever lights one gem on top of the gate. When all three gems glow, the gate opens and the game ends.

The game is played mostly by **reading text and choosing where to go** (clickable choices). The GUI makes the story easy to follow: a scene picture for each place, a dialogue box, choice buttons, and a gate status panel showing the three gems.

---

## 1. Tech requirements

- Plain **HTML + CSS + JavaScript**, no frameworks, no build step.
- Files: `index.html`, `style.css`, `game.js` (story data can go in a separate `story.js`).
- Runs by double-clicking `index.html` in a browser (Chrome/Edge). No server, no internet needed.
- **No external images.** All scene art is drawn with CSS and/or inline SVG (simple shapes: tree silhouettes, fog layers, colored gradients). Keep it atmospheric, not detailed.
- Works on a laptop screen (main target) and still usable on a phone (choices stack vertically).
- All game text lives in one data object so it's easy to edit the story without touching the game logic.

---

## 2. Screen layout

```
+------------------------------------------------------+
|  [Gate panel: ◇ ◇ ◇ ]                 [Inventory 🎒] |
|                                                      |
|              SCENE PICTURE (top ~55%)                |
|        (forest drawn in CSS/SVG, changes per place)  |
|                                                      |
+------------------------------------------------------+
|  Location name (small, e.g. "The Clearing")          |
|  Dialogue / narration box (typewriter text)          |
|                                                      |
|  [ Choice 1 ]  [ Choice 2 ]  [ Choice 3 ]            |
+------------------------------------------------------+
```

- **Gate panel** (top-left): three small gem icons. Grey/dim = lever not pulled; glowing (each a different color: red, green, blue) = pulled. Only appears **after** the player has read the note at the gate.
- **Inventory** (top-right): small bag icon; click to see items carried. Starts empty. Only appears once the player picks up their first item.
- **Scene picture**: a different look for each location (see section 5). Fades between scenes (~0.6s).
- **Location name**: shown above the text box.
- **Dialogue box**: dark semi-transparent box, light text.
  - Narration in normal text.
  - The character's own spoken thoughts in *italics* inside quotes, e.g. *"What's going on? Where am I?"*
  - Notes/written things (like the gate note) appear in a parchment-styled box.
- **Choice buttons**: appear only after the text has finished typing. 2–4 choices per screen.

---

## 3. Controls

- **Click / tap** a choice button to choose.
- **Keyboard**: number keys `1`–`4` pick choices; `Space` or `Enter` skips the typewriter animation (shows the full text instantly) or continues.
- Clicking the dialogue box while text is typing also skips to the full text.

---

## 4. Opening sequence (exactly as written)

1. **Black screen.** Nothing for ~1 second.
2. In the **centre** of the black screen, the text fades in (white, serif font, slightly large):
   > One day, I open my eyes ...
3. Hold ~2.5 seconds (or until the player clicks/presses a key), then the text fades out.
4. The screen slowly fades in (~2 seconds) to the **mysterious forest** (The Clearing scene): tall dark trees, drifting fog, faint light from above.
5. The dialogue box appears and the character says:
   > *"What's going on? Where am I?"*
6. A short narration follows, then the first choices appear:
   > I'm lying on soft moss in a small clearing. Tall trees surround me on every side. I don't remember how I got here.
   - **Choices:** `Stand up and look around`

From here the player explores freely.

A small **"Click to start"** title screen before the black screen is allowed (needed so browsers allow audio, if sound is added). Title: **The Forest Gate**.

---

## 5. The world — locations

The forest is a small map of connected places. The player moves by choosing directions/paths.

```
                 [ The Gate ]
                      |
                 [ Clearing ] ---- [ River Bank ] ---- (far bank: [ Lever 2 ])
                /     |
   [ Hollow Oak ]     |
     (Lever 1)   [ Ruined Shrine ]       [ Woodcutter's Hut ]
                     (Lever 3)            (reached from River Bank)
```

### 5.1 The Clearing (start / hub)
- **Look:** dark green, fog, soft beam of light in the middle.
- **First visit text:** *"Paths lead off in different directions. To the north, I think I can see something made of metal between the trees."*
- **Choices:** Go north (toward the metal) · Go west (an enormous old tree) · Go east (sound of running water) · Go south (crumbling stones)

### 5.2 The Gate (north)
- **Look:** a tall iron gate between two stone pillars, fully closed. On top of the gate, **three gem sockets** (dim). A folded note is pinned to the gate.
- **First visit text:** *"A huge iron gate. Beyond it… I can't see anything, just white mist. This must be the way out."* The gate won't open.
- **Choices:** Read the note · Try to open the gate · Go back to the clearing
- **The note** (shown in parchment style):
  > *To leave this forest, find the three levers hidden among the trees. Each lever you pull will wake one stone. When all three shine, the way will open.*
- After reading: the character says *"Three levers… alright. Let's find them."* and the **Gate panel** appears at the top of the screen.
- "Try to open the gate" (before all levers): *"It doesn't move an inch."* Shows how many gems are glowing, e.g. *"Two of the three stones are glowing."*
- When the player returns here, the gem sockets in the scene picture also show which gems are lit.

### 5.3 The Hollow Oak (west) — Lever 1 (easy)
- **Look:** one gigantic hollow tree, roots everywhere, thick vines hanging over the trunk.
- **Text:** *"This tree must be hundreds of years old. There's a dark hollow in the trunk, half hidden behind vines."*
- **Choices:** Pull the vines aside · Look around the roots · Go back to the clearing
  - *Look around the roots* → *"Just roots and mushrooms. Nothing useful."* (back to choices)
  - *Pull the vines aside* → reveals a rusty lever inside the hollow. Choices: Pull the lever · Leave it for now
  - *Pull the lever* → **Lever 1 pulled.** Sound/visual: the red gem lights in the Gate panel with a short glow animation. Narration: *"Somewhere to the north, I hear a deep clunk. A red light flickers through the trees."*
- After pulling, revisiting shows: *"The lever is already down."*

### 5.4 River Bank (east) — Lever 2 (needs an item)
- **Look:** a fast river, blue-grey water, a broken wooden bridge with a big gap in the middle.
- **Text:** *"A river cuts through the forest. On the other side, half covered in moss, I can see something that looks like a lever. But the bridge is broken."*
- **Choices:** Try to jump the gap · Follow the river downstream · Go back to the clearing
  - *Jump the gap* → *"I take a few steps back… then change my mind. The water is too fast."* (no death — the game never kills the player)
  - *Follow the river downstream* → goes to Woodcutter's Hut
- **If the player has the Plank:** new choice `Lay the plank across the gap` → crosses → lever is there. Choices: Pull the lever · Go back across
  - *Pull the lever* → **Lever 2 pulled.** Green gem lights. *"Another clunk echoes from the north. A green glow joins the forest light."*

### 5.5 Woodcutter's Hut (reached from River Bank)
- **Look:** a small abandoned wooden cabin, smoke-less chimney, a pile of wood outside.
- **Text:** *"An old cabin. It looks like no one has been here for years."*
- **Choices:** Look at the woodpile · Go inside · Go back to the river
  - *Woodpile* → *"Logs, mostly rotten. But one long plank looks solid."* Choice: Take the plank → **Plank** added to inventory (inventory icon appears the first time). *"This could be long enough to fix the bridge."*
  - *Go inside* → a table with an old journal. Reading it gives a **hint for the Shrine riddle** (see 5.6): *"…the stones at the shrine only answer to the one who remembers: what goes up but never comes down…"*  (The player can still solve the riddle without reading it.)

### 5.6 Ruined Shrine (south) — Lever 3 (riddle)
- **Look:** a circle of broken grey stones, a stone altar in the middle, faint purple light. A lever is attached to the altar but locked by a stone ring with carved words.
- **Text:** *"Old stones arranged in a circle. On the altar, a lever is locked inside a stone ring. Words are carved into it."*
- **Choices:** Read the carving · Try to pull the lever · Go back to the clearing
  - *Try to pull* (before solving) → *"It's locked tight."*
  - *Read the carving* → riddle:
    > *"What goes up but never comes down?"*
    - Choices: `Your age` · `A bird` · `Smoke` · `A ball`
    - Wrong answer → *"The stones stay silent. Maybe I should think about it more."* (player can try again; no penalty)
    - **Correct: `Your age`** → *"The stone ring turns with a grinding sound and falls open."* Lever unlocked.
  - Then *Pull the lever* → **Lever 3 pulled.** Blue gem lights. *"A third clunk. Blue light. I think that's all of them."*

### 5.7 Order and freedom
- The three levers can be pulled **in any order**.
- The player can find levers **before** reading the gate note. In that case, pulling the lever still works, and the Gate panel appears the moment they read the note (already showing the correct gems lit).
- After any lever is pulled, the character occasionally comments on progress, e.g. *"One down, two to go."* / *"Just one more lever."*

---

## 6. Ending

- When all **three** levers are pulled, the narration adds: *"All three lights… the gate must be open now."*
- At **The Gate**, the scene shows all three gems glowing and the gate standing open, with bright white mist behind it.
- **Choices:** Step through the gate · Not yet (go back to the clearing)
- *Step through the gate* →
  1. Screen fades to **white**.
  2. Text in the centre: *"I step into the light…"*
  3. Fade to **black**.
  4. Centre text, mirroring the opening: *"…and I open my eyes."*
  5. Title card: **The End?** with a `Play again` button.

---

## 7. Game state & logic

Keep one state object, for example:

```js
state = {
  location: "clearing",
  noteRead: false,
  levers: { oak: false, river: false, shrine: false },
  shrineUnlocked: false,
  inventory: [],          // e.g. ["plank"]
  visited: {}             // locations seen before (to show shorter text on return)
}
```

- **First visit vs return visit:** each location has a longer first-visit description and a shorter one on return.
- **Choices are data-driven:** each scene defines its text and a list of choices; each choice can have a condition (e.g. only show "Lay the plank" if the plank is in the inventory) and an effect (change state, go to another scene).
- **Saving:** automatically save the state to `localStorage` after every choice. On the title screen, show `Continue` (if a save exists) and `New game`. Wrap localStorage in try/catch so the game still works if it isn't available.

---

## 8. Look & feel

- **Mood:** mysterious, calm, a bit dreamy — not scary.
- **Colors:** deep greens, dark blues, grey fog; each location has its own accent (Oak = warm brown, River = blue-grey, Hut = muted orange, Shrine = faint purple, Gate = silver/iron).
- **Fog:** slowly drifting semi-transparent layers animated with CSS.
- **Fonts:** a serif font for narration and the opening/ending lines (e.g. Georgia), a clean sans-serif for buttons.
- **Typewriter effect:** ~30 characters per second, skippable.
- **Gem lighting animation:** when a lever is pulled, the matching gem in the Gate panel pulses brightly 2–3 times, then stays glowing.
- **Buttons:** soft, rounded, slightly transparent; highlight on hover.

---

## 9. Sound (optional, off by default)

- A mute/unmute button in a corner.
- If added: soft forest ambience, a "clunk" when a lever is pulled, a chime when a gem lights. Generate sounds with the Web Audio API (no external files), or skip sound entirely in the first version.

---

## 10. Out of scope (first version)

- No combat, no health, no way to die or lose.
- No free character movement with arrow keys — moving is done through choices.
- No multiple endings.

---

## 11. Done when…

- [ ] Opening plays exactly: black screen → "One day, I open my eyes ..." → forest fades in → *"What's going on? Where am I?"*
- [ ] All 6 locations are reachable and each has its own scene picture.
- [ ] The note at the gate explains the three levers and makes the Gate panel appear.
- [ ] Each of the three levers lights its own gem (red, green, blue), in any order.
- [ ] The river needs the plank from the hut; the shrine needs the riddle answer.
- [ ] With three gems lit, the gate opens and the ending plays, with a Play again button.
- [ ] Progress saves and the Continue button works after closing the browser.
- [ ] Number keys and Space/Enter work; layout is usable on a phone.
