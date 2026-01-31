"use client"

import Image from "next/image"

interface AvatarProps {
  src?: string | null
  alt: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-20 h-20",
}

export function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size]

  if (src) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden bg-gray-dark ${className}`}>
        <Image
          src={src}
          alt={alt}
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Generate a consistent color based on the alt text
  const colors = [
    "bg-pink-500",
    "bg-purple-500",
    "bg-blue-500",
    "bg-cyan-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
  ]
  const colorIndex = alt.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  const bgColor = colors[colorIndex]
  const initial = alt.charAt(0).toUpperCase()

  return (
    <div
      className={`${sizeClass} rounded-full ${bgColor} flex items-center justify-center text-white font-bold ${className}`}
      style={{ fontSize: size === "xl" ? "2rem" : size === "lg" ? "1.25rem" : "0.875rem" }}
    >
      {initial}
    </div>
  )
}
