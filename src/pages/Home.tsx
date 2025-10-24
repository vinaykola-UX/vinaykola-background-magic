import { Sparkles, Zap, Shield, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ImageUploader from "@/components/ImageUploader";
import heroImage from "@/assets/hero-background.jpg";

const Home = () => {
  const scrollToUploader = () => {
    document.getElementById('uploader')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-hero opacity-50" />
        <div className="absolute inset-0 bg-gradient-glow" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                Remove Image Backgrounds
                <span className="block bg-gradient-primary bg-clip-text text-transparent mt-2">
                  Instantly with AI ⚡
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground">
                Transform your images in seconds with our AI-powered background removal tool. 
                Fast, accurate, and completely free.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={scrollToUploader}
                  size="lg" 
                  className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow text-lg px-8"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Try Now - It's Free
                </Button>
              </div>
            </div>
            
            <div className="relative animate-scale-in">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <img 
                src={heroImage} 
                alt="AI Background Removal Demo" 
                className="relative rounded-2xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Background Remover.io?</h2>
            <p className="text-xl text-muted-foreground">Powerful AI technology at your fingertips</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-card hover:shadow-glow transition-shadow">
              <div className="rounded-lg bg-primary/10 w-14 h-14 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Advanced AI processes your images in seconds, not minutes. Get professional results instantly.
              </p>
            </Card>

            <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-card hover:shadow-glow transition-shadow">
              <div className="rounded-lg bg-secondary/10 w-14 h-14 flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">100% Private</h3>
              <p className="text-muted-foreground">
                All processing happens in your browser. Your images never leave your device.
              </p>
            </Card>

            <Card className="p-8 bg-card/80 backdrop-blur-sm shadow-card hover:shadow-glow transition-shadow">
              <div className="rounded-lg bg-accent/10 w-14 h-14 flex items-center justify-center mb-6">
                <Download className="h-7 w-7 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">High Quality</h3>
              <p className="text-muted-foreground">
                Download in PNG format with transparent backgrounds. Perfect for any project.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section id="uploader" className="py-20 scroll-mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Start Removing Backgrounds</h2>
            <p className="text-xl text-muted-foreground">Upload your image and watch the magic happen</p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <ImageUploader />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
