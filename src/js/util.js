import { rand } from './rng.js';

export const $=id=>document.getElementById(id);
export const rnd=(a,b)=>a+rand()*(b-a);
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
