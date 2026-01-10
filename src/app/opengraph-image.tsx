import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'DORYA! - Electric Wind God Fist Training'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #000000 70%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Electric grid pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(250, 204, 21, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(250, 204, 21, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
        
        {/* Lightning bolt decoration - left */}
        <svg
          width="120"
          height="300"
          viewBox="0 0 120 300"
          style={{
            position: 'absolute',
            left: 80,
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: 0.3,
          }}
        >
          <path
            d="M80 0 L20 130 L60 130 L30 300 L100 150 L60 150 Z"
            fill="url(#grad1)"
          />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Lightning bolt decoration - right */}
        <svg
          width="120"
          height="300"
          viewBox="0 0 120 300"
          style={{
            position: 'absolute',
            right: 80,
            top: '50%',
            transform: 'translateY(-50%) scaleX(-1)',
            opacity: 0.3,
          }}
        >
          <path
            d="M80 0 L20 130 L60 130 L30 300 L100 150 L60 150 Z"
            fill="url(#grad2)"
          />
          <defs>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#F97316" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            zIndex: 10,
          }}
        >
          {/* Main title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 20,
            }}
          >
            <span
              style={{
                fontSize: 140,
                fontWeight: 900,
                background: 'linear-gradient(135deg, #FACC15 0%, #F97316 50%, #EF4444 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-4px',
                textShadow: '0 0 60px rgba(250, 204, 21, 0.5)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              DORYA!
            </span>
          </div>
          
          {/* Subtitle */}
          <div
            style={{
              fontSize: 36,
              color: '#ffffff',
              fontWeight: 600,
              letterSpacing: '8px',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Electric Wind God Fist
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: 24,
              color: '#9CA3AF',
              marginTop: 20,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            Master the Perfect Execution
          </div>
          
          {/* Input display */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 30,
              alignItems: 'center',
            }}
          >
            {['→', '↓', '↘', '+', '2'].map((input, i) => (
              <div
                key={i}
                style={{
                  width: input === '+' ? 30 : 60,
                  height: 60,
                  borderRadius: 12,
                  backgroundColor: input === '+' ? 'transparent' : 'rgba(250, 204, 21, 0.1)',
                  border: input === '+' ? 'none' : '2px solid rgba(250, 204, 21, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: input === '+' ? 32 : 28,
                  fontWeight: 700,
                  color: '#FACC15',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {input}
              </div>
            ))}
          </div>
        </div>
        
        {/* Bottom URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 22,
              color: '#6B7280',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            dorya.gg
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}

