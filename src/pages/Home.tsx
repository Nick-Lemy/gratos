export default function Home() {
  return (
    <section className="min-h-dvh bg-[#0064E2] px-5 pt-12 pb-6 font-mileast text-white flex flex-col items-center gap-12 sm:px-8 sm:pt-20 lg:pt-32">
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <div className="min-w-0 border-2 border-white rounded-md p-4 sm:p-5">
          <a href="/qr" className="inline-block text-4xl mb-3 cursor-pointer font-bold hover:underline sm:text-5xl">
            QRGratos
          </a>
          <p className="text-lg sm:text-xl">
            Free tools to generate{" "}
            <span className="text-yellow-300"> QR Codes</span>{" "}
          </p>
        </div>
        <div className="min-w-0 border-2 border-white rounded-md p-4 sm:p-5">
          <a href="/pdf" className="inline-block text-4xl mb-3 cursor-pointer font-bold hover:underline sm:text-5xl">
            PDFGratos
          </a>
          <p className="text-lg sm:text-xl">
            <span className="text-yellow-300">Edit Pdfs</span> online for free
          </p>
        </div>
      </div>
      <footer className="mt-auto text-center text-sm sm:text-base">
        © 2026 Nick Lemy K. All Rights Reserved.
      </footer>
    </section>
  );
}
