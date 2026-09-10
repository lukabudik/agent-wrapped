interface AvatarProps {
  login: string;
  url: string | null;
  size?: number;
}

/**
 * Plain img rather than next/image: these are GitHub's own CDN avatars, already
 * served at the size we ask for, and routing them through the Next optimizer
 * would mean shipping sharp into the Railway runtime image for no gain.
 */
export function Avatar({ login, url, size = 28 }: AvatarProps) {
  if (!url) {
    return (
      <span
        aria-hidden
        style={{ width: size, height: size }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-edge bg-panel font-mono text-[11px] text-faint"
      >
        {login.slice(0, 2)}
      </span>
    );
  }

  const src = url.includes("?") ? `${url}&s=${size * 2}` : `${url}?s=${size * 2}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- GitHub's CDN already sizes these; see the note above
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      className="shrink-0 rounded-full border border-edge bg-panel"
    />
  );
}
