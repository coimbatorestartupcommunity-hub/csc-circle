export function eventHasConcluded(event: { ends_at: string; registration_state: string }) {
  return event.registration_state === "completed" || Date.parse(event.ends_at) <= Date.now();
}
