import { expect, test } from "bun:test";
import { maakCoachCache } from "./coach-cache";
test("same input shares request, changed context/style does not", async () => {
    const cache = maakCoachCache();
    let calls = 0;
    const load = async () => ++calls;
    expect(await Promise.all([cache.vraag("text/context/Rustiger", load), cache.vraag("text/context/Rustiger", load)])).toEqual([1, 1]);
    expect(await cache.vraag("text/new-context/Rustiger", load)).toBe(2);
    expect(await cache.vraag("text/new-context/Korter", load)).toBe(3);
});
test("analysis expires after sixty seconds and can be cleared", async () => {
    let time = 0, calls = 0;
    const cache = maakCoachCache(() => time);
    const load = async () => ++calls;
    await cache.vraag("a", load);
    time = 60001;
    expect(await cache.vraag("a", load)).toBe(2);
    cache.wis();
    expect(await cache.vraag("a", load)).toBe(3);
});
