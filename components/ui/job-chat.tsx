import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  created_at: string;
  delete_at: string;
  is_read?: boolean;
}

interface ChatProps {
  jobId?: string;
  jobApplicationId?: string;
  bookingId?: string;
  recipientId: string;
  recipientName: string;
  currentUserId: string;
  context?: "job" | "booking"; // Type of conversation
  onUnreadCountChange?: (count: number) => void;
}

export default function JobChat({
  jobId,
  jobApplicationId,
  bookingId,
  recipientId,
  recipientName,
  currentUserId,
  context = "job",
  onUnreadCountChange,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const contextId = jobApplicationId || bookingId;
  const queryParam = jobApplicationId ? "job_application_id" : "booking_id";

  useEffect(() => {
    if (!contextId) return;
    
    fetchMessages();
    // Set up realtime subscription
    const channel = `messages:${contextId}`;
    const subscription = supabase
      .channel(channel)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `${queryParam}=eq.${contextId}`,
        },
        (payload) => {
          // Re-fetch messages on insert to ensure we have the full, joined sender data
          // (Realtime payload may not include joined relations like sender)
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [contextId, queryParam]);

  const fetchMessages = async () => {
    if (!contextId) return;
    
    try {
      setLoading(true);
      // Use browser Supabase client so the user's JWT is sent and RLS applies correctly.
      const messagesQuery = supabase
        .from('messages')
        .select('*, sender:sender_id(id, full_name, avatar_url)')
        .order('created_at', { ascending: true });

      if (jobApplicationId) {
        messagesQuery.eq('job_application_id', jobApplicationId);
      } else if (bookingId) {
        messagesQuery.eq('booking_id', bookingId);
      }

      const { data, error } = await messagesQuery;
      if (error) throw error;
      
      // Filter out expired messages (delete_at is in the past)
      const validMessages = (data || []).filter((msg: any) => {
        if (!msg.delete_at) return true;
        return new Date(msg.delete_at) > new Date();
      }) as Message[];
      
      setMessages(validMessages);
      
      // Calculate unread count: messages from recipient that haven't been read by currentUserId
      const unreadCount = validMessages.filter(
        (msg: any) => msg.sender_id !== currentUserId && !msg.is_read
      ).length;
      onUnreadCountChange?.(unreadCount);
      
      // Mark all unread messages from recipient as read
      if ((data || []).length > 0) {
        const unreadMessageIds = (data || [])
          .filter((msg: any) => msg.sender_id !== currentUserId && !msg.is_read)
          .map((msg: any) => msg.id);
        
        if (unreadMessageIds.length > 0) {
          const { error: markErr } = await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessageIds);

          if (markErr) console.error('Error marking messages as read:', markErr);
        }
        
        // Cleanup: trigger server-side deletion of expired messages
        fetch('/api/messages/cleanup', { method: 'POST' }).catch(err => 
          console.warn('Failed to trigger message cleanup:', err)
        );
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      // Use browser Supabase client so the user's JWT is sent automatically
      // Derive sender_id from the authenticated session to avoid mismatches
      const {
        data: { user: authUser },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !authUser) throw userErr || new Error("Not authenticated");
      // Calculate delete_at: 1 hour from now
      const now = new Date();
      const deleteAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

      // Try inserting including delete_at. If the DB doesn't have that column yet
      // (migration not applied), catch the error and retry without delete_at.
      const insertPayload = {
        job_id: jobId || null,
        job_application_id: jobApplicationId || null,
        booking_id: bookingId || null,
        sender_id: authUser.id,
        recipient_id: recipientId,
        content: newMessage,
        is_read: false,
        delete_at: deleteAt,
      } as any;

      // First attempt
      const { data: insertedData, error: insertError } = await supabase
        .from("messages")
        .insert([insertPayload])
        .select("*, sender:sender_id(id, full_name, avatar_url)")
        .single();

      if (insertError) {
        // Log full error for debugging
        console.error("Initial insert error (with delete_at):", insertError, JSON.stringify(insertError));
        const msg = (insertError as any)?.message || JSON.stringify(insertError);

        // Try to detect missing column(s) from the error message and retry without them.
        // Look for patterns like: Could not find the 'column_name' column
        const missingCols: string[] = [];
        try {
          const re = /'([^']+)' column/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(msg))) {
            if (m[1]) missingCols.push(m[1]);
          }
        } catch (e) {
          // ignore regex issues
        }

        if (missingCols.length > 0) {
          try {
            const payloadClean = { ...insertPayload } as any;
            for (const col of missingCols) delete payloadClean[col];

            const { data: retryData, error: retryErr } = await supabase
              .from("messages")
              .insert([payloadClean])
              .select("*, sender:sender_id(id, full_name, avatar_url)")
              .single();

            if (retryErr) {
              console.error("Retry insert failed (after removing missing cols):", retryErr);
              alert("Failed to send message: " + (retryErr.message || JSON.stringify(retryErr)));
              return;
            }

            const message = retryData as Message;
            setMessages((prev) => [...prev, message]);
            setNewMessage("");
            return;
          } catch (retryEx) {
            console.error("Retry insert exception:", retryEx);
            alert("Failed to send message: " + ((retryEx as any)?.message || JSON.stringify(retryEx)));
            return;
          }
        }

        // Otherwise surface the error to the user
        alert("Failed to send message: " + (msg || "Unknown error"));
        return;
      }

      const message = insertedData as Message;
      setMessages((prev) => [...prev, message]);
      setNewMessage("");
    } catch (err: unknown) {
      try {
        console.error("Error sending message:", err, JSON.stringify(err));
      } catch (e) {
        console.error("Error sending message (non-serializable):", err);
      }
      const msg = (err as any)?.message || JSON.stringify(err) || "Unknown error";
      alert("Failed to send message: " + msg);
    } finally {
      setSending(false);
    }
  };

  const contextLabel = context === "booking" ? "Service Provider" : "Worker";

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-0">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          Chat with {recipientName}
        </h3>
        <p className="text-xs text-muted-foreground mt-1 italic">
          💬 Messages automatically delete after 1 hour for space management
        </p>
      </div>

      <div className="bg-background/50 rounded-lg p-4 max-h-[50vh] md:h-64 overflow-y-auto mb-4 space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.sender_id === currentUserId ? "justify-end" : ""
              }`}
            >
              {msg.sender_id !== currentUserId && (
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  {msg.sender.avatar_url ? (
                    <img
                      src={msg.sender.avatar_url}
                      alt={msg.sender.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-primary">
                      {msg.sender.full_name[0]}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`max-w-[80%] sm:max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender_id === currentUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm break-words">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={sending || !newMessage.trim()}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          {sending ? "Sending..." : "Send"}
        </Button>
      </form>
    </Card>
  );
}
