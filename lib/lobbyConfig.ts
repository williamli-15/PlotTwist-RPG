import { Lobby, Avatar } from './types';

// Host avatar for Hack-Nation (Linn Bieske - Lead Host)
const hackNationHostAvatar: Avatar = {
    name: 'Linn Bieske',  // ADD THIS
    model: '/avatars/Linn.vrm',
    personality: `You are Linn Bieske, the lead host of Hack-Nation: Global AI Online-Hackathon. You're organizing an incredible event with 2000+ AI builders from 60+ countries, featuring speakers from MIT, OpenAI, and Google.
        - Keep responses enthusiastic and welcoming (2-3 sentences max)
        - You're passionate about connecting brilliant minds to solve real-world AI challenges
        - You help participants navigate the four competition tracks and find team members
        - You coordinate with co-host Kai Nestor Wiederhold and amazing speakers
        - You're excited about the $5k+ in API & Cash prizes sponsored by OpenAI
        - You facilitate connections between hackers, VCs, and hiring companies
        - Direct participants to visit hack-nation.ai for registration and event details
        - Invite people to join the Discord community: https://tinyurl.com/discordhacknation
        - Share links naturally: "Check out hack-nation.ai" and "Join our Discord at https://tinyurl.com/discordhacknation"
        
        Background:
        You're leading Hack-Nation, bringing together participants from Harvard, MIT, Stanford and across the globe for a 24-hour AI hackathon. The event features four tracks: Agentic AI & Data Engineering, Model Fine-Tuning, Rapid Prototyping, and Small Model Deployment. Previous winners include SynthShape (AI 3D modeling), ThermoTrace (thermal drone analysis), and AI Scam Shield.
        
        You can help participants explore competition tracks, connect with mentors, and learn about career opportunities in the talent network. You actively encourage people to visit the website and join the Discord community.`,
    history: [],
    eventSchedule: `Hack-Nation Schedule (August 9-10, 2025 - Boston Time):
        Day 1 - Saturday Aug 9:
        • 10:00-10:30 AM: Welcome & Opening Remarks
        • 10:30-11:30 AM: Keynote Speakers (Rama/MIT, Julian/OpenAI, Gregory/Google, Hubertus)
        • 11:30-12:00 PM: Challenge Introductions
        • 12:00 PM: Hacking Begins! (24-hour sprint)
        Day 2 - Sunday Aug 10:
        • 9:00 AM: Submission Deadline
        • 11:00-2:00 PM: Jury Reviews & Finalist Selection
        • 2:30-3:30 PM: Finalist Pitches (Live)
        • 4:00-4:30 PM: Awards Ceremony ($2500/$1500/$1000 prizes)`,
    contact: `Connect with Hack-Nation:
        - Website: https://hack-nation.ai/
        - Discord: https://tinyurl.com/discordhacknation
        - Host: Linn Bieske (Lead)
        - Co-Host: Kai Nestor Wiederhold
        - Global event: 2000+ builders, 60+ countries
        - In-person hubs: Boston, Bay Area, Oxford`,
    stories: [
        "Building a Global AI Community: Connecting 2000+ builders across 60+ countries",
        "From SynthShape to Success: How our first hackathon winners built AI-powered 3D modeling",
        "The Venture Track: Helping hackathon projects become funded startups",
        "Career Network Impact: Outstanding participants joining top tech companies"
    ]
};

// Co-host avatar (Kai Nestor Wiederhold)
const coHostAvatar: Avatar = {
    name: 'Kai Nestor Wiederhold',  // ADD THIS
    model: 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/VRoid_Sample_B-D0UeF1RrEd5ItEeCiUZ3o8DxtxvFIK.vrm',
    personality: `You are Kai Nestor Wiederhold, co-host of Hack-Nation. You work closely with Linn to create an amazing hackathon experience for all participants.
        - Keep responses supportive and technical (2-3 sentences max)
        - You focus on the technical aspects and competition track guidance
        - You help with project development and resource allocation
        - You coordinate mentoring sessions with our distinguished judges
        - You're detail-oriented about the 24-hour sprint logistics
        - You help participants understand the four tracks: Agentic AI, Model Fine-Tuning, Rapid Prototyping, Small Model Deployment
        
        You support participants throughout their journey from track selection to final presentation, working alongside Linn and our incredible speaker lineup from MIT, OpenAI, Google, and successful entrepreneurs.`,
    history: [],
    eventSchedule: `Co-Host Support Schedule:
        - Technical workshops for each competition track
        - Mentoring sessions with industry judges
        - Resource coordination (compute credits, tools, platforms)
        - Team formation support for solo participants
        - Project feedback throughout the 24-hour sprint`,
    contact: `Kai Nestor Wiederhold - Co-Host:
        - Available during all hackathon hours
        - Focus: Technical guidance and competition logistics
        - Working with Linn Bieske and distinguished judge panel
        - Specializes in helping teams navigate the four tracks`,
    stories: [
        "Behind the Scenes: Coordinating a global AI hackathon with participants from 60+ countries",
        "Technical Excellence: Ensuring 2000+ builders have access to the best AI tools and platforms",
        "Judge Coordination: Working with experts from Microsoft, OpenAI, Harvard, and ex-Waymo"
    ]
};

// AI Agent & Infra Hackathon host - Madison Ho from Lux Capital
const aiAgentHackathonHostAvatar: Avatar = {
    name: 'Madison Ho',
    model: '/avatars/Linn.vrm', // Using available avatar model
    personality: `You are Madison Ho from Lux Capital, co-hosting the AI Agent & Infra Hackathon. You're passionate about connecting builders with cutting-edge AI infrastructure and agent technologies.
        - Keep responses enthusiastic and informative (2-4 sentences max)
        - You're excited about the $100K+ in prizes and opportunities to connect with top VCs
        - Help participants understand the two main tracks: Best Agent Hack and Best Use of Modal
        - Connect hackers with sponsors: Lux Capital, Modal, Cognition, and AWS
        - Encourage participation in both tracks for maximum opportunities
        - Share details about compute credits: $500 Modal credits, Devin Core Plan access
        - Highlight the 36-hour format and NYC-based judging preference
        - Contact: madison.ho@luxcapital.com for questions
        
        Background:
        You're organizing this cutting-edge hackathon focused on AI agents and infrastructure. The event runs 36 hours from August 12-14, with virtual hacking and in-person NYC judging. You work closely with Emily Han and sponsors to create opportunities for college students, early professionals, and engineers to showcase their skills directly to innovative hiring teams.`,
    history: [],
    eventSchedule: `AI Agent & Infra Hackathon Schedule (EST):
        Aug 12 (Tuesday):
        • 6:00-8:00 PM: Opening, Sponsor Intros, & Networking (NYC)
        • 9:00 PM: Official challenge reveal + track selection
        • 10:00 PM: Hacking Starts (36 hours begins)
        
        Aug 14 (Thursday):
        • 10:00 AM: Hacking Ends
        • 1:00 PM: Finalists Announced Online
        • 6:00-8:00 PM: Finalists Judging & Awards (NYC)`,
    contact: `Connect with AI Agent & Infra Hackathon:
        - Host: Madison Ho (madison.ho@luxcapital.com)
        - Co-Host: Emily Han (emily@modal.com)
        - Sponsors: Lux Capital, Modal, Cognition, AWS
        - Location: NYC (with virtual participation)
        - Application-based registration (priority to NYC-based hackers)`,
    stories: [
        "Best Overall Hack: $25K AWS credits + Lux Capital partner meetings for top winners",
        "Best Use of Modal: Up to $25K Modal credits for serverless compute projects",
        "Best Agent Hack: $3K cash + Devin Team access for gigacontext agent builds",
        "Direct access to investors from Lux Capital and engineers from Modal, Cognition, AWS"
    ]
};

// Predefined lobby configurations
export const defaultLobbies: Lobby[] = [
    {
        lobbyId: 'hack-nation',
        name: 'Hack-Nation',
        description: 'Global AI Online-Hackathon (Aug 9-10, 2025) • 2000+ builders • 60+ countries • $5k+ prizes • MIT, OpenAI, Google speakers • Four AI tracks available',
        theme: 'ai-hackathon',
        hostAvatar: hackNationHostAvatar,
        maxPlayers: 2000,
        currentPlayers: [],
        backgroundColor: '#0a0a0a',
        environmentImage: 'neutral'
    },
    {
        lobbyId: 'ai-agent-hackathon',
        name: 'AI Agent & Infra Hackathon',
        description: 'Co-hosted by Lux Capital, Modal, Cognition & AWS • 36-hour hackathon • $100K+ prizes • Build cutting-edge AI agents & infra • NYC + Virtual',
        theme: 'ai-infrastructure',
        hostAvatar: aiAgentHackathonHostAvatar,
        maxPlayers: 200,
        currentPlayers: [],
        backgroundColor: '#1a1a2e',
        environmentImage: 'neutral'
    }
];

// Competition tracks for Hack-Nation
export const hackNationTracks = [
    {
        name: "Agentic AI & Data Engineering",
        description: "Build intelligent agents and robust data pipelines that can reason, plan, and execute complex tasks autonomously."
    },
    {
        name: "Model Fine-Tuning & Adaptation", 
        description: "Customize and optimize AI models for specific use cases, improving performance and efficiency."
    },
    {
        name: "Rapid Prototyping & App Building",
        description: "Create innovative AI-powered applications with rapid development techniques and modern frameworks."
    },
    {
        name: "Small Model Deployment",
        description: "Deploy efficient, lightweight AI models for edge computing and resource-constrained environments."
    }
];

// Competition tracks for AI Agent & Infra Hackathon
export const aiAgentHackathonTracks = [
    {
        name: "Best Agent Hack - Gigacontext Agents",
        description: "Build an agent that works with, analyzes, synthesizes, or manipulates massive contexts that can't fit in an LLM's context window. Explore domains like code, law, bio, etc.",
        prizes: "$3K + Devin Team + Windsurf Pro (1st), $1.5K + tools (2nd), $0.5K + tools (3rd)",
        credits: "Devin Core Plan + 4 months Windsurf Pro"
    },
    {
        name: "Best Use of Modal",
        description: "Any project built on Modal's serverless compute platform for AI inference, batch processing, sandboxed execution, and more. Scale from zero to thousands of CPUs/GPUs easily.",
        prizes: "$25K Modal credits (1st), $10K credits (2nd), $1K credits (3rd)",
        credits: "$500 Modal credits"
    },
    {
        name: "Best Overall Hack",
        description: "Top overall project across all categories, judged on innovation, technical execution, and real-world impact.",
        prizes: "$25K AWS credits + Lux partner meeting (1st), $10K + meeting (2nd), $5K + meeting (3rd)",
        credits: "All participants eligible"
    }
];

// Sponsors and judges for AI Agent Hackathon
export const aiAgentHackathonSponsors = [
    {
        name: "Lux Capital",
        role: "Lead Sponsor & Judging",
        description: "Top-tier VC firm investing in emerging technologies"
    },
    {
        name: "Modal Labs",
        role: "Infrastructure Partner",
        description: "Serverless compute platform for AI applications"
    },
    {
        name: "Cognition",
        role: "Agent Technology Sponsor", 
        description: "Creators of Devin and Windsurf development tools"
    },
    {
        name: "AWS",
        role: "Cloud Infrastructure Partner",
        description: "Providing compute credits and cloud services"
    }
];

// Speaker information for reference
export const hackNationSpeakers = [
    {
        name: "Rama Ramakrishnan",
        title: "MIT Professor for AI/ML",
        profile: "LinkedIn Profile"
    },
    {
        name: "Hubertus Bessau", 
        title: "Serial Entrepreneur & Co-Founder of MyMuesli",
        profile: "LinkedIn Profile"
    },
    {
        name: "Julian Lee",
        title: "Member of Technical Staff - Research at OpenAI", 
        profile: "LinkedIn Profile"
    },
    {
        name: "Gregory Dibb",
        title: "Researcher at Google",
        profile: "LinkedIn Profile"
    }
];

// Judge information for reference
export const hackNationJudges = [
    { name: "Regina Ceballos", title: "Microsoft" },
    { name: "Teddy Lee", title: "OpenAI" },
    { name: "Mike Boensel", title: "Founder" },
    { name: "Marton Sziraczki", title: "Ex-Waymo" },
    { name: "Konstantina Yaneva", title: "Harvard" },
    { name: "Nikolay Vyahhi", title: "Hyperskill" },
    { name: "Fridolin Haugg", title: "Harvard" },
    { name: "Gabriella Torres Vives", title: "AEthos" },
    { name: "Matt Casavant", title: "Verizon" },
    { name: "Artem Lukoianov", title: "MIT CSAIL" },
    { name: "Christina (Ziyu) Y.", title: "MIT" },
    { name: "Pranav Parekh", title: "Adobe" }
];

// Previous winners for inspiration
export const previousWinners = [
    {
        place: "🥇 First Place",
        name: "SynthShape",
        description: "AI-powered 3D modeling from text or images — making design accessible for everyone."
    },
    {
        place: "🥈 Second Place", 
        name: "ThermoTrace",
        description: "Smart anomaly detection for thermal drone footage to help with search & rescue operations."
    },
    {
        place: "🥉 Third Place",
        name: "AI Scam Shield", 
        description: "A smart tool that protects older adults from scams by detecting threats in real-time."
    }
];

// Helper function to get lobby by ID
export function getLobbyById(lobbyId: string): Lobby | undefined {
    return defaultLobbies.find(lobby => lobby.lobbyId === lobbyId);
}

// Helper function to get available lobbies
export function getAvailableLobbies(): Lobby[] {
    return [...defaultLobbies];
}