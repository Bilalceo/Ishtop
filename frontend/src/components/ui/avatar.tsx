/**
 * =============================================================================
 * AVATAR COMPONENT
 * =============================================================================
 */

"use client";

import * as React from "react";
import Image from "next/image";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = "", fallback, size = "md", ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const initials = fallback || getInitials(alt);

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 font-medium text-white",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src && !hasError ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  max?: number;
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 4, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div
        ref={ref}
        className={cn("flex -space-x-3", className)}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div
            key={index}
            className="relative ring-2 ring-white dark:ring-surface-800 rounded-full"
          >
            {child}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-100 text-sm font-medium text-surface-600 ring-2 ring-white dark:bg-surface-700 dark:text-surface-400 dark:ring-surface-800">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = "AvatarGroup";

// UserAvatar - Simple wrapper with name prop
interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  imageUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const UserAvatar = React.forwardRef<HTMLDivElement, UserAvatarProps>(
  ({ name = "User", imageUrl, size = "md", className, ...props }, ref) => {
    return (
      <Avatar
        ref={ref}
        src={imageUrl}
        alt={name}
        fallback={getInitials(name)}
        size={size}
        className={className}
        {...props}
      />
    );
  }
);

UserAvatar.displayName = "UserAvatar";

export { Avatar, AvatarGroup, UserAvatar };
