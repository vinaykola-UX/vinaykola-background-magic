import { useState, useCallback } from 'react';
import { Upload, Download, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';

const ImageUploader = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addWatermark, setAddWatermark] = useState(true);
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setProcessedImage(null);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const processImage = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    try {
      const img = await loadImage(await fetch(originalImage).then(r => r.blob()));
      const blob = await removeBackground(img, addWatermark);
      const url = URL.createObjectURL(blob);
      setProcessedImage(url);
      
      toast({
        title: "Success!",
        description: "Background removed successfully",
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Error",
        description: "Failed to remove background. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'background-removed.png';
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm shadow-card hover:border-primary/50 transition-colors">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="p-12 text-center"
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-6">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold">Drop your image here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG, WEBP</p>
              </div>
              <Button variant="outline" className="mt-4">
                Select Image
              </Button>
            </div>
          </label>
        </div>
      </Card>

      {/* Preview Area */}
      {originalImage && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          <Card className="overflow-hidden shadow-card bg-card/80 backdrop-blur-sm">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold">Original</h3>
            </div>
            <div className="p-6 bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)_50%/20px_20px]">
              <img src={originalImage} alt="Original" className="w-full h-auto rounded-lg shadow-lg" />
            </div>
          </Card>

          <Card className="overflow-hidden shadow-card bg-card/80 backdrop-blur-sm">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold">Processed</h3>
            </div>
            <div className="p-6 bg-[repeating-conic-gradient(#808080_0%_25%,transparent_0%_50%)_50%/20px_20px] min-h-[300px] flex items-center justify-center">
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Removing background...</p>
                </div>
              ) : processedImage ? (
                <img src={processedImage} alt="Processed" className="w-full h-auto rounded-lg shadow-lg" />
              ) : (
                <p className="text-muted-foreground">Click "Remove Background" to process</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      {originalImage && (
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="watermark" 
              checked={addWatermark}
              onCheckedChange={(checked) => setAddWatermark(checked as boolean)}
            />
            <label htmlFor="watermark" className="text-sm text-muted-foreground cursor-pointer">
              Add "Made by Vinay Kola" watermark
            </label>
          </div>
          
          <div className="flex gap-4">
            <Button
              onClick={processImage}
              disabled={isProcessing}
              size="lg"
              className="bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Remove Background
                </>
              )}
            </Button>

            {processedImage && (
              <Button
                onClick={downloadImage}
                variant="outline"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                Download PNG
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
