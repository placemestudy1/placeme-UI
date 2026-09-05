import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getEarlyLeaveEvaluation, leaveRoom, type EarlyLeaveEvaluation } from "@/lib/api";

export type EarlyLeaveUiState =
  | EarlyLeaveEvaluation
  | {
      jobId: null;
      status: "pending" | "failed";
      finality: "pending";
      accepted: false;
    };

const EVENT_NAME = "placeme:early-leave-evaluation";
const keyFor = (roomId: string) => `placeme:early-leave:${roomId}`;

function publish(roomId: string, state: EarlyLeaveUiState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(keyFor(roomId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { roomId, state } }));
}

export function readEarlyLeaveState(roomId: string): EarlyLeaveUiState | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(keyFor(roomId));
  if (!value) return null;
  try {
    return JSON.parse(value) as EarlyLeaveUiState;
  } catch {
    return null;
  }
}

export function beginEarlyLeaveEvaluation(session: Session | null, roomId: string) {
  publish(roomId, { jobId: null, status: "pending", finality: "pending", accepted: false });
  return leaveRoom(session, roomId)
    .then(({ evaluation }) => {
      publish(roomId, evaluation);
      return evaluation;
    })
    .catch((error: unknown) => {
      publish(roomId, { jobId: null, status: "failed", finality: "pending", accepted: false });
      throw error;
    });
}

export function useEarlyLeaveEvaluation(session: Session | null, roomId: string) {
  const [state, setState] = useState<EarlyLeaveUiState | null>(() => readEarlyLeaveState(roomId));
  const stateStatus = state?.status;

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ roomId: string; state: EarlyLeaveUiState }>).detail;
      if (detail.roomId === roomId) setState(detail.state);
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, [roomId]);

  useEffect(() => {
    if (!stateStatus || stateStatus === "completed" || stateStatus === "partial") return undefined;
    let cancelled = false;
    const poll = () => {
      getEarlyLeaveEvaluation(session, roomId)
        .then(({ evaluation }) => {
          if (!cancelled && evaluation) publish(roomId, evaluation);
        })
        .catch(() => {});
    };
    const interval = window.setInterval(poll, 3000);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [session, roomId, stateStatus]);

  return state;
}
