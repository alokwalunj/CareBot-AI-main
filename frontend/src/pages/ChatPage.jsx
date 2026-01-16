import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, MessageCircle, Loader2, Mic, MicOff, Volume2, Square } from "lucide-react";
import { chatAPI, voiceAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const ChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);

  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await chatAPI.getMessages();
      const data = Array.isArray(res.data) ? res.data : [];

      const mapped = data.map((m) => ({
        id: m._id || m.id,
        role: m.role,              // ✅ user / assistant
        content: m.content,        // ✅ content
        timestamp: m.createdAt || new Date().toISOString(),
      }));

      setMessages(mapped);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording started... Tap again to stop");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const res = await voiceAPI.speechToText(audioBlob);
      const transcribedText = res.data.text;
      if (transcribedText && transcribedText.trim()) {
        setInput(transcribedText);
        toast.success("Voice transcribed successfully!");
      } else {
        toast.warning("Could not understand audio. Please try again.");
      }
    } catch (error) {
      console.error("Transcription error:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const speakMessage = async (message) => {
    const msgId = message.id;

    if (isSpeaking && playingMessageId === msgId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsSpeaking(false);
      setPlayingMessageId(null);
      return;
    }

    setIsSpeaking(true);
    setPlayingMessageId(msgId);

    try {
      const res = await voiceAPI.textToSpeech(message.content);
      const audioBase64 = res.data.audio_base64;

      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setPlayingMessageId(null);
        toast.error("Failed to play audio");
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      toast.error("Failed to generate speech. Please try again.");
      setIsSpeaking(false);
      setPlayingMessageId(null);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setLoading(true);

    // Optimistic message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      // ✅ This hits POST /api/chat/messages
      const res = await chatAPI.sendMessage({
        message: userText,
        session_id: "default",
      });

      // res.data is assistant message object
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...tempUserMsg, id: `user-${Date.now()}` },
        res.data,
      ]);
    } catch (error) {
      console.error("Send error:", error);
      toast.error(error?.response?.data?.message || "Failed to send message.");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setInput(userText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Describe your symptoms or health concerns, and I'll respond.
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-message-in`}
                  >
                    <div
                      className={`max-w-[85%] ${
                        message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"
                      } chat-bubble`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-50">
                          {format(new Date(message.timestamp), "h:mm a")}
                        </p>

                        {message.role === "assistant" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-70 hover:opacity-100"
                                  onClick={() => speakMessage(message)}
                                  disabled={isSpeaking && playingMessageId !== message.id}
                                >
                                  {playingMessageId === message.id && isSpeaking ? (
                                    <Square className="w-3.5 h-3.5" />
                                  ) : (
                                    <Volume2 className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {playingMessageId === message.id && isSpeaking ? "Stop" : "Listen"}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="chat-bubble chat-bubble-assistant flex items-center gap-2">
                    <span className="typing-dot w-2 h-2 bg-current rounded-full opacity-60"></span>
                    <span className="typing-dot w-2 h-2 bg-current rounded-full opacity-60"></span>
                    <span className="typing-dot w-2 h-2 bg-current rounded-full opacity-60"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-border p-4 bg-background">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon"
                        className={`h-12 w-12 rounded-full flex-shrink-0 ${isRecording ? "animate-pulse" : ""}`}
                        onClick={toggleRecording}
                        disabled={loading || isTranscribing}
                      >
                        {isTranscribing ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : isRecording ? (
                          <MicOff className="w-5 h-5" />
                        ) : (
                          <Mic className="w-5 h-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isTranscribing ? "Transcribing..." : isRecording ? "Stop recording" : "Start voice input"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isRecording ? "Recording... Tap mic to stop" : "Describe your symptoms..."}
                  className="flex-1 h-12 rounded-full px-5"
                  disabled={loading || isRecording}
                />

                <Button
                  type="submit"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  disabled={loading || !input.trim() || isRecording}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </Button>
              </div>

              {isRecording && (
                <div className="flex items-center justify-center gap-2 mt-3 text-destructive text-sm">
                  <span className="w-2 h-2 bg-destructive rounded-full animate-pulse"></span>
                  Recording... Tap microphone to stop
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center mt-3">
                CareBot provides guidance only. Always consult a healthcare professional for medical advice.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
