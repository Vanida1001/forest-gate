/* ============================================================
   The Forest Gate — all story text and scene logic lives here.
   Segments: n = narration, t = spoken thought (italic, quoted),
             note = written note (parchment box).
   Node fields:
     loc     – location key (picks the scene picture)
     locName – optional override of the displayed location name
     visit   – key used to remember "first visit" for longer text
     enter   – optional effect run when the node is shown
     text    – function (state, firstVisit) -> array of segments
     choices – function (state) -> array of { label, if, do, go }
   ============================================================ */

const n = s => ({ k: 'n', s });
const t = s => ({ k: 't', s });
const note = s => ({ k: 'note', s });

const count = s => Object.values(s.levers).filter(Boolean).length;
const has = (s, item) => s.inventory.includes(item);
// The player may only roam once they have read the gate note (or already pulled a lever, e.g. an older save).
const free = s => s.noteRead || count(s) > 0;
const BACK = { label: 'Go back to the clearing', go: 'clearing' };

const progress = s => {
  const c = count(s);
  if (c === 1) return t('One down, two to go.');
  if (c === 2) return t('Just one more lever.');
  return n('All three lights… the gate must be open now.');
};

const STORY = {
  title: 'The Forest Gate',

  opening: 'One day, I open my eyes ...',
  endings: {
    leave: {
      beats: [
        { text: 'I step into the light…', from: '#fff', color: '#2a3a30' },
        { text: '…and I open my eyes.', from: '#000', color: '#fff' }
      ],
      title: 'The End?',
      blurb: 'You stepped through the gate and woke to a new day, none the wiser.'
    },
    stay: {
      beats: [
        { text: 'The light is calling. But I think of the journal, and the runes carved into the stone. The stones are glowing now, and someone has to keep them.', from: '#0b1f1a', color: '#e4ece6' },
        { text: 'I step back from the gate. The mist settles, patient as ever, and the pillars dim to a soft silver.', from: '#000', color: '#cfe8c8' },
        { text: 'The seasons pass. The forest and I learn to understand each other.', from: '#000', color: '#cfe8c8' },
        { text: 'And one day, somewhere in the moss, a stranger opens their eyes…', from: '#000', color: '#fff' }
      ],
      // extra beat inserted after the first one when the player found every clue
      extra: s => (s.prophecyRead && s.pageRead)
        ? [{ text: 'The prophecy, the journal, the loose page, the runes. They were never warnings. They were an invitation. And now I know who has been watching me all this time: the ones who stayed before me.', from: '#0b1f1a', color: '#e4ece6' }]
        : [],
      title: 'The Keeper',
      blurb: 'You stayed to tend the stones, and the forest kept you.'
    },
    escaped: {
      beats: [
        { text: 'I step into the light…', from: '#fff', color: '#2a3a30' },
        { text: 'Open sky. Cold air. Behind me, the gate closes without a sound.', from: '#dfe6df', color: '#2a3a30' },
        { text: 'I should feel free.', from: '#000', color: '#fff' }
      ],
      eye: 'YOU ESCAPED THE FOREST. BUT THE FOREST HAS NOT FINISHED WITH YOU.',
      title: 'The One Who Escaped',
      blurb: 'You knew what the forest wanted, and left anyway. It is still watching.'
    }
  },

  locations: {
    clearing: { name: 'The Clearing',      accent: '#7bd88f' },
    gate:     { name: 'The Gate',          accent: '#b8c4d0' },
    oak:      { name: 'The Hollow Oak',    accent: '#c08a52' },
    river:    { name: 'River Bank',        accent: '#8fb2c8' },
    hut:      { name: "Woodcutter's Hut",  accent: '#d29a5a' },
    shrine:   { name: 'The Ruined Shrine', accent: '#b18cf0' },
    stone:    { name: 'The Whispering Stone', accent: '#9fc4c0' }
  },

  /* Unsettling thoughts that surface now and then; the more levers
     are pulled, the bolder the watcher gets. */
  watching: [
    [ // no levers yet
      'I could swear something just moved between the trees.',
      'The woods have gone quiet, as if holding their breath.',
      'I feel eyes on the back of my neck. When I turn, nothing is there.',
      'A twig snaps somewhere behind me. I do not dare look.'
    ],
    [ // one lever
      'Two pale lights between the trunks… they blinked.',
      "I'm not alone here. I haven't been since I woke up.",
      'My footsteps echo a half-second late, as if something walks in step with me.'
    ],
    [ // two levers
      'The trees seem closer than before.',
      'Something whispered my name. It was the wind. It had to be the wind.',
      'Whatever is watching me is getting bolder.'
    ],
    [ // three levers
      "It's watching. It's patient. It wants to see what I'll choose.",
      'The whole forest is leaning in to listen.'
    ]
  ],

  scares: [
    'Something stood between the trees just now. Tall. Perfectly still. Gone before I could breathe.',
    'It was closer this time. It did not hide.'
  ],

  prophecy: 'Who wanders here, lost and alone,\nis watched by eyes that are not their own.\nThe trees lean in, the shadows creep;\nthis forest has a hunger deep.\nThree stones will wake, and a door will show,\nbut few are those who choose to go.\nThe wood is haunted, the wood is old,\nand it keeps its wanderers, as it is told.',

  items: {
    plank: { name: 'Plank', desc: 'A long, solid plank. Maybe it could fix the bridge.' }
  },

  riddle: {
    answers: [
      { id: 'age',   label: 'Your age', correct: true },
      { id: 'bird',  label: 'A bird' },
      { id: 'smoke', label: 'Smoke' },
      { id: 'ball',  label: 'A ball' }
    ]
  },

  leverText: {
    oak:    s => 'I pull the lever. It is stiff and rusty, but it gives. Somewhere to the north, I hear a deep clunk. A red light flickers through the trees.',
    river:  s => count(s) === 1
      ? 'I pull the lever. Somewhere to the north, I hear a deep clunk. A green glow joins the forest light.'
      : 'Another clunk echoes from the north. A green glow joins the forest light.',
    shrine: s => count(s) === 3
      ? 'A third clunk. Blue light. I think that\'s all of them.'
      : 'Another clunk, far to the north. A blue light shivers between the trees.'
  },

  nodes: {

    /* ---------------- Opening ---------------- */
    intro: {
      loc: 'clearing',
      text: () => [
        t("What's going on? Where am I?"),
        n("I'm lying on soft moss in a small clearing. Tall trees surround me on every side. I don't remember how I got here.")
      ],
      choices: () => [{ label: 'Stand up and look around', go: 'clearing' }]
    },

    /* ---------------- Clearing ---------------- */
    clearing: {
      loc: 'clearing', visit: 'clearing',
      text: (s, first) => {
        const out = first
          ? [n('I get to my feet and brush the moss off my clothes. The undergrowth is thick on every side but one.'),
             t('There is a path to the north. Between the trees, I think I can see something made of metal.')]
          : free(s)
            ? [n('The clearing again. Now that I know what I am looking for, paths open up to the north, west, east and south.')]
            : [n('The clearing again. Thick undergrowth blocks every way but the path north.')];
        if (count(s) === 3) out.push(n('A bright white glow spills through the trees to the north.'));
        return out;
      },
      choices: s => [
        { label: 'Go north (toward the metal)', go: 'gate' },
        { label: 'Go west (an enormous old tree)', if: () => free(s), go: 'oak' },
        { label: 'Go east (sound of running water)', if: () => free(s), go: 'river' },
        { label: 'Go south (crumbling stones)', if: () => free(s), go: 'shrine' }
      ]
    },

    /* ---------------- Gate ---------------- */
    gate: {
      loc: 'gate', visit: 'gate',
      text: (s, first) => {
        if (count(s) === 3) {
          const out = [
            first ? t('A huge iron gate…') : n('The gate.'),
            n('It stands wide open. Its three gems blaze red, green and blue, and bright white mist pours out between the pillars.')
          ];
          if (s.journalRead && !s.runesRead) out.push(t('The journal hinted at something besides escape. Maybe the shrine has more to say.'));
          if (s.runesRead && !s.journalRead) out.push(t('The runes spoke of a keeper. Maybe someone wrote about it somewhere.'));
          if (s.prophecyRead) out.push(n('The prophecy said the forest keeps whoever wanders. The mist glows. Somewhere behind me, a branch creaks.'));
          if (s.journalRead && s.runesRead) out.push(t('The journal. The runes. "The stones need a keeper." The mist is warm and inviting… but the gems seem to glow a little brighter when I hesitate. Is that what the forest wants?'));
          return out;
        }
        if (first) return [
          t("A huge iron gate. Beyond it… I can't see anything, just white mist. This must be the way out."),
          n("I push on the bars. The gate won't open. A folded note is pinned to it.")
        ];
        return [n('The iron gate stands closed between its stone pillars.' + (s.noteRead ? '' : ' A folded note is pinned to it.'))];
      },
      choices: s => count(s) === 3
        ? [{ label: 'Step through the gate', go: st => (st.journalRead && st.runesRead) ? 'gate_confirm' : '@end:leave' },
           { label: 'Stay and keep the stones', if: () => s.journalRead && s.runesRead, go: '@end:stay' },
           { label: 'Not yet (go back to the clearing)', go: 'clearing' }]
        : gateChoices()
    },

    // Only reached by players who could stay: the forest tries to keep them.
    gate_confirm: {
      loc: 'gate', whisper: true,
      text: () => [
        n('I take a step toward the light. The gems flicker and dim, one by one, as if the stones are holding their breath. Then something breathes against my ear.'),
        { k: 'w', s: 'Leaving so soon? They all say they want to go… Are you sure? The stones will go dark without you. And I have grown so fond of watching you.' },
        n('The mist waits. Behind me, the trees creak closer, as if leaning in to hear my answer.')
      ],
      choices: () => [
        { label: 'I am leaving. Now.', go: '@end:escaped' },
        { label: 'Stay and keep the stones', go: '@end:stay' },
        { label: 'Not yet…', go: 'gate' }
      ]
    },

    gate_note: {
      loc: 'gate', visit: 'note',
      enter: s => { Game.readNote(); },
      text: (s, first) => {
        const out = [note('Three levers hide among the trees;\neach wakes a stone, and each one frees.\nWhen all three gems begin to glow,\nthe gate will open. Off you go.')];
        if (first) out.push(t("Three levers… alright. Let's find them."));
        return out;
      },
      choices: () => [
        { label: 'Try to open the gate', go: 'gate_try' },
        BACK
      ]
    },

    gate_try: {
      loc: 'gate',
      text: s => {
        const c = count(s);
        const msg = c === 0 ? 'None of the stones are glowing.'
          : c === 1 ? 'One of the three stones is glowing.'
          : 'Two of the three stones are glowing.';
        return [n('I pull at the bars with all my strength.'), t("It doesn't move an inch."), n(msg)];
      },
      choices: () => gateChoices()
    },

    /* ---------------- Hollow Oak (Lever 1) ---------------- */
    oak: {
      loc: 'oak', visit: 'oak',
      text: (s, first) => first
        ? [t("This tree must be hundreds of years old. There's a dark hollow in the trunk, half hidden behind vines.")]
        : [n('The Hollow Oak towers over me, its roots snaking across the ground.')],
      choices: s => oakChoices(s)
    },
    oak_roots: {
      loc: 'oak',
      text: s => s.trailFound
        ? [t('Just roots and mushrooms. Nothing useful.'),
           n('Then I notice something: between two huge roots, the moss is worn flat. A faint trail winds away behind the tree.')]
        : [t('Just roots and mushrooms. Nothing useful.')],
      choices: s => oakChoices(s)
    },

    /* ---------------- The Whispering Stone (hidden, lore) ---------------- */
    stone: {
      loc: 'stone', visit: 'stone',
      text: (s, first) => first
        ? [n('The trail ends in a small, silent clearing. No birds sing here. On a mound of mossy steps, an old stone rises, taller than I am, and the fog lies perfectly still around it.'),
           t('Why does it feel like the whole forest is leaning in to look at me?')]
        : [n('The silent clearing. The tall stone waits on its mound, and the fog does not move.')],
      choices: () => [
        { label: 'Read the stone', go: 'stone_read' },
        { label: 'Go back to the oak', go: 'oak' }
      ]
    },
    stone_read: {
      loc: 'stone',
      enter: () => { Game.state().prophecyRead = true; },
      text: () => [
        n('Words are carved into the stone, worn but clear:'),
        note(STORY.prophecy),
        t('Haunted… that would explain the eyes.')
      ],
      choices: () => [
        { label: 'Step back from the stone', go: 'stone' },
        { label: 'Go back to the oak', go: 'oak' }
      ]
    },
    oak_vines: {
      loc: 'oak',
      text: s => s.levers.oak
        ? [n('The lever is already down.')]
        : [n('I pull the vines aside. Inside the hollow, a rusty lever sticks out of the old wood.')],
      choices: s => s.levers.oak
        ? [{ label: 'Step back', go: 'oak' }, BACK]
        : [{ label: 'Pull the lever', do: () => Game.pull('oak'), go: 'oak_pulled' },
           { label: 'Leave it for now', go: 'oak' }]
    },
    oak_pulled: {
      loc: 'oak',
      text: s => [n(STORY.leverText.oak(s)), progress(s)],
      choices: () => [{ label: 'Look around the tree', go: 'oak' }, BACK]
    },

    /* ---------------- River Bank (Lever 2) ---------------- */
    river: {
      loc: 'river', visit: 'river',
      text: (s, first) => first
        ? [t('A river cuts through the forest. On the other side, half covered in moss, I can see something that looks like a lever. But the bridge is broken.')]
        : [n(s.planked ? 'The river rushes past. The plank spans the gap in the bridge.' : 'The river rushes past the broken bridge.')],
      choices: s => riverChoices(s)
    },
    river_jump: {
      loc: 'river',
      text: () => [n('I take a few steps back… then change my mind. The water is too fast.')],
      choices: s => riverChoices(s)
    },
    river_laid: {
      loc: 'river',
      text: () => [n('I slide the plank across the gap. It wobbles, then settles with a thud. It should hold.')],
      choices: () => [{ label: 'Cross the plank', go: 'river_far' }, { label: 'Step back', go: 'river' }]
    },
    river_far: {
      loc: 'river', locName: 'The Far Bank', visit: 'riverfar',
      text: (s, first) => s.levers.river
        ? [n('The far bank. The mossy lever is already down.')]
        : first
          ? [n('I edge across the plank, arms out, and reach the far bank. Half buried in moss, an old lever juts from a stone.')]
          : [n('The far bank. The mossy lever waits among the stones.')],
      choices: s => [
        { label: 'Pull the lever', if: () => !s.levers.river, do: () => Game.pull('river'), go: 'river_pulled' },
        { label: 'Go back across', go: 'river' }
      ]
    },
    river_pulled: {
      loc: 'river', locName: 'The Far Bank',
      text: s => [n(STORY.leverText.river(s)), progress(s)],
      choices: () => [{ label: 'Go back across', go: 'river' }]
    },

    /* ---------------- Woodcutter's Hut ---------------- */
    hut: {
      loc: 'hut', visit: 'hut',
      text: (s, first) => first
        ? [t('An old cabin. It looks like no one has been here for years.')]
        : [n('The abandoned cabin stands quiet among the trees.')],
      choices: () => [
        { label: 'Look at the woodpile', go: 'hut_wood' },
        { label: 'Go inside', go: 'hut_in' },
        { label: 'Go back to the river', go: 'river' }
      ]
    },
    hut_wood: {
      loc: 'hut',
      text: s => s.plankTaken
        ? [n('Just a pile of rotten logs now.')]
        : [t('Logs, mostly rotten. But one long plank looks solid.')],
      choices: s => [
        { label: 'Take the plank', if: () => !s.plankTaken, do: () => Game.addItem('plank'), go: 'hut_plank' },
        { label: 'Step back', go: 'hut' }
      ]
    },
    hut_plank: {
      loc: 'hut',
      text: () => [n('I pick up the plank. It is heavy, but sound.'), t('This could be long enough to fix the bridge.')],
      choices: () => [{ label: 'Go back to the river', go: 'river' }, { label: 'Look around the hut', go: 'hut' }]
    },
    hut_in: {
      loc: 'hut', visit: 'hutin',
      text: (s, first) => {
        const out = first
          ? [n('Inside, dust hangs in the air. A table stands in the middle of the room with an old journal on it.')]
          : [n('The dusty room. The old journal lies on the table.')];
        if (count(s) >= 2 && !s.pageRead) out.push(n('Now that the forest is glowing, I notice a floorboard under the table. It looks loose.'));
        return out;
      },
      choices: s => [
        { label: 'Read the journal', go: 'hut_journal' },
        { label: 'Look under the table', if: () => count(s) >= 2 && !s.pageRead, go: 'hut_page' },
        { label: 'Read the loose page', if: () => s.pageRead, go: 'hut_page' },
        { label: 'Go back outside', go: 'hut' }
      ]
    },
    hut_page: {
      loc: 'hut',
      enter: () => { Game.state().pageRead = true; },
      text: () => [
        n('Under the loose floorboard, a folded page is tucked away, brittle and brown. The handwriting matches the journal, but here every line rhymes, as if the writer could no longer stop.'),
        note('I woke the stones, and the gate swung wide,\nand the forest begged me to stay inside.\nThose who refuse and flee its call\nare followed still beyond the wall,\nfor the eye that watches sees us all.'),
        t('Followed… beyond the wall?')
      ],
      choices: () => [{ label: 'Step away from the table', go: 'hut_in' }, { label: 'Go back outside', go: 'hut' }]
    },
    hut_journal: {
      loc: 'hut',
      enter: () => { Game.state().journalRead = true; },
      text: () => [
        note("I have kept this gate for many years now. Each spring I mean to leave, and each spring the forest asks me to wait a little longer. I do not know when I began writing like this, in rhyme, but the words come easier that way.\nThe forest needs a keeper, or the stones will sleep,\nand the next lost wanderer will wander and weep.\nSo I think I will stay, and the light I will keep."),
        t('Whoever wrote this never left. Was it a choice?')
      ],
      choices: () => [{ label: 'Step away from the table', go: 'hut_in' }, { label: 'Go back outside', go: 'hut' }]
    },

    /* ---------------- Ruined Shrine (Lever 3) ---------------- */
    shrine: {
      loc: 'shrine', visit: 'shrine',
      text: (s, first) => first
        ? [t('Old stones arranged in a circle. On the altar, a lever is locked inside a stone ring. Words are carved into it.')]
        : s.levers.shrine ? [n('The altar is quiet now. The lever is down, and the runes glow softly.')]
        : s.shrineUnlocked ? [n('The stone ring lies open around the lever.')]
        : [n('The old stones stand in their circle. The lever is still locked inside its ring.')],
      choices: s => shrineChoices(s)
    },
    shrine_locked: {
      loc: 'shrine',
      text: () => [t("It's locked tight.")],
      choices: s => shrineChoices(s)
    },
    riddle: {
      loc: 'shrine',
      text: () => [n('The carved words read:'), t('What goes up but never comes down?')],
      choices: () => riddleChoices(false)
    },
    riddle_wrong: {
      loc: 'shrine',
      text: () => [n('The stones stay silent. Maybe I should think about it more.')],
      choices: () => riddleChoices(true)
    },
    shrine_open: {
      loc: 'shrine',
      text: () => [n('The stone ring turns with a grinding sound and falls open.')],
      choices: () => [
        { label: 'Pull the lever', do: () => Game.pull('shrine'), go: 'shrine_pulled' },
        { label: 'Leave it for now', go: 'shrine' }
      ]
    },
    shrine_runes: {
      loc: 'shrine',
      enter: () => { Game.state().runesRead = true; },
      text: () => [
        note('Three stones wake, one door shall gleam;\nthe forest needs a keeper, so it seems.\nGo if you wish, the way is clear,\nor stay, and keep the light burning here.'),
        t('The forest needs a keeper. So the way out is not the only choice here…')
      ],
      choices: s => shrineChoices(s)
    },
    shrine_pulled: {
      loc: 'shrine',
      text: s => [n(STORY.leverText.shrine(s)), n('Behind me, the runes carved into the stone ring have started to glow. The words look different now, as if they have changed.'), progress(s)],
      choices: () => [{ label: 'Read the glowing runes', go: 'shrine_runes' }, { label: 'Look around the shrine', go: 'shrine' }, BACK]
    }
  }
};

/* ---------- shared choice lists ---------- */
function gateChoices() {
  return [
    { label: 'Read the note', go: 'gate_note' },
    { label: 'Try to open the gate', go: 'gate_try' },
    BACK
  ];
}

function oakChoices(s) {
  return [
    { label: 'Pull the vines aside', if: () => !s.oakOpen, do: () => { Game.state().oakOpen = true; }, go: 'oak_vines' },
    { label: 'Look into the hollow', if: () => s.oakOpen, go: 'oak_vines' },
    { label: 'Look around the roots', if: () => !s.trailFound, do: () => { Game.state().trailFound = true; }, go: 'oak_roots' },
    { label: 'Follow the faint trail behind the tree', if: () => s.trailFound, go: 'stone' },
    BACK
  ];
}

function riverChoices(s) {
  return [
    { label: 'Try to jump the gap', if: () => !s.planked, go: 'river_jump' },
    { label: 'Lay the plank across the gap', if: () => has(s, 'plank') && !s.planked,
      do: () => { Game.removeItem('plank'); Game.state().planked = true; }, go: 'river_laid' },
    { label: 'Cross the plank', if: () => s.planked, go: 'river_far' },
    { label: 'Follow the river downstream', go: 'hut' },
    BACK
  ];
}

function shrineChoices(s) {
  if (s.levers.shrine) return [{ label: 'Read the glowing runes', go: 'shrine_runes' }, BACK];
  if (s.shrineUnlocked) return [
    { label: 'Pull the lever', do: () => Game.pull('shrine'), go: 'shrine_pulled' }, BACK];
  return [
    { label: 'Read the carving', go: 'riddle' },
    { label: 'Try to pull the lever', go: 'shrine_locked' },
    BACK
  ];
}

function riddleChoices(withLeave) {
  const s = Game.state();
  const list = STORY.riddle.answers
    .filter(a => !s.riddleWrong.includes(a.id))
    .map(a => a.correct
      ? { label: a.label, do: () => { s.shrineUnlocked = true; s.riddleWrong = []; }, go: 'shrine_open' }
      : { label: a.label, do: () => { s.riddleWrong.push(a.id); }, go: 'riddle_wrong' });
  if (withLeave) list.push({ label: 'Step away from the stones', do: () => { s.riddleWrong = []; }, go: 'shrine' });
  return list;
}
