export type UnreadInput = {
  lastMessageAt: string | null | undefined;
  lastReadAt: string | null | undefined;
};

export function isThreadUnread({ lastMessageAt, lastReadAt }: UnreadInput): boolean {
  if (!lastMessageAt) {
    return false;
  }

  if (!lastReadAt) {
    return true;
  }

  const lastMessageTime = new Date(lastMessageAt).getTime();
  const lastReadTime = new Date(lastReadAt).getTime();

  if (Number.isNaN(lastMessageTime)) {
    return false;
  }

  if (Number.isNaN(lastReadTime)) {
    return true;
  }

  return lastMessageTime > lastReadTime;
}
