import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCheck,
  Inbox,
  Loader2,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { auth } from "../../lib/firebase";
import {
  createOrFindConversation,
  markConversationRead,
  sendMessage,
  subscribeConversations,
  subscribeMessages,
  updateTypingStatus,
} from "../../lib/messaging";
import type {
  ChatMessage,
  ConversationDraft,
  MessageAuthor,
  MessageConversation,
} from "../../types/messaging";
import ConversationStarter from "./ConversationStarter";
import MessagingState from "./MessagingState";

interface MessagingModuleProps {
  role: "student" | "teacher" | null;
}

const skeletonCards = Array.from({ length: 5 }, (_, index) => index);

const conversationLabels: Record<MessageConversation["type"], string> = {
  teacher_student: "Teacher and student",
  teacher_parent: "Teacher and parent",
  admin_teacher: "Admin and teacher",
};

const formatTime = (millis: number) => {
  if (!millis) return "New";

  const date = new Date(millis);
  const today = new Date().toDateString();

  if (date.toDateString() === today) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const authorFromAuth = (role: MessagingModuleProps["role"]): MessageAuthor | null => {
  const user = auth.currentUser;
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email || "educor-user@example.com",
    role: role === "teacher" ? "teacher" : "student",
  };
};

const otherParticipants = (conversation: MessageConversation, author: MessageAuthor | null) => {
  if (!author) return conversation.participants;
  return conversation.participants.filter((participant) => participant.email !== author.email);
};

function ConversationListItem({
  conversation,
  selected,
  author,
  onSelect,
}: {
  conversation: MessageConversation;
  selected: boolean;
  author: MessageAuthor | null;
  onSelect: (conversation: MessageConversation) => void;
}) {
  const recipients = otherParticipants(conversation, author);
  const recipientLabel = recipients.map((recipient) => recipient.email).join(", ") || conversation.title;

  return (
    <motion.button
      layout
      type="button"
      onClick={() => onSelect(conversation)}
      whileHover={{ y: -2 }}
      className={clsx(
        "w-full rounded-xl border p-4 text-left transition",
        selected
          ? "border-[#135d54] bg-[#eef7f4]"
          : "border-white/45 bg-white/75 hover:border-[#b7d5ce] dark:border-white/10 dark:bg-white/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-bold">{conversation.title}</p>
            {conversation.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d85435]" />}
          </div>
          <p className="mt-1 truncate text-sm text-[#52645f] dark:text-white/65">{recipientLabel}</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-[#6c7d78] dark:text-white/55">
          {formatTime(conversation.lastMessageAtMs)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#52645f] dark:text-white/65">
        {conversation.lastMessage || conversationLabels[conversation.type]}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#135d54] shadow-sm">
          {conversationLabels[conversation.type]}
        </span>
        {conversation.unread && (
          <span className="rounded-full bg-[#d85435] px-3 py-1 text-xs font-bold text-white">Unread</span>
        )}
      </div>
    </motion.button>
  );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("flex", mine ? "justify-end" : "justify-start")}
    >
      <div
        className={clsx(
          "max-w-[78%] rounded-2xl px-4 py-3 shadow-sm",
          mine ? "bg-[#135d54] text-white" : "border border-[#dbe7e2] bg-white text-[#17211f] dark:border-white/10"
        )}
      >
        <p className="text-sm font-semibold opacity-75">{mine ? "You" : message.senderEmail}</p>
        <p className="mt-2 leading-7">{message.body}</p>
        <p className={clsx("mt-2 text-right text-xs font-semibold", mine ? "text-white/65" : "text-[#6c7d78]")}>
          {formatTime(message.createdAtMs)}
        </p>
      </div>
    </motion.div>
  );
}

export default function MessagingModule({ role }: MessagingModuleProps) {
  const [conversations, setConversations] = useState<MessageConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const author = useMemo(() => authorFromAuth(role), [role]);

  useEffect(() => {
    if (!author) {
      const timer = window.setTimeout(() => setLoadingConversations(false), 0);
      return () => window.clearTimeout(timer);
    }

    const unsubscribe = subscribeConversations(
      author,
      (conversationData) => {
        setConversations(conversationData);
        setSelectedConversationId((current) => current || conversationData[0]?.id || "");
        setError("");
        setLoadingConversations(false);
      },
      () => {
        setError("Messages could not be loaded. Check your connection and try again.");
        setLoadingConversations(false);
      }
    );

    return () => unsubscribe();
  }, [author]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    if (!selectedConversation) {
      const timer = window.setTimeout(() => {
        setMessages([]);
        setLoadingMessages(false);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const unsubscribe = subscribeMessages(
      selectedConversation.id,
      (messageData) => {
        setMessages(messageData);
        setLoadingMessages(false);
      },
      () => {
        setActionError("Messages for this conversation could not be loaded.");
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation?.unread && author) {
      markConversationRead(selectedConversation, author).catch(() => {
        setActionError("Unread status could not be updated.");
      });
    }
  }, [author, selectedConversation]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(
    () => () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    },
    []
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) =>
      [
        conversation.title,
        conversation.lastMessage,
        conversation.type,
        ...conversation.participants.map((participant) => participant.email),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [conversations, search]);

  const unreadCount = useMemo(
    () => conversations.filter((conversation) => conversation.unread).length,
    [conversations]
  );

  const handleCreateConversation = async (draft: ConversationDraft) => {
    if (!author) {
      setActionError("Sign in again before starting a conversation.");
      return;
    }

    setActionError("");
    setCreatingConversation(true);

    try {
      const conversationId = await createOrFindConversation(author, draft);
      setSelectedConversationId(conversationId);
    } catch {
      setActionError("Conversation could not be opened. Check the recipient and try again.");
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleBodyChange = (value: string) => {
    setBody(value);

    if (!author || !selectedConversation) return;
    updateTypingStatus(selectedConversation, author, Boolean(value.trim())).catch(() => undefined);

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      updateTypingStatus(selectedConversation, author, false).catch(() => undefined);
    }, 1800);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!author || !selectedConversation || !body.trim()) return;

    setActionError("");
    setSending(true);

    try {
      await sendMessage(selectedConversation, author, body);
      setBody("");
      await updateTypingStatus(selectedConversation, author, false);
    } catch {
      setActionError("Message could not be sent. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  if (loadingConversations) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {skeletonCards.map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
              />
            ))}
          </div>
          <div className="h-[560px] animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10" />
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <MessagingState
        icon={RefreshCw}
        title="Messaging did not load"
        message={error}
        actionLabel="Refresh page"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(47,111,159,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Messaging
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Real-time conversations for teachers, students, parents, and admins.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Firestore chat keeps messages, unread states, conversation lists, and typing indicators synced.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Conversations", value: conversations.length },
              { label: "Unread", value: unreadCount },
              { label: "Messages", value: messages.length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <ConversationStarter
            role={author?.role ?? "student"}
            submitting={creatingConversation}
            onSubmit={handleCreateConversation}
          />

          <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Conversations</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Unread messages stay highlighted.</p>
              </div>
              <MessagesSquare className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>

            <label className="relative mt-4 block">
              <span className="sr-only">Search conversations</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7d78]"
                size={17}
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-full border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>

            {filteredConversations.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-5 text-center dark:border-white/15 dark:bg-white/5">
                <Inbox className="mx-auto text-[#135d54]" size={24} aria-hidden="true" />
                <p className="mt-3 font-bold">No conversations</p>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Start a conversation above.</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
                <AnimatePresence initial={false}>
                  {filteredConversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation}
                      selected={conversation.id === selectedConversationId}
                      author={author}
                      onSelect={(selected) => {
                        setLoadingMessages(true);
                        setSelectedConversationId(selected.id);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </aside>

        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-xl border border-white/45 bg-white/75 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          {selectedConversation ? (
            <>
              <div className="border-b border-[#dbe7e2] bg-[#f8fbfa]/85 p-5 dark:border-white/10 dark:bg-white/5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase text-[#d85435]">
                      {conversationLabels[selectedConversation.type]}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">{selectedConversation.title}</h2>
                    <p className="mt-2 text-sm text-[#52645f] dark:text-white/65">
                      {otherParticipants(selectedConversation, author)
                        .map((participant) => participant.email)
                        .join(", ") || "Conversation"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-bold text-[#135d54]">
                    <CheckCheck size={16} aria-hidden="true" />
                    {selectedConversation.unread ? "Marking read" : "Read"}
                  </div>
                </div>

                {selectedConversation.typingParticipants.length > 0 && (
                  <p className="mt-3 text-sm font-semibold text-[#2f6f9f]">
                    {selectedConversation.typingParticipants.map((participant) => participant.email).join(", ")} typing...
                  </p>
                )}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[#f8fbfa]/70 p-5 dark:bg-black/10">
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center text-[#52645f] dark:text-white/65">
                    <Loader2 className="mr-2 animate-spin" size={18} aria-hidden="true" />
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <MessagingState
                    icon={MessageCircle}
                    title="No messages yet"
                    message="Send the first message to start the conversation."
                  />
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      mine={message.senderEmail === author?.email}
                    />
                  ))
                )}
                <div ref={scrollAnchorRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-[#dbe7e2] bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <label>
                    <span className="sr-only">Message</span>
                    <textarea
                      value={body}
                      onChange={(event) => handleBodyChange(event.target.value)}
                      placeholder="Write a message..."
                      className="min-h-24 w-full resize-none rounded-xl border border-[#c9ded8] bg-white px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={sending || !body.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send size={18} aria-hidden="true" />
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <MessagingState
                icon={Users}
                title="Choose a conversation"
                message="Select a chat from the conversation list or open a new one."
              />
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
