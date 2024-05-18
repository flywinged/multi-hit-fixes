import { Generation, Weather, Terrain, TypeName, ID } from './data/interface';
import { Field, Side } from './field';
import { Move } from './move';
import { Pokemon } from './pokemon';
import { Damage, DamageRollWeightMap, addDamageWeight, convolveDamageWeight, damageRange, mergeDamageWeights } from './result';
import { error } from './util';
// NOTE: This needs to come last to simplify bundling
import { isGrounded } from './mechanics/util';

export interface RawDesc {
  HPEVs?: string;
  attackBoost?: number;
  attackEVs?: string;
  attackerAbility?: string;
  attackerItem?: string;
  attackerName: string;
  attackerTera?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderName: string;
  defenderTera?: string;
  defenseBoost?: number;
  defenseEVs?: string;
  hits?: number;
  alliesFainted?: number;
  isBeadsOfRuin?: boolean;
  isSwordOfRuin?: boolean;
  isTabletsOfRuin?: boolean;
  isVesselOfRuin?: boolean;
  isAuroraVeil?: boolean;
  isFlowerGiftAttacker?: boolean;
  isFlowerGiftDefender?: boolean;
  isFriendGuard?: boolean;
  isHelpingHand?: boolean;
  isCritical?: boolean;
  isLightScreen?: boolean;
  isBurned?: boolean;
  isProtected?: boolean;
  isReflect?: boolean;
  isBattery?: boolean;
  isPowerSpot?: boolean;
  isWonderRoom?: boolean;
  isSwitching?: 'out' | 'in';
  moveBP?: number;
  moveName: string;
  moveTurns?: string;
  moveType?: TypeName;
  rivalry?: 'buffed' | 'nerfed';
  terrain?: Terrain;
  weather?: Weather;
  isDefenderDynamaxed?: boolean;
}

export function display(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  rawDesc: RawDesc,
  notation = '%',
  err = true
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1];
  const max = typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1];

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const desc = buildDescription(rawDesc, attacker, defender);
  const damageText = `${min}-${max} (${minDisplay} - ${maxDisplay}${notation})`;

  if (move.category === 'Status' && !move.named('Nature Power')) return `${desc}: ${damageText}`;
  const koChanceText = getKOChance(gen, attacker, defender, move, field, damage, err).text;
  return koChanceText ? `${desc}: ${damageText} -- ${koChanceText}` : `${desc}: ${damageText}`;
}

export function displayMove(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1];
  const max = typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1];

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const recoveryText = getRecovery(gen, attacker, defender, move, damage, notation).text;
  const recoilText = getRecoil(gen, attacker, defender, move, damage, notation).text;

  return `${minDisplay} - ${maxDisplay}${notation}${recoveryText &&
    ` (${recoveryText})`}${recoilText && ` (${recoilText})`}`;
}

export function getRecovery(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const minD = typeof minDamage === 'number' ? [minDamage] : minDamage;
  const maxD = typeof maxDamage === 'number' ? [maxDamage] : maxDamage;

  const recovery = [0, 0] as [number, number];
  let text = '';

  const ignoresShellBell =
    gen.num === 3 && move.named('Doom Desire', 'Future Sight');
  if (attacker.hasItem('Shell Bell') && !ignoresShellBell) {
    const max = Math.round(defender.maxHP() / 8);
    for (let i = 0;i < minD.length;i++) {
      recovery[0] += Math.min(Math.round(minD[i] / 8), max);
      recovery[1] += Math.min(Math.round(maxD[i] / 8), max);
    }
  }

  if (move.named('G-Max Finale')) {
    recovery[0] = recovery[1] = Math.round(attacker.maxHP() / 6);
  }

  if (move.drain) {
    const percentHealed = move.drain[0] / move.drain[1];
    const max = Math.round(defender.maxHP() * percentHealed);
    for (let i = 0;i < minD.length;i++) {
      recovery[0] += Math.min(Math.round(minD[i] * percentHealed), max);
      recovery[1] += Math.min(Math.round(maxD[i] * percentHealed), max);
    }
  }

  if (recovery[1] === 0) return { recovery, text };

  const minHealthRecovered = toDisplay(notation, recovery[0], attacker.maxHP());
  const maxHealthRecovered = toDisplay(notation, recovery[1], attacker.maxHP());

  text = `${minHealthRecovered} - ${maxHealthRecovered}${notation} recovered`;
  return { recovery, text };
}

// TODO: return recoil damage as exact HP
export function getRecoil(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = (typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1]);
  const max = (typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1]);

  let recoil: [number, number] | number = [0, 0];
  let text = '';

  const damageOverflow = minDamage > defender.curHP() || maxDamage > defender.curHP();
  if (move.recoil) {
    const mod = (move.recoil[0] / move.recoil[1]) * 100;
    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.curHP()) * mod, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.curHP()) * mod, attacker.maxHP(), 100
      );
    }
    if (!attacker.hasAbility('Rock Head')) {
      recoil = [minRecoilDamage, maxRecoilDamage];
      text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} recoil damage`;
    }
  } else if (move.hasCrashDamage) {
    const genMultiplier = gen.num === 2 ? 12.5 : gen.num >= 3 ? 50 : 1;

    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow && gen.num !== 2) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
    }

    recoil = [minRecoilDamage, maxRecoilDamage];
    switch (gen.num) {
      case 1:
        recoil = toDisplay(notation, 1, attacker.maxHP());
        text = '1hp damage on miss';
        break;
      case 2: case 3: case 4:
        if (defender.hasType('Ghost')) {
          if (gen.num === 4) {
            const gen4CrashDamage = Math.floor(((defender.maxHP() * 0.5) / attacker.maxHP()) * 100);
            recoil = notation === '%' ? gen4CrashDamage : Math.floor((gen4CrashDamage / 100) * 48);
            text = `${gen4CrashDamage}% crash damage`;
          } else {
            recoil = 0;
            text = 'no crash damage on Ghost types';
          }
        } else {
          text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} crash damage on miss`;
        }
        break;
      default:
        recoil = notation === '%' ? 24 : 50;
        text = '50% crash damage';
    }
  } else if (move.struggleRecoil) {
    recoil = notation === '%' ? 12 : 25;
    text = '25% struggle damage';
    // Struggle recoil is actually rounded down in Gen 4 per DaWoblefet's research, but until we
    // return recoil damage as exact HP the best we can do is add some more text to this effect
    if (gen.num === 4) text += ' (rounded down)';
  } else if (move.mindBlownRecoil) {
    recoil = notation === '%' ? 24 : 50;
    text = '50% recoil damage';
  }

  return { recoil, text };
}

export function getKOChance(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damageInput: Damage,
  err = true
) {
  let combineResult = combine(damageInput);
  let damageWeights = combineResult.damageWeights;
  let rolls = getDamageRolls(damageWeights);
  let damage = rolls;

  // Code doesn't really work if these aren't set.
  if (move.timesUsed === undefined) move.timesUsed = 1;
  if (move.timesUsedWithMetronome === undefined) move.timesUsedWithMetronome = 1;

  if (damage[0] >= defender.maxHP() && move.timesUsed === 1 && move.timesUsedWithMetronome === 1) {
    return { chance: 1, n: 1, text: 'guaranteed OHKO' };
  }

  const hazards = getHazards(gen, defender, field.defenderSide);
  const eot = getEndOfTurn(gen, attacker, defender, move, field);
  const toxicCounter =
    defender.hasStatus('tox') && !defender.hasAbility('Magic Guard') ? defender.toxicCounter : 0;

  // multi-hit moves have too many possibilities for brute-forcing to work, so reduce it
  // to an approximate distribution
  let qualifier = '';
  if (combineResult.accurate === false) {
    qualifier = "approx. ";
  }

  const hazardsText = hazards.texts.length > 0
    ? ' after ' + serializeText(hazards.texts)
    : '';
  const afterText =
    hazards.texts.length > 0 || eot.texts.length > 0
      ? ' after ' + serializeText(hazards.texts.concat(eot.texts))
      : '';

  // 
  if ((move.timesUsed === 1 && move.timesUsedWithMetronome === 1) || move.isZ) {

    // This block computes OHKOs
    const chance = computeKOChance(
      damageWeights, defender.curHP() - hazards.damage, 0, 1, 1, defender.maxHP(), toxicCounter
    );
    if (chance === 1) {
      return { chance, n: 1, text: `guaranteed OHKO${hazardsText}` }; // eot wasn't considered
    } else if (chance > 0) {
      // note: still not accounting for EOT due to poor eot damage handling
      return {
        chance,
        n: 1,
        text: qualifier + formatChance(chance) + ` OHKO${hazardsText}`,
      };
    }

    // This block computes 2-4HKOs
    for (let i = 2;i <= 4;i++) {
      const chance = computeKOChance(
        damageWeights, defender.curHP() - hazards.damage, eot.damage, i, 1, defender.maxHP(), toxicCounter
      );
      if (chance === 1) {
        return { chance, n: i, text: `${qualifier || 'guaranteed '}${i}HKO${afterText}` };
      } else if (chance > 0) {
        return {
          chance,
          n: i,
          text: qualifier + formatChance(chance) + ` ${i}HKO${afterText}`,
        };
      }
    }

    // This block computes 5-9HKOs
    for (let i = 5;i <= 9;i++) {
      if (
        predictTotal(damage[0], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        return { chance: 1, n: i, text: `${qualifier || 'guaranteed '}${i}HKO${afterText}` };
      } else if (
        predictTotal(damage[damage.length - 1], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        return { n: i, text: qualifier + `possible ${i}HKO${afterText}` };
      }
    }
  } else {
    const chance = computeKOChance(
      damageWeights, defender.maxHP() - hazards.damage,
      eot.damage,
      move.hits || 1,
      move.timesUsed || 1,
      defender.maxHP(),
      toxicCounter
    );
    if (chance === 1) {
      return {
        chance,
        n: move.timesUsed,
        text: `${qualifier || 'guaranteed '}KO in ${move.timesUsed} turns${afterText}`,
      };
    } else if (chance > 0) {
      return {
        chance,
        n: move.timesUsed,
        text:
          qualifier +
          formatChance(chance) +
          ` ${move.timesUsed}HKO${afterText}`,
      };
    }

    if (predictTotal(
      damage[0],
      eot.damage,
      move.hits,
      move.timesUsed,
      toxicCounter,
      defender.maxHP()
    ) >=
      defender.curHP() - hazards.damage
    ) {
      return {
        chance: 1,
        n: move.timesUsed,
        text: `${qualifier || 'guaranteed '}KO in ${move.timesUsed} turns${afterText}`,
      };
    } else if (
      predictTotal(
        damage[damage.length - 1],
        eot.damage,
        move.hits,
        move.timesUsed,
        toxicCounter,
        defender.maxHP()
      ) >=
      defender.curHP() - hazards.damage
    ) {
      return {
        n: move.timesUsed,
        text: qualifier + `possible KO in ${move.timesUsed} turns${afterText}`,
      };
    }
    return { n: move.timesUsed, text: qualifier + 'not a KO' };
  }

  return { chance: 0, n: 0, text: '' };
}

function combine(damage: Damage): { damageWeights: DamageRollWeightMap, accurate: Boolean; } {
  let damageWeights: DamageRollWeightMap = [];

  // Fixed Damage
  if (typeof damage === 'number') {
    damageWeights[damage] = 16;
    return { damageWeights, accurate: true };
  }

  // Standard Damage
  if (damage.length === 16) {
    let d = damage as number[];
    for (let i = 0;i < 16;i++) {
      addDamageWeight(damageWeights, d[i]);
    }
    return { damageWeights, accurate: true };
  }

  // Multi-Hit Damage
  const d = damage as number[][];
  damageWeights[0] = 1;
  for (let i = 0;i < d.length;i++) {
    let nextWeights: DamageRollWeightMap = [];
    for (let j = 0;j < 16;j++) {
      mergeDamageWeights(nextWeights, convolveDamageWeight(damageWeights, d[i][j]));
    }
    damageWeights = nextWeights;
  }

  return { damageWeights, accurate: d.length <= 3 };
}

const TRAPPING = [
  'Bind', 'Clamp', 'Fire Spin', 'Infestation', 'Magma Storm', 'Sand Tomb',
  'Thunder Cage', 'Whirlpool', 'Wrap', 'G-Max Sandblast', 'G-Max Centiferno',
];

function getHazards(gen: Generation, defender: Pokemon, defenderSide: Side) {
  let damage = 0;
  const texts: string[] = [];

  if (defender.hasItem('Heavy-Duty Boots')) {
    return { damage, texts };
  }
  if (defenderSide.isSR && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
    const rockType = gen.types.get('rock' as ID)!;
    const effectiveness =
      rockType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? rockType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Stealth Rock');
  }
  if (defenderSide.steelsurge && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
    const steelType = gen.types.get('steel' as ID)!;
    const effectiveness =
      steelType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? steelType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Steelsurge');
  }

  if (!defender.hasType('Flying') &&
    !defender.hasAbility('Magic Guard', 'Levitate') &&
    !defender.hasItem('Air Balloon')
  ) {
    if (defenderSide.spikes === 1) {
      damage += Math.floor(defender.maxHP() / 8);
      if (gen.num === 2) {
        texts.push('Spikes');
      } else {
        texts.push('1 layer of Spikes');
      }
    } else if (defenderSide.spikes === 2) {
      damage += Math.floor(defender.maxHP() / 6);
      texts.push('2 layers of Spikes');
    } else if (defenderSide.spikes === 3) {
      damage += Math.floor(defender.maxHP() / 4);
      texts.push('3 layers of Spikes');
    }
  }

  if (isNaN(damage)) {
    damage = 0;
  }

  return { damage, texts };
}

function getEndOfTurn(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  let damage = 0;
  const texts = [];

  if (field.hasWeather('Sun', 'Harsh Sunshine')) {
    if (defender.hasAbility('Dry Skin', 'Solar Power')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push(defender.ability + ' damage');
    }
  } else if (field.hasWeather('Rain', 'Heavy Rain')) {
    if (defender.hasAbility('Dry Skin')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('Dry Skin recovery');
    } else if (defender.hasAbility('Rain Dish')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Rain Dish recovery');
    }
  } else if (field.hasWeather('Sand')) {
    if (
      !defender.hasType('Rock', 'Ground', 'Steel') &&
      !defender.hasAbility('Magic Guard', 'Overcoat', 'Sand Force', 'Sand Rush', 'Sand Veil') &&
      !defender.hasItem('Safety Goggles')
    ) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16));
      texts.push('sandstorm damage');
    }
  } else if (field.hasWeather('Hail', 'Snow')) {
    if (defender.hasAbility('Ice Body')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Ice Body recovery');
    } else if (
      !defender.hasType('Ice') &&
      !defender.hasAbility('Magic Guard', 'Overcoat', 'Snow Cloak') &&
      !defender.hasItem('Safety Goggles') &&
      field.hasWeather('Hail')
    ) {
      damage -= Math.floor(defender.maxHP() / 16);
      texts.push('hail damage');
    }
  }

  const loseItem = move.named('Knock Off') && !defender.hasAbility('Sticky Hold');
  if (defender.hasItem('Leftovers') && !loseItem) {
    damage += Math.floor(defender.maxHP() / 16);
    texts.push('Leftovers recovery');
  } else if (defender.hasItem('Black Sludge') && !loseItem) {
    if (defender.hasType('Poison')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Black Sludge recovery');
    } else if (!defender.hasAbility('Magic Guard', 'Klutz')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push('Black Sludge damage');
    }
  } else if (defender.hasItem('Sticky Barb')) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Sticky Barb damage');
  }

  if (field.defenderSide.isSeeded) {
    if (!defender.hasAbility('Magic Guard')) {
      // 1/16 in gen 1, 1/8 in gen 2 onwards
      damage -= Math.floor(defender.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('Leech Seed damage');
    }
  }

  if (field.attackerSide.isSeeded && !attacker.hasAbility('Magic Guard')) {
    if (attacker.hasAbility('Liquid Ooze')) {
      damage -= Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('Liquid Ooze damage');
    } else {
      damage += Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('Leech Seed recovery');
    }
  }

  if (field.hasTerrain('Grassy')) {
    if (isGrounded(defender, field)) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('Grassy Terrain recovery');
    }
  }

  if (defender.hasStatus('psn')) {
    if (defender.hasAbility('Poison Heal')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('Poison Heal');
    } else if (!defender.hasAbility('Magic Guard')) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8));
      texts.push('poison damage');
    }
  } else if (defender.hasStatus('tox')) {
    if (defender.hasAbility('Poison Heal')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('Poison Heal');
    } else if (!defender.hasAbility('Magic Guard')) {
      texts.push('toxic damage');
    }
  } else if (defender.hasStatus('brn')) {
    if (defender.hasAbility('Heatproof')) {
      damage -= Math.floor(defender.maxHP() / (gen.num > 6 ? 32 : 16));
      texts.push('reduced burn damage');
    } else if (!defender.hasAbility('Magic Guard')) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 || gen.num > 6 ? 16 : 8));
      texts.push('burn damage');
    }
  } else if (
    (defender.hasStatus('slp') || defender.hasAbility('Comatose')) &&
    attacker.hasAbility('isBadDreams') &&
    !defender.hasAbility('Magic Guard')
  ) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Bad Dreams');
  }

  if (!defender.hasAbility('Magic Guard') && TRAPPING.includes(move.name)) {
    if (attacker.hasItem('Binding Band')) {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 6) : Math.floor(defender.maxHP() / 8);
      texts.push('trapping damage');
    } else {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16);
      texts.push('trapping damage');
    }
  }
  if (defender.isSaltCure && !defender.hasAbility('Magic Guard')) {
    const isWaterOrSteel = defender.hasType('Water', 'Steel') ||
      (defender.teraType && ['Water', 'Steel'].includes(defender.teraType));
    damage -= Math.floor(defender.maxHP() / (isWaterOrSteel ? 4 : 8));
    texts.push('Salt Cure');
  }
  if (!defender.hasType('Fire') && !defender.hasAbility('Magic Guard') &&
    (move.named('Fire Pledge (Grass Pledge Boosted)', 'Grass Pledge (Fire Pledge Boosted)'))) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Sea of Fire damage');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Grass') &&
    (field.defenderSide.vinelash || move.named('G-Max Vine Lash'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Vine Lash damage');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Fire') &&
    (field.defenderSide.wildfire || move.named('G-Max Wildfire'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Wildfire damage');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Water') &&
    (field.defenderSide.cannonade || move.named('G-Max Cannonade'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Cannonade damage');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Rock') &&
    (field.defenderSide.volcalith || move.named('G-Max Volcalith'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('Volcalith damage');
  }

  return { damage, texts };
}

function computeKOChance(
  damageWeights: DamageRollWeightMap,
  hp: number,
  eot: number,
  hits: number,
  timesUsed: number,
  maxHP: number,
  toxicCounter: number
) {

  let nRolls = 4096;
  let rolls = getDamageRolls(damageWeights, nRolls);

  if (hits === 1) {
    if (rolls[nRolls - 1] < hp) {
      return 0;
    }
    for (let i = 0;i < nRolls;i++) {
      if (rolls[i] >= hp) {
        return (nRolls - i) / nRolls;
      }
    }
  }

  let toxicDamage = 0;
  if (toxicCounter > 0) {
    toxicDamage = Math.floor((toxicCounter * maxHP) / 16);
    toxicCounter++;
  }
  let sum = 0;
  let lastc = 0;
  for (let i = 0;i < nRolls;i++) {
    let c;
    if (i === 0 || rolls[i] !== rolls[i - 1]) {
      c = computeKOChance(
        damageWeights,
        hp - rolls[i] + eot - toxicDamage,
        eot,
        hits - 1,
        timesUsed,
        maxHP,
        toxicCounter
      );
    } else {
      c = lastc;
    }
    if (c === 1) {
      sum += nRolls - i;
      break;
    } else {
      sum += c;
    }
    lastc = c;
  }

  return sum / nRolls;
}

function predictTotal(
  damage: number,
  eot: number,
  hits: number,
  timesUsed: number,
  toxicCounter: number,
  maxHP: number
) {
  let toxicDamage = 0;
  if (toxicCounter > 0) {
    for (let i = 0;i < hits - 1;i++) {
      toxicDamage += Math.floor(((toxicCounter + i) * maxHP) / 16);
    }
  }
  let total = 0;
  if (hits > 1 && timesUsed === 1) {
    total = damage * hits - eot * (hits - 1) + toxicDamage;
  } else {
    total = damage - eot * (hits - 1) + toxicDamage;
  }
  return total;
}

function getDamageRolls(d: DamageRollWeightMap, count: number = 16) {

  // Reduce damage map to a list of 16 approximate values spaced evenly apart
  let total = 0;
  let allRolls: number[] = [];
  let rolls: number[] = [];
  d.forEach((weight, damageRoll) => {
    total += weight;
    allRolls.push(damageRoll);
  });
  allRolls.sort();

  // Determine the approximate spacing needed between each of the 16 points
  let spacing = total / (count - 1);
  rolls[0] = allRolls[0];
  let cumulative = 0;

  let currentIndex = 1;
  allRolls.forEach(roll => {
    if (currentIndex === count - 1) {
      return;
    }

    cumulative += d[roll];
    while (cumulative >= currentIndex * spacing) {
      rolls.push(roll);
      currentIndex += 1;
    }

  });

  rolls.push(allRolls[allRolls.length - 1]);
  return rolls;

}

function buildDescription(description: RawDesc, attacker: Pokemon, defender: Pokemon) {
  const [attackerLevel, defenderLevel] = getDescriptionLevels(attacker, defender);
  let output = '';
  if (description.attackBoost) {
    if (description.attackBoost > 0) {
      output += '+';
    }
    output += description.attackBoost + ' ';
  }
  output = appendIfSet(output, attackerLevel);
  output = appendIfSet(output, description.attackEVs);
  output = appendIfSet(output, description.attackerItem);
  output = appendIfSet(output, description.attackerAbility);
  output = appendIfSet(output, description.rivalry);
  if (description.isBurned) {
    output += 'burned ';
  }
  if (description.alliesFainted) {
    output += Math.min(5, description.alliesFainted) +
      ` ${description.alliesFainted === 1 ? 'ally' : 'allies'} fainted `;
  }
  if (description.attackerTera) {
    output += `Tera ${description.attackerTera} `;
  }
  if (description.isBeadsOfRuin) {
    output += 'Beads of Ruin ';
  }
  if (description.isSwordOfRuin) {
    output += 'Sword of Ruin ';
  }
  output += description.attackerName + ' ';
  if (description.isHelpingHand) {
    output += 'Helping Hand ';
  }
  if (description.isFlowerGiftAttacker) {
    output += ' with an ally\'s Flower Gift ';
  }
  if (description.isBattery) {
    output += ' Battery boosted ';
  }
  if (description.isPowerSpot) {
    output += ' Power Spot boosted ';
  }
  if (description.isSwitching) {
    output += ' switching boosted ';
  }
  output += description.moveName + ' ';
  if (description.moveBP && description.moveType) {
    output += '(' + description.moveBP + ' BP ' + description.moveType + ') ';
  } else if (description.moveBP) {
    output += '(' + description.moveBP + ' BP) ';
  } else if (description.moveType) {
    output += '(' + description.moveType + ') ';
  }
  if (description.hits) {
    output += '(' + description.hits + ' hits) ';
  }
  output = appendIfSet(output, description.moveTurns);
  output += 'vs. ';
  if (description.defenseBoost) {
    if (description.defenseBoost > 0) {
      output += '+';
    }
    output += description.defenseBoost + ' ';
  }
  output = appendIfSet(output, defenderLevel);
  output = appendIfSet(output, description.HPEVs);
  if (description.defenseEVs) {
    output += '/ ' + description.defenseEVs + ' ';
  }
  output = appendIfSet(output, description.defenderItem);
  output = appendIfSet(output, description.defenderAbility);
  if (description.isTabletsOfRuin) {
    output += 'Tablets of Ruin ';
  }
  if (description.isVesselOfRuin) {
    output += 'Vessel of Ruin ';
  }
  if (description.isProtected) {
    output += 'protected ';
  }
  if (description.isDefenderDynamaxed) {
    output += 'Dynamax ';
  }
  if (description.defenderTera) {
    output += `Tera ${description.defenderTera} `;
  }
  output += description.defenderName;
  if (description.weather && description.terrain) {
    // do nothing
  } else if (description.weather) {
    output += ' in ' + description.weather;
  } else if (description.terrain) {
    output += ' in ' + description.terrain + ' Terrain';
  }
  if (description.isReflect) {
    output += ' through Reflect';
  } else if (description.isLightScreen) {
    output += ' through Light Screen';
  }
  if (description.isFlowerGiftDefender) {
    output += ' with an ally\'s Flower Gift';
  }
  if (description.isFriendGuard) {
    output += ' with an ally\'s Friend Guard';
  }
  if (description.isAuroraVeil) {
    output += ' with an ally\'s Aurora Veil';
  }
  if (description.isCritical) {
    output += ' on a critical hit';
  }
  if (description.isWonderRoom) {
    output += ' in Wonder Room';
  }
  return output;
}

function getDescriptionLevels(attacker: Pokemon, defender: Pokemon) {
  if (attacker.level !== defender.level) {
    return [
      attacker.level === 100 ? '' : `Lvl ${attacker.level}`,
      defender.level === 100 ? '' : `Lvl ${defender.level}`,
    ];
  }
  // There's an argument for showing any level thats not 100, but VGC and LC players
  // probably would rather not see level cruft in their calcs
  const elide = [100, 50, 5].includes(attacker.level);
  const level = elide ? '' : `Lvl ${attacker.level}`;
  return [level, level];
}

function serializeText(arr: string[]) {
  if (arr.length === 0) {
    return '';
  } else if (arr.length === 1) {
    return arr[0];
  } else if (arr.length === 2) {
    return arr[0] + ' and ' + arr[1];
  } else {
    let text = '';
    for (let i = 0;i < arr.length - 1;i++) {
      text += arr[i] + ', ';
    }
    return text + 'and ' + arr[arr.length - 1];
  }
}

function appendIfSet(str: string, toAppend?: string) {
  return toAppend ? `${str}${toAppend} ` : str;
}

function toDisplay(notation: string, a: number, b: number, f = 1) {
  return notation === '%' ? Math.floor((a * (1000 / f)) / b) / 10 : Math.floor((a * (48 / f)) / b);
}

function formatChance(chance: number): string {
  let i;
  for (i = 1;1 - chance < Math.pow(10, -i);i++) { }

  if (i > 2) {
    return "1 in ~" + Math.round((chance) / (1 - chance)).toString() + " chance to NOT";
  }

  for (i = 1;chance < Math.pow(10, -i);i++) { }

  if (i > 2) {
    return "1 in ~" + Math.round((1 - chance) / (chance)).toString() + " chance to";
  }

  return (Math.round(chance * Math.pow(10, i + 3)) / Math.pow(10, i + 1)).toString() + "% chance to";
}