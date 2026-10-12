// Hand models follow the tracked grip, independently of Three's target-ray visibility.
// Reconcile live sources every frame: connected can precede asynchronous model loading.
export function reconcileHandSources(entries, sources = []) {
  const live = Array.from(sources).filter(s => s.handedness === 'left' || s.handedness === 'right');
  const used = new Set();
  for (const entry of entries) {
    const current = entry.source || entry.ray?.userData.source;
    entry.source = live.includes(current) && !used.has(current) ? current : null;
    if (entry.source) used.add(entry.source);
  }
  for (const entry of entries) {
    if (!entry.source) { entry.source = live.find(s => !used.has(s)) || null; if (entry.source) used.add(entry.source); }
    if (entry.ray) entry.ray.userData.source = entry.source;
  }
}
export function syncTrackedHands(entries, session, frame, referenceSpace) {
  reconcileHandSources(entries, session?.inputSources);
  for (const entry of entries) {
    let pose = null, rayPose = null;
    if (frame && referenceSpace && (!session?.visibilityState || session.visibilityState === 'visible')) {
      try {
        if (entry.source?.gripSpace) pose = frame.getPose(entry.source.gripSpace, referenceSpace);
        if (entry.source?.targetRaySpace) rayPose = frame.getPose(entry.source.targetRaySpace, referenceSpace);
        pose ||= rayPose;
      } catch { /* Tracking loss hides a hand until a valid pose returns. */ }
    }
    const matrix = pose?.transform?.matrix;
    if(entry.ray&&rayPose?.transform?.matrix){
      entry.ray.matrixAutoUpdate=false;entry.ray.matrix.fromArray(rayPose.transform.matrix);
      entry.ray.matrixWorldNeedsUpdate=true;
    }
    entry.tracked = !!matrix && matrix.length === 16;
    if (entry.anchor) {
      entry.anchor.visible = entry.tracked;
      if (entry.tracked) {
        // RLH gloves/guns use the pointing axis as their local barrel axis. The
        // grip's tilt differs on Touch Plus: use ray rotation with grip position.
        entry.anchor.matrix.fromArray(rayPose?.transform?.matrix || matrix);
        const a=entry.anchor.matrix.elements;a[12]=matrix[12];a[13]=matrix[13];a[14]=matrix[14];
        entry.anchor.matrixWorldNeedsUpdate = true;
      }
    }
  }
}
