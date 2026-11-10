const ICONS = {
  all: (
    <>
      <rect x="5" y="5" width="9" height="9" rx="2.2" />
      <rect x="18" y="5" width="9" height="9" rx="2.2" />
      <rect x="5" y="18" width="9" height="9" rx="2.2" />
      <rect x="18" y="18" width="9" height="9" rx="2.2" />
      <path d="M22.5 12V8.6M22.5 9.8c-1.7 0-2.7-.9-2.8-2.6 1.8 0 2.7.9 2.8 2.6ZM22.5 8.8c.1-1.5.9-2.3 2.4-2.4-.1 1.5-.9 2.3-2.4 2.4Z" />
    </>
  ),
  rice: (
    <>
      <path d="M10 28c3.2-6.3 5.1-13.4 5.4-21.2M18.3 28c.8-6.4.3-12.8-1.4-19.2" />
      <g fill="currentColor" fillOpacity=".16">
        <ellipse cx="12.1" cy="9" rx="2.1" ry="3.2" transform="rotate(-35 12.1 9)" />
        <ellipse cx="10.2" cy="14" rx="2.1" ry="3.2" transform="rotate(-45 10.2 14)" />
        <ellipse cx="9.5" cy="19.2" rx="2.1" ry="3.2" transform="rotate(-55 9.5 19.2)" />
        <ellipse cx="19.7" cy="10.2" rx="2.1" ry="3.2" transform="rotate(35 19.7 10.2)" />
        <ellipse cx="21.2" cy="15.4" rx="2.1" ry="3.2" transform="rotate(43 21.2 15.4)" />
        <ellipse cx="21.3" cy="20.8" rx="2.1" ry="3.2" transform="rotate(50 21.3 20.8)" />
      </g>
      <path d="M13.5 6.8c-2.6-.1-4.2-1.4-4.7-3.8 2.7 0 4.2 1.3 4.7 3.8Z" />
    </>
  ),
  vegetable: (
    <>
      <path d="M12 10.5 25.2 23c1.3 1.3.2 3.5-1.6 3.1l-17-3.5c-1.3-.3-1.8-1.9-.9-2.8L12 10.5Z" fill="currentColor" fillOpacity=".13" />
      <path d="m12 10.5 13.2 12.6c1.3 1.3.2 3.5-1.6 3.1l-17-3.5c-1.3-.3-1.8-1.9-.9-2.8l6.3-9.4ZM11.5 13.8l4.5 4.3M8.8 17.5l4.1 3.9" />
      <path d="M12.2 10.7C8.3 10.4 6 8.4 5.2 4.8c4-.1 6.4 1.9 7 5.9ZM12.2 10.6c.3-4 2.5-6.2 6.4-6.7-.2 4-2.3 6.3-6.4 6.7Z" />
    </>
  ),
  fruit: (
    <>
      <circle cx="15.5" cy="18" r="9.2" fill="currentColor" fillOpacity=".13" />
      <circle cx="15.5" cy="18" r="9.2" />
      <path d="M15.5 8.8c-.1-3 1.6-5 5-6M17.1 6.6c3.3.6 5.8-.5 7.3-3.2-3.4-.7-5.8.4-7.3 3.2ZM10.7 13.5c-1.4 1-2.1 2.5-2.1 4.3" />
    </>
  ),
  coffee: (
    <>
      <path d="M6 12h17v7.2A7.8 7.8 0 0 1 15.2 27H13.8A7.8 7.8 0 0 1 6 19.2V12Z" fill="currentColor" fillOpacity=".1" />
      <path d="M6 12h17v7.2A7.8 7.8 0 0 1 15.2 27H13.8A7.8 7.8 0 0 1 6 19.2V12ZM23 14h1.5a3.5 3.5 0 0 1 0 7H22M10.5 9c-1.5-2 .9-3.1-.2-5M15 9c-1.5-2 .9-3.1-.2-5M19.5 9c-1.5-2 .9-3.1-.2-5" />
      <ellipse cx="14.5" cy="18.8" rx="3.1" ry="2.2" transform="rotate(-28 14.5 18.8)" />
      <path d="m13.2 20.7 2.6-3.8" />
    </>
  ),
  tea: (
    <>
      <path d="M7 14h17v5.5a7.5 7.5 0 0 1-7.5 7.5h-2A7.5 7.5 0 0 1 7 19.5V14Z" fill="currentColor" fillOpacity=".1" />
      <path d="M7 14h17v5.5a7.5 7.5 0 0 1-7.5 7.5h-2A7.5 7.5 0 0 1 7 19.5V14ZM24 16h1.2a3.1 3.1 0 0 1 0 6.2h-2M16 14V7M16 10.5c-3.9-.1-6-2.1-6.2-6 4 .1 6 2.1 6.2 6ZM16 8.4c.2-3.4 2-5.2 5.5-5.4-.2 3.5-2 5.3-5.5 5.4Z" />
    </>
  ),
  spice: (
    <>
      <path d="M16.8 10.2c3.2 5.7 1.3 11.1-5.8 16.1-2.6 1.8-5.8 1-7.1-1.8 7.3-.2 9.5-4.7 10.1-10.3.2-2.1 1.1-3.3 2.8-4Z" fill="currentColor" fillOpacity=".14" />
      <path d="M20.3 6.3c-.3 2.1-1.5 3.6-3.6 4.4M16.8 10.2c3.2 5.7 1.3 11.1-5.8 16.1-2.6 1.8-5.8 1-7.1-1.8 7.3-.2 9.5-4.7 10.1-10.3.2-2.1 1.1-3.3 2.8-4ZM20.1 6.2c2.8-.1 4.8 1 5.9 3.3-2.9.2-4.9-.9-5.9-3.3Z" />
    </>
  ),
  grain: (
    <>
      <path d="M16 5.5c-5.2 0-7.2 4.6-7.2 10.2 0 7.5 3.2 11.3 7.2 11.3s7.2-3.8 7.2-11.3C23.2 10.1 21.2 5.5 16 5.5Z" fill="currentColor" fillOpacity=".12" />
      <path d="M16 5.5c-5.2 0-7.2 4.6-7.2 10.2 0 7.5 3.2 11.3 7.2 11.3s7.2-3.8 7.2-11.3C23.2 10.1 21.2 5.5 16 5.5ZM16 7v18M11.5 9.5h9M10 13.5h12M9.5 17.5h13M10.5 21.5h11M8.8 16.5C5.4 14.9 4 12 4.5 8c3.2 1.4 4.7 4.2 4.3 8.5ZM23.2 16.5c3.4-1.6 4.8-4.5 4.3-8.5-3.2 1.4-4.7 4.2-4.3 8.5Z" />
    </>
  ),
  other: (
    <>
      <path d="M6 13h20l-2.1 13H8.1L6 13Z" fill="currentColor" fillOpacity=".1" />
      <path d="M6 13h20l-2.1 13H8.1L6 13ZM4 13h24M10 13c.3-4 2.3-6 6-6s5.7 2 6 6M11.5 17v5M16 17v5M20.5 17v5M16 7V3.8M16 5.2c-2.2 0-3.5-1.2-3.7-3.2 2.3 0 3.5 1.1 3.7 3.2ZM16 4.2c.1-1.9 1.1-2.9 3-3-.1 1.9-1.1 2.9-3 3Z" />
    </>
  ),
};

export default function AgricultureIcon({ type = 'other', title, className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`agriculture-icon agriculture-icon--${type} ${className}`.trim()}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title>{title}</title>}
      {ICONS[type] || ICONS.other}
    </svg>
  );
}
