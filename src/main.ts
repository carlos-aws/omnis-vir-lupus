import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/cinzel/latin-500.css';
import './styles.css';
import { SaveStore } from './game/storage.ts';
import { activeMission, chapterOf } from './game/state.ts';
import type { GameState, Origin } from './game/types.ts';
import { GameRenderer } from './render/scene.ts';
import { Soundscape } from './audio.ts';
import { battleScreen, campScreen, characterScreen, expeditionScreen, inventoryScreen, journalScreen, shell, worldScreen } from './ui/screens.ts';
import type { UIState } from './ui/screens.ts';
import { CINEMATIC, cinematicScreen, creationScreen, titleScreen } from './ui/welcome.ts';
import { installActions } from './ui/actions.ts';
import { installPreferences } from './ui/preferences.ts';
import { installLifecycle } from './ui/lifecycle.ts';
import { beginCinematic } from './ui/cinematic.ts';
import { installOffline } from './ui/offline.ts';

function browserStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}
const store = new SaveStore(browserStorage());
const initial = store.load();
const root = document.getElementById('app')!;

export const app = {
  state: initial as GameState | null,
  store,
  ui: {
    view: 'camp', inventoryFilter: 'all', journalTab: 'chronicle',
    selectedChapter: initial ? chapterOf(initial) : 0,
    battleTab: 'actions', selectedEnemy: '', boosted: false, acting: false,
    saveStatus: store.durable ? 'Saved on this device' : 'No checkpoint yet',
  } as UIState,
  screen: 'title' as 'title' | 'creation' | 'game' | 'cinematic',
  cinematicIndex: 0,
  introTimer: null as ReturnType<typeof setInterval> | null,
  expedition: false,
  origin: 'red' as Origin,
  busy: false,
  sound: new Soundscape(),
  renderer: new GameRenderer(action => {
    document.querySelector<HTMLButtonElement>(`[data-care="${action}"]`)?.click();
  }),
  render(focus = false): void {
    const { state, ui, renderer } = app;
    const focused = document.activeElement as HTMLElement | null;
    const focusSelector = focused?.id ? `#${CSS.escape(focused.id)}`
      : focused?.dataset.action ? Object.entries(focused.dataset)
        .map(([key, value]) => `[data-${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}="${CSS.escape(value ?? '')}"]`).join('') : '';
    renderer.host.remove();
    if (app.screen === 'cinematic') root.innerHTML = cinematicScreen(app.cinematicIndex);
    else if (app.screen === 'creation') root.innerHTML = creationScreen(app.origin);
    else if (app.screen !== 'game' || !state) root.innerHTML = titleScreen(state, store.warning);
    else {
      const screens = {
        camp: () => campScreen(state), world: () => worldScreen(state, ui),
        character: () => characterScreen(state), inventory: () => inventoryScreen(state, ui),
        market: () => inventoryScreen(state, ui, true), journal: () => journalScreen(state, ui),
      };
      root.innerHTML = shell(state, ui, state.battle ? battleScreen(state, ui)
        : app.expedition && state.expedition ? expeditionScreen(state) : screens[ui.view]());
    }
    const slot = document.getElementById('scene-slot');
    if (slot) {
      slot.append(renderer.host);
      const game = app.screen === 'game' && state;
      const mission = game && activeMission(state);
      renderer.set({
        state, mode: !game ? 'cinematic' : state.battle ? 'battle' : app.expedition ? 'travel' : 'camp',
        cinematic: app.screen === 'cinematic' ? app.cinematicIndex : undefined,
        region: app.screen === 'cinematic' ? CINEMATIC[app.cinematicIndex].region
          : game && (state.battle || app.expedition) && mission ? mission.region : 'hollow',
        reducedMotion: state?.settings.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
      if (state?.battle) renderer.setTarget(ui.selectedEnemy);
    } else renderer.pause();
    app.sound.setMode(app.screen === 'cinematic' ? 'cinematic' : app.screen === 'game' && state?.battle ? 'battle' : 'camp');
    if (state) app.sound.configure(state.settings);
    document.body.classList.toggle('large-text', state?.settings.textSize === 'large');
    document.body.classList.toggle('reduced-motion', state?.settings.reducedMotion ?? false);
    if (focus) document.getElementById('content')?.focus({ preventScroll: true });
    else if (!focused?.isConnected && focusSelector) root.querySelector<HTMLElement>(focusSelector)?.focus({ preventScroll: true });
  },
};
export type Application = typeof app;

installActions(app);
installPreferences(app);
installLifecycle(app);
installOffline(app);
if (!initial && !store.warning && !matchMedia('(prefers-reduced-motion: reduce)').matches) beginCinematic(app);
else app.render();
