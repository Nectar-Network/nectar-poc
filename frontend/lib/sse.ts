import { useEffect, useState } from "react";
import { apiUrl } from "./api";

const MAX_BACKOFF_MS = 16_000;

export function useSSEEvents(maxEvents = 20): string[] {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const url = `${apiUrl()}/api/events`;
    let es: EventSource | undefined;
    let backoff = 1_000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function connect() {
      if (stopped) return;
      try {
        es = new EventSource(url);

        es.onopen = () => {
          backoff = 1_000; // reset on successful connect
        };

        es.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data) as { msg: string };
            setEvents((prev) => [...prev, parsed.msg].slice(-maxEvents));
          } catch {
            setEvents((prev) => [...prev, e.data].slice(-maxEvents));
          }
        };

        es.onerror = () => {
          es?.close();
          if (!stopped) {
            setEvents((prev) =>
              [...prev, `reconnecting in ${backoff / 1000}s…`].slice(-maxEvents)
            );
            timer = setTimeout(() => {
              backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
              connect();
            }, backoff);
          }
        };
      } catch {
        // SSE not available (SSR context)
      }
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(timer);
      es?.close();
    };
  }, [maxEvents]);

  return events;
}
