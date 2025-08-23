import { Dice6, Crown, Heart } from "lucide-react";

const GameHeader = () => {
  return (
    <header className="relative py-6 px-4">
      <div className="container mx-auto">
        {/* Main Title */}
        <div className="text-center mb-4">
          <h1 className="text-4xl md:text-6xl font-bold text-primary mb-2" style={{ fontFamily: 'Fredoka One' }}>
            Board Game Rules Helper
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Got a question about any board game? I'm here to help clarify the rules! 
            <span className="inline-flex items-center ml-2">
              <Dice6 className="w-5 h-5 text-accent animate-pulse" />
            </span>
          </p>
        </div>

        {/* Branding Banners */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="brand-banner flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Powered by Cambrouillolage
            <Heart className="w-4 h-4" />
          </div>
        </div>

        {/* Decorative Game Elements */}
        <div className="absolute top-4 left-4 hidden md:block">
          <div className="w-8 h-8 bg-game-red rounded-full meeple-bounce opacity-80"></div>
        </div>
        <div className="absolute top-8 right-8 hidden md:block">
          <div className="w-6 h-6 bg-game-blue rounded opacity-75 transform rotate-12 meeple-bounce" style={{ animationDelay: '0.5s' }}></div>
        </div>
        <div className="absolute bottom-4 left-1/4 hidden lg:block">
          <div className="w-4 h-4 bg-game-green rounded-full meeple-bounce opacity-70" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="absolute bottom-8 right-1/3 hidden lg:block">
          <div className="w-5 h-5 bg-game-yellow rounded opacity-80 transform -rotate-12 meeple-bounce" style={{ animationDelay: '1.5s' }}></div>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;