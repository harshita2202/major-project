import { useState } from 'react';

/**
 * UserAvatar.jsx
 * Safely renders a student avatar.
 * Handles image URLs (with fallback on load error) as well as 2-letter initials.
 * Guarantees zero text overflow or overwriting.
 */
export default function UserAvatar({ avatar, name = 'Student', size = 36 }) {
  const [imgError, setImgError] = useState(false);

  const isUrl =
    !imgError &&
    typeof avatar === 'string' &&
    (avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('data:') ||
      avatar.startsWith('/'));

  const initials = (name || 'ST')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ST';

  return (
    <div
      className="avatar-circle"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        backgroundColor: 'var(--pt-blue-50)',
        color: 'var(--pt-navy-800)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size <= 32 ? '11px' : '12.5px',
        fontWeight: 700,
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        lineHeight: 1,
      }}
    >
      {isUrl ? (
        <img
          src={avatar}
          alt={name}
          onError={() => setImgError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            display: 'block',
          }}
        />
      ) : (
        <span>{avatar && typeof avatar === 'string' && avatar.length <= 3 && !avatar.includes('/') ? avatar.toUpperCase() : initials}</span>
      )}
    </div>
  );
}
