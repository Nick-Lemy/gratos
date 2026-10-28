import ToolCard from "../components/ToolCard";

export default function Home() {
  return (
    <section className="min-h-dvh bg-neutral-950 px-5 pt-12 pb-6 font-mileast text-neutral-200 flex flex-col items-center gap-12 sm:px-8 sm:pt-20 lg:pt-32">
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <ToolCard
          title="QRGratos"
          href="/qr"
          description={
            <>
              Free tool to generate, customize and personalize{" "}
              <span className="text-teal-400"> QR Codes</span>{" "}
            </>
          }
        />
        <ToolCard
          title="MediaGratos"
          href="/media"
          description={
            <>
              Download direct media links and convert{" "}
              <span className="text-teal-400">video and audio files</span>{" "}
              right in your browser.
            </>
          }
        />
      </div>
      <footer className="mt-auto text-center text-neutral-500 text-sm sm:text-base">
        © 2026 Nick Lemy K. All Rights Reserved.
      </footer>
    </section>
  );
}
