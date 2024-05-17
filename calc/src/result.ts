import {RawDesc, display, displayMove, getRecovery, getRecoil, getKOChance} from './desc';
import {Generation} from './data/interface';
import {Field} from './field';
import {Move} from './move';
import {Pokemon} from './pokemon';

export type Damage = number | number[] | [number, number] | number[][];
export type DamageChanceMap = { [key: string]: number }

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

  const d = damage as number[][]
  let totalMinimums = d.reduce((accumulator, currentHitRolls) => {
    return accumulator + currentHitRolls[0]
  }, 0)

  let totalMaximums = d.reduce((accumulator, currentHitRolls) => {
    return accumulator + currentHitRolls[currentHitRolls.length - 1]
  }, 0)

  return [totalMinimums, totalMaximums]
}

export function addDamageChance(damageChances: DamageChanceMap, damage: number, count: number = 1) {
  if (damageChances[damage] === undefined) {
    damageChances[damage] = count;
  } else {
    damageChances[damage] += count;
  }
}

export function convolveDamageChance(damageChances: DamageChanceMap, damage: number): DamageChanceMap {

  let newDamageChances: DamageChanceMap = {}

  for (const [stringValue, chance] of Object.entries(damageChances)) {
    let value: number = +stringValue
    addDamageChance(newDamageChances, value + damage, chance)
  }

  return newDamageChances
}

export function mergeDamageChances(d1: DamageChanceMap, d2: DamageChanceMap) {
  for (const [stringValue, chance] of Object.entries(d2)) {
    let value: number = +stringValue
    addDamageChance(d1, value, chance)
  }
}