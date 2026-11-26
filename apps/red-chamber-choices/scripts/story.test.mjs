import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';

const context = createContext({ window: {} });
for (const file of ['story-data.js', 'story.js']) {
  runInContext(readFileSync(new URL('../src/' + file, import.meta.url), 'utf8'), context, { filename: file });
}
const { redChamberData: data, redChamberStory: story } = context.window;

test('all 81 routes reach an ending and all four badges are obtainable', () => {
  const badges = new Set();
  let completed = 0;

  function play(save) {
    const index = save.choices.length;
    const scene = data.scenes[index];
    if (!scene) {
      const result = story.result(save.choices);
      assert.equal(Object.values(result.scores).reduce((sum, score) => sum + score, 0), 12);
      assert.ok(Object.values(result.scores).every((score) => score >= 0 && score <= 8));
      assert.ok(result.ending);
      assert.ok(save.badges.includes(result.badge));
      badges.add(result.badge);
      completed += 1;
      return;
    }
    for (const choice of scene.choices) {
      const next = story.choose(save, index, choice.id);
      assert.equal(next.choices.length, index + 1);
      if (data.scenes[index + 1]) {
        assert.equal(story.dialogue(index + 1, next.choices)[0], choice.next);
      } else {
        assert.equal(story.result(next.choices).ending, choice.next[1]);
      }
      play(next);
    }
  }

  play(story.emptySave());
  assert.equal(completed, 81);
  assert.deepEqual([...badges].sort(), Object.keys(data.badges).sort());
});

test('flower choices have distinct next-scene lines and delayed callbacks', () => {
  const starts = new Set();
  const callbacks = new Set();
  for (const choice of data.scenes[1].choices) {
    const route = ['compose', choice.id, 'boundary'];
    starts.add(story.dialogue(2, route)[0][1]);
    callbacks.add(story.dialogue(3, route)[1][1]);
  }
  assert.equal(starts.size, 3);
  assert.equal(callbacks.size, 3);
});

test('locked scenes, duplicate submissions, and corrupted saves cannot progress', () => {
  const empty = story.emptySave();
  assert.equal(story.choose(empty, 1, 'confide'), empty);
  assert.equal(story.choose(empty, 0, 'invalid'), empty);
  const first = story.choose(empty, 0, 'compose');
  assert.equal(story.choose(first, 0, 'remember'), first);
  assert.equal(story.result(first.choices), null);
  assert.equal(story.validateSave(JSON.parse(JSON.stringify(first))).choices[0], 'compose');
  assert.throws(() => story.validateSave({ version: 1, choices: ['confide'], badges: [] }));
  assert.throws(() => story.validateSave({ version: 1, choices: [], badges: ['constructor'] }));
});
