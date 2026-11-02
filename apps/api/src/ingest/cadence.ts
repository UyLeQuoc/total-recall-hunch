const NEAR_LOCK_MS = 2 * 3_600_000;
const NEAR_CADENCE_MS = 5 * 60_000;
const FAR_CADENCE_MS = 30 * 60_000;

export function snapshotDue(
  now: Date,
  startsAt: Date,
  last: Date | undefined,
  slackMs = 30_000,
): boolean {
  const untilLock = startsAt.getTime() - now.getTime();
  if (untilLock <= 0) return false;
  if (!last) return true;
  const cadence = untilLock <= NEAR_LOCK_MS ? NEAR_CADENCE_MS : FAR_CADENCE_MS;
  return now.getTime() - last.getTime() >= cadence - slackMs;
}
