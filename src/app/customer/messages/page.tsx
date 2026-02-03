import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { isThreadUnread } from "@/lib/messaging";
import {
  findOrCreateThreadForStudent,
  listMessagesForThread,
  listThreadsForUser,
  markThreadRead,
} from "@/lib/messaging-server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import MessageComposer from "@/app/messages/message-composer";

type SearchParams = {
  thread?: string | string[];
  student?: string | string[];
};

type PageProps = {
  searchParams?: SearchParams | Promise<SearchParams>;
};

function readParam(param?: string | string[]): string | null {
  if (!param) {
    return null;
  }
  return Array.isArray(param) ? param[0] ?? null : param;
}

export default async function CustomerMessagesPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const threadParam = readParam(resolvedSearchParams?.thread);
  const studentParam = readParam(resolvedSearchParams?.student);

  if (!threadParam && studentParam) {
    const { threadId } = await findOrCreateThreadForStudent(
      supabase,
      user.id,
      studentParam
    );

    if (threadId) {
      redirect(`/customer/messages?thread=${threadId}`);
    }
  }

  const selectedThreadId = threadParam ?? null;

  if (selectedThreadId) {
    await markThreadRead(supabase, user.id, selectedThreadId);
  }

  const [threadsResult, messagesResult] = await Promise.all([
    listThreadsForUser(supabase, user.id, "customer"),
    selectedThreadId
      ? listMessagesForThread(supabase, selectedThreadId)
      : Promise.resolve({ messages: [] }),
  ]);

  const threads = threadsResult.threads;
  const threadError = threadsResult.error;
  const messages = messagesResult.messages;
  const messageError = messagesResult.error;
  const selectedThread = selectedThreadId
    ? threads.find((thread) => thread.id === selectedThreadId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <h1 className="text-2xl font-semibold text-slate-900">Messages</h1>
      </div>

      {threadError ? (
        <Card>
          <CardContent className="py-4 text-sm text-red-600">
            {threadError}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {threads.length > 0 ? (
              threads.map((thread) => {
                const unread = isThreadUnread({
                  lastMessageAt: thread.lastMessage?.createdAt,
                  lastReadAt: thread.lastReadAt,
                });
                const preview = thread.lastMessage?.body ?? "No messages yet.";
                const timestamp =
                  thread.lastMessage?.createdAt ?? thread.updatedAt;
                const isSelected = thread.id === selectedThreadId;

                return (
                  <Link
                    key={thread.id}
                    href={`/customer/messages?thread=${thread.id}`}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition",
                      isSelected
                        ? "border-sky-200 bg-sky-50"
                        : "border-border bg-white"
                    )}
                    data-testid={`thread-item-${thread.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {thread.studentName ?? "General"}
                        </span>
                        {unread ? (
                          <span
                            className="h-2 w-2 rounded-full bg-sky-500"
                            data-testid="thread-unread"
                          />
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {preview}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(timestamp)}
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>No conversations yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/customer">Go to students</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedThread?.studentName ?? "Select a thread"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Customer ↔ Manager
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {messageError ? (
              <p className="text-sm text-red-600">{messageError}</p>
            ) : null}

            {selectedThread ? (
              <div className="space-y-4">
                {messages.length > 0 ? (
                  messages.map((message) => {
                    const isOwn = message.senderId === user.id;

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex",
                          isOwn ? "justify-end" : "justify-start"
                        )}
                        data-testid="message-item"
                      >
                        <div
                          className={cn(
                            "max-w-[75%] space-y-1 rounded-lg border px-3 py-2 text-sm",
                            isOwn
                              ? "border-sky-200 bg-sky-50 text-slate-900"
                              : "border-border bg-white"
                          )}
                        >
                          <div className="text-xs text-muted-foreground">
                            {isOwn ? "You" : "Manager"} · {formatDateTime(message.createdAt)}
                          </div>
                          <p>{message.body}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation below.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a thread to view messages.
              </p>
            )}

            {selectedThread ? (
              <MessageComposer threadId={selectedThread.id} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
