# DORYA! - Electric Wind God Fist Training

An online training game to practice the Electric Wind God Fist (EWGF) from Tekken. Master the legendary Mishima technique with precise frame-perfect inputs!

![DORYA!](https://i.imgur.com/placeholder.png)

## 🎮 Features

- **3D Fighting Arena** - Built with Three.js, featuring stylized characters in a Tekken-inspired stage
- **Authentic EWGF Mechanics** - Practice the exact input sequence: f, n, d, df+2
- **Perfect Electric Detection** - Frame-precise timing detection for PEWGF (1-frame window!)
- **Electric Visual Effects** - Juicy feedback with lightning effects around the fist
- **Multiple Game Modes**:
  - **DORYA STREAK** - Get the highest consecutive successful electrics
  - **PEWGF RUSH** - Score as many Perfect Electrics as possible in 60 seconds
  - **SURVIVAL** - One miss ends it all - keep the streak alive!
  - **FREESTYLE** - Practice without pressure
- **Command History** - See your input timing in real-time
- **Online Leaderboard** - Compete with players worldwide
- **Character Hitboxes** - Opponent launches into the air on hit!

## 🕹️ Controls

### Movement (WASD)
- **D** - Forward
- **S** - Down
- **S+D** - Down-Forward

### Attack
- **K** - Right Punch (2 in Tekken notation)

### EWGF Input
```
D → (release) → S → S+D+K
```
Forward → Neutral → Down → Down-Forward + Right Punch

For a **Perfect Electric (PEWGF)**, the df+2 must be input within 1 frame of the down input!

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dorya-game.git
cd dorya-game
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates SQLite db)
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **3D Graphics**: Three.js with React Three Fiber
- **Animations**: Framer Motion
- **Styling**: Tailwind CSS
- **Database**: Prisma with PostgreSQL
- **Post-Processing**: @react-three/postprocessing (Bloom, Chromatic Aberration)

## 📁 Project Structure

```
dorya/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── app/
│   │   ├── api/           # API routes for leaderboard
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── MainMenu.tsx   # Main menu screen
│   │   ├── Game.tsx       # Game container
│   │   ├── GameScene.tsx  # Three.js 3D scene
│   │   ├── GameHUD.tsx    # Heads-up display
│   │   ├── CommandHistory.tsx
│   │   ├── HowToPlay.tsx
│   │   ├── Ladder.tsx     # Leaderboard
│   │   └── ResultScreen.tsx
│   ├── hooks/
│   │   ├── useGameInput.ts  # Input detection & EWGF logic
│   │   └── useGameState.ts  # Game state management
│   ├── lib/
│   │   └── prisma.ts      # Prisma client
│   └── types/
│       └── game.ts        # TypeScript types
├── package.json
└── README.md
```

## 🎯 EWGF Timing Guide

| Result | Frame Gap (d to df+2) | Description |
|--------|----------------------|-------------|
| **PERFECT** | 0-1 frames | ⚡ Just Frame! Maximum damage & advantage |
| **GOOD** | 2-3 frames | Standard EWGF - still excellent |
| **OK** | 4-6 frames | Regular EWGF - works but slower |
| **MISS** | 7+ frames | Too slow or wrong input |

At 60fps, 1 frame = ~16.67ms. A PEWGF requires superhuman precision!

## 🏆 Game Modes

### DORYA STREAK
Build the longest streak of successful Electrics. One miss resets your combo!

### PEWGF RUSH  
60 seconds on the clock. Only Perfect Electrics count. How many can you land?

### SURVIVAL
The ultimate test. Keep landing Doryas - one miss and it's game over!

### FREESTYLE
No pressure, no timer, no judgment. Just practice until it becomes muscle memory.

## 🌐 Database Configuration

The game uses PostgreSQL. Make sure you have PostgreSQL running and update your `.env` file:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dorya?schema=public"
```

Then run the migrations:
```bash
npx prisma db push
```

## 🎨 Customization

### Adding New Characters
Characters are defined in `GameScene.tsx`. Extend the `Character` component with new models, animations, and effects.

### Adding New Game Modes
1. Add the mode to `prisma/schema.prisma` GameMode enum
2. Add mode logic in `useGameState.ts`
3. Add UI in relevant components

## 📜 License

MIT License - feel free to use this for your own projects!

## 🙏 Credits

- Inspired by **TEKKEN** by Bandai Namco
- Electric Wind God Fist is a signature move of the Mishima family
- "DORYA!" is the iconic battle cry

---

**DORYA!** ⚡

