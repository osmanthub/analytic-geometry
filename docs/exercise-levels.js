'use strict';
(() => {
  const advanced = new Map([
    ['vector-1-10','从坐标或几何论证证明向量三重积公式，再推出循环恒等式，不能将待证公式当作已知。'],
    ['lines-3-26','完整参数化过定直线的平面束，处理被普通单参数形式遗漏的成员并证明解已穷尽。']
  ]);
  const challenging = new Set(['contest-c1','contest-8-final']);
  for (const p of window.curatedExercises) {
    p.sourceKind=p.difficulty==='竞赛'?'competition':'textbook';
    p.tier=challenging.has(p.id)?'challenge':p.part==='surfaces'||advanced.has(p.id)?'advanced':'consolidation';
    p.challengeReason=advanced.get(p.id)|| (p.part==='surfaces'?'需要组合几何建模、方程推导与条件核查；竞赛身份仅说明来源，具体难度取决于推理要求。':'训练已学方法的应用与计算，归入巩固练习，不计入默认难题精选。');
  }
  window.curatedExercises.push(...window.advancedLineExercises,...window.contestLineExercises);
  window.exerciseTierLabels={challenge:'挑战题',advanced:'综合提高',consolidation:'巩固练习'};
  window.exerciseSourceLabels={competition:'竞赛原题',textbook:'教材 / 讲义'};
})();
