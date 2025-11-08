import { supabase } from '@/integrations/supabase/client';

export const removeBackground = async (imageElement: HTMLImageElement, addWatermark: boolean = false): Promise<Blob> => {
  try {
    console.log('Starting professional background removal with remove.bg...');
    
    // Convert image to base64
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageBase64 = canvas.toDataURL('image/png');
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('remove-background', {
      body: { imageBase64 }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error('Failed to remove background');
    }

    if (!data.success) {
      throw new Error(data.error || 'Background removal failed');
    }

    // Convert base64 result back to blob
    const response = await fetch(data.image);
    const blob = await response.blob();
    
    // Add watermark if requested
    if (addWatermark) {
      const watermarkedBlob = await addWatermarkToBlob(blob);
      return watermarkedBlob;
    }
    
    console.log('Background removal successful');
    return blob;
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

const addWatermarkToBlob = async (blob: Blob): Promise<Blob> => {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');
  
  canvas.width = img.width;
  canvas.height = img.height;
  
  ctx.drawImage(img, 0, 0);
  
  // Add watermark
  ctx.font = '14px Inter, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('Made by Vinay Kola', canvas.width / 2, canvas.height - 20);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (watermarkedBlob) => {
        if (watermarkedBlob) {
          resolve(watermarkedBlob);
        } else {
          reject(new Error('Failed to create watermarked blob'));
        }
      },
      'image/png',
      1.0
    );
  });
};

export const loadImage = (file: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

