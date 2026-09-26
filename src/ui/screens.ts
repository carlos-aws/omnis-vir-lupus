import { ABILITIES, ELEMENTS } from '../data/abilities.ts';
import { CHAPTERS } from '../data/chapters.ts';
import { ENEMIES, ENEMY_MAP } from '../data/enemies.ts';
import { ITEMS, ITEM_MAP, RARITY_COLORS, SLOTS } from '../data/items.ts';
import { COMPANIONS, GROWTH, NEEDS, ORIGINS } from '../data/origins.ts';
import { campaign, ENDINGS } from '../data/story.ts';
import { INTENTS } from '../game/combat.ts';
import { formatTime } from '../game/math.ts';
import { abilitiesFor, activeMission, activeNode, ACHIEVEMENTS, chapterOf, colorOf, growthOf, levelOf, nextMission, readiness, readinessLabel, statsOf, storyCompleted, upgradeCost, xpForLevel } from '../game/state.ts';
import type { GameState, View } from '../game/types.ts';
import { companionSprite, enemyUrl, itemUrl, portraitUrl } from '../render/sprites.ts';
import { escape, button, meter, number, title } from './kit.ts';
import { icon, wolfMark } from './icons.ts';

export interface UIState {
  view: View;
  inventoryFilter: string;
  journalTab: string;
  selectedChapter: number;
  battleTab: 'actions' | 'skills' | 'supplies';
  selectedEnemy: string;
  boosted: boolean;
  acting: boolean;
  saveStatus: string;
}

const NAV: { id: View; name: string; icon: string; key: string }[] = [
  { id: 'camp', name: 'The Hollow', icon: 'camp', key: 'H' },
  { id: 'world', name: 'The world', icon: 'world', key: 'M' },
  { id: 'character', name: 'Character', icon: 'person', key: 'C' },
  { id: 'inventory', name: 'Inventory', icon: 'bag', key: 'I' },
  { id: 'market', name: 'Quartermaster', icon: 'market', key: 'Q' },
  { id: 'journal', name: 'Chronicle', icon: 'book', key: 'J' },
];

export function shell(state: GameState, ui: UIState, content: string): string {
  const current = NAV.find(nav => nav.id === ui.view)!;
  return `<div class="game-shell">
    <aside class="sidebar">
      <button class="brand" data-action="nav" data-view="camp" aria-label="Return to the Hollow">${wolfMark()}<span>OMNIS<br>VIR LUPUS</span></button>
      <div class="sidebar-rule"></div>
      <span class="nav-label">YOUR JOURNEY</span>
      <nav aria-label="Game navigation">${NAV.map(nav => `<button class="nav-item ${ui.view === nav.id ? 'active' : ''}" data-action="nav" data-view="${nav.id}" aria-label="${nav.name}" ${ui.view === nav.id ? 'aria-current="page"' : ''}>${icon(nav.icon)}<span>${nav.name}</span><kbd>${nav.key}</kbd></button>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="small-wolf">${wolfMark()}</div><p>Not born.<br><em>Becoming.</em></p><span class="version">INDEPENDENT FAN GAME · 1.0</span><button class="text-button" data-action="credits">Credits & inspiration ${icon('arrow')}</button></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><div class="breadcrumb">${icon(current.icon)}<span>OMNIS VIR LUPUS</span><i>/</i><strong>${escape(state.battle ? 'Encounter' : current.name)}</strong></div>
        <div class="header-actions"><span class="save-status ${ui.saveStatus.startsWith('Saved') ? 'saved' : ''}" id="save-status">${icon('save')}<span>${escape(ui.saveStatus)}</span></span><span class="credits-chip" aria-label="${state.credits} credits">${icon('coin')}${number(state.credits)}</span>
          <button class="icon-button" data-action="help" title="Field guide" aria-label="Open field guide">${icon('help')}</button>
          <button class="icon-button sound-toggle" data-action="sound" title="Toggle sound" aria-label="${state.settings.sound ? 'Mute sound' : 'Enable sound'}">${icon(state.settings.sound ? 'sound' : 'muted')}</button>
          <button class="icon-button fullscreen-toggle" data-action="fullscreen" title="Fullscreen" aria-label="Toggle fullscreen">${icon('fullscreen')}</button>
          <button class="icon-button" data-action="settings" title="Settings and saves" aria-label="Open settings and saves">${icon('settings')}</button>
          <button class="header-avatar" data-action="nav" data-view="character" aria-label="View ${escape(state.name)}"><img src="${portraitUrl(state)}" alt=""></button>
        </div>
      </header>
      <main id="content" tabindex="-1">${content}</main>
      <footer class="statusbar"><span><i class="status-dot"></i>${escape(readinessLabel(state))}</span><span>${escape(ORIGINS[state.origin].name)} origin · Age ${growthOf(state).age}</span><span>${icon('clock')}${formatTime(state.playSeconds)}<i class="footer-divider"></i>16+ · FICTIONAL VIOLENCE & MATURE THEMES</span></footer>
    </div>
    <nav class="mobile-nav" aria-label="Mobile game navigation">${NAV.filter(nav => nav.id !== 'market').map(nav => `<button data-action="nav" data-view="${nav.id}" class="${ui.view === nav.id ? 'active' : ''}" aria-label="${nav.name}" ${ui.view === nav.id ? 'aria-current="page"' : ''}>${icon(nav.icon)}<span>${nav.name === 'The Hollow' ? 'Camp' : nav.name === 'The world' ? 'World' : nav.name}</span></button>`).join('')}</nav>
  </div>`;
}

function needMeters(state: GameState): string {
  return Object.entries(NEEDS).map(([key, need]) => `<div class="need-row">${icon(need.icon)}<div><div class="need-label"><span>${need.label}</span><span>${Math.round(state.needs[key as keyof typeof state.needs])}%</span></div><div class="thin-meter" role="meter" aria-label="${need.label}" aria-valuenow="${Math.round(state.needs[key as keyof typeof state.needs])}" aria-valuemin="0" aria-valuemax="100"><i style="width:${state.needs[key as keyof typeof state.needs]}%;background:${need.color}"></i></div></div></div>`).join('');
}

function characterCard(state: GameState): string {
  const level = levelOf(state), stats = statsOf(state), stage = growthOf(state);
  return `<section class="panel wolf-card"><div class="panel-heading"><span class="eyebrow">YOUR WOLF</span><span class="level-tag">LVL <b>${level}</b></span></div>
    <div class="portrait-stage ${colorOf(state)}"><div class="portrait-halo"></div><div class="portrait-ground"></div><img src="${portraitUrl(state)}" alt="${escape(state.name)} wearing ${escape(ITEM_MAP[state.equipment.armor ?? '']?.name ?? 'travel clothes')}"><span class="growth-rune">${String(GROWTH.indexOf(stage) + 1).padStart(2, '0')}</span></div>
    <div class="character-identity"><h2>${escape(state.name)}</h2><span class="origin-tag ${colorOf(state)}">${state.carved ? 'CARVED GOLD' : ORIGINS[state.origin].name.toUpperCase()}</span><span class="identity-divider">/</span><span>${stage.name}</span></div>
    <div class="vitals">${meter('Health', state.hp, stats.maxHp, 'health')}${meter('Focus', state.focus, stats.maxFocus, 'focus')}</div>
    <div class="mini-stats"><div>${icon('sword')}<strong>${stats.attack}</strong><span>ATTACK</span></div><div>${icon('shield')}<strong>${stats.defense}</strong><span>DEFENSE</span></div><div>${icon('bolt')}<strong>${stats.speed}</strong><span>SPEED</span></div></div>
    <div class="xp-strip"><span>${level === 80 ? 'A lifetime remembered' : `${number(state.xp - xpForLevel(level))} / ${number(xpForLevel(level + 1) - xpForLevel(level))} XP`}</span><span>${level === 80 ? 'MAX LEVEL' : `LVL ${level + 1}`}</span><div class="thin-meter"><i style="width:${level === 80 ? 100 : (state.xp - xpForLevel(level)) / (xpForLevel(level + 1) - xpForLevel(level)) * 100}%"></i></div></div>
    <button class="card-link" data-action="nav" data-view="character">Character & abilities ${icon('arrow')}</button>
  </section>`;
}

export function campScreen(state: GameState): string {
  const mission = nextMission(state);
  const chapter = CHAPTERS[chapterOf(state)];
  const companion = COMPANIONS.find(c => c.id === state.companion)!;
  const active = activeMission(state);
  return `<div class="camp-heading page-heading"><div><span class="eyebrow">${icon('pin')}MARS · A PLACE BETWEEN BATTLES</span><h1>The Hollow<span class="heading-dot">.</span></h1><p>Keep the fire alive. Keep the human in you.</p></div><span class="world-time">${icon('sun')}SOL ${String(Math.floor(state.playSeconds / 720) + 1).padStart(3, '0')}<span>EARLY LIGHT</span></span></div>
  <div class="camp-grid"><div class="camp-main">
    <section class="landscape-frame camp-landscape" aria-label="An animated pixel art camp in the ruins of a Martian garden">
      <div id="scene-slot" class="scene-slot"></div><div class="scene-vignette"></div>
      <div class="scene-top"><span class="scene-badge"><i></i>SAFE HAVEN</span><button class="scene-icon" data-action="wash" aria-label="Wash and mend" title="Wash and mend">${icon('water')}</button></div>
      <button class="scene-hotspot supply-hotspot" data-action="forage" aria-label="Gather two rations">${icon('bag')}<span>Supply cache</span></button>
      <div class="scene-bottom"><div><span class="eyebrow">SANCTUARY 01</span><strong>A fire worth coming home to.</strong></div><span class="scene-controls">${icon('person')}Tap to walk <i>·</i> WASD <i>·</i> E to interact</span></div>
    </section>
    <div class="section-label"><span>TEND TO YOURSELF</span><span>Small rituals. A stronger tomorrow.</span></div>
    <div class="care-grid">
      <button class="care-card" data-action="care" data-care="meal" ${(state.inventory.ration ?? 0) < 1 ? 'disabled' : ''}><span class="care-symbol warm">${icon('bowl')}</span><span><strong>Share a meal</strong><small>${state.inventory.ration ?? 0} rations in your pack</small></span><span class="care-plus">+</span></button>
      <button class="care-card" data-action="care" data-care="rest"><span class="care-symbol blue">${icon('moon')}</span><span><strong>Take a rest</strong><small>Restore health & focus</small></span><span class="care-plus">+</span></button>
      <button class="care-card" data-action="care" data-care="train" ${state.training >= 3 ? 'disabled' : ''}><span class="care-symbol copper">${icon('swords')}</span><span><strong>Train your blade</strong><small>${3 - state.training} sessions before next sortie</small></span><span class="care-plus">+</span></button>
      <button class="care-card" data-action="care" data-care="talk"><span class="care-symbol green">${icon('heart')}</span><span><strong>Make a connection</strong><small>A quiet word with ${companion.name}</small></span><span class="care-plus">+</span></button>
    </div>
    <section class="mission-card"><div class="mission-number">${state.ending ? icon('sun') : String(chapter.id + 1).padStart(2, '0')}</div><div class="mission-info"><span class="eyebrow">${active ? 'EXPEDITION IN PROGRESS' : state.ending ? 'YOUR STORY CONTINUES' : `CHAPTER ${chapter.id + 1} / 16`}</span><h2>${escape(active?.title ?? mission?.title ?? 'A world after wolves')}</h2><p>${escape(active?.subtitle ?? mission?.subtitle ?? 'The main story is complete. Return to the roads, grow to level 80, and finish the work that does not end with a throne.')}</p><div class="mission-meta"><span>${icon('flag')}${escape(state.ending ? ENDINGS[state.ending].title : chapter.title)}</span><span>${icon('star')}${mission ? `+${number(mission.reward.xp)} XP` : 'LEVEL 80 AWAITS'}</span></div></div>${button(active ? 'Resume expedition' : mission ? 'Continue the story' : 'Explore the world', active ? 'expedition' : mission ? 'continue-story' : 'nav', { className: 'primary', icon: 'arrow', data: 'data-view="world"' })}</section>
    <div class="camp-bottom"><div>${icon('feather')}<span>“${escape(companion.lines[Math.min(companion.lines.length - 1, Math.floor((state.bonds[companion.id] ?? 0) / 25))])}”</span><small>— ${companion.name}</small></div><button class="text-button" data-action="nav" data-view="market">Visit the quartermaster ${icon('arrow')}</button></div>
  </div><aside class="camp-aside">${characterCard(state)}
    <section class="panel needs-card"><div class="panel-heading"><span class="eyebrow">BODY & SPIRIT</span><span class="readiness-chip">${Math.round(readiness(state)) >= 75 ? 'WELL CARED FOR' : 'HOLDING ON'}</span></div>${needMeters(state)}<p class="panel-note">Well cared for: +8% attack. Your needs never cause permanent harm.</p></section>
    <button class="companion-mini panel" data-action="companions"><div class="companion-avatar"><img src="${companionSprite(companion.color).toDataURL()}" alt=""></div><div><span class="eyebrow">BY YOUR SIDE</span><strong>${companion.name}</strong><small>${companion.role} · Bond ${state.bonds[companion.id] ?? 0}</small></div>${icon('chevron')}</button>
  </aside></div>`;
}

function worldMap(state: GameState, selected: number): string {
  const points = CHAPTERS.map((chapter, index) => ({
    chapter, x: 67 + (index % 4) * 170 + (Math.floor(index / 4) % 2 ? 35 : 0),
    y: 82 + Math.floor(index / 4) * 107,
  }));
  return `<div class="world-chart"><svg viewBox="0 0 700 460" role="img" aria-label="Campaign map with sixteen connected regions"><defs><pattern id="map-grid" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M34 0H0v34" fill="none" stroke="#526256" stroke-opacity=".12"/></pattern><radialGradient id="map-light"><stop stop-color="#6e7751" stop-opacity=".2"/><stop offset="1" stop-color="#202c29" stop-opacity="0"/></radialGradient></defs><rect width="700" height="460" fill="#202b28"/><rect width="700" height="460" fill="url(#map-grid)"/><ellipse cx="360" cy="220" rx="370" ry="210" fill="url(#map-light)"/><path d="m-30 170 77-80 67 13 23-32 68 18 64-45 71 10 22 31 77-9 34 50 65 8 100 74-77 21-40 51 14 59-49 10-45 43-66-12-49 25-96-16-68 20-57-65-59-8-44-46Z" fill="#44523d" fill-opacity=".28" stroke="#889077" stroke-opacity=".25"/><path d="m10 325 117-33 72 18 110-70 92 5 95-90 172 59" fill="none" stroke="#76868a" stroke-opacity=".3" stroke-width="6"/><path d="${points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')}" fill="none" stroke="#b89d69" stroke-width="1" stroke-dasharray="4 7" opacity=".45"/>
    ${points.map(({ chapter, x, y }) => `<g class="map-dot ${chapter.id === selected ? 'selected' : ''}" opacity="${chapter.id <= chapterOf(state) ? 1 : 0.45}"><circle cx="${x}" cy="${y}" r="${chapter.id === selected ? 23 : 14}" fill="#26312d" stroke="${chapter.id === selected ? '#dbbe80' : '#77826a'}"/><circle cx="${x}" cy="${y}" r="4" fill="${chapter.id <= chapterOf(state) ? chapter.color : '#536158'}"/><text x="${x}" y="${y + 40}" text-anchor="middle" fill="#b6b9a5" font-size="10" font-family="Barlow, sans-serif">${String(chapter.id + 1).padStart(2, '0')} · ${chapter.region.toUpperCase()}</text></g>`).join('')}<text x="32" y="431" fill="#a19470" font-size="10" letter-spacing="4" font-family="Barlow, sans-serif">THE INNER WORLDS</text><g transform="translate(641 381)" stroke="#ac9f77" fill="none" opacity=".6"><path d="M0-22v44M-22 0h44m-10-12L-12 12M-12-12l24 24"/><circle r="14"/></g></svg><span class="chart-label">A map of the world they said was yours.</span></div>`;
}

export function worldScreen(state: GameState, ui: UIState): string {
  const chapter = CHAPTERS[ui.selectedChapter];
  const unlocked = chapter.id <= chapterOf(state);
  const missions = campaign(state.origin).filter(mission => mission.chapter === chapter.id);
  const current = nextMission(state);
  return `${title('THE INNER WORLDS', 'No road belongs to an empire.', 'Sixteen chapters. Three beginnings. The same impossible sky.')}
    <div class="world-layout"><div class="world-left">${worldMap(state, chapter.id)}<div class="chapter-selector" aria-label="Select chapter">${CHAPTERS.map(ch => `<button class="${ch.id === chapter.id ? 'selected' : ''} ${ch.id > chapterOf(state) ? 'locked' : ''}" data-action="chapter" data-chapter="${ch.id}" aria-label="Chapter ${ch.id + 1}: ${escape(ch.title)}" aria-pressed="${ch.id === chapter.id}"><span>${String(ch.id + 1).padStart(2, '0')}</span>${ch.id > chapterOf(state) ? icon('lock') : ch.id < chapterOf(state) ? icon('check') : icon('flag')}</button>`).join('')}</div><div class="world-progress panel"><span class="eyebrow">THE LONG ROAD</span><strong>${storyCompleted(state)} <small>/ 64 operations</small></strong><div class="thin-meter"><i style="width:${storyCompleted(state) / 64 * 100}%"></i></div><p>Your story grows through completed operations. Recommended levels guide preparation; they never lock you out.</p></div></div>
    <div class="world-right"><section class="panel chapter-detail"><span class="eyebrow">CHAPTER ${chapter.id + 1} · ${chapter.region.toUpperCase()} · LVL ${chapter.level}–${chapter.level + 3}</span><h2>${escape(chapter.title)}</h2><p class="chapter-subtitle">${escape(chapter.subtitle)}</p><p>${escape(chapter.opening)}</p><div class="operation-list">${missions.map(mission => {
      const done = state.completed.includes(mission.id);
      const available = unlocked && current?.id === mission.id;
      return `<div class="operation ${done ? 'done' : available ? 'current' : 'locked'}"><span class="operation-marker">${done ? icon('check') : available ? icon('flag') : icon('lock')}</span><div><span class="eyebrow">OPERATION ${mission.index + 1} · LVL ${mission.level}</span><h3>${escape(mission.title)}</h3><p>${escape(mission.subtitle)}</p>${available ? button(state.expedition ? 'Resume expedition' : 'Begin operation', state.expedition ? 'expedition' : 'start-mission', { className: 'primary compact', icon: 'arrow', data: `data-mission="${mission.id}"` }) : `<span class="operation-status">${done ? 'COMPLETED' : 'CONTINUE THE STORY TO UNLOCK'}</span>`}</div></div>`;
    }).join('')}</div></section>
    <section class="panel patrol-card"><div class="patrol-icon">${icon('swords')}</div><div><span class="eyebrow">BEYOND THE MAIN STORY</span><h3>Patrol the supply road</h3><p>Two encounters. Experience, supplies, and forge materials. The road always needs a watch.</p></div>${button('Take a patrol', 'hunt', { icon: 'arrow', disabled: !unlocked || Boolean(state.expedition), data: `data-chapter="${chapter.id}"` })}</section></div></div>`;
}

export function characterScreen(state: GameState): string {
  const stage = growthOf(state), stats = statsOf(state), level = levelOf(state);
  const origin = ORIGINS[state.origin];
  return `${title('THE PERSON BEHIND THE WEAPON', state.name, `${origin.name} origin · ${stage.name} · Age ${stage.age} · Level ${level} of 80`)}
  <div class="character-layout"><section class="panel character-showcase"><div class="large-portrait ${colorOf(state)}"><div class="portrait-halo"></div><img src="${portraitUrl(state)}" alt="${escape(state.name)} in current equipment"></div><span class="origin-tag ${colorOf(state)}">${state.carved ? 'CARVED GOLD · RED AT HEART' : origin.name.toUpperCase()}</span><h2>${escape(stage.name)}</h2><p>${escape(stage.description)}</p><div class="stat-table">${Object.entries({ Health: stats.maxHp, Focus: stats.maxFocus, Attack: stats.attack, Defense: stats.defense, Speed: stats.speed }).map(([name, value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join('')}</div><p class="panel-note">${origin.trait}</p></section>
  <div class="character-details"><section class="panel"><div class="panel-heading"><span class="eyebrow">A LIFE, NOT JUST A LEVEL</span><span class="muted">${GROWTH.indexOf(stage) + 1} / 8 PHASES</span></div><div class="growth-track">${GROWTH.map((growth, index) => `<div class="growth-step ${growth.level <= level ? 'reached' : ''} ${growth === stage ? 'current' : ''}"><span class="growth-node">${growth.level <= level ? icon(index === 7 ? 'wolf' : 'check') : index + 1}</span><div><strong>${growth.name}</strong><span>Age ${growth.age} · Lvl ${growth.level}</span></div></div>`).join('')}</div></section>
  <section class="panel"><div class="panel-heading"><span class="eyebrow">YOUR EQUIPMENT</span><button class="text-button" data-action="nav" data-view="inventory">Open inventory ${icon('arrow')}</button></div><div class="equipped-grid">${SLOTS.map(slot => { const item = ITEM_MAP[state.equipment[slot] ?? '']; return `<div class="equipment-slot">${item ? `<img class="pixel-item" src="${itemUrl(item)}" alt="">` : icon('gem')}<span class="eyebrow">${slot.toUpperCase()}</span><strong>${escape(item?.name ?? 'Empty slot')}${item && state.upgrades[item.id] ? ` +${state.upgrades[item.id]}` : ''}</strong><small>${item ? Object.entries(item.stats ?? {}).map(([key, value]) => `${key.replace('max', '')} +${value}`).join(' · ') : 'Find a relic on the road.'}</small></div>`; }).join('')}</div></section>
  <section class="panel"><div class="panel-heading"><span class="eyebrow">ABILITIES EARNED</span><span class="muted">${abilitiesFor(state).length} LEARNED</span></div><div class="ability-grid">${ABILITIES.filter(ability => !ability.origin || ability.origin === state.origin).map(ability => `<div class="ability-card ${level < ability.level ? 'locked' : ''}"><span class="ability-symbol" style="color:${ELEMENTS[ability.element].color}">${icon(ability.icon)}</span><div><div class="ability-heading"><strong>${ability.name}</strong><small>${level < ability.level ? `LVL ${ability.level}` : ability.cost ? `${ability.cost} FP` : 'FREE'}</small></div><p>${escape(ability.description)}</p><span class="ability-element">${ELEMENTS[ability.element].name} · ${ability.target === 'all' ? 'All enemies' : ability.target === 'self' ? 'Self' : 'One enemy'}</span></div></div>`).join('')}</div></section>
  <section class="panel origin-memory"><span class="eyebrow">A BEGINNING YOU KEEP</span><h3>${origin.title}</h3><p>${origin.prologue}</p>${state.carved ? '<p class="accent-text">The Carving changed your body. Mineborn fury, your memories, and your original identity remain yours.</p>' : ''}</section></div></div>`;
}

function itemCard(state: GameState, item: typeof ITEMS[number], market: boolean): string {
  const owned = state.inventory[item.id] ?? 0;
  const equipped = Object.values(state.equipment).includes(item.id);
  const equipment = SLOTS.includes(item.kind as typeof SLOTS[number]);
  const upgrades = state.upgrades[item.id] ?? 0;
  const cost = upgradeCost(state, item);
  return `<article class="item-card ${equipped ? 'equipped' : ''}" style="--rarity:${RARITY_COLORS[item.rarity]}"><div class="item-top"><span class="item-rarity">${item.rarity.toUpperCase()}</span><span class="item-count">${equipment ? `LVL ${item.level}` : `×${owned}`}</span></div><div class="item-art"><img class="pixel-item" src="${itemUrl(item)}" alt=""></div><h3>${escape(item.name)}${upgrades ? ` <span>+${upgrades}</span>` : ''}</h3><p>${escape(item.description)}</p>${item.stats ? `<div class="item-stats">${Object.entries(item.stats).map(([key, value]) => `<span>${key.replace('max', '')} <b>${value >= 0 ? '+' : ''}${Math.round(value * (1 + upgrades * 0.15))}</b></span>`).join('')}</div>` : ''}
    ${market
      ? `<div class="item-purchase"><span>${icon('coin')}${number(item.price)}</span>${button(equipment && owned ? 'Owned' : 'Buy', 'buy', { className: 'compact', data: `data-item="${item.id}"`, disabled: equipment && owned > 0 || state.credits < item.price })}</div>`
      : `<div class="item-actions">${equipment ? button(equipped ? 'Equipped' : 'Equip', 'equip', { className: equipped ? 'compact is-equipped' : 'compact', data: `data-item="${item.id}"`, disabled: equipped || levelOf(state) < item.level }) : item.kind === 'consumable' ? button('Use', 'use', { className: 'compact', data: `data-item="${item.id}"` }) : '<span class="muted">Forge material</span>'}${equipment ? `<button class="icon-button" data-action="upgrade" data-item="${item.id}" title="${upgrades >= 5 ? 'Fully forged' : `Forge: ${cost.credits} credits, ${cost.alloy} alloy${cost.sunstone ? `, ${cost.sunstone} sunstone` : ''}`}" aria-label="Forge ${escape(item.name)}" ${upgrades >= 5 ? 'disabled' : ''}>${icon('forge')}</button>` : ''}<button class="icon-button" data-action="sell" data-item="${item.id}" title="Sell for ${Math.floor(item.price * 0.4)} credits" aria-label="Sell one ${escape(item.name)}">${icon('coin')}</button></div>`}
  </article>`;
}

export function inventoryScreen(state: GameState, ui: UIState, market = false): string {
  const available = market ? ITEMS.filter(item => item.level <= levelOf(state) + 5 && !['mining-blade', 'practice-razor', 'ice-axe', 'work-clothes', 'academy-coat', 'fur-mantle'].includes(item.id)) : ITEMS.filter(item => (state.inventory[item.id] ?? 0) > 0);
  const filtered = available.filter(item => ui.inventoryFilter === 'all' || item.kind === ui.inventoryFilter);
  return `${title(market ? 'THE QUARTERMASTER' : 'WHAT YOU CARRY', market ? 'Tools for another tomorrow.' : 'A pack full of possibilities.', market ? 'No banners. Fair prices. A forge that remembers your favorite blade.' : 'Equipment changes your stats and appearance. A well-packed bag can change an ending.')}
    <div class="inventory-toolbar"><div class="filter-tabs" role="group" aria-label="Filter items">${[['all', 'All items'], ['weapon', 'Weapons'], ['armor', 'Armor'], ['relic', 'Relics'], ['consumable', 'Supplies'], ['material', 'Materials']].map(([id, name]) => `<button class="${ui.inventoryFilter === id ? 'active' : ''}" data-action="item-filter" data-filter="${id}" aria-pressed="${ui.inventoryFilter === id}">${name}</button>`).join('')}</div><span class="wallet">${icon('coin')}${number(state.credits)} <small>CREDITS</small></span></div>
    ${market ? `<div class="market-intro panel">${icon('forge')}<p><strong>A better edge. The same familiar grip.</strong> Forge owned equipment in your inventory for +15% item stats per upgrade, up to +5. The last two upgrades also need sunstone.</p>${button('My inventory', 'nav', { className: 'compact', data: 'data-view="inventory"', icon: 'bag' })}</div>` : `<div class="inventory-summary"><span>${available.length} different items</span><span>${icon('gem')}${state.inventory.alloy ?? 0} alloy · ${state.inventory.sunstone ?? 0} sunstone</span><button class="text-button" data-action="nav" data-view="market">Visit the quartermaster ${icon('arrow')}</button></div>`}
    <div class="item-grid">${filtered.map(item => itemCard(state, item, market)).join('') || `<div class="empty-state">${icon('bag')}<h2>Room for what comes next.</h2><p>You haven’t found anything in this category yet. Explore or visit the quartermaster.</p></div>`}</div>`;
}

export function journalScreen(state: GameState, ui: UIState): string {
  const tabs = [['chronicle', 'Field journal'], ['bestiary', 'Bestiary'], ['milestones', 'Milestones']];
  let body = '';
  if (ui.journalTab === 'bestiary') {
    body = `<div class="bestiary-grid">${ENEMIES.filter(enemy => state.bestiary[enemy.id]).map(enemy => `<article class="panel bestiary-card"><div class="bestiary-art"><img src="${enemyUrl(enemy.id)}" alt="${escape(enemy.name)}"></div><span class="eyebrow">${enemy.boss ? 'CHAPTER BOSS' : enemy.family.toUpperCase()} · ${state.bestiary[enemy.id]} DEFEATED</span><h3>${enemy.name}</h3><p>${enemy.description}</p><div class="weakness-list"><span>WEAK TO</span>${enemy.weakness.map(element => `<span class="element-pill" style="color:${ELEMENTS[element].color}" title="${ELEMENTS[element].name}">${icon(ELEMENTS[element].icon)}${ELEMENTS[element].name}</span>`).join('')}</div><div class="enemy-pattern">${enemy.pattern.map(intent => `<span title="${INTENTS[intent].description}">${icon(INTENTS[intent].icon)}${INTENTS[intent].name}</span>`).join('<i>→</i>')}</div></article>`).join('') || `<div class="empty-state">${icon('eye')}<h2>Learn who stands against you.</h2><p>Defeated enemies are recorded here with their weaknesses and patterns.</p></div>`}</div>`;
  } else if (ui.journalTab === 'milestones') {
    body = `<div class="achievement-grid">${ACHIEVEMENTS.map(achievement => `<article class="panel achievement ${state.achievements.includes(achievement.id) ? 'unlocked' : ''}"><div>${icon(state.achievements.includes(achievement.id) ? 'star' : 'lock')}</div><h3>${achievement.title}</h3><p>${achievement.text}</p><span class="eyebrow">${state.achievements.includes(achievement.id) ? 'REMEMBERED' : 'STILL TO COME'}</span></article>`).join('')}</div>`;
  } else {
    body = `<div class="journal-layout"><div class="journal-entries">${state.ending ? `<article class="panel ending-entry"><span class="eyebrow">YOUR ENDING</span><h2>${ENDINGS[state.ending].title}</h2><p>${ENDINGS[state.ending].text}</p></article>` : ''}${[...state.journal].reverse().map(entry => `<article class="journal-entry"><span class="journal-mark">${icon(entry.id === 'origin' ? 'feather' : entry.id === 'carving' ? 'eclipse' : 'book')}</span><div><span class="eyebrow">${entry.id === 'origin' ? 'WHERE IT BEGAN' : entry.id.includes(':') ? 'A CHOICE REMEMBERED' : 'A STEP ON THE ROAD'}</span><h2>${escape(entry.title)}</h2>${entry.text.split('\n').filter(Boolean).map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div></article>`).join('')}</div><aside class="panel values-card"><span class="eyebrow">THE MARKS YOU LEAVE</span><h2>What kind of wolf?</h2><p>Your decisions build a history. Your final choice determines the shape of the ending.</p>${meter('Mercy', state.virtues.mercy, Math.max(10, ...Object.values(state.virtues)), 'green')}${meter('Defiance', state.virtues.defiance, Math.max(10, ...Object.values(state.virtues)), 'copper')}${meter('Ambition', state.virtues.ambition, Math.max(10, ...Object.values(state.virtues)), 'gold')}<div class="journal-totals"><span>Encounters won<strong>${state.victories}</strong></span><span>Times you stood again<strong>${state.defeats}</strong></span><span>Hours on the road<strong>${formatTime(state.playSeconds)}</strong></span></div></aside></div>`;
  }
  return `${title('THE THINGS WORTH REMEMBERING', 'An honest account.', 'Not every victory is a battle. Not every important person carries a blade.')}<div class="filter-tabs journal-tabs" role="group" aria-label="Chronicle sections">${tabs.map(([id, name]) => `<button class="${ui.journalTab === id ? 'active' : ''}" data-action="journal-tab" data-tab="${id}" aria-pressed="${ui.journalTab === id}">${name}${id === 'bestiary' ? ` <span>${Object.keys(state.bestiary).length}/${ENEMIES.length}</span>` : ''}</button>`).join('')}</div>${body}`;
}

export function expeditionScreen(state: GameState): string {
  const mission = activeMission(state)!;
  const expedition = state.expedition!;
  const node = activeNode(state)!;
  const cleared = expedition.resolved.includes(expedition.node);
  const remembered = state.choices[`${mission.id}:${expedition.node}`];
  const choices = node.choices?.filter(choice => !remembered || choice.id === remembered);
  return `<div class="expedition-heading page-heading"><div><span class="eyebrow">${mission.side ? 'SUPPLY ROAD PATROL' : `CHAPTER ${mission.chapter + 1} · OPERATION ${mission.index + 1}`} · LVL ${mission.level}</span><h1>${escape(mission.title)}</h1><p>${escape(mission.subtitle)}</p></div>${button('Return to camp', 'nav', { className: 'subtle', icon: 'camp', data: 'data-view="camp"' })}</div>
  <div class="expedition-layout"><div class="expedition-main"><section class="landscape-frame expedition-landscape"><div id="scene-slot" class="scene-slot"></div><div class="scene-vignette"></div><div class="scene-top"><span class="scene-badge">${icon('pin')}${mission.region.toUpperCase()}</span><span class="scene-badge">${expedition.node + 1} / ${mission.nodes.length}</span></div><div class="scene-bottom"><div><span class="eyebrow">${node.kind === 'battle' ? 'ENCOUNTER AHEAD' : node.speaker?.toUpperCase() ?? 'ON THE ROAD'}</span><strong>${escape(node.title)}</strong></div></div></section>
    <section class="panel story-panel"><div class="story-symbol">${icon(node.kind === 'battle' ? 'swords' : node.kind === 'choice' ? 'feather' : node.kind === 'cache' ? 'bag' : node.kind === 'rest' ? 'moon' : 'book')}</div><div class="story-copy"><span class="eyebrow">${node.speaker?.toUpperCase() ?? (node.kind === 'choice' ? 'THE CHOICE IS YOURS' : 'FIELD JOURNAL')}</span><h2>${escape(node.title)}</h2><p>${escape(node.text)}</p>
    ${choices ? `${remembered ? '<p class="panel-note">You chose this road earlier. That choice remains part of your story.</p>' : ''}<div class="story-choices">${choices.map((choice, index) => `<button class="choice-card" data-action="story-choice" data-choice="${choice.id}"><span class="choice-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${escape(choice.label)}</strong><small>${escape(choice.detail)}</small></span>${icon('arrow')}</button>`).join('')}</div>` : `<div class="story-actions">${node.kind === 'cache' ? `<span class="reward-line">${icon('coin')}+${node.reward?.credits ?? 0} ${node.reward?.item ? `· ${ITEM_MAP[node.reward.item].name} ×${node.reward.quantity ?? 1}` : ''}</span>` : ''}${button(node.kind === 'battle' && !cleared ? 'Enter the encounter' : node.kind === 'cache' ? 'Gather the supplies' : node.kind === 'rest' ? 'Catch your breath' : expedition.node === mission.nodes.length - 1 ? 'Complete the operation' : 'Continue', node.kind === 'battle' && !cleared ? 'battle-start' : 'story-next', { className: 'primary', icon: node.kind === 'battle' && !cleared ? 'swords' : 'arrow' })}</div>`}</div></section>
  </div><aside class="expedition-aside"><section class="panel route-card"><span class="eyebrow">THE ROUTE AHEAD</span><ol>${mission.nodes.map((step, index) => `<li class="${index < expedition.node ? 'done' : index === expedition.node ? 'current' : ''}"><span>${icon(index < expedition.node ? 'check' : step.kind === 'battle' ? 'swords' : step.kind === 'cache' ? 'bag' : step.kind === 'rest' ? 'moon' : 'flag')}</span><div><strong>${escape(step.title)}</strong><small>${index < expedition.node ? 'CLEARED' : index === expedition.node ? 'YOU ARE HERE' : step.kind.toUpperCase()}</small></div></li>`).join('')}</ol><button class="text-button danger-text" data-action="abandon">Leave this expedition</button></section><section class="panel travel-vitals"><span class="eyebrow">${escape(state.name).toUpperCase()}</span>${meter('Health', state.hp, statsOf(state).maxHp, 'health')}${meter('Focus', state.focus, statsOf(state).maxFocus, 'focus')}<p class="panel-note">Every step is saved. You can return to camp and resume this exact checkpoint.</p></section></aside></div>`;
}

export function battleScreen(state: GameState, ui: UIState): string {
  const battle = state.battle!;
  const mission = activeMission(state)!;
  const companion = COMPANIONS.find(c => c.id === state.companion)!;
  const selected = battle.enemies.find(enemy => enemy.uid === ui.selectedEnemy && enemy.hp > 0) ?? battle.enemies.find(enemy => enemy.hp > 0) ?? battle.enemies[0];
  const ended = battle.outcome !== 'active';
  let actions = '';
  if (ended && !ui.acting) {
    actions = `<div class="battle-result ${battle.outcome === 'won' ? 'won' : ''}"><div class="result-sigil">${icon(battle.outcome === 'won' ? 'wolf' : 'heart')}</div><div><span class="eyebrow">${battle.outcome === 'won' ? 'THE ROAD IS OPEN' : 'A SETBACK, NOT AN ENDING'}</span><h2>${battle.outcome === 'won' ? 'Still standing.' : battle.outcome === 'fled' ? 'Live to choose again.' : 'Someone brought you home.'}</h2><p>${battle.outcome === 'won' ? 'Take a breath. Gather what will get you through the next part.' : 'No permanent death. Your companion restores you at camp; your expedition checkpoint remains.'}</p></div>${button(battle.outcome === 'won' ? 'Claim victory' : 'Recover at camp', battle.outcome === 'won' ? 'battle-claim' : 'battle-recover', { className: 'primary', icon: 'arrow' })}</div>`;
  } else if (ui.battleTab === 'skills') {
    actions = `<div class="combat-skills">${abilitiesFor(state).filter(ability => ability.id !== 'strike').map(ability => `<button class="combat-skill" data-action="battle-ability" data-ability="${ability.id}" ${ui.acting || battle.hero.focus < ability.cost ? 'disabled' : ''}><span style="color:${ELEMENTS[ability.element].color}">${icon(ability.icon)}</span><span><strong>${ability.name}</strong><small>${ability.description}</small></span><b>${ability.cost}<small>FP</small></b></button>`).join('')}</div>`;
  } else if (ui.battleTab === 'supplies') {
    const supplies = ITEMS.filter(item => item.kind === 'consumable' && item.effect !== 'food' && (state.inventory[item.id] ?? 0) > 0);
    actions = `<div class="combat-skills">${supplies.map(item => `<button class="combat-skill" data-action="battle-item" data-item="${item.id}" ${ui.acting ? 'disabled' : ''}><img class="pixel-item" src="${itemUrl(item)}" alt=""><span><strong>${item.name}</strong><small>${item.description}</small></span><b>×${state.inventory[item.id]}</b></button>`).join('') || '<p class="muted">Your battle supplies are empty. Guard to recover health and focus.</p>'}</div>`;
  } else {
    const options = [
      { name: 'Strike', subtitle: 'Weapon attack · +7 focus', icon: 'sword', action: 'battle-ability', data: 'data-ability="strike"', key: '1' },
      { name: 'Abilities', subtitle: 'Break. Burn. Turn the tide.', icon: 'flame', action: 'battle-tab', data: 'data-tab="skills"', key: '2' },
      { name: 'Guard', subtitle: '−70% damage · recover', icon: 'shield', action: 'battle-guard', data: '', key: '3' },
      { name: 'Supplies', subtitle: 'One item. One turn.', icon: 'bag', action: 'battle-tab', data: 'data-tab="supplies"', key: '4' },
      { name: companion.name, subtitle: battle.companionCooldown ? `Ready in ${battle.companionCooldown} turns` : companion.skill, icon: 'heart', action: 'battle-companion', data: '', key: '5' },
    ];
    actions = `<div class="combat-actions">${options.map(option => `<button data-action="${option.action}" ${option.data} ${ui.acting || ended || option.key === '5' && battle.companionCooldown > 0 ? 'disabled' : ''}><span class="action-icon">${icon(option.icon)}</span><strong>${option.name}</strong><small>${option.subtitle}</small><kbd>${option.key}</kbd></button>`).join('')}</div>`;
  }
  return `<div class="battle-heading page-heading"><div><span class="eyebrow">${battle.boss ? 'CHAPTER BOSS' : 'TURN-BASED ENCOUNTER'} · ${mission.region.toUpperCase()}</span><h1>${battle.boss ? escape(battle.enemies[0].name) : 'Hold your ground.'}</h1></div><div class="round-badge">${icon('swords')}ROUND <strong>${battle.round}</strong></div></div>
  <section class="landscape-frame battle-landscape"><div id="scene-slot" class="scene-slot"></div><div class="scene-vignette"></div><div class="scene-top"><span class="scene-badge">${ui.acting ? 'THE TURN UNFOLDS' : ended ? 'ENCOUNTER RESOLVED' : 'YOUR TURN · CHOOSE AN ACTION'}</span><button class="scene-icon" data-action="battle-speed" aria-label="Battle animation speed">${state.settings.battleSpeed}×</button></div><div class="battle-scene-footer"><span>${escape(state.name)} <small>LVL ${levelOf(state)}</small></span><span>${battle.boss ? 'A SHIELD BREAK CANCELS A CHARGED ATTACK' : 'STRIKE WEAKNESSES TO BREAK THEIR GUARD'}</span></div></section>
  <div class="battle-hud"><section class="panel battle-hero"><div class="battle-name"><img src="${portraitUrl(state)}" alt=""><div><span class="eyebrow">${growthOf(state).name.toUpperCase()}</span><h3>${escape(state.name)}</h3></div><span class="origin-tag ${colorOf(state)}">LVL ${levelOf(state)}</span></div>${meter('Health', battle.hero.hp, battle.hero.maxHp, 'health')}${meter('Focus', battle.hero.focus, battle.hero.maxFocus, 'focus')}<div class="status-effects">${Object.entries(battle.hero.statuses).map(([status, turns]) => `<span>${escape(status)} · ${turns}</span>`).join('')}</div><button class="burst-toggle ${ui.boosted ? 'active' : ''}" data-action="burst" ${battle.boost < 3 || ui.acting || ended ? 'disabled' : ''} aria-pressed="${ui.boosted}"><span>${icon('flame')}BURST</span><span class="burst-pips">${[1, 2, 3].map(n => `<i class="${battle.boost >= n ? 'filled' : ''}"></i>`).join('')}</span><small>${ui.boosted ? 'NEXT ABILITY EMPOWERED' : battle.boost >= 3 ? 'READY · TAP TO EMPOWER' : 'BUILD 3 CHARGES'}</small></button></section>
  <section class="enemy-targets" aria-label="Choose an enemy target">${battle.enemies.map(enemy => {
    const definition = ENEMY_MAP[enemy.id];
    return `<button class="enemy-card ${enemy.uid === selected.uid ? 'selected' : ''} ${enemy.hp <= 0 ? 'defeated' : ''}" data-action="target" data-target="${enemy.uid}" ${enemy.hp <= 0 || ui.acting ? 'disabled' : ''} aria-pressed="${enemy.uid === selected.uid}"><div class="enemy-card-title"><strong>${escape(enemy.name)}</strong><small>LVL ${enemy.level}</small></div><div class="enemy-hp"><i style="width:${enemy.hp / enemy.maxHp * 100}%"></i></div><span class="enemy-hp-text">${Math.ceil(enemy.hp)} / ${enemy.maxHp} HP</span><div class="enemy-defense"><span class="shield-count">${icon('shield')}${enemy.broken ? 'BROKEN' : `${enemy.shield}/${enemy.maxShield}`}</span><span class="weakness-icons">${definition.weakness.map(element => `<span style="color:${ELEMENTS[element].color}" title="Weak to ${ELEMENTS[element].name}" aria-label="Weak to ${ELEMENTS[element].name}">${icon(ELEMENTS[element].icon)}</span>`).join('')}</span></div><div class="enemy-intent ${enemy.intent === 'heavy' || enemy.charged ? 'danger' : ''}">${icon(enemy.hp <= 0 ? 'check' : enemy.broken ? 'broken' : INTENTS[enemy.intent].icon)}<span>${enemy.hp <= 0 ? 'DEFEATED' : enemy.broken ? 'STAGGERED' : enemy.charged ? 'CHARGED · ' + INTENTS[enemy.intent].name.toUpperCase() : INTENTS[enemy.intent].name.toUpperCase()}</span></div></button>`;
  }).join('')}</section></div>
  <section class="panel command-panel" tabindex="-1" aria-label="Battle commands" aria-busy="${ui.acting}"><div class="command-heading"><span class="eyebrow">${ui.acting ? 'RESOLVING THE TURN…' : ended ? 'AFTER THE BATTLE' : ui.battleTab === 'actions' ? 'MAKE YOUR MOVE' : ui.battleTab === 'skills' ? 'LEARNED ABILITIES' : 'FIELD SUPPLIES'}</span><div>${ui.battleTab !== 'actions' && !ended ? button('Back', 'battle-tab', { className: 'subtle compact', icon: 'back', data: 'data-tab="actions"', disabled: ui.acting }) : ''}${!ended ? `<button class="text-button" data-action="battle-flee" ${ui.acting ? 'disabled' : ''}>Withdraw ${icon('back')}</button>` : ''}</div></div>${actions}</section>
  <details class="combat-log"><summary>${icon('book')}Battle log <span>${battle.log.length} events</span></summary><ol>${battle.log.slice(-20).map(line => `<li>${escape(line)}</li>`).join('')}</ol></details>`;
}
