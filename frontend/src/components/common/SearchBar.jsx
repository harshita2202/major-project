import { Search, X } from 'lucide-react';

/**
 * SearchBar component with clear icon
 */
export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Search...',
  width = '100%',
  maxWidth = '360px'
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: width,
        maxWidth: maxWidth
      }}
    >
      <Search
        size={16}
        style={{
          position: 'absolute',
          left: '12px',
          color: '#94a3b8',
          pointerEvents: 'none'
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '8px 34px 8px 36px',
          fontSize: '13.5px',
          fontFamily: 'inherit',
          color: '#0f172a',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          outline: 'none',
          transition: 'all 0.15s ease'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--pt-blue-600)';
          e.target.style.boxShadow = '0 0 0 3px rgba(30, 136, 229, 0.18)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'var(--border-subtle)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '10px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 0
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
