import { CHAPTERS } from './chapters.ts';
import { ORIGINS } from './origins.ts';
import type { Choice, Mission, Origin, StoryNode } from '../game/types.ts';

// Four distinct field scenes per chapter. Mission assembly supplies encounter
// structure; this text supplies the people, stakes, discoveries, and choices.
const FIELD_SCENES: string[][] = [
  [
    'A ventilation grate has been opened from the other side. In the dust beneath it is a footprint too small for a patrol boot. Someone found this way before you. Someone came back to mark it.',
    'The ledger lists oxygen as a discretionary expense. Beside each denied request is a person’s name. You recognize one. On the last page, a clerk has written a message in the margin: I kept a copy.',
    'The witnesses have brought absurd things: a chipped cup, a spool of red thread, a tin of photographs. You were going to ask them to travel light. Then you see how tightly the oldest woman holds her cup.',
    'The elevator has two controls. One calls it down. The other alerts the Warden. A worker has spent years learning to bridge the contacts between them. He asks for ninety seconds and somebody to watch the corridor.',
  ],
  [
    'Under the aqueduct, a cook stirs a pot that cannot possibly feed everyone. She adds water without looking embarrassed. The camp’s first rule, she says, is that the pot is never empty while somebody is waiting.',
    'The convoy driver has hidden the children beneath sacks of flour. She tells you which trucks hold food and which hold ammunition. The patrol will reach one before you can move both.',
    'The water line crosses a room full of abandoned toys. The Hollow was meant to be a holiday estate. Nobody ever finished building it. You turn a painted wooden animal upright before climbing into the pipe.',
    'The Houndsman knows the name of everyone in camp. Someone has been selling him lists. When you find his runner, the frightened teenager holds up a medicine bottle. The payment was for a sick sister.',
  ],
  [
    'The physician’s rooms have been cleared, but her kettle is still warm. Under the examination table is a patient who refuses to leave without their medical records. They have already been made to start their life over twice.',
    'The sealed clinic contains enough supplies to change one person beyond recognition, or save dozens of wounded people. The physician checks your face as you read the inventory. She has prepared another route. It will be harder.',
    'Your borrowed identity belonged to a person declared dead while they were still alive. In a recording, they insist that their name be useful to somebody. The image freezes before they can say goodbye.',
    'When the lights dim, nobody in the clinic pretends not to be afraid. The physician has drawn a line on the floor around her patients. Beyond it, you can hear the Custodian trying to remember who it was built to protect.',
  ],
  [
    'At the gate, a registrar examines your clothes before your invitation. A servant carrying fresh water passes without being looked at. For a moment you consider how much of an empire is held together by people it refuses to notice.',
    'Two candidates have been locked outside the supply hall as a lesson in initiative. One is furious. The other has begun picking the lock with a broken medal. Neither wants your pity. Both could use a lookout.',
    'Three cells arrive at the tower with three passwords and three plans to leave if the others cannot be trusted. You put the map on the floor. Everyone has to kneel to read it. It is a useful first negotiation.',
    'The champion offers to spare your allies if you admit you do not belong here. Behind him, a junior guard has lowered her weapon. You are no longer the only person waiting to see what belonging means.',
  ],
  [
    'The laboratory keeps separate doors for specimens and staff. Both lead to the same incinerator. A botanist has erased the distinction on the evacuation plan. The amended route is marked EVERYONE.',
    'The researchers call the experimental plants their children. Some of the actual children in the laboratory think that is funny. One insists on carrying a cutting of the tree that grew outside her window.',
    'The seed bank contains food that will grow in the mine settlements. Its patent register says reproduction without permission is theft. You leave the register behind and take the seeds.',
    'The Matron’s roots have grown through the emergency controls. A technician can cut power, but doing so will freeze the remaining seed trays. You will have to hold the creature while she reroutes the cold rooms.',
  ],
  [
    'Yrsa stops at a line of black stones and removes her gloves. Each stone marks a person forbidden to come home. She adds one for the person she used to be, then walks past it.',
    'The aurora crackles in time with the transmitter. An elder listens to a recorded divine command played at half speed. Beneath the distortion, a bored operator asks when the next shift starts.',
    'The maintenance corridor smells of machine oil. On the wall is a lunch rota. One of the clan warriors begins to laugh, then cannot stop shaking. The world has not become kinder simply because the lie is ordinary.',
    'The false god offers Yrsa a place beside it. A voice that never has to be questioned. She looks at the people waiting below the temple and asks you to keep the channel open.',
  ],
  [
    'A caravan elder ties bells to the last wagon so nobody is silently left behind. By midday the wind is strong enough that you can barely hear them. You count the wagons anyway.',
    'Two settlements claim the cistern. Both have graves to prove they need it. The old engineer points out a blocked overflow pipe: there used to be enough water for both, before somebody found a profit in scarcity.',
    'The beacon is still transmitting the coordinates of a town buried under glass. The operator’s final log is an apology for a delivery that never arrived. You copy the names before resetting its signal.',
    'The dunes begin to move against the wind. The Wyrm is following the caravan’s engines. Your driver offers to draw it away alone. There is enough room in the cab for two people and a much less terrible plan.',
  ],
  [
    'At the curfew checkpoint, a guard is pretending not to see a family trying to cross. His superior is coming down the stairs. He looks at you once, then moves his hand away from the alarm.',
    'The hospital runs on three floors of extension cables and exhausted people refusing to leave. Mara hands you a list of parts. At the bottom, in smaller writing, she has added coffee.',
    'The square is filling with people carrying chairs, not weapons. Your soldiers want to establish a firing line. An old woman asks whether they plan to stand in front of the people or among them.',
    'The Prefect’s orders are clear: the relay must survive, the district need not. Ione can reroute the broadcast so everyone hears the next command. The Prefect has never expected to have an audience.',
  ],
  [
    'The counterfeit banners are better made than yours. Expensive thread, fresh cloth, a wolf embroidered with perfect teeth. The people who saw them arrive did not have the luxury of inspecting the stitching.',
    'The granary doors open onto neatly stacked sacks. Every one has been stamped with the name of a relief fund. Outside, a mother asks which part of the paperwork her hungry son should eat.',
    'The quartermaster wants protection before testimony. He also wants to keep the money. Your scouts found the mass grave he claims not to know about. The truth comes with a person you would rather not need.',
    'The Jackal’s machine wears a recording of your voice as its battle cry. Hearing your own words turned into a threat is worse than the armor. Break the speakers first, someone says. You decide what comes after.',
  ],
  [
    'The dockworkers are sitting beneath the ship’s enormous shadow. A foreman is reading out the names of crew ordered aboard without shore leave. Nobody moves until the final name is spoken.',
    'Through a maintenance window, the planet curves away in impossible silence. Your tether catches on a torn panel. On the other side of the hull, trapped crew are tapping a rhythm against the metal.',
    'The engine crews have heard promises before. They want the right to refuse an order that will kill them. Your officers look uncomfortable. You realize that is probably the point.',
    'The Executor has sealed the bridge and linked the guns to his armor. The mechanic who knows the emergency bypass has never held a weapon. You give her something more useful: a clear route and enough time.',
  ],
  [
    'The anonymous message leads to a café that no longer exists. A waitress from the old place waits at the ruins. She remembers every regular and asks why memory only becomes valuable when someone wants to sell it.',
    'The archive is full of voices. Not dramatic last words: grocery orders, birthday messages, complaints about the weather. Ione pauses over a file of somebody teaching their mother to use a new terminal.',
    'A transmitter operator will broadcast the records, but only if survivors approve the release of their names. Your intelligence officer calls it a delay. A woman waiting outside calls it the first time anyone has asked.',
    'The Veiled Sister offers you the location of a missing friend in exchange for the archive. You cannot tell whether she is lying. You can tell that she intends to keep selling the question.',
  ],
  [
    'The road to the furnace is paved with heatproof tiles. Workers have scratched directions to shade into the grout. The official signage gives only the fastest route. The unofficial route gets people there alive.',
    'An engineer refuses to leave her console. If the reactor goes cold too quickly, a district loses heat for a winter. She is not defending the weapon. She is defending people who cannot afford to move.',
    'The military and civilian circuits share an old junction. There is a way to separate them, but the labels are gone. Three retired technicians come back with tools and argue about which one remembers correctly.',
    'The Engine begins its targeting cycle. On the control screen, the city is only a bright shape. You have eaten there. You know the name of the woman who brought the bread.',
  ],
  [
    'Your old friend has set a place for you at a table long enough to make conversation an effort. The food is what you used to like. He remembers that, at least. You both know you came to discuss something else.',
    'The vault contains arrest lists written before the surrender terms. Beside the names of negotiators are the names of their children. Cassian closes the folder very carefully.',
    'The household staff have already packed. They always knew which way this would go. A cook asks if the evacuation wagons have room for the animals. You find another wagon.',
    'The Oathkeeper calls you faithless. You remember the oath together, word for word. Then you ask him to name one person it is protecting now. For the first time, he has to think.',
  ],
  [
    'The crossing is mostly waiting. People repair clothes, argue over ration flavors, and watch a sky with no weather. Between alarms, you learn the unfamiliar work of being present without giving orders.',
    'The distress call comes from a ship outside your planned route. It might be a trap. The signal includes the sound of somebody trying to keep a frightened passenger calm. That part does not sound rehearsed.',
    'An enemy crew asks what surrender means. No one has given them an answer that does not end in an airlock. You write the terms in plain language and ask your own crews to witness them.',
    'The Admiral calls you reckless. She has calculated every possible ending except a voluntary retreat. You send her the list of civilian ships she will have to destroy to remain correct.',
  ],
  [
    'The landing zone is a disused freight garden. Under imported trees, old workers have built a village out of packing crates. They offer you directions and ask you to keep the fighting away from their water tanks.',
    'The processional stairs bear the names of conquered worlds. Someone has begun adding the names of the builders in chalk. Rain is rare on the moon. There is time to carve them properly.',
    'The palace shelters are clean, empty, and stocked for a century. The district outside has been sleeping in drainage tunnels. A guard says the stores are reserved. You ask for whom, exactly.',
    'The Crown of Ash is large enough to stand above the palace wall. Its operator has been told the district is already evacuated. Ione opens a live feed. Whether the operator looks is a choice you cannot make for them.',
  ],
  [
    'The palace librarian is burning the wrong books on purpose: duplicate menus, old invitations, blank ledgers. The real records are in handcarts behind her desk. She asks you to stop staring and push.',
    'The final execution order is propagating across relays faster than your fleet can jam it. Ione finds a permissions flaw inherited from the very first network. Tyrants, she says, never change their own access codes.',
    'You find palace children hiding in a classroom. They have been told wolves are coming. You put down your weapon before entering. There is a drawing of a sunrise on the wall.',
    'The Sovereign asks what makes you different. The question is not entirely foolish. Outside, people are still deciding whether to trust you. The answer will have to be something you do after winning.',
  ],
];

const DILEMMAS: string[][] = [
  ['A wounded guard blocks the narrow service passage.', 'The ledger clerk wants to disappear without testifying.', 'A family cannot keep up with the witnesses.', 'The elevator can carry the wounded or the seized equipment first.'],
  ['There is one dry sleeping room left in the aqueduct.', 'Food and ammunition are trapped on opposite sides of the convoy.', 'The camp wants to expel a stranger with a house tattoo.', 'The Houndsman’s young runner offers to identify the buyer.'],
  ['The physician has a patient from the enemy garrison.', 'The surgical reserves are also needed by the field hospital.', 'A stolen identity archive includes other fugitives’ locations.', 'The clinic’s remaining power can protect patients or preserve research.'],
  ['A rival candidate has lost their invitation.', 'A guard offers supplies in exchange for the weakest candidates.', 'One cell demands command before it will join the others.', 'The champion’s junior guard is ready to surrender.'],
  ['The escape route passes a locked specimen enclosure.', 'A researcher wants to destroy the patents before leaving.', 'The seed trays are too heavy for one transport.', 'A technician refuses to abandon the last living tree.'],
  ['A clan elder asks you to leave sacred stones untouched.', 'A young priest says he never knew the voice was false.', 'The transmitter can expose the lie or issue commands in the god’s voice.', 'The defeated temple guards are surrounded by an angry crowd.'],
  ['A broken wagon is slowing the entire caravan.', 'Both settlements demand control of the water valve.', 'The beacon can guide refugees or conceal your route.', 'The Wyrm’s operator has abandoned a valuable control core.'],
  ['The checkpoint guard quietly asks for a way out.', 'The hospital needs the batteries reserved for your weapons.', 'A crowd wants to tear down the records office.', 'The Prefect’s staff offer information in exchange for protection.'],
  ['Survivors ask you to take down your own banner.', 'Recovered food could feed the settlements or your advance force.', 'The quartermaster insists on immunity before naming his employer.', 'The Jackal’s crew claim they only followed a contract.'],
  ['A supervisor threatens to report the dockworkers’ families.', 'A trapped marine is sharing air with an injured dockworker.', 'The engineers demand a vote before joining your fleet.', 'The surrendered bridge crew know how to launch the escape pods.'],
  ['The café witness wants her name kept off every record.', 'The archive includes private letters mixed with evidence.', 'The broadcast could endanger survivors who have not agreed to speak.', 'The Sister offers a secret that could secure your political future.'],
  ['The workers want their old wages before repairing the road.', 'A technician has been quietly powering an unauthorized settlement.', 'An elegant shortcut would cut the hospital grid for several days.', 'The targeting controls could make your fleet unstoppable.'],
  ['Your old friend asks that your meeting remain secret.', 'The vault holds both arrest lists and family medical records.', 'A servant offers to burn the estate if you promise revenge.', 'The Oathkeeper yields his blade and waits for your judgment.'],
  ['Civilian captains want a say in the fleet’s route.', 'Answering the distress call gives the blockade more time.', 'Some of your allies want no quarter for enemy crews.', 'The Admiral offers her ships if she can keep command.'],
  ['The freight villagers ask you to reroute the approach.', 'Soldiers want to clear the chalk names for a landing marker.', 'The palace stores could provision the campaign for months.', 'The Crown’s defeated operator is asking to see the people below.'],
  ['The librarian asks you not to destroy an uncomfortable history.', 'The execution network could instead carry orders in your name.', 'Your troops recognize a palace child’s family crest.', 'The throne is empty. Everyone is waiting to see who approaches it.'],
];

const ORIGIN_SCENES: Record<Origin, string[][]> = {
  red: [
    [
      'The shift bell rings thirteen times. That means someone is missing. You follow a trail of dropped ore to the sealed door, where your friend has found a panel warm with sunlight from the other side.',
      'Your mother’s name appears in the ledger beside a denied oxygen allowance. The number is smaller than the cost of an overseer’s dinner. You take a breath that suddenly feels borrowed.',
      'A retired driller recognizes the surface map. He says he saw it as a child and was told it was a fairy tale. He walks with you, carrying his granddaughter on his shoulders.',
      'Warden Vey calls your escape a theft of company property. For the first time you understand he is not talking about the equipment. Mara puts her hand on your shoulder. Keep breathing, she says.',
    ],
    [
      'At the Hollow, nobody asks how much ore you can cut. The question makes you feel useless before you recognize it as freedom. Mara gives you a cup and a place beside the fire.',
      'The convoy carries the same brand of rations your mine withheld after bad shifts. You know how long a family can make one tin last. You also know they should never have had to.',
      'You clear the water line with a tool you have held since childhood. For once, the work makes your own life better. You discover that you do not hate labor. You hate what was done with yours.',
      'The runner wears red thread beneath a stolen jacket. He says you would have done the same thing for your family. You are not sure he is wrong. You are sure there has to be another way.',
    ],
    [
      'The Carver studies your hands before your face. She can give you the body of a Gold. She cannot promise that people who loved you before will find the change easy. You ask whether love ever was.',
      'The operation will take months of recovery, compressed into a room where the war will have to wait for you. Mara promises to keep telling you ordinary news. You need something to come back to.',
      'The new face in the glass has golden eyes. The first thing you do is check whether your hands still shake when you are afraid. They do. You find this unexpectedly reassuring.',
      'The final procedure is done. You stand taller in the clinic doorway, changed in bone and blood. You are a Gold now to every scanner the empire owns. Beneath the new face, the mine runner remembers every name.',
    ],
  ],
  gold: [
    [
      'Your first independent command is an escort detail beneath your family’s estate. The prisoners carry tools, not weapons. One calls you by a childhood nickname. She used to clean your room.',
      'The ledger is signed with your house seal. Every deprivation was authorized by somebody who sat at your dinner table. Cassian waits while you decide whether to read the next page.',
      'The witnesses expect a trap when you remove the house crest. You cannot blame them. You walk at the back of the column where they can see whether you raise your weapon.',
      'Warden Vey offers to report the incident as youthful confusion. Go upstairs, he says, and everything will remain yours. Behind you, the people in the elevator stop speaking.',
    ],
    [
      'At the Hollow, the cook hands you a knife and a pile of vegetables. No bow. No title. Cassian is already at work beside you, cutting them badly and defending the results.',
      'Your family’s supplies are in the convoy. The serial numbers prove it. For the first time, you sign for a delivery without knowing whether the people receiving it will thank you.',
      'You volunteer for watch and discover you do not know how to wake somebody gently. Every lesson arrives with an embarrassment. Nobody in camp seems to consider this fatal.',
      'The Houndsman offers to return you to your family. His contract includes a bonus if you appear repentant. Cassian asks whether there is extra for looking disappointed in them.',
    ],
    [
      'The Carver has treated people injured by your house’s enforcers. She gives you the inventory to carry. You are grateful she has found a useful thing for you to do with your hands.',
      'Your genetic clearance opens the clinic doors. It is the first time your birthright has been useful without first making somebody else smaller. You keep the doors open behind you.',
      'Your new identity removes the family name. The rest of you is unchanged. The empty space on the document is frightening until Cassian points out that you can write something better there.',
      'You hold the clinic while others recover from the Carving. Nobody can remake your conscience for you. Leaving your house was an action; becoming someone worth following will be a practice.',
    ],
  ],
  obsidian: [
    [
      'The broken machine’s map leads from the ice to a warm tunnel. A priest says you will be cursed if you open the last door. You hear human voices on the other side, asking for help.',
      'The ledger counts clan children as military assets before they can walk. Yrsa reads it twice. Then she reads the names aloud so neither of you can pretend the page was just numbers.',
      'You have never guided anyone through a mine. The mine workers have never seen the ice. Between your maps, a route appears that neither group could have found alone.',
      'Warden Vey wears the sigil of one of your gods on a cheap keychain. You spend one terrible moment wanting to laugh. Then he reaches for the elevator lock.',
    ],
    [
      'The Hollow is warmer than you know how to sleep in. Yrsa finds you outside, watching unfamiliar stars through the haze. She brings two blankets and does not tell you to go back inside.',
      'The convoy’s prisoners include a clan child dressed for a sacred journey. You cut the ceremonial bindings. The child asks if the gods are angry. You tell them the truth: you do not know the gods.',
      'The camp has no shrine. You set a plain stone beside the fire for the people you want to remember. By evening, others have placed small things beside it. No one tells anyone how to pray.',
      'The Houndsman has a recording of the priests ordering your capture. Yrsa asks him to play it again. She wants to remember how ordinary the command sounds now.',
    ],
    [
      'The Carver offers to remove the tracking implants the priests called blessings. She explains each instrument before touching you. You had not realized that a healer could ask permission.',
      'The clinic has records of generations of polar warriors. Your family’s lineage is filed beneath production figures. You carry the records out under your own arm.',
      'The new identity does not change your face, your height, or your Color. It changes the fact that a distant room believes it owns those things. Yrsa says that is surgery enough.',
      'At the clinic threshold, you put your hand over the place the implant used to be. Silence answers. For the first time, it feels like something you chose.',
    ],
  ],
};

const RETURN_LINES = [
  'On the return route, the company is quieter. The objective is complete, but people are not objectives. You remember who hesitated, who helped, and who will need someone to sit beside them tonight.',
  'The supplies are secured. The witnesses are moving. For a little while, the plan is simply to bring everybody home. You decide that is enough of a victory to name.',
  'Your companion takes the first watch. Before sleeping, you add what happened to the field journal. No heroic omissions. If this is going to become a story, it should at least be an honest one.',
  'The way forward is open. Behind you, someone has begun clearing the rubble. The next part of the story belongs to them as much as it belongs to you.',
];

function choices(chapter: number, index: number): Choice[] {
  const rewards = { mercy: 'medkit', defiance: 'alloy', ambition: 'focus-tonic' };
  return [
    {
      id: 'mercy', label: 'Put people first', virtue: 'mercy',
      detail: 'Protect lives and consent. Build trust. Receive a field dressing.',
      response: `You take the time to listen before deciding. It complicates the plan; it also gives the people affected a place in it. ${chapter < 4 ? 'Your companion quietly moves to help.' : 'The company has begun to expect this of you. That expectation feels like a responsibility worth keeping.'}`,
      reward: { item: rewards.mercy, quantity: 1 },
    },
    {
      id: 'defiance', label: 'Break the machinery of control', virtue: 'defiance',
      detail: 'Expose the order behind the harm. Strengthen resistance. Receive alloy.',
      response: `You make the hidden arrangement visible: the command, the chain of authority, the person expected to pay for it. ${index % 2 ? 'Someone copies the evidence before you even ask.' : 'People begin asking questions that cannot be put back into silence.'}`,
      reward: { item: rewards.defiance, quantity: 1 },
    },
    {
      id: 'ambition', label: 'Secure the company’s advantage', virtue: 'ambition',
      detail: 'Prioritize resources and leverage. Gain credits and a focus draught.',
      response: `You choose the advantage that will keep the campaign moving. The result is useful. ${chapter > 7 ? 'Your oldest companion waits until you are alone to ask what you intend to do with all this power.' : 'You tell yourself you will use it well. Someone will be watching to see whether you do.'}`,
      reward: { credits: 35 + chapter * 10, item: rewards.ambition, quantity: 1 },
    },
  ];
}

function assembly(origin: Origin): Mission[] {
  return CHAPTERS.flatMap(chapter => chapter.missions.map((title, index) => {
    const originOpening = ORIGIN_SCENES[origin][chapter.id]?.[index];
    const opening = originOpening ?? (index === 0 ? chapter.opening : FIELD_SCENES[chapter.id][index]);
    const pool = chapter.enemyPool;
    const level = chapter.level + index;
    const last = chapter.id === 15 && index === 3;
    const nodes: StoryNode[] = [
      { kind: 'story', title, text: opening, speaker: chapter.id < 3 ? ORIGINS[origin].name + ' origin' : 'Field journal' },
      {
        kind: 'explore', title: 'Read the ground',
        text: `${chapter.objectives[index]} The direct route is watched. Your companion finds two quieter approaches. Choose how to enter; both routes lead to the objective.`,
        choices: [
          { id: 'shelter', label: 'Follow the sheltered route', detail: 'Recover 15% health before the first encounter.', response: 'You move through cover and take a moment to bind old wounds. Your companion checks the road ahead.', virtue: 'mercy' },
          { id: 'overlook', label: 'Scout the overlook', detail: 'Recover 25% focus. Begin the first battle with an extra burst charge.', response: 'From higher ground, the patrol’s pattern becomes clear. You wait until every person is in position.', virtue: 'defiance' },
          { id: 'salvage', label: 'Search the abandoned route', detail: 'Find 30 credits and a useful field supply.', response: 'The old passage takes longer, but people have left useful things behind. You take only what no one is coming back for.', virtue: 'ambition' },
        ],
      },
      { kind: 'battle', title: 'The outer patrol', text: 'Movement ahead. Watch their intentions and choose your opening.', enemies: [pool[index % 5], pool[(index + 1) % 5]] },
      { kind: 'story', title: 'What the maps leave out', text: FIELD_SCENES[chapter.id][index], speaker: 'On the ground' },
      { kind: 'cache', title: 'A cache left for the next traveler', text: 'A small circle is scratched into the wall. Inside a sheltered recess, someone has left supplies with a note: take what gets you home.', reward: { item: index % 2 ? 'focus-tonic' : 'medkit', quantity: 2, credits: 24 + chapter.id * 9 } },
      { kind: 'battle', title: 'Hold the passage', text: 'A second formation moves to cut off the route. Break their guard before their heavy attacks land.', enemies: [pool[(index + 2) % 5], pool[(index + 3) % 5]] },
      { kind: 'choice', title: 'The person behind the order', text: DILEMMAS[chapter.id][index], choices: choices(chapter.id, index) },
      { kind: 'battle', title: 'Beyond the checkpoint', text: 'The path narrows. The defenders know where you must go. Use your companion and your burst charges to turn the opening.', enemies: chapter.id < 3 ? [pool[(index + 4) % 5], pool[index % 5]] : [pool[(index + 4) % 5], pool[index % 5], pool[(index + 2) % 5]] },
      { kind: 'rest', title: 'A moment between alarms', text: 'Your companion finds a defensible corner. You share water, repair a strap, and let your hands stop shaking. Recover 45% health and 40% focus.' },
      { kind: 'story', title: index === 3 ? 'At the threshold' : 'The final approach', text: `${chapter.objectives[index]} ${index === 3 ? chapter.opening : RETURN_LINES[(index + chapter.id) % 4]}`, speaker: 'Your companion' },
      { kind: 'battle', title: index === 3 ? 'The chapter’s reckoning' : 'Clear the way home', text: index === 3 ? 'Your opponent holds the last route forward. Their strongest attack has a warning. Use it.' : 'One final formation stands between the company and a safe return.', enemies: index === 3 ? [chapter.boss] : [pool[(index + 1) % 5], pool[(index + 3) % 5], ...(chapter.id >= 5 ? [pool[index % 5]] : [])], boss: index === 3 },
      { kind: 'story', title: last ? 'The empty throne' : 'What remains', text: chapter.id === 2 && index === 3 ? ORIGIN_SCENES[origin][2][3] + ' ' + chapter.ending : index === 3 ? chapter.ending : RETURN_LINES[index], speaker: 'Field journal' },
    ];
    if (last) nodes.push({
      kind: 'choice', title: 'What comes after the wolf?', text: 'You have won the right to decide. That does not mean the right should belong only to you. The room waits. Beyond it is a world full of people who will have to live with your answer.',
      choices: [
        { id: 'common-dawn', label: 'Give the future to everyone', virtue: 'mercy', detail: 'Open a constituent assembly. A shared, unfinished dawn.', response: 'You move the chairs into a circle. It takes longer than claiming the throne. That is the point.' },
        { id: 'wandering-wolf', label: 'Break the throne and walk away', virtue: 'defiance', detail: 'Dismantle the office. Return to the people still beyond its reach.', response: 'You leave the doors open. The first argument begins before you reach the stairs. Nobody asks permission to have it.' },
        { id: 'golden-cage', label: 'Take power until the world is ready', virtue: 'ambition', detail: 'Become a provisional ruler. A safer world with a familiar shadow.', response: 'You promise that this will be temporary. Your companions have heard those words before. They stay close enough to remind you.' },
      ],
    });
    return {
      id: `c${String(chapter.id + 1).padStart(2, '0')}-m${index + 1}`,
      chapter: chapter.id, index, title, subtitle: chapter.objectives[index],
      location: chapter.id === 0 ? ORIGINS[origin].home : chapter.title,
      region: chapter.id === 0 ? origin === 'gold' ? 'citadel' : origin === 'obsidian' ? 'tundra' : 'mine' : chapter.region,
      level, minutes: 12 + (index === 3 ? 5 : 2),
      nodes,
      reward: { xp: 160 + level * 38, credits: 100 + chapter.id * 32, item: index === 3 ? `t${Math.min(8, Math.floor(chapter.id / 2) + 1)}-${chapter.id % 2 ? 'armor' : 'relic'}` : 'alloy' },
    };
  }));
}

const CAMPAIGNS: Record<Origin, Mission[]> = {
  red: assembly('red'),
  gold: assembly('gold'),
  obsidian: assembly('obsidian'),
};
export const campaign = (origin: Origin): Mission[] => CAMPAIGNS[origin];

export function huntMission(chapterId: number, run: number): Mission {
  const chapter = CHAPTERS[Math.max(0, Math.min(15, chapterId))];
  const pool = chapter.enemyPool;
  return {
    id: `hunt-${chapter.id}-${run}`, chapter: chapter.id, index: 0,
    title: ['The supply road', 'A signal unanswered', 'Night watch', 'The long way home'][run % 4],
    subtitle: 'A repeatable patrol. Gain experience, credits, supplies, and forge materials.',
    location: chapter.title, region: chapter.region, level: chapter.level + 2, minutes: 7, side: true,
    nodes: [
      { kind: 'story', title: 'People still need a road home', text: 'A trader has missed the rendezvous. It may be a broken axle or something worse. Your companion gathers the medical supplies. You take the route markers.' },
      { kind: 'battle', title: 'The broken checkpoint', text: 'A patrol has taken the trader’s route.', enemies: [pool[run % 5], pool[(run + 2) % 5]] },
      { kind: 'cache', title: 'The trader’s thanks', text: 'The axle was broken, too. You help set it right. The trader insists on sharing the supplies.', reward: { item: 'medkit', quantity: 2, credits: 60 + chapter.id * 18 } },
      { kind: 'battle', title: 'Escort to the ridge', text: 'The route home is almost clear.', enemies: [pool[(run + 3) % 5], pool[(run + 4) % 5]] },
      { kind: 'story', title: 'One more safe arrival', text: 'The trader reaches the lights at the ridge. Someone is waiting with a kettle. This story will not make it into a military history. You write it down anyway.' },
    ],
    reward: { xp: 200 + chapter.level * 22, credits: 120 + chapter.id * 25, item: run % 3 === 2 ? 'sunstone' : 'alloy' },
  };
}

export const ENDINGS: Record<string, { title: string; text: string }> = {
  'common-dawn': { title: 'The common dawn', text: 'The new assembly is noisy, slow, and impossible to command. It is also the first room in which all Colors can refuse an order. You help build it, then learn to be one voice among many. Some mornings, that is harder than fighting. On the best mornings, it is the reason you fought.' },
  'wandering-wolf': { title: 'The wandering wolf', text: 'The throne becomes building material. You travel where the old maps end, carrying tools as often as a weapon. People tell different stories about what you did. You listen to the ones that name somebody else. A world without masters will need more than one hero.' },
  'golden-cage': { title: 'The golden cage', text: 'You sign the first decree with a hand that remembers chains. The hospitals receive supplies. The roads open. Your friends keep a chair at your table and challenge you every day. Whether this is a beginning or another version of the old story will be decided by the power you are willing to relinquish.' },
};
