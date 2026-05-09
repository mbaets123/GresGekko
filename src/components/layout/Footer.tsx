export function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-gray-900 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-1 text-xs text-white/50 sm:flex-row sm:justify-between">
        <p>
          Video&apos;s door{" "}
          <a
            href="https://www.youtube.com/@biologiemetjoost"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white/70 underline underline-offset-2 hover:text-white"
          >
            Biologie met Joost
          </a>
        </p>
        <p>
          Gemaakt door{" "}
          <a
            href="https://nl.linkedin.com/in/mike-baets-7b6464156"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white/70 underline underline-offset-2 hover:text-white"
          >
            Mike Baets
          </a>
        </p>
      </div>
    </footer>
  );
}
