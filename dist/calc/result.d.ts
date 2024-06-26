import { RawDesc } from './desc';
import { Generation } from './data/interface';
import { Field } from './field';
import { Move } from './move';
import { Pokemon } from './pokemon';
export type Damage = number | number[] | number[][];
export type DamageRollWeightMap = number[];
export declare class Result {
    gen: Generation;
    attacker: Pokemon;
    defender: Pokemon;
    move: Move;
    field: Field;
    damage: number | number[] | number[][];
    rawDesc: RawDesc;
    constructor(gen: Generation, attacker: Pokemon, defender: Pokemon, move: Move, field: Field, damage: Damage, rawDesc: RawDesc);
    desc(): string;
    range(): [number, number];
    fullDesc(notation?: string, err?: boolean): string;
    moveDesc(notation?: string): string;
    recovery(notation?: string): {
        recovery: [number, number];
        text: string;
    };
    recoil(notation?: string): {
        recoil: number | [number, number];
        text: string;
    };
    kochance(err?: boolean): {
        chance: number;
        n: number;
        text: string;
    } | {
        n: number;
        text: string;
        chance?: undefined;
    };
}
export declare function damageRange(damage: Damage): [number, number];
export declare function addDamageWeight(damageWeights: DamageRollWeightMap, damage: number, count?: number): void;
export declare function convolveDamageWeight(damageWeights: DamageRollWeightMap, damage: number): DamageRollWeightMap;
export declare function mergeDamageWeights(d1: DamageRollWeightMap, d2: DamageRollWeightMap): void;
