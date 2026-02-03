"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/action-state";
import type { ActionState } from "@/lib/action-state";
import { sendMessageAction } from "@/app/messages/actions";

function FormMessage({ message, status }: { message: string; status: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={
        status === "error"
          ? "text-sm text-red-600"
          : "text-sm text-emerald-600"
      }
      aria-live="polite"
    >
      {message}
    </p>
  );
}

export default function MessageComposer({ threadId }: { threadId: string }) {
  const [state, formAction] = useFormState<ActionState, FormData>(
    sendMessageAction,
    initialActionState
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="thread_id" value={threadId} />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="message-body">
          New message
        </label>
        <textarea
          id="message-body"
          name="body"
          rows={4}
          ref={textareaRef}
          className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Write a quick update..."
          data-testid="message-body"
          required
        />
      </div>
      <FormMessage message={state.message} status={state.status} />
      <Button type="submit" data-testid="message-send">
        Send message
      </Button>
    </form>
  );
}
