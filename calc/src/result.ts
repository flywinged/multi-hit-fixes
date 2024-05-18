import { RawDesc, display, displayMove, getRecovery, getRecoil, getKOChance } from './desc';
import { Generation } from './data/interface';
import { Field } from './field';
import { Move } from './move';
import { Pokemon } from './pokemon';

export type Damage = number | number[] | number[][];
export type DamageRollWeightMap = number[];

export class Result {
  gen: Generation;
  attacker: Pokemon;
  defender: Pokemon;
  move: Move;
  field: Field;
  damage: number | number[] | number[][];
  rawDesc: RawDesc;

  constructor(
    gen: Generation,
    attacker: Pokemon,
    defender: Pokemon,
    move: Move,
    field: Field,
    damage: Damage,
    rawDesc: RawDesc,
  ) {
    this.gen = gen;
    this.attacker = attacker;
    this.defender = defender;
    this.move = move;
    this.field = field;
    this.damage = damage;
    this.rawDesc = rawDesc;
  }

  /* get */ desc() {
    return this.fullDesc();
  }

  range(): [number, number] {
    return damageRange(this.damage);
  }

  fullDesc(notation = '%', err = true) {
    return display(
      this.gen,
      this.attacker,
      this.defender,
      this.move,
      this.field,
      this.damage,
      this.rawDesc,
      notation,
      err
    );
  }

  moveDesc(notation = '%') {
    return displayMove(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
  }

  recovery(notation = '%') {
    return getRecovery(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
  }

  recoil(notation = '%') {
    return getRecoil(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
  }

  kochance(err = true) {
    return getKOChance(
      this.gen,
      this.attacker,
      this.defender,
      this.move,
      this.field,
      this.damage,
      err
    );
  }
}

export function damageRange(
  damage: Damage
): [number, number] {
  // Fixed Damage
  if (typeof damage === 'number') return [damage, damage];

  // Standard Damage
  if (damage.length === 16) {
    const d = damage as number[];
    if (d[0] > d[d.length - 1]) return [Math.min(...d), Math.max(...d)];
    return [d[0], d[d.length - 1]];
  }

  const d = damage as number[][];
  let totalMinimums = 0;
  let totalMaximums = 0;
  for (let i = 0;i < d.length;i++) {
    totalMinimums += d[i][0];
    totalMaximums += d[i][15];
  }

  return [totalMinimums, totalMaximums];
}

export function addDamageWeight(damageWeights: DamageRollWeightMap, damage: number, count: number = 1) {
  if (damageWeights[damage] === undefined) {
    damageWeights[damage] = count;
  } else {
    damageWeights[damage] += count;
  }
}

export function convolveDamageWeight(damageWeights: DamageRollWeightMap, damage: number): DamageRollWeightMap {

  let newDamageWeights: DamageRollWeightMap = [];

  damageWeights.forEach((weight, damageRoll) => {
    addDamageWeight(newDamageWeights, damageRoll + damage, weight);
  });

  return newDamageWeights;
}

export function mergeDamageWeights(d1: DamageRollWeightMap, d2: DamageRollWeightMap) {
  d2.forEach((weight, damageRoll) => {
    addDamageWeight(d1, damageRoll, weight);
  });
}