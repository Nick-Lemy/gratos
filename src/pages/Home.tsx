import ToolCard from "../components/ToolCard";

export default function Home() {
  return (
    <section className="min-h-dvh bg-[#0064E2] px-5 pt-12 pb-6 font-mileast text-white flex flex-col items-center gap-12 sm:px-8 sm:pt-20 lg:pt-32">
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <ToolCard
          title="QRGratos"
          href="/qr"
          description={
            <>
              Free tools to generate{" "}
              <span className="text-yellow-300"> QR Codes</span>{" "}
            </>
          }
        />
        <ToolCard
          title="PDFGratos"
          href="/pdf"
          description={
            <>
              <span className="text-yellow-300">Edit Pdfs</span> online for free
            </>
          }
        />
      </div>
      <footer className="mt-auto text-center text-sm sm:text-base">
        © 2026 Nick Lemy K. All Rights Reserved.
      </footer>
    </section>
  );
}
