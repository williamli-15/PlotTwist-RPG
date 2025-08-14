# Assemble - 3D Virtual Event Platform

A revolutionary 3D virtual event platform that creates immersive digital twin experiences for attendees. Assemble transforms virtual events from passive viewing experiences into interactive networking environments where meaningful connections happen naturally through spatial proximity and AI-enhanced conversations.

## 🎯 Vision

**Solving Virtual Event Networking**: In real-life events, you might connect with 10-20 people. In virtual events, often not even 1. Assemble changes this by creating 3D spaces where attendees can:

- **Find & Connect**: Discover attendees you actually want to talk to through spatial interaction
- **Bridge Virtual to Real**: Seamlessly move conversations to LinkedIn/WhatsApp with full context
- **Learn Before Meeting**: Get AI-powered insights about other attendees before and after events
- **Context-Aware Networking**: AI assistants help attendees find and connect with relevant people

## 🌟 Features

### 🏢 Virtual Event Spaces
- **3D Event Venues**: Immersive environments built with Three.js
- **Digital Twin Attendees**: VRM avatars representing real event participants
- **Spatial Audio & Chat**: Natural conversations based on proximity
- **Event Organizer Dashboard**: Easy setup and management tools

### 🤝 Smart Networking
- **AI-Powered Introductions**: Context-aware suggestions for meaningful connections
- **Real-World Integration**: Export conversations to LinkedIn, WhatsApp, email
- **Attendee Discovery**: Learn about participants before, during, and after events
- **Conversation Context**: AI maintains context about everyone in the room

### 🌐 Web-First Accessibility
- **No Downloads Required**: Runs entirely in web browsers
- **Mobile Optimized**: Accessible on phones, tablets, and desktops
- **Low Bandwidth Mode**: Adaptive quality for all connection speeds
- **Universal Compatibility**: Works across all devices and platforms

### 👥 Attendee Experience
- **Pre-Event Networking**: Connect with attendees before the event starts
- **During Event Discovery**: Find and approach people naturally in 3D space
- **Post-Event Follow-up**: Maintain connections with full conversation history
- **Profile Integration**: Import LinkedIn/professional profiles for richer interactions

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

## 🎯 How It Works

### For Event Organizers
1. **Create Event Space**: Set up your 3D venue with custom branding and layout
2. **Import Attendees**: Upload attendee list with LinkedIn/professional profiles
3. **Configure AI Assistants**: Set networking goals and conversation prompts
4. **Launch Event**: Share web link - no app downloads required
5. **Monitor Engagement**: Real-time analytics on connections and conversations

### For Event Attendees
1. **Join via Web Link**: Access the event instantly in your browser
2. **Create Digital Twin**: Quick avatar setup representing your professional profile
3. **Explore & Network**: Move through 3D space to discover and approach other attendees
4. **AI-Enhanced Conversations**: Get context about people you're talking to
5. **Export Connections**: Save conversations and connect on LinkedIn/WhatsApp
6. **Post-Event Follow-up**: Continue relationships with full conversation history

## 🏗️ Project Structure

```
├── app/
│   ├── components/
│   │   ├── world.tsx             # Main 3D scene and event space
│   │   ├── npc.tsx               # Digital twin avatars and attendees
│   │   ├── chat_service.js       # AI networking and conversation system
│   │   └── event_management/     # Event organizer dashboard
├── lib/
│   ├── eventConfig.ts            # Event space configurations
│   ├── attendeeManager.ts        # Attendee data and profile management
│   └── networkingAI.ts           # AI-powered networking suggestions
├── public/
│   ├── venues/                   # 3D event venue models
│   ├── avatars/                  # VRM attendee avatars
│   └── assets/                   # Event branding and media
```

## 🤖 AI-Powered Networking

Assemble uses advanced AI to enhance networking experiences:

### Context-Aware Conversations
- **Profile Analysis**: AI understands attendee backgrounds and interests
- **Introduction Suggestions**: Smart recommendations for meaningful connections
- **Conversation Starters**: AI generates relevant talking points based on shared interests
- **Real-time Insights**: Get context about people you're talking to during conversations

### Networking Intelligence
- **Attendee Matching**: Algorithm suggests high-value connections
- **Group Formation**: AI identifies and facilitates relevant group discussions
- **Follow-up Optimization**: Smart suggestions for post-event relationship building
- **Event Analytics**: Organizers get insights on networking patterns and engagement

## 🎨 3D Event Assets

### Venue Environments
- **Conference Centers**: Professional meeting spaces with branding capabilities
- **Expo Halls**: Large spaces for trade shows and exhibitions
- **Networking Lounges**: Casual spaces designed for conversations
- **Custom Venues**: Branded environments tailored to specific events

### Digital Twin Avatars
- **Professional Avatars**: Business-appropriate VRM models
- **Customization Options**: Attendees can personalize their digital representation
- **Accessibility Features**: Multiple avatar options for inclusive representation
- **Animation Library**: Professional gestures and expressions for natural interaction

## 🔧 Development

### Key Components
- `world.tsx`: Manages 3D event venues and spatial interactions
- `npc.tsx`: Handles attendee avatars, movement, and proximity-based features
- `chat_service.js`: Powers AI networking and conversation management
- `eventConfig.ts`: Defines event settings, venues, and networking parameters

### Creating New Event Types
1. Add event configuration to `eventConfig.ts`
2. Configure AI networking prompts for the event context
3. Set up venue-specific 3D assets and layouts
4. Define attendee interaction patterns and networking goals

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

## 🚀 Use Cases

### Corporate Events
- **Company All-Hands**: Connect remote teams in immersive 3D spaces
- **Product Launches**: Interactive showcases with attendee networking
- **Board Meetings**: Professional environments with spatial audio

### Conferences & Trade Shows
- **Industry Conferences**: Multi-track events with networking between sessions
- **Virtual Exhibitions**: 3D booths with natural attendee flow and interactions
- **Academic Conferences**: Poster sessions and paper discussions in virtual spaces

### Networking Events
- **Professional Meetups**: Industry-specific networking with AI-powered introductions
- **Startup Pitch Events**: Connect investors, entrepreneurs, and advisors
- **Alumni Gatherings**: Reconnect with classmates in nostalgic virtual environments

### Educational Events
- **Virtual Classrooms**: Interactive learning environments with peer collaboration
- **Workshop Series**: Hands-on training with breakout group functionality
- **Graduation Ceremonies**: Celebrate achievements with family and friends virtually

## 🌍 Global Impact

Assemble democratizes access to high-quality networking opportunities:
- **Geographic Barriers Removed**: Connect with anyone, anywhere
- **Inclusive by Design**: Accessible to attendees with mobility limitations
- **Cost-Effective**: Eliminate travel expenses while maintaining human connection
- **Environmental Benefit**: Reduce carbon footprint of business travel
- **Time Efficient**: Maximize networking ROI with AI-enhanced matching

---

**Transforming virtual events from passive to interactive - Built with ❤️ for meaningful human connection**