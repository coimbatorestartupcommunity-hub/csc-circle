export type EventNoticeVisibility = {
  status: string;
  eventStatus: string;
  deletedAt?: string | null;
  startsAt?: string | null;
  stopsAt?: string | null;
};

/** Mirrors the database policy: the promotion window is start-inclusive/end-exclusive. */
export function isEventNoticeActive(notice: EventNoticeVisibility, now = Date.now()) {
  const start = notice.startsAt ? Date.parse(notice.startsAt) : null;
  const stop = notice.stopsAt ? Date.parse(notice.stopsAt) : null;
  return notice.status === "published" && notice.eventStatus === "published" && !notice.deletedAt &&
    (!notice.startsAt || (start !== null && start <= now)) &&
    (!notice.stopsAt || (stop !== null && stop > now));
}
