import { Upload, Wand2, Download } from "lucide-react";
import { Card } from "@/components/ui/card";

const HowItWorks = () => {
  const steps = [
    {
      icon: Upload,
      title: "Upload Your Image",
      description: "Drag and drop your image or click to browse. We support JPG, PNG, and WEBP formats.",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Wand2,
      title: "AI Removes Background",
      description: "Our advanced AI analyzes your image and automatically removes the background with precision.",
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      icon: Download,
      title: "Download Result",
      description: "Download your image with a transparent background in high-quality PNG format instantly.",
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-20 animate-fade-in">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            How It <span className="bg-gradient-primary bg-clip-text text-transparent">Works</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Remove backgrounds from your images in three simple steps. No technical skills required.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto space-y-12">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className="p-8 sm:p-12 bg-card/80 backdrop-blur-sm shadow-card hover:shadow-glow transition-all animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col sm:flex-row items-start gap-8">
                <div className={`rounded-2xl ${step.bg} p-6 shrink-0`}>
                  <step.icon className={`h-12 w-12 ${step.color}`} />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl font-bold text-muted-foreground/20">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h2 className="text-3xl font-bold">{step.title}</h2>
                  </div>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="mt-20 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-8 bg-card/60 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-4">Why Use AI?</h3>
            <p className="text-muted-foreground leading-relaxed">
              Traditional background removal tools require manual editing and hours of work. 
              Our AI-powered solution analyzes millions of pixels instantly, identifying and 
              removing backgrounds with professional-grade precision in seconds.
            </p>
          </Card>

          <Card className="p-8 bg-card/60 backdrop-blur-sm">
            <h3 className="text-2xl font-bold mb-4">Perfect For</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                E-commerce product photos
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Social media content creation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Professional headshots
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Marketing materials & graphics
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
