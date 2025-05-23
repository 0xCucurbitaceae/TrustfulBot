import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b border-gray-200 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" className="h-12" alt="Logo" />
            EAS Bot
          </Link>
        </div>
        <div>
          <Link href="/deploy" legacyBehavior>
            <a className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Deploy your own
            </a>
          </Link>
        </div>
      </div>
    </header>
  );
}
