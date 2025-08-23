import { Shield, Star, Coffee } from "lucide-react";
import gameElements from "@/assets/game-elements.jpg";

const GameFooter = () => {
  return (
    <footer className="relative mt-16 py-8 px-4">
      {/* Background Game Elements */}
      <div 
        className="absolute inset-0 opacity-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${gameElements})` }}
      ></div>
      
      <div className="container mx-auto relative">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          {/* About */}
          <div>
            <h3 className="font-bold text-primary mb-3 flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              Reliable Rules
            </h3>
            <p className="text-sm text-muted-foreground">
              Get accurate rule clarifications for thousands of board games. 
              When in doubt, ask away!
            </p>
          </div>

          {/* Quality */}
          <div>
            <h3 className="font-bold text-primary mb-3 flex items-center justify-center gap-2">
              <Star className="w-5 h-5" />
              Game Expert Help
            </h3>
            <p className="text-sm text-muted-foreground">
              Our AI is trained on comprehensive rule sets and community 
              discussions to give you the best answers.
            </p>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-bold text-primary mb-3 flex items-center justify-center gap-2">
              <Coffee className="w-5 h-5" />
              Community Driven
            </h3>
            <p className="text-sm text-muted-foreground">
              Built by board game enthusiasts, for board game enthusiasts. 
              Happy gaming!
            </p>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <div className="brand-banner inline-block mb-4">
            ✨ Powered by Cambrouillolage ✨
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Cambrouillolage. Making board gaming more accessible, one rule at a time.
          </p>
        </div>

        {/* Floating Meeples */}
        <div className="absolute -top-4 left-1/4 hidden lg:block">
          <div className="w-6 h-6 bg-game-red rounded-full meeple-bounce opacity-60"></div>
        </div>
        <div className="absolute -top-2 right-1/3 hidden lg:block">
          <div className="w-4 h-4 bg-game-blue rounded opacity-50 meeple-bounce" style={{ animationDelay: '0.8s' }}></div>
        </div>
      </div>
    </footer>
  );
};

export default GameFooter;