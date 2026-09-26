import type { Application } from '../main.ts';
import { CINEMATIC } from './welcome.ts';

export function beginCinematic(app: Application): void {
  if (app.introTimer) clearInterval(app.introTimer);
  app.cinematicIndex = 0;
  app.screen = 'cinematic';
  app.sound.setMode('cinematic');
  app.render(true);
  app.introTimer = setInterval(() => {
    if (document.hidden) return;
    app.cinematicIndex++;
    if (app.cinematicIndex >= CINEMATIC.length) endCinematic(app);
    else app.render();
  }, 5200);
}

function endCinematic(app: Application): void {
  if (app.introTimer) clearInterval(app.introTimer);
  app.introTimer = null;
  app.screen = 'title';
  app.sound.setMode('camp');
  app.render(true);
}

export function cinematicAction(app: Application, action: string): boolean {
  if (action === 'skip-intro') endCinematic(app);
  else if (action === 'replay-intro') beginCinematic(app);
  else return false;
  return true;
}
