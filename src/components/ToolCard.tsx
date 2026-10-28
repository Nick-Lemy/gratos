import type { ReactElement } from "react";
import { Link } from "react-router-dom";

interface ToolCardProp {
  title: string;
  description: ReactElement;
  href: string;
}
export default function ToolCard({ title, description, href }: ToolCardProp) {
  return (
    <div className="min-w-0 border border-white/50 rounded-md p-4 sm:p-5">
      <Link
        to={href}
        className="inline-block text-4xl mb-3 cursor-pointer font-bold hover:underline sm:text-5xl"
      >
        {title}
      </Link>
      <p className="text-lg sm:text-xl">{description}</p>
    </div>
  );
}
