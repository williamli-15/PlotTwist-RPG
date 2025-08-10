# YNGO - You Never Go Offline

A 3D metaverse hub built with Next.js, Three.js, and React that connects multiple digital twin experiences. YNGO serves as a central hub for exploring various virtual worlds and communities.

## 🌟 Features

- **Interactive 3D Environment**: Built with Three.js for immersive 3D experiences
- **Multi-Lobby System**: Switch between different themed worlds (Hack-Nation, English Professor)
- **Dynamic NPCs**: AI-powered characters with unique personalities per lobby
- **VRM Avatar Support**: Load and animate VRM avatars using @pixiv/three-vrm
- **Real-time Chat**: Streaming AI conversations with OpenRouter integration
- **Portal Navigation**: Seamless transitions between different virtual environments

## 🎮 Available Worlds

### 🖥️ Hack-Nation
- AI hackathon and development community
- Features JordanTheJet as YNGO metaverse guide
- Links to hack-nation.ai and Discord community

### 📚 Professor Englando's Classroom
- Interactive English learning environment
- AI-powered English teacher with personalized lessons
- Grammar, vocabulary, and pronunciation practice

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **3D Graphics**: Three.js v0.170.0
- **Avatars**: @pixiv/three-vrm for VRM model support
- **Animation**: @tweenjs/tween.js for smooth transitions
- **State Management**: Zustand
- **AI Chat**: OpenRouter API integration
- **Styling**: Tailwind CSS with custom animations
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd PlotTwist-RPG
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Create .env.local file with:
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 Usage

1. **Enter YNGO Hub**: Start in the main metaverse hub
2. **Choose a World**: Select from available lobbies (Hack-Nation, English Professor)
3. **Interact with NPCs**: Chat with AI-powered characters
4. **Explore Weapons**: View and learn about 3D weapons
5. **Navigate Worlds**: Use quick links to visit external communities

## 🏗️ Project Structure

```
├── app/
│   ├── components/
│   │   ├── npc.tsx              # Main NPC component
│   │   ├── chat_service.js      # AI chat functionality
│   │   └── DynamicChatService.js # Multi-personality chat
├── lib/
│   └── lobbyConfig.ts           # World configurations
├── public/
│   ├── context/                 # Metadata and descriptions
│   └── models/                  # 3D models and VRM avatars
```

## 🤖 AI Integration

YNGO uses OpenRouter API for AI-powered conversations with different personality profiles:
- **JordanTheJet**: YNGO metaverse guide and introducer
- **Professor Englando**: English learning specialist
- **Custom Personalities**: Extensible system for new characters

## 🎨 3D Assets

- **Weapons**: Interactive 3D models with detailed metadata
- **Avatars**: VRM-compatible character models
- **Environments**: Custom 3D scenes for each lobby

## 🔧 Development

### Key Components
- `npc.tsx`: Handles NPC rendering, animation, and interactions
- `chat_service.js`: Manages AI conversations and streaming
- `lobbyConfig.ts`: Defines world settings and personalities

### Adding New Worlds
1. Add lobby configuration to `lobbyConfig.ts`
2. Create personality prompt in `DynamicChatService.js`
3. Add world-specific assets and metadata

## 📦 Dependencies

### Core Dependencies
- `three`: 3D graphics engine
- `@pixiv/three-vrm`: VRM avatar support
- `@tweenjs/tween.js`: Animation library
- `zustand`: State management
- `ethers`: Blockchain integration

### Development
- `@types/three`: Three.js TypeScript definitions
- `tailwindcss`: Styling framework
- `eslint`: Code linting

## 🚀 Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Make sure to set up environment variables in your Vercel dashboard.

## 📄 License

This project is part of the PlotTwist ecosystem.

---

**Built with ❤️ for the metaverse community**