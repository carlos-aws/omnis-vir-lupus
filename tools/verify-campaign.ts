import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { simulate, chooseAction } from './simulate-campaign.ts';
import { act, claimBattle, createBattle, recoverBattle } from '../src/game/combat.ts';
import { activeNode, advanceNode, care, growthOf, levelOf, startHunt } from '../src/game/state.ts';
import { decodeSave, encodeSave } from '../src/game/storage.ts';
import type { Difficulty, Origin } from '../src/game/types.ts';

await mkdir('tools/out', { recursive: true });
const reports = [];
const origins: Origin[] = ['red', 'gold', 'obsidian'];
const difficulties: Difficulty[] = ['story', 'standard', 'veteran'];
const endings = ['common-dawn', 'wandering-wolf', 'golden-cage'];
for (const difficulty of difficulties) {
  for (const [index, origin] of origins.entries()) {
    const phases = new Set<string>();
    const report = simulate(origin, difficulty, 4217 + index, endings[index], state => {
      phases.add(growthOf(state).name);
    });
    let state = report.state;
    assert.equal(state.completed.length, 64);
    assert.equal(report.encounters, 256);
    assert.equal(state.ending, endings[index]);
    assert.equal(state.carved, origin === 'red');
    const finalLevel = levelOf(state);
    let patrols = 0;
    while (levelOf(state) < 80 && patrols < 20) {
      care(state, 'rest');
      startHunt(state, 15);
      while (state.expedition) {
        const node = activeNode(state)!;
        if (node.kind === 'battle') {
          createBattle(state);
          while (state.battle!.outcome === 'active') {
            assert.ok(state.battle!.round < 180, 'Endgame battle must remain winnable.');
            act(state, chooseAction(state));
          }
          if (state.battle!.outcome === 'won') { claimBattle(state); advanceNode(state); }
          else { recoverBattle(state); care(state, 'rest'); }
        } else advanceNode(state, node.choices?.[0].id);
        state = decodeSave(encodeSave(state));
      }
      patrols++;
    }
    assert.equal(levelOf(state), 80);
    phases.add(growthOf(state).name);
    assert.equal(phases.size, 8);
    reports.push({ origin, difficulty, ending: state.ending, finalLevel, rounds: report.rounds, encounters: report.encounters, defeats: report.losses, patrolsTo80: patrols, phases: [...phases] });
    console.log(`${origin}/${difficulty}: ${report.rounds} rounds, ${report.losses} defeats, ${patrols} patrols to level 80.`);
  }
}
await writeFile('tools/out/campaign-report.json', JSON.stringify({ generatedAt: new Date().toISOString(), reports }, null, 2));
