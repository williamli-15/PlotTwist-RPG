# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js-based 3D interactive RPG/merchant application featuring VRM avatars, Three.js 3D scenes, and AI-powered chat interactions. The project creates an immersive virtual environment where users can interact with NPCs, equip weapons, and explore a 3D world.

## Common Development Commands

```bash
# Development
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linting

# Asset Processing Pipeline (scripts/)
node fetch_nfts.js           # Fetch NFT metadata
node download_models.js      # Download 3D models
node convert_to_glb.js       # Convert models to GLB format
node take_screenshots.js     # Generate model screenshots
node get_summary.js          # Create AI summaries
node process_metadata.js     # Process and combine metadata
node upload_to_vercel.mjs    # Upload assets to Vercel blob storage
```

## Architecture Overview

### Core 3D Engine (`app/components/world.tsx`, `app/components/npc.tsx`)
- **Three.js Scene Management**: Camera controls, lighting, environment setup
- **VRM Avatar System**: Loading and animating VRM characters with Mixamo animations
- **Weapon System**: Dynamic weapon loading, attachment to avatar bones, type inference
- **Chat Integration**: Camera transitions and UI state management during conversations

### AI Chat System (`app/api/chat/route.js`, `app/components/chat_service.js`)
- **OpenRouter Integration**: Streaming chat responses with Google Gemini Flash
- **Action Tag Parser**: Parses `<<try_weapon>>` tags from AI responses to trigger weapon equipping
- **Context-Aware Responses**: Maintains conversation history and character context

### Asset Management Pipeline
- **NFT Metadata Processing**: Fetches NFT data, downloads 3D models, converts formats
- **Vercel Blob Storage**: Hosts processed assets with generated URLs
- **Weapon Inference System**: Automatically categorizes weapons (sword/pistol) from metadata

### UI Components (`components/ui/`)
- **Shadcn/ui Integration**: Button, Card, Input components with Tailwind styling
- **3D Model Viewer**: Custom ModelViewer component for asset previews
- **Responsive Design**: Mobile detection with conditional feature loading

## Key Technical Patterns

### VRM Avatar Loading
- Use `VRMLoaderPlugin` with `GLTFLoader`
- Apply `VRMUtils.rotateVRM0()` for proper orientation
- Initialize animation mixer and load Mixamo FBX animations

### Weapon Attachment System
- Search avatar bone hierarchy for `J_Bip_R_Hand`
- Apply weapon-specific position/rotation configs based on inferred type
- Remove lights from loaded weapon models to prevent scene interference

### AI Action Integration
- Parse chat responses for action tags using regex patterns
- Extract structured parameters from tag content
- Execute corresponding functions (weapon equipping, animation triggers)

## Environment Configuration

Required environment variables:
- `OPENROUTER_API_KEY`: For AI chat functionality
- `VERCEL_URL`: For proper CORS handling in API routes

## Development Notes

- The project uses TypeScript with `@ts-nocheck` pragmas in some 3D components
- Mobile devices skip weapon loading for performance
- Animation system supports crossfading between different weapon idle states
- Three.js path aliases configured in tsconfig.json for examples/jsm imports