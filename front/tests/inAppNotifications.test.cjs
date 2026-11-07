const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { InAppAlertTracker, PREDICTION_COOLDOWN_MS, notificationAllowed, parsePredictionCooldowns, isCurrentPredictionTime } = require('../src/lib/inAppNotifications.ts');
const { DEFAULT_NOTIFICATION_PREFERENCES, parseNotificationPreferences, preferenceKey } = require('../src/lib/notificationPreferences.ts');
const { PARKING_LOTS, nearestParkingLot } = require('../src/lib/parking.ts');
const now = Date.parse('2026-11-07T17:12:00Z');
const lot = PARKING_LOTS.find(l => l.Lot_ID === 'utah-surface-001');
const otherLot = PARKING_LOTS.find(l => l.Lot_ID === 'utah-surface-002');
const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, parked_lot_id: lot.Lot_ID };
function report(id, extra = {}) {
  return { id, user_id: 'other', photo_path: `${id}.jpg`, note: '', latitude: lot.latitude, longitude: lot.longitude,
    created_at: new Date(now).toISOString(), observed_at: new Date(now).toISOString(), ...extra };
}
function tracker() { const t = new InAppAlertTracker(); t.sightings([], 'me', prefs, now); return t; }

test('opening a feed does not replay history; later sightings alert once across refreshes', () => {
  const t = new InAppAlertTracker();
  assert.deepEqual(t.sightings([report('old')], 'me', prefs, now), []);
  const next = t.sightings([report('new'), report('old')], 'me', prefs, now);
  assert.equal(next.length, 1);
  assert.equal(next[0].sighting.id, 'new');
  assert.deepEqual(t.sightings([report('new'), report('old')], 'me', prefs, now), []);
  t.sightings([], 'me', prefs, now);
  assert.deepEqual(t.sightings([report('new')], 'me', prefs, now), []);
});
test('campus and parked-lot matching produce one targeted alert', () => {
  const result = tracker().sightings([report('new')], 'me', prefs, now);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, 'Enforcement at your parked lot');
  assert.equal(result[0].lotId, lot.Lot_ID);
});
test('parked-only preference excludes other lots; clearing the lot stops targeted alerts', () => {
  const rows = [report('here'), report('elsewhere', otherLot)];
  assert.equal(tracker().sightings(rows, 'me', { ...prefs, all_sightings: false }, now).length, 1);
  assert.equal(tracker().sightings(rows, 'me', { ...prefs, all_sightings: false, parked_lot_id: null }, now).length, 0);
});
test('own sightings, stale reports, invalid times and invalid coordinates are suppressed', () => {
  const rows = [report('mine', { user_id: 'me' }), report('old', { observed_at: new Date(now - 31 * 60_000).toISOString() }),
    report('invalid', { observed_at: 'bad' }), report('badGPS', { latitude: Infinity }), report('outsideEarth', { latitude: 1000 })];
  assert.deepEqual(tracker().sightings(rows, 'me', prefs, now), []);
});
test('disabled alerts consume events rather than replaying them when enabled', () => {
  const t = tracker();
  assert.deepEqual(t.sightings([report('muted')], 'me', { ...prefs, enabled: false }, now), []);
  assert.deepEqual(t.sightings([report('muted')], 'me', prefs, now), []);
});
test('nearest-lot catalogue matches model IDs including the two distinct lot 42 facilities', () => {
  assert.equal(PARKING_LOTS.length, 132);
  assert.equal(PARKING_LOTS.filter(l => l.lot_number === 42).length, 2);
  for (const item of PARKING_LOTS) assert.equal(nearestParkingLot(item).Lot_ID, item.Lot_ID);
  assert.equal(nearestParkingLot({ latitude: 40.7649, longitude: -111.8421 }).Lot_ID, 'utah-surface-024');
});
test('prediction alerts require a finite current high score and enabled parked-lot preference', () => {
  for (const score of [.69, NaN, Infinity]) assert.deepEqual(tracker().prediction({ [lot.Lot_ID]: score }, prefs, now), []);
  assert.equal(tracker().prediction({ [lot.Lot_ID]: .7 }, prefs, now).length, 1);
  assert.deepEqual(tracker().prediction({ [lot.Lot_ID]: .9 }, { ...prefs, predictions: false }, now), []);
  assert.deepEqual(tracker().prediction({ [lot.Lot_ID]: .9 }, { ...prefs, parked_lot_id: null }, now), []);
});
test('historical/future map slots and stale responses cannot trigger current prediction alerts', () => {
  assert.equal(isCurrentPredictionTime(now - 60_000, now), true);
  assert.equal(isCurrentPredictionTime(now - 10 * 60_000, now), false);
  assert.equal(isCurrentPredictionTime(now + 60 * 60_000, now), false);
  assert.equal(isCurrentPredictionTime(NaN, now), false);
  assert.equal(isCurrentPredictionTime(Date.parse('2026-11-07T17:29:00Z'), Date.parse('2026-11-07T17:31:00Z')), false);
});
test('prediction cooldown survives rehydration and expires after two hours', () => {
  const t = tracker();
  assert.equal(t.prediction({ [lot.Lot_ID]: .8 }, prefs, now).length, 1);
  const restored = new InAppAlertTracker(parsePredictionCooldowns(JSON.stringify(t.predictionCooldowns), now + 60_000));
  assert.deepEqual(restored.prediction({ [lot.Lot_ID]: .9 }, prefs, now + 60_000), []);
  assert.equal(restored.prediction({ [lot.Lot_ID]: .9 }, prefs, now + PREDICTION_COOLDOWN_MS).length, 1);
});
test('queued prediction banners become ineligible after moving or at slot expiry', () => {
  const [item] = tracker().prediction({ [lot.Lot_ID]: .9 }, prefs, now);
  assert.equal(item.expiresAt, Date.parse('2026-11-07T17:30:00Z'));
  assert.equal(notificationAllowed(item, prefs, now), true);
  assert.equal(notificationAllowed(item, { ...prefs, parked_lot_id: otherLot.Lot_ID }, now), false);
  assert.equal(notificationAllowed(item, prefs, item.expiresAt), false);
});
test('local preference cache is account-scoped and validates saved data', () => {
  assert.notEqual(preferenceKey('a'), preferenceKey('b'));
  assert.equal(parseNotificationPreferences(null).enabled, true);
  assert.equal(parseNotificationPreferences(JSON.stringify({ parked_lot_id: lot.Lot_ID, enabled: false })).parked_lot_id, lot.Lot_ID);
  assert.equal(parseNotificationPreferences(JSON.stringify({ parked_lot_id: 'fake', enabled: 'false' })).parked_lot_id, null);
  assert.equal(parseNotificationPreferences(JSON.stringify({ enabled: 'false' })).enabled, true);
  assert.throws(() => parseNotificationPreferences('{broken'));
});
