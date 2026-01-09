import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Send, 
  Plus, 
  MessageCircle, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  ChevronLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square
} from "lucide-react";
import { chatAPI, voiceAPI } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

const ChatPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId || null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  
  // Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await chatAPI.getSessions();
        setSessions(res.data);
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };
    fetchSessions();
  }, []);

  // Fetch messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      const fetchMessages = async () => {
        setLoadingMessages(true);
        try {
          const res = await chatAPI.getSessionMessages(currentSessionId);
          setMessages(res.data);
        } catch (error) {
          console.error("Error fetching messages:", error);
        } finally {
          setLoadingMessages(false);
        }
      };
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  // Update URL when session changes
  useEffect(() => {
    if (currentSessionId && currentSessionId !== sessionId) {
      navigate(`/chat/${currentSessionId}`, { replace: true });
    }
  }, [currentSessionId, sessionId, navigate]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
    if (isSpeaking && playingMessageId === message.id) {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsSpeaking(false);
      setPlayingMessageId(null);
      return;
    }

    setIsSpeaking(true);
    setPlayingMessageId(message.id);
    
    try {
      const res = await voiceAPI.textToSpeech(message.content);
      const audioBase64 = res.data.audio_base64;
      
      // Create audio element and play
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

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Optimistically add user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await chatAPI.sendMessage({
        message: userMessage,
        session_id: currentSessionId
      });

      // Update session ID if new
      if (!currentSessionId) {
        setCurrentSessionId(res.data.session_id);
        // Refresh sessions list
        const sessionsRes = await chatAPI.getSessions();
        setSessions(sessionsRes.data);
      }

      // Add AI response
      setMessages(prev => [...prev.slice(0, -1), 
        { ...tempUserMsg, id: `user-${Date.now()}` },
        res.data
      ]);
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
      setMessages(prev => prev.slice(0, -1));
      setInput(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    navigate("/chat");
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        handleNewChat();
      }
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete conversation");
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case "emergency":
        return (
          <Badge className="severity-emergency animate-pulse-emergency">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Emergency
          </Badge>
        );
      case "consultation":
        return (
          <Badge className="severity-consultation">
            <AlertCircle className="w-3 h-3 mr-1" />
            Consult Doctor
          </Badge>
        );
      case "mild":
        return (
          <Badge className="severity-mild">
            <CheckCircle className="w-3 h-3 mr-1" />
            Mild
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} border-r border-border bg-card transition-all duration-300 flex-shrink-0 overflow-hidden`}>
          <div className="p-4 border-b border-border">
            <Button 
              onClick={handleNewChat} 
              className="w-full rounded-full"
              data-testid="new-chat-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Consultation
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-3 space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setCurrentSessionId(session.id)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all ${
                    currentSessionId === session.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-accent'
                  }`}
                  data-testid={`sidebar-session-${session.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{session.title}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                        <Clock className="w-3 h-3" />
                        {format(new Date(session.last_message_at), "MMM d")}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${
                        currentSessionId === session.id ? 'hover:bg-white/20' : ''
                      }`}
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      data-testid={`delete-session-${session.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No conversations yet
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile sidebar toggle */}
          <div className="md:hidden p-3 border-b border-border flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
            </Button>
            <span className="font-medium text-sm">
              {currentSessionId ? "Chat" : "New Consultation"}
            </span>
          </div>

          {/* Messages */}
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
                    Describe your symptoms or health concerns, and I'll provide guidance 
                    and help you decide if you need to see a doctor.
                  </p>
                  
                  {/* Voice hint */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Mic className="w-4 h-4" />
                    <span>Tap the mic button to speak your symptoms</span>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                    {[
                      "I have a headache that won't go away",
                      "I'm feeling dizzy and tired",
                      "I have a sore throat and cough",
                      "My stomach has been hurting"
                    ].map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4 text-left text-sm"
                        onClick={() => setInput(prompt)}
                        data-testid={`quick-prompt-${i}`}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-message-in`}
                    data-testid={`message-${index}`}
                  >
                    <div className={`max-w-[85%] ${
                      message.role === "user" 
                        ? "chat-bubble-user" 
                        : "chat-bubble-assistant"
                    } chat-bubble`}>
                      {message.role === "assistant" && message.severity && (
                        <div className="mb-3">
                          {getSeverityBadge(message.severity)}
                        </div>
                      )}
                      
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      
                      {message.role === "assistant" && message.suggestions?.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-current/10">
                          <p className="text-xs font-medium mb-2 opacity-70">Suggestions:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.suggestions.map((suggestion, i) => (
                              <span key={i} className="text-xs bg-black/10 rounded-full px-3 py-1">
                                {suggestion}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-50">
                          {format(new Date(message.timestamp), "h:mm a")}
                        </p>
                        
                        {/* Voice playback button for AI messages */}
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
                                  data-testid={`speak-message-${index}`}
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

          {/* Input Area */}
          <div className="border-t border-border p-4 bg-background">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3">
                {/* Voice Recording Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon" 
                        className={`h-12 w-12 rounded-full flex-shrink-0 ${
                          isRecording ? 'animate-pulse' : ''
                        }`}
                        onClick={toggleRecording}
                        disabled={loading || isTranscribing}
                        data-testid="voice-record-btn"
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
                  data-testid="chat-input"
                />
                
                <Button 
                  type="submit" 
                  size="icon" 
                  className="h-12 w-12 rounded-full"
                  disabled={loading || !input.trim() || isRecording}
                  data-testid="chat-send-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              
              {/* Recording indicator */}
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
