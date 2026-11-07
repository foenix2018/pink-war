// A target that stays put. « Nearest enemy » or « first of the list » changes hands every time two distances cross or a
// unit dies, which makes whatever points at it (the objective guide, Gaby's and Cara's support fire) swing around as if
// at random. A lock keeps its current target while it is still a valid candidate, and only gives it up for another one
// that is clearly better (closer by `ratio`) and has been so for `hold` seconds.
export function createTargetLock({ ratio = .72, hold = .7 } = {}) {
  let current = null, challenger = null, since = 0;
  return {
    // candidates: array of objects; distance(candidate) → metres; now: seconds on any monotonic clock.
    pick(candidates, distance, now = 0) {
      if (!candidates.length) { current = challenger = null; return null; }
      let best = candidates[0], bestDistance = distance(best);
      for (let i = 1; i < candidates.length; i++) { const d = distance(candidates[i]); if (d < bestDistance) { best = candidates[i]; bestDistance = d; } }
      if (!current || !candidates.includes(current)) { current = best; challenger = null; return current; }
      if (best === current) { challenger = null; return current; }
      if (bestDistance < distance(current) * ratio) {
        if (challenger !== best) { challenger = best; since = now; }
        if (now - since >= hold) { current = best; challenger = null; }
      } else challenger = null;
      return current;
    },
    get current() { return current; },
    reset() { current = challenger = null; }
  };
}
