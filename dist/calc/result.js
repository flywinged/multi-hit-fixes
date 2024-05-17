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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;

var desc_1 = require("./desc");
var Result = (function () {
    function Result(gen, attacker, defender, move, field, damage, rawDesc) {
        this.gen = gen;
        this.attacker = attacker;
        this.defender = defender;
        this.move = move;
        this.field = field;
        this.damage = damage;
        this.rawDesc = rawDesc;
    }
    Result.prototype.desc = function () {
        return this.fullDesc();
    };
    Result.prototype.range = function () {
        return damageRange(this.damage);
    };
    Result.prototype.fullDesc = function (notation, err) {
        if (notation === void 0) { notation = '%'; }
        if (err === void 0) { err = true; }
        return (0, desc_1.display)(this.gen, this.attacker, this.defender, this.move, this.field, this.damage, this.rawDesc, notation, err);
    };
    Result.prototype.moveDesc = function (notation) {
        if (notation === void 0) { notation = '%'; }
        return (0, desc_1.displayMove)(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
    };
    Result.prototype.recovery = function (notation) {
        if (notation === void 0) { notation = '%'; }
        return (0, desc_1.getRecovery)(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
    };
    Result.prototype.recoil = function (notation) {
        if (notation === void 0) { notation = '%'; }
        return (0, desc_1.getRecoil)(this.gen, this.attacker, this.defender, this.move, this.damage, notation);
    };
    Result.prototype.kochance = function (err) {
        if (err === void 0) { err = true; }
        return (0, desc_1.getKOChance)(this.gen, this.attacker, this.defender, this.move, this.field, this.damage, err);
    };
    return Result;
}());
exports.Result = Result;
function damageRange(damage) {
    if (typeof damage === 'number')
        return [damage, damage];
    if (damage.length === 16) {
        var d_1 = damage;
        if (d_1[0] > d_1[d_1.length - 1])
            return [Math.min.apply(Math, __spreadArray([], __read(d_1), false)), Math.max.apply(Math, __spreadArray([], __read(d_1), false))];
        return [d_1[0], d_1[d_1.length - 1]];
    }
    var d = damage;
    var totalMinimums = 0;
    var totalMaximums = 0;
    for (var i = 0; i < d.length; i++) {
        totalMinimums += d[i][0];
        totalMaximums += d[i][15];
    }
    return [totalMinimums, totalMaximums];
}
exports.damageRange = damageRange;
function addDamageWeight(damageWeights, damage, count) {
    if (count === void 0) { count = 1; }
    if (damageWeights[damage] === undefined) {
        damageWeights[damage] = count;
    }
    else {
        damageWeights[damage] += count;
    }
}
exports.addDamageWeight = addDamageWeight;
function convolveDamageWeight(damageWeights, damage) {
    var newDamageWeights = [];
    damageWeights.forEach(function (damageRoll, weight) {
        addDamageWeight(newDamageWeights, damageRoll + damage, weight);
    });
    return newDamageWeights;
}
exports.convolveDamageWeight = convolveDamageWeight;
function mergeDamageWeights(d1, d2) {
    d2.forEach(function (damageRoll, weight) {
        addDamageWeight(d1, damageRoll, weight);
    });
}
exports.mergeDamageWeights = mergeDamageWeights;
//# sourceMappingURL=result.js.map