# The Forest Gate — Game Spec

A short, story-driven **haunted text adventure with a light graphical interface**. The player wakes up with no memory in a mysterious forest, finds a locked exit gate, and must explore to find and pull three levers. Each lever lights one gem on the gate. When all three glow, the gate opens, and the player must choose: **leave**, or **stay and become the forest's keeper**.

The forest is haunted. Something is always watching, a ghost named **Wren** (the previous keeper) can be talked to, and there are **three endings**. Lore is discovered through notes, carvings, conversation, and a **lore log**.

The game is played by **reading text and choosing where to go** (clickable choices). The GUI shows a scene picture for each place, a dialogue box, choice buttons, a gate status panel, an inventory, and a lore log.

> **Status:** all features below are implemented and syntax-checked. The game has not yet been play-tested end to end in a browser.

---

## 1. Tech requirements

- Plain **HTML + CSS + JavaScript**, no frameworks, no build step.
- Files:
  - `index.html` — page structure and overlays.
  - `style.css` — all styling and animation.
  - `story.js` — **all story content and scene logic** (nodes, text, choices, endings, lore entries, haunting lines).
  - `lang.js` — French and Mandarin translations (English text is the key).
  - `game.js` — engine, scene art (inline SVG), sound (Web Audio), saving, UI.
- Runs by double-clicking `index.html` in a browser (Chrome/Edge). No server, no internet needed. It can also be hosted as static files (e.g. GitHub Pages).
- **No external images, fonts, or audio files.** All scene art is inline SVG/CSS; all sound is generated with the Web Audio API.
- Works on a laptop (main target) and on a phone (choices stack vertically).
- All game text lives in `story.js` (English) and `lang.js` (translations), so the story can be edited without touching the engine.
- Browser storage (all wrapped in try/catch so the game still works without it):

| Key | Purpose |
|---|---|
| `forestGateSave_v1` | the saved game state |
| `forestGateSound` | sound on/off preference |
| `forestGateLang` | chosen language (`en` / `fr` / `zh`) |
| `forestGateEndings` | list of endings the player has completed |

---

## 2. Screen layout

```
+------------------------------------------------------+
|  [Gate panel: ◇ ◇ ◇ ]            [📖 Lore] [🎒 Bag]  |
|                    (toast: "New lore entry: ...")    |
|              SCENE PICTURE (top ~62%)                |
|        (forest drawn in SVG, changes per place,      |
|         with watching eyes, fog, vignette)           |
|                                              [🔇]    |
+------------------------------------------------------+
|  Location name (small, e.g. "The Clearing")          |
|  Dialogue / narration box (typewriter text)          |
|                                                      |
|  [ Choice 1 ]  [ Choice 2 ]  [ Choice 3 ]            |
+------------------------------------------------------+
```

- **Gate panel** (top-left): three gem icons. Dim = lever not pulled; glowing red / green / blue = pulled. Only appears **after** the player has read the note at the gate. Each gem pulses 3 times when its lever is pulled.
- **Lore button 📖** (top-right): appears once the first lore entry is unlocked. Opens the lore log (see section 9).
- **Inventory button 🎒** (top-right, beside the lore button): appears once the player picks up their first item. Opens a small list with item descriptions.
- **Notice (toast)**: a small pill at the top of the scene announces new lore entries for a few seconds.
- **Mute button** (bottom-right of the scene): toggles sound.
- **Scene picture**: a different look for each place, cross-faded (~0.6s). The picture's **full height is always shown**; on wide windows the extra width is filled with dark forest, on narrow windows the sides are trimmed.
- **Dialogue box**: dark semi-transparent, compact, scrolls if a language needs more room. Segment types:
  - Narration — normal text.
  - The character's spoken thoughts — *italic, in quotes*.
  - The forest's whisper — pale glowing italic, in quotes.
  - Wren's speech — pale blue italic, in quotes.
  - Notes / written things — parchment box, line breaks preserved (the notes are rhymes).
- **Choice buttons**: appear only after the text has finished typing. Never more than 4 per screen.

---

## 3. Controls

- **Click / tap** a choice button.
- **Keyboard**: `1`–`4` pick choices; `Space` or `Enter` skips the typewriter animation, or continues when there is exactly one choice.
- Clicking the dialogue box while text is typing skips to the full text.
- Typewriter speed: ~30 characters/second (slower per character in Mandarin).
- Moving the mouse over the scene makes the watching eyes react (see section 8).

---

## 4. Title screen and menus

Shown at launch, over a black background, with the title **The Forest Gate** and the tip *"Best played with headphones and the sound on."*

- **Click to start** (first visit) / **New game** (when a save exists) and **Continue** (only if a save exists).
- **Endings** — opens the endings gallery (section 10).
- **Sound: on/off** — the sound preference. It is remembered; audio itself starts when the player clicks Start or Continue (browsers require a click).
- **🌐 Language** — cycles English → Français → 中文 (see section 12). Remembered.
- The end card has **Play again** and **Home screen** (returns here).

---

## 5. Opening sequence

1. **Black screen.** Nothing for ~1 second.
2. Centre text fades in (white, serif, large): *One day, I open my eyes ...*
3. Hold ~2.5 seconds (or until click/key), then fade out.
4. The screen fades in (~2 seconds) to **The Clearing**.
5. The dialogue box appears: *"What's going on? Where am I?"* followed by narration: *I'm lying on soft moss in a small clearing. Tall trees surround me on every side. I don't remember how I got here.*
6. **Choice:** `Stand up and look around`.

**Guided start:** until the player has read the gate note (or pulled any lever), the Clearing only offers **north to the gate**. The undergrowth blocks every other way. After the note is read, west, east and south open up.

---

## 6. The world — locations

```
                   [ The Gate ]  ← pillars carved with keepers' names
                        |
 [ Hollow Oak ] --- [ Clearing ] --- [ River Bank ] --- (far bank: Lever 2)
   (Lever 1)           |                  |
        |         [ Ruined Shrine ]  [ Woodcutter's Hut ]
 [ Whispering Stone ]    (Lever 3)     (journal, loose page, Wren)
   (hidden trail)
```

Each location has a longer first-visit text and a shorter return text, its own scene art, and its own accent colour.

### 6.1 The Clearing (hub)
- West: Hollow Oak · East: River Bank · South: Ruined Shrine · North: The Gate (the other three unlock after the note is read).

### 6.2 The Gate (north)
- **Look:** tall iron gate between two stone pillars; three gem sockets on the crossbar; a pinned note (until read). With all three gems lit the gate stands open with bright white mist behind it.
- **Choices (closed):** Read the note · Try to open the gate · Examine the pillars · Go back.
- **The note** (rhyme, parchment): *Three levers hide among the trees; / each wakes a stone, and each one frees. / When all three gems begin to glow, / the gate will open. Off you go.* After reading, the Gate panel appears.
- **Try to open:** *"It doesn't move an inch."* plus how many stones glow.
- **Examine the pillars:** hundreds of names are scratched in many hands; the newest is **WREN**, with an empty space beside it (a roster of keepers).
- **Open gate (all three lit):** *Step through the gate* · *Stay and keep the stones* (only if the player read both the journal and the runes) · *Not yet*. Hints appear if only one of the two was read. See section 10.

### 6.3 The Hollow Oak (west) — Lever 1 (easy)
- Choices: Pull the vines aside / Look into the hollow · Look around the roots · Go back.
- Pulling the vines reveals a rusty lever → **Pull the lever** lights the **red** gem.
- **Look around the roots** reveals a worn trail behind the tree → **Follow the faint trail** leads to the Whispering Stone.

### 6.3b The Whispering Stone (hidden, off the oak)
- A silent, bird-less clearing with a tall carved stone on a mossy mound, still fog, and many watching eyes.
- **Read the stone** shows the **prophecy** (rhyme): the forest is haunted and old, it keeps whoever wanders, three stones will wake but few choose to go. Unlocks the "Prophecy" lore entry.

### 6.4 River Bank (east) — Lever 2 (needs the plank)
- A fast river and a broken bridge with a gap. A lever is visible on the far bank.
- *Try to jump the gap* → *"…then change my mind. The water is too fast."* (the player never dies).
- With the **Plank**: *Lay the plank across the gap* (consumes the plank) → *Cross the plank* → **The Far Bank** → *Pull the lever* lights the **green** gem.
- *Follow the river downstream* → Woodcutter's Hut.

### 6.5 Woodcutter's Hut (from the River Bank)
- *Look at the woodpile* → *Take the plank* (the inventory button appears).
- *Go inside* → a table with the **journal**:
  - **The journal** starts as plain prose (the last keeper has kept the gate for years and notices they have started writing in rhyme) and slides into verse about the forest needing a keeper. Reading it unlocks the stay option's first requirement and makes **Wren** appear.
  - **The loose page** (found under the table once **two levers** are pulled): a fully rhymed page, foreshadowing that those who flee are followed beyond the wall by "the eye that watches".
  - **Wren** — see section 9.
- A pale figure is also faintly visible in the cabin window from outside once the journal has been read.

### 6.6 Ruined Shrine (south) — Lever 3 (riddle)
- A circle of broken stones, an altar, and a lever locked in a carved stone ring.
- *Read the carving* → riddle: **"What goes up but never comes down?"** Answers: **Your age** (correct) · A bird · Smoke · A ball. Wrong answers are removed one by one (no penalty) and a *Step away* choice appears.
- Correct → the ring opens → *Pull the lever* lights the **blue** gem.
- **After the lever is pulled, the runes on the ring glow and change.** The narration says so, and *Read the glowing runes* reveals a rhyme: the forest needs a keeper; the wanderer may leave, or stay and keep the light. This unlocks the stay option's second requirement.

### 6.7 Order and freedom
- Levers can be pulled in any order; lever messages adapt to how many are already pulled. After a lever the character comments on progress (*"One down, two to go."* / *"Just one more lever."* / *"All three lights… the gate must be open now."*).

---

## 7. Items and puzzles
- **Plank** (Woodcutter's Hut) → bridges the river gap.
- **Riddle answer** (Your age) → unlocks lever 3.
- **Journal + runes** → unlock the stay option.
- **Loose page, prophecy, Wren's conversation, pillars** → optional lore that enriches the endings.

---

## 8. Haunting systems

The forest should feel watched, not just spooky.

- **Watching eyes:** pairs of pale eyes blink in the trees at the sides of every scene (1 pair at the start, +1 per lever pulled; 6 at the Whispering Stone). Their pupils **follow the mouse**; if the pointer comes close to a pair it **vanishes** and reappears elsewhere a few seconds later.
- **Uneasy thoughts:** every third scene the character adds an unsettling italic thought. They get bolder as more levers are pulled (four pools by lever count). One pool line triggers a footsteps sound.
- **Scripted scares (two, once each):**
  1. After the **2nd lever**, on the next scene: the picture flickers dark, a tall silhouette with pale eyes appears at the edge of the trees for ~1.5 s, with a shriek-and-boom sound and a whisper. The character says: *"Something stood between the trees just now. Tall. Perfectly still. Gone before I could breathe."* Unlocks "The Watchers" lore entry.
  2. After the **3rd lever**: the same, larger and closer, with a heavier growl-and-breath sound: *"It was closer this time. It did not hide."*
- **Mood shift per lever:** each lever deepens the dark vignette and fog and changes the colour tint (neutral → grey-green → sickly yellow-green → dull red).

---

## 9. Wren (ghost keeper) and the lore log

### 9.1 Wren
- **Who:** the previous keeper (uses they/them). Kind, tired, not quite solid. Appears in the cabin once the journal has been read.
- **Conversation:** up to three unanswered topics are offered at a time, plus *Say goodbye*:
  - *What is this place?* — the forest was a garden that grew lonely; a gate was raised and a bargain made: wanderers may leave if someone keeps the three stones awake.
  - *What are the eyes in the trees?* (after the previous one) — wanderers who stayed; lonely, not cruel; they watch closest when someone is about to leave.
  - *Why can't I remember anything?* — the forest takes what you carry and will give your name and memories back, but **only to its keeper**.
  - *How do I leave?* — the gate truly opens; but then the stones go dark and the next wanderer finds no keeper. Wren is tired.
  - *Can I help you?* (after the previous one) — Wren only wants to rest, but will **not** ask the player to stay out of pity.
- **Reason to stay:** staying frees Wren, restores the player's memory, and keeps the next wanderer safe. Leaving costs all of that.
- **At the gate:** if Wren has been met, they appear when the player tries to leave and say something short and understanding.

### 9.2 Lore log (📖)
- Opens a panel titled "Lore: X of 14". Found entries show a title and a short text; unfound entries show `???`. A toast and chime announce each new entry.
- Entries and where they unlock:

| Entry | Unlocked by |
|---|---|
| The Gate | first visiting the gate |
| The Note | reading the note |
| The Roster | examining the pillars |
| The Watchers | the first scare |
| The Keeper's Journal | reading the journal |
| The Loose Page | finding the loose page |
| Wren | meeting Wren |
| The Bargain | asking *What is this place?* |
| The Kept | asking about the eyes |
| The Forest's Offer | asking about memory |
| The Price of Leaving | asking how to leave |
| Wren's Wish | asking if you can help |
| The Prophecy | reading the stone |
| The Glowing Runes | reading the changed runes |

---

## 10. Endings (three)

Reaching the end card **unlocks** that ending in the gallery. All endings use full-screen fades with centred text.

### 10.1 The End? — leave (default)
Step through the gate **without** having read both the journal and the runes: fade to white · *"I step into the light…"* · fade to black · *"…and I open my eyes."* · end card **The End?**

### 10.2 The Keeper — stay
Available at the open gate only if the player read **both the journal and the runes**. Beats:
1. *The light is calling, but the stones need someone to keep them…*
2. Optional beats depending on discoveries (inserted here): **Wren** fades into the mist, thanking the player (if met) · the forest **returns the player's name and memories** (if they asked about memory) · *the prophecy, journal, page and runes were an invitation, and the watchers are the ones who stayed* (if the prophecy and loose page were read).
3. *I step back from the gate… The seasons pass… and one day a stranger opens their eyes…* (looping back to the opening line).
End card: **The Keeper**.

### 10.3 The One Who Escaped — leave knowing everything
If the player could stay (journal + runes read) and chooses to leave:
- First, a **confirmation** where the forest whispers: *"Leaving so soon? … Are you sure? The stones will go dark without you…"* (with Wren's line if met). Choices: *I am leaving. Now.* · *Stay and keep the stones* · *Not yet…*
- Leaving → white fade, *"I step into the light…"*, (Wren sits down in the mist, if met), *"Open sky. Cold air. Behind me, the gate closes without a sound."*, *"I should feel free."*
- Then a **giant blinking eye** appears on black, its pupil looking around, with a red message beneath: **YOU ESCAPED THE FOREST. BUT THE FOREST HAS NOT FINISHED WITH YOU.** (heartbeat at its loudest.)
- End card: **The One Who Escaped**.

### 10.4 Endings gallery (home screen → Endings)
- One box per ending. **Unlocked** boxes show the ending's name and a one-line description. **Locked** boxes show `???`. A counter shows "X of 3 endings found". The end card also shows "Endings found: X of 3".

---

## 11. Sound (Web Audio, off by default, no files)

- A speaker button in the scene and a sound button on the title screen toggle it; the preference is remembered.
- Sound plays **only while a game is running**: silent on the title screen and end card; it also pauses when the browser tab is hidden.
- **Wind:** a very quiet, muffled background.
- **Heartbeat:** starts after the first lever; faster and louder as levers are pulled; loudest at the Whispering Stone and during the giant eye.
- **Whispers:** breathy, panned, with echo, every ~12–22 s (more often as tension rises).
- **Lever sounds:** a clunk, plus a chime when the gem lights.
- **Footsteps:** four soft steps on the "footsteps echo" thought.
- **Scare sounds:** a distinct one for each scare (section 8).
- **After the 3rd lever (urgent / hunted):** a rushing whisper swell then a distant **bell**; a faster heartbeat; a quiet clashing, wavering pad whose pulsing speeds up and pitch creeps up over ~90 s; louder, overlapping, echoing whispers every few seconds; occasional wooden creaks and far-off ghostly wails.
- A whisper accompanies the forest's voice at the leave confirmation.

---

## 12. Languages

- **English** (default), **French** and **Mandarin (simplified)**, switched with the 🌐 button on the title screen only.
- Everything is translated: story, choices, place names, items, notes and rhymes, prophecy, lore entries, endings, the eye message, the menus and the gallery.
- English text is the lookup key; any string missing from `lang.js` falls back to English.
- Chinese uses suitable fonts and a slower typewriter speed.
- Titles: *The Forest Gate* / *Le Portail de la Forêt* / *森林之门*.
- Translations were written by the developer and should be checked by native speakers.

---

## 13. Game state and logic

One state object, saved to `localStorage` after every scene. On the title screen `Continue` appears if a save exists.

```js
state = {
  location, node,                       // where the player is
  noteRead, journalRead, runesRead,     // clue flags
  prophecyRead, pageRead, trailFound,
  levers: { oak, river, shrine },
  shrineUnlocked, oakOpen, planked, plankTaken,
  riddleWrong: [],                      // wrong riddle answers so far
  hasBag, inventory: [],                // e.g. ["plank"]
  visited: {},                          // first-visit text tracking
  steps, scares,                        // uneasy-thought counter; scares shown (0-2)
  lore: [],                             // unlocked lore entry ids
  ghostMet, ghostAsked: [],             // Wren
  ghostWish, ghostOffered               // asked "Can I help?" / asked about memory
}
```

- **Data-driven scenes:** each node in `story.js` defines `loc`, `text(state, firstVisit)` returning segments, and `choices(state)` (each with an optional `if` condition, an optional effect `do`, and a target `go`). Nodes may run an `enter` effect (e.g. unlock a lore entry) and request a whisper sound.
- The engine appends uneasy thoughts and triggers scares; the scene art reflects state (gems lit, plank laid, vines pulled aside, ring open, lever positions, Wren in the window).
- Saving a game mid-ending is not needed; the saved position after an ending is the open gate.

---

## 14. Look & feel

- **Mood:** mysterious and dreamy at first, increasingly haunted and uneasy.
- **Colours:** deep greens, dark blues, grey fog; each location has an accent (Oak = warm brown, River = blue-grey, Hut = muted orange, Shrine = faint purple, Gate = silver/iron, Whispering Stone = pale teal). The mood tint shifts as levers are pulled.
- **Fog:** slowly drifting layers that get denser with each lever.
- **Fonts:** Georgia-style serif for narration; clean sans-serif for buttons; CJK-friendly fonts for Mandarin.
- **Buttons:** soft, rounded, slightly transparent; highlight on hover.
- **Gem animation:** pulses 2–3 times then stays glowing.

---

## 15. Out of scope

- No combat, no health, no way to die or lose.
- No free character movement with arrow keys — moving is done through choices.
- Language can only be changed from the title screen.

---

## 16. Done when…

- [ ] Opening plays exactly: black → "One day, I open my eyes ..." → forest fades in → *"What's going on? Where am I?"*
- [ ] The Clearing only allows north until the gate note is read.
- [ ] All locations (including the Whispering Stone) are reachable and each has its own scene picture.
- [ ] The note explains the three levers and makes the Gate panel appear.
- [ ] Each lever lights its own gem (red, green, blue) in any order; the river needs the plank; the shrine needs the riddle answer; the runes change after the shrine lever.
- [ ] Wren can be met and talked to; the lore log unlocks all 14 entries and shows `???` for the rest.
- [ ] Eyes react to the mouse; both scares trigger once with their sounds; the mood darkens with each lever.
- [ ] All three endings are reachable, each unlocks its box in the gallery, and the end card offers Play again and Home screen.
- [ ] The leave confirmation appears only for players who could stay.
- [ ] Sound plays only during a game; the urgent/haunted sound begins after the third lever.
- [ ] English, French and Mandarin all work and persist.
- [ ] Progress saves and Continue works after closing the browser.
- [ ] Number keys and Space/Enter work; layout is usable on a phone and on wide, short windows.
