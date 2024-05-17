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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
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
    var totalMinimums = d.reduce(function (accumulator, currentHitRolls) {
        return accumulator + currentHitRolls[0];
    }, 0);
    var totalMaximums = d.reduce(function (accumulator, currentHitRolls) {
        return accumulator + currentHitRolls[currentHitRolls.length - 1];
    }, 0);
    return [totalMinimums, totalMaximums];
}
exports.damageRange = damageRange;
function addDamageChance(damageChances, damage, count) {
    if (count === void 0) { count = 1; }
    if (damageChances[damage] === undefined) {
        damageChances[damage] = count;
    }
    else {
        damageChances[damage] += count;
    }
}
exports.addDamageChance = addDamageChance;
function convolveDamageChance(damageChances, damage) {
    var e_1, _a;
    var newDamageChances = {};
    try {
        for (var _b = __values(Object.entries(damageChances)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), stringValue = _d[0], chance = _d[1];
            var value = +stringValue;
            addDamageChance(newDamageChances, value + damage, chance);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return newDamageChances;
}
exports.convolveDamageChance = convolveDamageChance;
function mergeDamageChances(d1, d2) {
    var e_2, _a;
    try {
        for (var _b = __values(Object.entries(d2)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var _d = __read(_c.value, 2), stringValue = _d[0], chance = _d[1];
            var value = +stringValue;
            addDamageChance(d1, value, chance);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
}
exports.mergeDamageChances = mergeDamageChances;
//# sourceMappingURL=result.js.map