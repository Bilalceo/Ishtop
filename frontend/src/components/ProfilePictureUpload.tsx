"use client";

/**
 * Profile Picture Upload Component
 * Allows users to upload and manage their profile picture
 */

import { useState, useRef } from 'react';
import { Camera, Trash2, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

export function ProfilePictureUpload() {
  const { user, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update user in store
      if (user) {
        setUser({
          ...user,
          avatar_url: response.data.avatar_url,
        });
      }

      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(
        error.response?.data?.detail || 'Failed to upload profile picture'
      );
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!user?.avatar_url) return;

    setDeleting(true);

    try {
      await api.delete('/profile/avatar');

      // Update user in store
      if (user) {
        setUser({
          ...user,
          avatar_url: undefined,
        });
      }

      toast.success('Profile picture removed');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete profile picture');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar Display */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
          {user?.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.full_name || 'Profile'}
              width={96}
              height={96}
              className="object-cover"
            />
          ) : (
            <User className="h-12 w-12 text-surface-400" />
          )}
        </div>

        {(uploading || deleting) && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading || deleting}
        />

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || deleting}
          variant="outline"
          size="sm"
        >
          <Camera className="h-4 w-4 mr-2" />
          {user?.avatar_url ? 'Change Photo' : 'Upload Photo'}
        </Button>

        {user?.avatar_url && (
          <Button
            onClick={handleDelete}
            disabled={uploading || deleting}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}

        <p className="text-xs text-surface-500">
          JPG, PNG or GIF. Max 5MB.
        </p>
      </div>
    </div>
  );
}
