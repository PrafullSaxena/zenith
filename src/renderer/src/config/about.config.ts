import {
  Github,
  Linkedin,
  Twitter,
  GitPullRequest,
  Database,
  Rocket,
  BookOpen,
  PenLine,
  Brain
} from 'lucide-react'

// System
export const APP_VERSION = '1.0.0'

// Author & Social
export const AUTHOR = {
  name: 'Prafull Saxena',
  role: 'Software Engineer · Full-Stack Developer',
  bio: 'Building tools that make developers more productive. Zenith was created to bring AI-powered code review, database inspection, and query optimization into a single, cohesive desktop experience.',
  initials: 'PS'
}

export const SOCIAL_LINKS = [
  {
    label: 'GitHub',
    url: 'https://github.com/prafullsaxena',
    icon: Github
  },
  {
    label: 'LinkedIn',
    url: 'https://linkedin.com/in/prafullsaxena',
    icon: Linkedin
  },
  {
    label: 'Twitter / X',
    url: 'https://x.com/prafullsaxena',
    icon: Twitter
  }
]

// Zenith Plugin Capabilities
export const CAPABILITIES = [
  {
    icon: GitPullRequest,
    title: 'CodeReviewBot',
    desc: 'Automated Bitbucket PR code review with AI-generated inline severity comments.'
  },
  {
    icon: Database,
    title: 'DbInspector',
    desc: 'Database exploration, ER diagrams, and AI-powered Query optimization (EXPLAIN ANALYZE).'
  },
  {
    icon: Rocket,
    title: 'Launchpad',
    desc: 'Cloud cost estimation with AI-powered architectural insight and recommendations.'
  },
  {
    icon: BookOpen,
    title: 'Nebula',
    desc: 'Notes and knowledge management equipped with automatic AI summarization.'
  },
  {
    icon: PenLine,
    title: 'TextCraft',
    desc: 'AI-driven text refinement with precise tone controls and formatting presets.'
  },
  {
    icon: Brain,
    title: 'Cortex',
    desc: 'Advanced codebase analysis generating interactive architectural flow visualizations.'
  }
]

// Tutorial / Getting Started
export const GETTING_STARTED = [
  {
    step: 1,
    title: 'Configure an AI Agent',
    desc: 'Go to Settings → AI Agents. Ensure at least one provider (Claude, Gemini, Ollama, etc.) shows "Connected" status.'
  },
  {
    step: 2,
    title: 'Add a Database Connection',
    desc: 'Open DbInspector, click "Add Connection", enter your PostgreSQL credentials, and test the connection.'
  },
  {
    step: 3,
    title: 'Explore Your Workspace',
    desc: 'Navigate to any plugin via the sidebar to start utilizing AI-augmented dev workflows.'
  },
  {
    step: 4,
    title: 'Ask AI About Your Data',
    desc: 'Switch to the "Ask AI" tab inside DbInspector and ask questions like "Write a query to find inactive users".'
  },
  {
    step: 5,
    title: 'Automate Code Reviews',
    desc: 'Connect your Bitbucket inside CodeReviewBot to automatically run AI analyzers against PRs.'
  },
  {
    step: 6,
    title: 'Analyze Code Architecture',
    desc: 'Use Cortex to generate robust, interactive application flow diagrams from raw code logic.'
  }
]
