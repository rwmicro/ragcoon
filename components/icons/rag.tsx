import React from "react"

export default function RAGIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      {/* Document stack with search/knowledge representation */}
      <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
      <circle cx="10" cy="15" r="3" opacity="0.6" />
      <path d="M12.5 17.5l2 2" strokeWidth="1.5" stroke="currentColor" fill="none" />
    </svg>
  )
}
