import GameHeader from "@/components/GameHeader";
import ChatInterface from "@/components/ChatInterface";
import GameFooter from "@/components/GameFooter";
import gameTableHero from "@/assets/game-table-hero.jpg";
import meepleCharacters from "@/assets/meeple-characters.jpg";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative min-h-[50vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${gameTableHero})` }}
      >
        <div className="absolute inset-0 bg-background/80"></div>
        <div className="relative z-10 w-full">
          <GameHeader />
        </div>
      </section>

      {/* Main Chat Section */}
      <section className="py-12 relative">
        {/* Decorative Meeple Characters */}
        <div className="absolute top-8 right-8 hidden xl:block">
          <img 
            src={meepleCharacters} 
            alt="Friendly meeple characters" 
            className="w-32 h-32 object-contain opacity-30"
          />
        </div>
        
        <div className="container mx-auto">
          <ChatInterface />
        </div>
      </section>

      {/* Footer */}
      <GameFooter />
    </div>
  );
};

export default Index;
