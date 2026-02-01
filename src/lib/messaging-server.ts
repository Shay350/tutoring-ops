import "server-only";

import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type MessagingClient = Awaited<ReturnType<typeof createClient>>;

export type ThreadListItem = {
  id: string;
  studentId: string | null;
  customerId: string;
  updatedAt: string | null;
  studentName: string | null;
  customerName: string | null;
  lastMessage: {
    body: string | null;
    createdAt: string | null;
    senderId: string | null;
  } | null;
  lastReadAt: string | null;
};

export type MessageItem = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export async function listThreadsForUser(
  supabase: MessagingClient,
  userId: string,
  role: Role
): Promise<{ threads: ThreadListItem[]; error?: string }> {
  const { data: threadRows, error } = await supabase
    .from("message_threads")
    .select("id, student_id, customer_id, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return { threads: [], error: "Unable to load message threads." };
  }

  const threads = threadRows ?? [];
  const threadIds = threads.map((thread) => thread.id);
  const studentIds = threads
    .map((thread) => thread.student_id)
    .filter((value): value is string => Boolean(value));
  const customerIds = Array.from(
    new Set(threads.map((thread) => thread.customer_id).filter(Boolean))
  );

  const [messageResult, readStateResult, studentResult, customerResult] =
    await Promise.all([
      threadIds.length
        ? supabase
            .from("messages")
            .select("id, thread_id, body, created_at, sender_id")
            .in("thread_id", threadIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      threadIds.length
        ? supabase
            .from("message_read_state")
            .select("thread_id, last_read_at")
            .eq("user_id", userId)
            .in("thread_id", threadIds)
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? supabase
            .from("students")
            .select("id, full_name")
            .in("id", studentIds)
        : Promise.resolve({ data: [] }),
      role === "manager" && customerIds.length
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", customerIds)
        : Promise.resolve({ data: [] }),
    ]);

  const lastMessageByThread = new Map<
    string,
    { body: string | null; created_at: string | null; sender_id: string | null }
  >();

  for (const message of messageResult.data ?? []) {
    if (!lastMessageByThread.has(message.thread_id)) {
      lastMessageByThread.set(message.thread_id, message);
    }
  }

  const readStateByThread = new Map<string, string | null>();
  for (const readState of readStateResult.data ?? []) {
    readStateByThread.set(readState.thread_id, readState.last_read_at);
  }

  const studentNameById = new Map<string, string | null>();
  for (const student of studentResult.data ?? []) {
    studentNameById.set(student.id, student.full_name ?? null);
  }

  const customerNameById = new Map<string, string | null>();
  for (const customer of customerResult.data ?? []) {
    customerNameById.set(customer.id, customer.full_name ?? null);
  }

  return {
    threads: threads.map((thread) => {
      const lastMessage = lastMessageByThread.get(thread.id) ?? null;
      const studentName = thread.student_id
        ? studentNameById.get(thread.student_id) ?? null
        : null;
      const customerName = customerNameById.get(thread.customer_id) ?? null;

      return {
        id: thread.id,
        studentId: thread.student_id,
        customerId: thread.customer_id,
        updatedAt: thread.updated_at,
        studentName,
        customerName,
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              createdAt: lastMessage.created_at,
              senderId: lastMessage.sender_id,
            }
          : null,
        lastReadAt: readStateByThread.get(thread.id) ?? null,
      };
    }),
  };
}

export async function listMessagesForThread(
  supabase: MessagingClient,
  threadId: string
): Promise<{ messages: MessageItem[]; error?: string }> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_id, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    return { messages: [], error: "Unable to load messages." };
  }

  return {
    messages: (data ?? []).map((message) => ({
      id: message.id,
      threadId: message.thread_id,
      senderId: message.sender_id,
      body: message.body,
      createdAt: message.created_at,
    })),
  };
}

export async function findOrCreateThreadForStudent(
  supabase: MessagingClient,
  customerId: string,
  studentId: string | null
): Promise<{ threadId?: string; error?: string }> {
  const threadQuery = supabase
    .from("message_threads")
    .select("id")
    .eq("customer_id", customerId)
    .limit(1);

  const { data: existing, error: existingError } = studentId
    ? await threadQuery.eq("student_id", studentId).maybeSingle()
    : await threadQuery.is("student_id", null).maybeSingle();

  if (existingError) {
    return { error: "Unable to locate messaging thread." };
  }

  if (existing?.id) {
    return { threadId: existing.id };
  }

  const { data: created, error: insertError } = await supabase
    .from("message_threads")
    .insert({
      student_id: studentId,
      customer_id: customerId,
    })
    .select("id")
    .maybeSingle();

  if (insertError || !created?.id) {
    return { error: "Unable to start a new thread." };
  }

  return { threadId: created.id };
}

export async function markThreadRead(
  supabase: MessagingClient,
  userId: string,
  threadId: string
): Promise<{ error?: string }> {
  if (!threadId) {
    return { error: "Missing thread id." };
  }

  const { error } = await supabase.from("message_read_state").upsert(
    {
      thread_id: threadId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" }
  );

  if (error) {
    return { error: "Unable to mark thread read." };
  }

  return {};
}

export async function sendMessage(
  supabase: MessagingClient,
  userId: string,
  threadId: string,
  body: string
): Promise<{ error?: string }> {
  if (!threadId) {
    return { error: "Missing thread id." };
  }

  if (!body.trim()) {
    return { error: "Message cannot be empty." };
  }

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: userId,
    body: body.trim(),
  });

  if (error) {
    return { error: "Unable to send message." };
  }

  await supabase.from("message_read_state").upsert(
    {
      thread_id: threadId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" }
  );

  return {};
}
