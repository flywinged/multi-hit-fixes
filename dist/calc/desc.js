"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
exports.__esModule = true;

var result_1 = require("./result");
var util_1 = require("./mechanics/util");
function display(gen, attacker, defender, move, field, damage, rawDesc, notation, err) {
    if (notation === void 0) { notation = '%'; }
    if (err === void 0) { err = true; }
    var _a = __read((0, result_1.damageRange)(damage), 2), minDamage = _a[0], maxDamage = _a[1];
    var min = typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1];
    var max = typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1];
    var minDisplay = toDisplay(notation, min, defender.maxHP());
    var maxDisplay = toDisplay(notation, max, defender.maxHP());
    var desc = buildDescription(rawDesc, attacker, defender);
    var damageText = "".concat(min, "-").concat(max, " (").concat(minDisplay, " - ").concat(maxDisplay).concat(notation, ")");
    if (move.category === 'Status' && !move.named('Nature Power'))
        return "".concat(desc, ": ").concat(damageText);
    var koChanceText = getKOChance(gen, attacker, defender, move, field, damage, err).text;
    return koChanceText ? "".concat(desc, ": ").concat(damageText, " -- ").concat(koChanceText) : "".concat(desc, ": ").concat(damageText);
}
exports.display = display;
function displayMove(gen, attacker, defender, move, damage, notation) {
    if (notation === void 0) { notation = '%'; }
    var _a = __read((0, result_1.damageRange)(damage), 2), minDamage = _a[0], maxDamage = _a[1];
    var min = typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1];
    var max = typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1];
    var minDisplay = toDisplay(notation, min, defender.maxHP());
    var maxDisplay = toDisplay(notation, max, defender.maxHP());
    var recoveryText = getRecovery(gen, attacker, defender, move, damage, notation).text;
    var recoilText = getRecoil(gen, attacker, defender, move, damage, notation).text;
    return "".concat(minDisplay, " - ").concat(maxDisplay).concat(notation).concat(recoveryText &&
        " (".concat(recoveryText, ")")).concat(recoilText && " (".concat(recoilText, ")"));
}
exports.displayMove = displayMove;
function getRecovery(gen, attacker, defender, move, damage, notation) {
    if (notation === void 0) { notation = '%'; }
    var _a = __read((0, result_1.damageRange)(damage), 2), minDamage = _a[0], maxDamage = _a[1];
    var minD = typeof minDamage === 'number' ? [minDamage] : minDamage;
    var maxD = typeof maxDamage === 'number' ? [maxDamage] : maxDamage;
    var recovery = [0, 0];
    var text = '';
    var ignoresShellBell = gen.num === 3 && move.named('Doom Desire', 'Future Sight');
    if (attacker.hasItem('Shell Bell') && !ignoresShellBell) {
        var max = Math.round(defender.maxHP() / 8);
        for (var i = 0; i < minD.length; i++) {
            recovery[0] += Math.min(Math.round(minD[i] / 8), max);
            recovery[1] += Math.min(Math.round(maxD[i] / 8), max);
        }
    }
    if (move.named('G-Max Finale')) {
        recovery[0] = recovery[1] = Math.round(attacker.maxHP() / 6);
    }
    if (move.drain) {
        var percentHealed = move.drain[0] / move.drain[1];
        var max = Math.round(defender.maxHP() * percentHealed);
        for (var i = 0; i < minD.length; i++) {
            recovery[0] += Math.min(Math.round(minD[i] * percentHealed), max);
            recovery[1] += Math.min(Math.round(maxD[i] * percentHealed), max);
        }
    }
    if (recovery[1] === 0)
        return { recovery: recovery, text: text };
    var minHealthRecovered = toDisplay(notation, recovery[0], attacker.maxHP());
    var maxHealthRecovered = toDisplay(notation, recovery[1], attacker.maxHP());
    text = "".concat(minHealthRecovered, " - ").concat(maxHealthRecovered).concat(notation, " recovered");
    return { recovery: recovery, text: text };
}
exports.getRecovery = getRecovery;
function getRecoil(gen, attacker, defender, move, damage, notation) {
    if (notation === void 0) { notation = '%'; }
    var _a = __read((0, result_1.damageRange)(damage), 2), minDamage = _a[0], maxDamage = _a[1];
    var min = (typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1]);
    var max = (typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1]);
    var recoil = [0, 0];
    var text = '';
    var damageOverflow = minDamage > defender.curHP() || maxDamage > defender.curHP();
    if (move.recoil) {
        var mod = (move.recoil[0] / move.recoil[1]) * 100;
        var minRecoilDamage = void 0, maxRecoilDamage = void 0;
        if (damageOverflow) {
            minRecoilDamage =
                toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
            maxRecoilDamage =
                toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
        }
        else {
            minRecoilDamage = toDisplay(notation, Math.min(min, defender.curHP()) * mod, attacker.maxHP(), 100);
            maxRecoilDamage = toDisplay(notation, Math.min(max, defender.curHP()) * mod, attacker.maxHP(), 100);
        }
        if (!attacker.hasAbility('Rock Head')) {
            recoil = [minRecoilDamage, maxRecoilDamage];
            text = "".concat(minRecoilDamage, " - ").concat(maxRecoilDamage).concat(notation, " recoil damage");
        }
    }
    else if (move.hasCrashDamage) {
        var genMultiplier = gen.num === 2 ? 12.5 : gen.num >= 3 ? 50 : 1;
        var minRecoilDamage = void 0, maxRecoilDamage = void 0;
        if (damageOverflow && gen.num !== 2) {
            minRecoilDamage =
                toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
            maxRecoilDamage =
                toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
        }
        else {
            minRecoilDamage = toDisplay(notation, Math.min(min, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100);
            maxRecoilDamage = toDisplay(notation, Math.min(max, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100);
        }
        recoil = [minRecoilDamage, maxRecoilDamage];
        switch (gen.num) {
            case 1:
                recoil = toDisplay(notation, 1, attacker.maxHP());
                text = '1hp damage on miss';
                break;
            case 2:
            case 3:
            case 4:
                if (defender.hasType('Ghost')) {
                    if (gen.num === 4) {
                        var gen4CrashDamage = Math.floor(((defender.maxHP() * 0.5) / attacker.maxHP()) * 100);
                        recoil = notation === '%' ? gen4CrashDamage : Math.floor((gen4CrashDamage / 100) * 48);
                        text = "".concat(gen4CrashDamage, "% crash damage");
                    }
                    else {
                        recoil = 0;
                        text = 'no crash damage on Ghost types';
                    }
                }
                else {
                    text = "".concat(minRecoilDamage, " - ").concat(maxRecoilDamage).concat(notation, " crash damage on miss");
                }
                break;
            default:
                recoil = notation === '%' ? 24 : 50;
                text = '50% crash damage';
        }
    }
    else if (move.struggleRecoil) {
        recoil = notation === '%' ? 12 : 25;
        text = '25% struggle damage';
        if (gen.num === 4)
            text += ' (rounded down)';
    }
    else if (move.mindBlownRecoil) {
        recoil = notation === '%' ? 24 : 50;
        text = '50% recoil damage';
    }
    return { recoil: recoil, text: text };
}
exports.getRecoil = getRecoil;
function getKOChance(gen, attacker, defender, move, field, damageInput, err) {
    if (err === void 0) { err = true; }
    var combineResult = combine(damageInput);
    var damageWeights = combineResult.damageWeights;
    var rolls = getDamageRolls(damageWeights);
    var damage = rolls;
    if (move.timesUsed === undefined)
        move.timesUsed = 1;
    if (move.timesUsedWithMetronome === undefined)
        move.timesUsedWithMetronome = 1;
    if (damage[0] >= defender.maxHP() && move.timesUsed === 1 && move.timesUsedWithMetronome === 1) {
        return { chance: 1, n: 1, text: 'guaranteed OHKO' };
    }
    var hazards = getHazards(gen, defender, field.defenderSide);
    var eot = getEndOfTurn(gen, attacker, defender, move, field);
    var toxicCounter = defender.hasStatus('tox') && !defender.hasAbility('Magic Guard') ? defender.toxicCounter : 0;
    var qualifier = '';
    if (combineResult.accurate === false) {
        qualifier = "approx. ";
    }
    var hazardsText = hazards.texts.length > 0
        ? ' after ' + serializeText(hazards.texts)
        : '';
    var afterText = hazards.texts.length > 0 || eot.texts.length > 0
        ? ' after ' + serializeText(hazards.texts.concat(eot.texts))
        : '';
    if ((move.timesUsed === 1 && move.timesUsedWithMetronome === 1) || move.isZ) {
        var chance = computeKOChance(damageWeights, defender.curHP() - hazards.damage, 0, 1, 1, defender.maxHP(), toxicCounter);
        if (chance === 1) {
            return { chance: chance, n: 1, text: "guaranteed OHKO".concat(hazardsText) };
        }
        else if (chance > 0) {
            return {
                chance: chance,
                n: 1,
                text: qualifier + formatChance(chance) + " OHKO".concat(hazardsText)
            };
        }
        for (var i = 2; i <= 4; i++) {
            var chance_1 = computeKOChance(damageWeights, defender.curHP() - hazards.damage, eot.damage, i, 1, defender.maxHP(), toxicCounter);
            if (chance_1 === 1) {
                return { chance: chance_1, n: i, text: "".concat(qualifier || 'guaranteed ').concat(i, "HKO").concat(afterText) };
            }
            else if (chance_1 > 0) {
                return {
                    chance: chance_1,
                    n: i,
                    text: qualifier + formatChance(chance_1) + " ".concat(i, "HKO").concat(afterText)
                };
            }
        }
        for (var i = 5; i <= 9; i++) {
            if (predictTotal(damage[0], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
                defender.curHP() - hazards.damage) {
                return { chance: 1, n: i, text: "".concat(qualifier || 'guaranteed ').concat(i, "HKO").concat(afterText) };
            }
            else if (predictTotal(damage[damage.length - 1], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
                defender.curHP() - hazards.damage) {
                return { n: i, text: qualifier + "possible ".concat(i, "HKO").concat(afterText) };
            }
        }
    }
    else {
        var chance = computeKOChance(damageWeights, defender.maxHP() - hazards.damage, eot.damage, move.hits || 1, move.timesUsed || 1, defender.maxHP(), toxicCounter);
        if (chance === 1) {
            return {
                chance: chance,
                n: move.timesUsed,
                text: "".concat(qualifier || 'guaranteed ', "KO in ").concat(move.timesUsed, " turns").concat(afterText)
            };
        }
        else if (chance > 0) {
            return {
                chance: chance,
                n: move.timesUsed,
                text: qualifier +
                    formatChance(chance) +
                    " ".concat(move.timesUsed, "HKO").concat(afterText)
            };
        }
        if (predictTotal(damage[0], eot.damage, move.hits, move.timesUsed, toxicCounter, defender.maxHP()) >=
            defender.curHP() - hazards.damage) {
            return {
                chance: 1,
                n: move.timesUsed,
                text: "".concat(qualifier || 'guaranteed ', "KO in ").concat(move.timesUsed, " turns").concat(afterText)
            };
        }
        else if (predictTotal(damage[damage.length - 1], eot.damage, move.hits, move.timesUsed, toxicCounter, defender.maxHP()) >=
            defender.curHP() - hazards.damage) {
            return {
                n: move.timesUsed,
                text: qualifier + "possible KO in ".concat(move.timesUsed, " turns").concat(afterText)
            };
        }
        return { n: move.timesUsed, text: qualifier + 'not a KO' };
    }
    return { chance: 0, n: 0, text: '' };
}
exports.getKOChance = getKOChance;
function combine(damage) {
    var damageWeights = [];
    if (typeof damage === 'number') {
        damageWeights[damage] = 16;
        return { damageWeights: damageWeights, accurate: true };
    }
    if (damage.length === 16) {
        var d_1 = damage;
        for (var i = 0; i < 16; i++) {
            (0, result_1.addDamageWeight)(damageWeights, d_1[i]);
        }
        return { damageWeights: damageWeights, accurate: true };
    }
    var d = damage;
    damageWeights[0] = 1;
    for (var i = 0; i < d.length; i++) {
        var nextWeights = [];
        for (var j = 0; j < 16; j++) {
            (0, result_1.mergeDamageWeights)(nextWeights, (0, result_1.convolveDamageWeight)(damageWeights, d[i][j]));
        }
        damageWeights = nextWeights;
    }
    return { damageWeights: damageWeights, accurate: d.length <= 3 };
}
var TRAPPING = [
    'Bind', 'Clamp', 'Fire Spin', 'Infestation', 'Magma Storm', 'Sand Tomb',
    'Thunder Cage', 'Whirlpool', 'Wrap', 'G-Max Sandblast', 'G-Max Centiferno',
];
function getHazards(gen, defender, defenderSide) {
    var damage = 0;
    var texts = [];
    if (defender.hasItem('Heavy-Duty Boots')) {
        return { damage: damage, texts: texts };
    }
    if (defenderSide.isSR && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
        var rockType = gen.types.get('rock');
        var effectiveness = rockType.effectiveness[defender.types[0]] *
            (defender.types[1] ? rockType.effectiveness[defender.types[1]] : 1);
        damage += Math.floor((effectiveness * defender.maxHP()) / 8);
        texts.push('Stealth Rock');
    }
    if (defenderSide.steelsurge && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
        var steelType = gen.types.get('steel');
        var effectiveness = steelType.effectiveness[defender.types[0]] *
            (defender.types[1] ? steelType.effectiveness[defender.types[1]] : 1);
        damage += Math.floor((effectiveness * defender.maxHP()) / 8);
        texts.push('Steelsurge');
    }
    if (!defender.hasType('Flying') &&
        !defender.hasAbility('Magic Guard', 'Levitate') &&
        !defender.hasItem('Air Balloon')) {
        if (defenderSide.spikes === 1) {
            damage += Math.floor(defender.maxHP() / 8);
            if (gen.num === 2) {
                texts.push('Spikes');
            }
            else {
                texts.push('1 layer of Spikes');
            }
        }
        else if (defenderSide.spikes === 2) {
            damage += Math.floor(defender.maxHP() / 6);
            texts.push('2 layers of Spikes');
        }
        else if (defenderSide.spikes === 3) {
            damage += Math.floor(defender.maxHP() / 4);
            texts.push('3 layers of Spikes');
        }
    }
    if (isNaN(damage)) {
        damage = 0;
    }
    return { damage: damage, texts: texts };
}
function getEndOfTurn(gen, attacker, defender, move, field) {
    var damage = 0;
    var texts = [];
    if (field.hasWeather('Sun', 'Harsh Sunshine')) {
        if (defender.hasAbility('Dry Skin', 'Solar Power')) {
            damage -= Math.floor(defender.maxHP() / 8);
            texts.push(defender.ability + ' damage');
        }
    }
    else if (field.hasWeather('Rain', 'Heavy Rain')) {
        if (defender.hasAbility('Dry Skin')) {
            damage += Math.floor(defender.maxHP() / 8);
            texts.push('Dry Skin recovery');
        }
        else if (defender.hasAbility('Rain Dish')) {
            damage += Math.floor(defender.maxHP() / 16);
            texts.push('Rain Dish recovery');
        }
    }
    else if (field.hasWeather('Sand')) {
        if (!defender.hasType('Rock', 'Ground', 'Steel') &&
            !defender.hasAbility('Magic Guard', 'Overcoat', 'Sand Force', 'Sand Rush', 'Sand Veil') &&
            !defender.hasItem('Safety Goggles')) {
            damage -= Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16));
            texts.push('sandstorm damage');
        }
    }
    else if (field.hasWeather('Hail', 'Snow')) {
        if (defender.hasAbility('Ice Body')) {
            damage += Math.floor(defender.maxHP() / 16);
            texts.push('Ice Body recovery');
        }
        else if (!defender.hasType('Ice') &&
            !defender.hasAbility('Magic Guard', 'Overcoat', 'Snow Cloak') &&
            !defender.hasItem('Safety Goggles') &&
            field.hasWeather('Hail')) {
            damage -= Math.floor(defender.maxHP() / 16);
            texts.push('hail damage');
        }
    }
    var loseItem = move.named('Knock Off') && !defender.hasAbility('Sticky Hold');
    if (defender.hasItem('Leftovers') && !loseItem) {
        damage += Math.floor(defender.maxHP() / 16);
        texts.push('Leftovers recovery');
    }
    else if (defender.hasItem('Black Sludge') && !loseItem) {
        if (defender.hasType('Poison')) {
            damage += Math.floor(defender.maxHP() / 16);
            texts.push('Black Sludge recovery');
        }
        else if (!defender.hasAbility('Magic Guard', 'Klutz')) {
            damage -= Math.floor(defender.maxHP() / 8);
            texts.push('Black Sludge damage');
        }
    }
    else if (defender.hasItem('Sticky Barb')) {
        damage -= Math.floor(defender.maxHP() / 8);
        texts.push('Sticky Barb damage');
    }
    if (field.defenderSide.isSeeded) {
        if (!defender.hasAbility('Magic Guard')) {
            damage -= Math.floor(defender.maxHP() / (gen.num >= 2 ? 8 : 16));
            texts.push('Leech Seed damage');
        }
    }
    if (field.attackerSide.isSeeded && !attacker.hasAbility('Magic Guard')) {
        if (attacker.hasAbility('Liquid Ooze')) {
            damage -= Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
            texts.push('Liquid Ooze damage');
        }
        else {
            damage += Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
            texts.push('Leech Seed recovery');
        }
    }
    if (field.hasTerrain('Grassy')) {
        if ((0, util_1.isGrounded)(defender, field)) {
            damage += Math.floor(defender.maxHP() / 16);
            texts.push('Grassy Terrain recovery');
        }
    }
    if (defender.hasStatus('psn')) {
        if (defender.hasAbility('Poison Heal')) {
            damage += Math.floor(defender.maxHP() / 8);
            texts.push('Poison Heal');
        }
        else if (!defender.hasAbility('Magic Guard')) {
            damage -= Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8));
            texts.push('poison damage');
        }
    }
    else if (defender.hasStatus('tox')) {
        if (defender.hasAbility('Poison Heal')) {
            damage += Math.floor(defender.maxHP() / 8);
            texts.push('Poison Heal');
        }
        else if (!defender.hasAbility('Magic Guard')) {
            texts.push('toxic damage');
        }
    }
    else if (defender.hasStatus('brn')) {
        if (defender.hasAbility('Heatproof')) {
            damage -= Math.floor(defender.maxHP() / (gen.num > 6 ? 32 : 16));
            texts.push('reduced burn damage');
        }
        else if (!defender.hasAbility('Magic Guard')) {
            damage -= Math.floor(defender.maxHP() / (gen.num === 1 || gen.num > 6 ? 16 : 8));
            texts.push('burn damage');
        }
    }
    else if ((defender.hasStatus('slp') || defender.hasAbility('Comatose')) &&
        attacker.hasAbility('isBadDreams') &&
        !defender.hasAbility('Magic Guard')) {
        damage -= Math.floor(defender.maxHP() / 8);
        texts.push('Bad Dreams');
    }
    if (!defender.hasAbility('Magic Guard') && TRAPPING.includes(move.name)) {
        if (attacker.hasItem('Binding Band')) {
            damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 6) : Math.floor(defender.maxHP() / 8);
            texts.push('trapping damage');
        }
        else {
            damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16);
            texts.push('trapping damage');
        }
    }
    if (defender.isSaltCure && !defender.hasAbility('Magic Guard')) {
        var isWaterOrSteel = defender.hasType('Water', 'Steel') ||
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
    return { damage: damage, texts: texts };
}
function computeKOChance(damageWeights, hp, eot, hits, timesUsed, maxHP, toxicCounter) {
    var nRolls = 4096;
    var rolls = getDamageRolls(damageWeights, nRolls);
    if (hits === 1) {
        if (rolls[nRolls - 1] < hp) {
            return 0;
        }
        for (var i = 0; i < nRolls; i++) {
            if (rolls[i] >= hp) {
                return (nRolls - i) / nRolls;
            }
        }
    }
    var toxicDamage = 0;
    if (toxicCounter > 0) {
        toxicDamage = Math.floor((toxicCounter * maxHP) / 16);
        toxicCounter++;
    }
    var sum = 0;
    var lastc = 0;
    for (var i = 0; i < nRolls; i++) {
        var c = void 0;
        if (i === 0 || rolls[i] !== rolls[i - 1]) {
            c = computeKOChance(damageWeights, hp - rolls[i] + eot - toxicDamage, eot, hits - 1, timesUsed, maxHP, toxicCounter);
        }
        else {
            c = lastc;
        }
        if (c === 1) {
            sum += nRolls - i;
            break;
        }
        else {
            sum += c;
        }
        lastc = c;
    }
    return sum / nRolls;
}
function predictTotal(damage, eot, hits, timesUsed, toxicCounter, maxHP) {
    var toxicDamage = 0;
    if (toxicCounter > 0) {
        for (var i = 0; i < hits - 1; i++) {
            toxicDamage += Math.floor(((toxicCounter + i) * maxHP) / 16);
        }
    }
    var total = 0;
    if (hits > 1 && timesUsed === 1) {
        total = damage * hits - eot * (hits - 1) + toxicDamage;
    }
    else {
        total = damage - eot * (hits - 1) + toxicDamage;
    }
    return total;
}
function getDamageRolls(d, count) {
    if (count === void 0) { count = 16; }
    var total = 0;
    var allRolls = [];
    var rolls = [];
    d.forEach(function (weight, damageRoll) {
        total += weight;
        allRolls.push(damageRoll);
    });
    allRolls.sort();
    var spacing = total / (count - 1);
    rolls[0] = allRolls[0];
    var cumulative = 0;
    var currentIndex = 1;
    allRolls.forEach(function (roll) {
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
function buildDescription(description, attacker, defender) {
    var _a = __read(getDescriptionLevels(attacker, defender), 2), attackerLevel = _a[0], defenderLevel = _a[1];
    var output = '';
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
            " ".concat(description.alliesFainted === 1 ? 'ally' : 'allies', " fainted ");
    }
    if (description.attackerTera) {
        output += "Tera ".concat(description.attackerTera, " ");
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
    }
    else if (description.moveBP) {
        output += '(' + description.moveBP + ' BP) ';
    }
    else if (description.moveType) {
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
        output += "Tera ".concat(description.defenderTera, " ");
    }
    output += description.defenderName;
    if (description.weather && description.terrain) {
    }
    else if (description.weather) {
        output += ' in ' + description.weather;
    }
    else if (description.terrain) {
        output += ' in ' + description.terrain + ' Terrain';
    }
    if (description.isReflect) {
        output += ' through Reflect';
    }
    else if (description.isLightScreen) {
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
function getDescriptionLevels(attacker, defender) {
    if (attacker.level !== defender.level) {
        return [
            attacker.level === 100 ? '' : "Lvl ".concat(attacker.level),
            defender.level === 100 ? '' : "Lvl ".concat(defender.level),
        ];
    }
    var elide = [100, 50, 5].includes(attacker.level);
    var level = elide ? '' : "Lvl ".concat(attacker.level);
    return [level, level];
}
function serializeText(arr) {
    if (arr.length === 0) {
        return '';
    }
    else if (arr.length === 1) {
        return arr[0];
    }
    else if (arr.length === 2) {
        return arr[0] + ' and ' + arr[1];
    }
    else {
        var text = '';
        for (var i = 0; i < arr.length - 1; i++) {
            text += arr[i] + ', ';
        }
        return text + 'and ' + arr[arr.length - 1];
    }
}
function appendIfSet(str, toAppend) {
    return toAppend ? "".concat(str).concat(toAppend, " ") : str;
}
function toDisplay(notation, a, b, f) {
    if (f === void 0) { f = 1; }
    return notation === '%' ? Math.floor((a * (1000 / f)) / b) / 10 : Math.floor((a * (48 / f)) / b);
}
function formatChance(chance) {
    var i;
    for (i = 1; 1 - chance < Math.pow(10, -i); i++) { }
    if (i > 2) {
        return "1 in ~" + Math.round((chance) / (1 - chance)).toString() + " chance to NOT";
    }
    for (i = 1; chance < Math.pow(10, -i); i++) { }
    if (i > 2) {
        return "1 in ~" + Math.round((1 - chance) / (chance)).toString() + " chance to";
    }
    return (Math.round(chance * Math.pow(10, i + 4)) / Math.pow(10, i + 2)).toString() + "% chance to";
}
//# sourceMappingURL=desc.js.map