function App() {
  return (
    <>
      <section className="p-5 h-screen font-mileast text-white bg-[#0064E2] gap-10 flex flex-col items-center py-32">
        <div className="flex gap-10">
          <div className="w-sm h-fit border-2 p-2 border-white rounded-md ">
            <h1 className="text-5xl mb-3 cursor-pointer font-bold hover:underline">
              QRGratos
            </h1>
            <p className="text-xl">
              Free tools to generate{" "}
              <span className="text-yellow-300"> QR Codes</span>{" "}
            </p>
          </div>
          <div className="w-sm h-fit border-2 p-2 border-white rounded-md ">
            <h1 className="text-5xl mb-3 cursor-pointer font-bold hover:underline">
              PDFGratos
            </h1>
            <p className="text-xl">
              <span className="text-yellow-300">Edit Pdfs</span> online for free
            </p>
          </div>
        </div>
        <footer className="bottom-0 h-1/12 absolute">© 2026 Nick Lemy K. All Rights Reserved.</footer>
      </section>
    </>
  );
}

export default App;
