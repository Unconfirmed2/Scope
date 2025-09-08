'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type ImageData = {
  file: File;
  dataUri: string;
} | null;

interface ImageUploadProps {
  // Current image data
  image: ImageData;
  onImageChange: (image: ImageData) => void;
  
  // UI Configuration
  variant?: 'icon' | 'button';
  size?: 'small' | 'medium' | 'large';
  label?: string;
  disabled?: boolean;
  
  // Styling
  className?: string;
  buttonText?: string;
  previewClassName?: string;
}

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export function ImageUpload({
  image,
  onImageChange,
  variant = 'icon',
  size = 'medium',
  label,
  disabled = false,
  className = '',
  buttonText = 'Upload Image',
  previewClassName
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUri = await readFileAsDataURL(file);
        onImageChange({ file, dataUri });
      } catch {
        toast({ 
          variant: 'destructive', 
          title: 'Error reading file', 
          description: 'Could not process the selected file.' 
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    onImageChange(null);
  };

  // Size configurations
  const sizeConfig = {
    small: {
      preview: 'w-16 h-16',
      removeButton: 'h-5 w-5',
      removeIcon: 'h-3 w-3'
    },
    medium: {
      preview: 'w-32 h-32',
      removeButton: 'h-6 w-6',
      removeIcon: 'h-4 w-4'
    },
    large: {
      preview: 'w-48 h-48',
      removeButton: 'h-8 w-8',
      removeIcon: 'h-5 w-5'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={className}>
      {label && <Label className="block mb-2">{label}</Label>}
      
      <div className="flex items-center gap-2">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled}
        />

        {/* Upload button */}
        {variant === 'icon' ? (
          <Button 
            size="icon" 
            type="button" 
            onClick={handleUploadClick} 
            disabled={disabled}
          >
            <ImagePlus />
          </Button>
        ) : (
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleUploadClick}
            disabled={disabled}
          >
            <ImagePlus className="mr-2" />
            {buttonText}
          </Button>
        )}

        {/* Image preview */}
        {image && (
          <div className={`relative ${config.preview} rounded-md overflow-hidden border ${previewClassName || ''}`}>
            <Image 
              src={image.dataUri} 
              alt="Preview" 
              layout="fill" 
              objectFit="cover" 
            />
            <Button
              variant="destructive"
              size="icon"
              className={`absolute top-1 right-1 ${config.removeButton}`}
              onClick={handleRemoveImage}
              type="button"
            >
              <Trash2 className={config.removeIcon} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}