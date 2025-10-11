'use client';
import ChatComponent from "@/components/user/Chat/chat"; 

export default function chatPage({ params }) {
  return <ChatComponent conversationId={params.id} />;
}