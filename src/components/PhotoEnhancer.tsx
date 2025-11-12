import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PhotoEnhancer = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [upscaleLevel, setUpscaleLevel] = useState("2");
  const [sliderPosition, setSliderPosition] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WEBP image.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const enhanceImage = async () => {
    if (!originalImage) return;

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to enhance images.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await fetch(originalImage).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", blob);
      formData.append("upscale_level", upscaleLevel);

      const { data, error } = await supabase.functions.invoke("enhance-image", {
        body: formData,
      });

      if (error) {
        // Check for insufficient credits error
        if (error.message?.includes('402') || error.message?.includes('Insufficient credits')) {
          toast({
            title: "Insufficient Credits",
            description: "You need at least 1 credit to enhance images.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      if (data?.output_url) {
        setEnhancedImage(data.output_url);
        toast({
          title: "Enhancement complete!",
          description: `Image enhanced! ${data.creditsRemaining || 0} credits remaining.`,
        });
      } else {
        throw new Error("No output URL received");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      toast({
        title: "Enhancement failed",
        description: error instanceof Error ? error.message : "Failed to enhance image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!enhancedImage) return;
    const link = document.createElement("a");
    link.href = enhancedImage;
    link.download = "enhanced-image.png";
    link.click();
  };

  return (
    <div className="space-y-8">
      {!originalImage ? (
        <Card
          className={`p-12 border-2 border-dashed transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
        >
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium mb-2">
                Drop your image here or click to upload
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, and WEBP formats
              </p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Choose Image
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInput}
            />
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Select value={upscaleLevel} onValueChange={setUpscaleLevel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Upscale level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2× Upscale</SelectItem>
                <SelectItem value="4">4× Upscale</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={enhanceImage}
              disabled={isProcessing}
              className="bg-gradient-primary hover:opacity-90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                "Enhance Image"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setOriginalImage(null);
                setEnhancedImage(null);
              }}
            >
              Upload New
            </Button>
          </div>

          {enhancedImage ? (
            <div className="space-y-4">
              <div className="relative w-full h-96 overflow-hidden rounded-lg bg-muted">
                <div className="absolute inset-0">
                  <img
                    src={enhancedImage}
                    alt="Enhanced"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                >
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute top-1/2 left-0 w-full -translate-y-1/2 z-10 cursor-ew-resize opacity-0"
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="w-1 h-4 bg-gray-400"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <Button onClick={downloadImage} size="lg" className="shadow-glow">
                  <Download className="mr-2 h-4 w-4" />
                  Download Enhanced Image
                </Button>
              </div>
            </div>
          ) : (
            <Card className="p-8">
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-auto rounded-lg"
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoEnhancer;
