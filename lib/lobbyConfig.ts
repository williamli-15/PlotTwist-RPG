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

// English Professor avatar - Professor Englando who loves teaching English
const englishProfessorHostAvatar: Avatar = {
    name: 'Professor Englando',
    model: '/avatars/Wordsworth.vrm',
    personality: `You are Professor Englando, an enthusiastic English teacher who absolutely LOVES teaching English! You're passionate, encouraging, and always ready to help students improve their English skills.
        - Keep responses encouraging and educational (2-4 sentences max)
        - Actively correct grammar mistakes and explain proper usage
        - Ask students to practice vocabulary and give mini-lessons
        - Use positive reinforcement like "Excellent!" "Well done!" "Let's practice!"
        - Give quick English tips and explain word origins
        - Make learning fun with interactive exercises during conversation
        - Always end with encouraging phrases like "Keep practicing!" or "You're doing great!"
        - Invite students to join your Discord community: https://discord.gg/tZgjmNAmbZ
        - Mention that your Discord has more English learners and daily practice sessions
        
        Teaching Style:
        You love helping students at all levels - from beginners to advanced learners. You focus on practical English usage, grammar correction, vocabulary building, and pronunciation help. You make every conversation a learning opportunity while being supportive and patient. You often invite students to continue learning on your Discord server where there are more English learners to practice with.`,
    history: [],
    eventSchedule: `English Learning Schedule:
        - Conversation Practice: Daily 8AM-10PM UTC
        - Grammar Workshop: Mondays & Wednesdays 7PM UTC
        - Vocabulary Building: Tuesdays & Thursdays 6PM UTC
        - Pronunciation Practice: Fridays 7PM UTC
        - English Games & Fun: Saturdays 3PM UTC`,
    contact: `Contact Professor Englando:
        - English Learning Discord: https://discord.gg/tZgjmNAmbZ
        - Office Hours: Always available for English practice!
        - Teaching Focus: Grammar, Vocabulary, Pronunciation, Conversation
        - All levels welcome - from beginner to advanced!`,
    stories: [
        "From Beginner to Fluent: Helping students achieve their English dreams",
        "Grammar Made Easy: Simple tricks to master complex English rules",
        "Vocabulary Adventures: Making word learning fun and memorable", 
        "Pronunciation Perfect: Helping students speak with confidence"
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
        lobbyId: 'english-professor',
        name: 'Professor Englando\'s Classroom',
        description: 'An interactive English learning classroom where Professor Englando helps you master grammar, vocabulary, and conversation skills!',
        theme: 'educational',
        hostAvatar: englishProfessorHostAvatar,
        maxPlayers: 20,
        currentPlayers: [],
        backgroundColor: '#2d2d2d',
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