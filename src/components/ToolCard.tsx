import type { ReactElement } from "react";
import { Link } from "react-router-dom";

interface ToolCardProp {
  title: string;
  description: ReactElement;
  href: string;
}
export default function ToolCard({ title, description, href }: ToolCardProp) {
  return (
    <div className="min-w-0 bg-neutral-900 border border-neutral-800 rounded-md p-4 sm:p-5">
      <Link
        to={href}
        className="inline-block break-words max-w-full text-4xl mb-3 cursor-pointer font-bold text-teal-400 hover:underline decoration-teal-400 sm:text-5xl"
      >
        {title}
      </Link>
      <p className="text-neutral-400 text-lg sm:text-xl">{description}</p>
    </div>
  );
}
