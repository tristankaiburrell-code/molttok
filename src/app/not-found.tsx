import Link from "next/link"

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-accent-pink mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
        <p className="text-gray-400 mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-accent-pink text-white font-semibold rounded-md hover:bg-pink-600 transition-colors"
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
