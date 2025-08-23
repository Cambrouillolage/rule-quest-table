import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Gamepad2, MessageCircle, Sparkles } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi there! 🎲 Which board game are you asking about?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let botResponse = "";
      
      if (!currentGame) {
        setCurrentGame(inputValue);
        botResponse = `Great! You're asking about "${inputValue}". What rule or situation would you like me to clarify for you? 🎯`;
      } else {
        botResponse = `That's a great question about ${currentGame}! Let me help clarify that rule for you. In most cases with ${currentGame}, the situation you're describing typically follows these guidelines... 🎲`;
      }

      const botMessage: Message = {
        id: Date.now() + 1,
        text: botResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resetConversation = () => {
    setCurrentGame(null);
    setMessages([
      {
        id: 1,
        text: "Hi there! 🎲 Which board game are you asking about?",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Current Game Display */}
      {currentGame && (
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-secondary/20 rounded-full px-4 py-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="font-semibold text-primary">Currently discussing: {currentGame}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetConversation}
              className="ml-2 h-6 text-xs"
            >
              New Game
            </Button>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <Card className="mb-6 p-6 max-h-96 overflow-y-auto" style={{ background: 'var(--table-gradient)' }}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`speech-bubble ${
                  message.isUser ? "speech-bubble-right bg-primary text-primary-foreground" : "speech-bubble-left"
                } max-w-md`}
              >
                {!message.isUser && (
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Game Helper</span>
                  </div>
                )}
                <p className="text-sm leading-relaxed">{message.text}</p>
                <span className="text-xs opacity-70 mt-2 block">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {/* Loading Animation */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="speech-bubble speech-bubble-left">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Game Helper</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  <span className="ml-2 text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Input Area */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                currentGame 
                  ? `Ask about ${currentGame} rules...` 
                  : "Type the name of a board game..."
              }
              className="border-2 border-primary/20 focus:border-primary rounded-xl"
              disabled={isLoading}
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="game-button"
            size="lg"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick Start Examples */}
        {!currentGame && messages.length === 1 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Popular games to ask about:
            </p>
            <div className="flex flex-wrap gap-2">
              {["Monopoly", "Settlers of Catan", "Scythe", "Wingspan", "Azul"].map((game) => (
                <Button
                  key={game}
                  variant="outline"
                  size="sm"
                  onClick={() => setInputValue(game)}
                  className="rounded-full text-xs"
                >
                  {game}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ChatInterface;