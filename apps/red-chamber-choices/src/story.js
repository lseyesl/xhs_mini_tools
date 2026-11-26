'use strict';

(function (root) {
  const data = root.redChamberData;
  const dimensions = Object.keys(data.dimensions);

  function emptySave() {
    return { version: 1, choices: [], badges: [] };
  }

  function choiceAt(index, id) {
    const scene = data.scenes[index];
    return scene && scene.choices.find(function (choice) { return choice.id === id; });
  }

  function validateSave(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.choices) || !Array.isArray(value.badges)) {
      throw new Error('无法读取此版本的存档');
    }
    if (value.choices.length > data.scenes.length || !value.choices.every(function (id, index) {
      return !!choiceAt(index, id);
    }) || !value.badges.every(function (id) {
      return Object.prototype.hasOwnProperty.call(data.badges, id);
    })) {
      throw new Error('存档内容有误');
    }
    return { version: 1, choices: value.choices.slice(), badges: Array.from(new Set(value.badges)) };
  }

  function dialogue(index, choices) {
    const scene = data.scenes[index];
    if (!scene) return [];
    const previous = index > 0 && choiceAt(index - 1, choices[index - 1]);
    const flowerChoice = index === 3 && choiceAt(1, choices[1]);
    return (previous ? [previous.next] : []).concat(flowerChoice ? [flowerChoice.echo] : [], scene.lines);
  }

  function result(choices) {
    if (choices.length !== data.scenes.length) return null;
    const scores = { self: 0, care: 0, plan: 0 };
    choices.forEach(function (id, index) {
      const choice = choiceAt(index, id);
      scores[choice.primary] += 2;
      scores[choice.secondary] += 1;
    });
    const ordered = dimensions.slice().sort(function (a, b) { return scores[b] - scores[a]; });
    const badge = scores[ordered[0]] - scores[ordered[1]] <= 1 ? 'balance' : ordered[0];
    return { scores: scores, badge: badge, ending: choiceAt(3, choices[3]).next[1] };
  }

  function choose(save, index, id) {
    if (index !== save.choices.length || !choiceAt(index, id)) return save;
    const choices = save.choices.concat(id);
    const ending = result(choices);
    const badges = save.badges.slice();
    if (ending && !badges.includes(ending.badge)) badges.push(ending.badge);
    return { version: save.version, choices: choices, badges: badges };
  }

  root.redChamberStory = {
    emptySave: emptySave, validateSave: validateSave, dialogue: dialogue,
    result: result, choose: choose, choiceAt: choiceAt
  };
}(window));
