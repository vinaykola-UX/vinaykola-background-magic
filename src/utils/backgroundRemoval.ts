import { supabase } from '@/integrations/supabase/client';

export const removeBackground = async (imageElement: HTMLImageElement, addWatermark: boolean = false): Promise<Blob> => {
  try {
    console.log('Starting professional background removal with remove.bg...');
    
    // Convert image to base64
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if too large (remove.bg has size limits)
    const maxDimension = 4000000; // 4 megapixels (e.g., 2000x2000) for better API compatibility
    let width = imageElement.naturalWidth;
    let height = imageElement.naturalHeight;
    
    const totalPixels = width * height;
    if (totalPixels > maxDimension) {
      const scale = Math.sqrt(maxDimension / totalPixels);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
      console.log('Resizing image from', imageElement.naturalWidth, 'x', imageElement.naturalHeight, 'to', width, 'x', height);
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);
    
    // Use JPEG with good quality to balance file size and quality
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('remove-background', {
      body: { imageBase64 }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error('Failed to remove background');
    }

    if (!data.success) {
      const errorMessage = data.error || 'Background removal failed';
      
      // Provide helpful message for common errors
      if (errorMessage.includes('Could not identify foreground')) {
        throw new Error('Could not detect a clear subject in your image. Please use photos with a clear person, animal, or object in the foreground. Group photos or complex scenes may not work well.');
      }
      
      throw new Error(errorMessage);
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

