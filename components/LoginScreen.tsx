import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './icons/GoogleIcon';
import { FestFlowLogoIcon } from './icons/FestFlowLogoIcon';
import { AGENT_DETAILS, AGENT_NAMES } from '../constants';
import { AgentName } from '../types';
import { RobotIcon } from './icons/RobotIcon';
import { GitHubIcon } from './icons/GitHubIcon';

// --- Icon Definitions ---
const IdeaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m4.93 19.07 1.41-1.41"></path><path d="m17.66 6.34 1.41-1.41"></path></svg>
);
const SplitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2v5"></path><path d="M12 17v5"></path><path d="m15 6-3-3-3 3"></path><path d="m9 18 3 3 3-3"></path><line x1="12" y1="12" x2="22" y2="12"></line><line x1="2" y1="12" x2="12" y2="12"></line></svg>
);
const StampIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);
const ChartBarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"></path><path d="M9 17V9"></path><path d="M15 17V5"></path><path d="M12 17V13"></path></svg>
);
const TrophyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.87 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.13 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
);

// --- Component Data ---
const featureSteps = [
    { icon: IdeaIcon, title: "Define Your Goal", description: "It starts with your vision. Describe your event goal in plain language." },
    { icon: SplitIcon, title: "AI Decomposes", description: "Our Master Planner instantly architects a comprehensive blueprint, assigning every task to the right specialist AI agent." },
    { icon: RobotIcon, title: "Agents Execute", description: "Your dedicated AI team works 24/7. They book venues, draft sponsor emails, create marketing content, and manage logistics in a seamless, automated flow." },
    { icon: StampIcon, title: "You Approve", description: "You're the conductor. Give final approval on key deliverables, edit AI-generated content, or provide new instructions to steer the project." },
    { icon: ChartBarIcon, title: "Monitor Progress", description: "Maintain complete oversight from a central dashboard. Track real-time progress, visualize timelines, and make strategic adjustments on the fly." },
    { icon: TrophyIcon, title: "Event Success", description: "From the first task to the final round of applause, FestFlow ensures every detail is perfectly aligned, delivering a successful, stress-free event." }
];

const featuredAgents = AGENT_NAMES.filter(name => name !== AgentName.MASTER_PLANNER);

// --- Sub-components for better organization ---

const AuthForm: React.FC = () => {
    const { signInWithGoogle, signInWithGitHub, signUpWithEmail, signInWithEmail } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleAuth = async (authFn: () => Promise<void>, method: string) => {
        setIsLoading(method);
        setAuthError(null);
        try {
            await authFn();
        } catch (error: any) {
            let friendlyMessage = "An unexpected error occurred. Please try again.";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    friendlyMessage = "An account already exists with this email. Please sign in instead.";
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     friendlyMessage = "Incorrect email or password. Please check your credentials and try again.";
                     break;
                case 'auth/account-exists-with-different-credential':
                    friendlyMessage = "An account already exists with this email. Please sign in using the method you originally used (e.g., Google or GitHub).";
                    break;
                 case 'auth/weak-password':
                    friendlyMessage = "Password is too weak. It should be at least 6 characters long.";
                    break;
            }
            setAuthError(friendlyMessage);
        } finally {
            setIsLoading(null);
        }
    };

    const handleEmailSignUp = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        handleAuth(() => signUpWithEmail(email, password), 'email_signup');
    };

    const handleEmailSignIn = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        handleAuth(() => signInWithEmail(email, password), 'email_signin');
    };

    const spinner = <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

    return (
        <div className="w-full max-w-md space-y-5 animate-fadeIn" style={{ animationDelay: '300ms' }}>
            <div className="grid grid-cols-1 gap-4">
                 <button onClick={() => handleAuth(signInWithGoogle, 'google')} disabled={!!isLoading} className="w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-light text-lg font-bold transform transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-highlight/20 hover:scale-105 active:scale-100 disabled:opacity-50">
                     {isLoading === 'google' ? spinner : <><GoogleIcon className="w-6 h-6" /> <span>Sign in with Google</span></>}
                 </button>
                 <button onClick={() => handleAuth(signInWithGitHub, 'github')} disabled={!!isLoading} className="w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-light text-lg font-bold transform transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-highlight/20 hover:scale-105 active:scale-100 disabled:opacity-50">
                     {isLoading === 'github' ? spinner : <><GitHubIcon className="w-6 h-6" /> <span>Sign in with GitHub</span></>}
                 </button>
            </div>
            <div className="flex items-center">
                <div className="flex-grow bg-accent h-px"></div>
                <span className="mx-4 text-text-secondary text-sm font-semibold">OR</span>
                <div className="flex-grow bg-accent h-px"></div>
            </div>
            <div className="space-y-4">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required className="w-full text-left p-4 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light text-base"/>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (6+ characters)" required className="w-full text-left p-4 bg-primary border-2 border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight transition-all text-light text-base"/>
                {authError && <p className="text-danger text-sm bg-danger/10 border border-danger/50 p-3 rounded-lg">{authError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={handleEmailSignIn} disabled={!!isLoading || !email || !password} className="w-full flex items-center justify-center bg-highlight/20 backdrop-blur-md border border-highlight/50 text-white font-bold py-4 px-5 rounded-lg text-base transform transition-all duration-300 hover:bg-highlight/40 hover:border-highlight/70 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-highlight/40 hover:scale-105 active:scale-100">
                        {isLoading === 'email_signin' ? spinner : 'Sign In'}
                    </button>
                     <button onClick={handleEmailSignUp} disabled={!!isLoading || !email || !password} className="w-full flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 text-text-secondary font-bold py-4 px-5 rounded-lg text-base transform transition-all duration-300 hover:bg-white/20 hover:text-white hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:scale-105 active:scale-100">
                        {isLoading === 'email_signup' ? spinner : 'Create Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const LandingHeader: React.FC = () => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <header className={`p-4 sticky top-0 z-40 flex items-center justify-start transition-all duration-300 ${isScrolled ? 'bg-secondary/50 backdrop-blur-lg border-b border-accent/50' : 'bg-transparent border-b border-transparent'}`}>
            <div className="flex items-center space-x-3">
                <FestFlowLogoIcon className="w-8 h-8 text-highlight" />
                <h1 className="text-2xl font-bold tracking-wider text-light">FestFlow</h1>
            </div>
        </header>
    );
};

const Hero: React.FC = () => (
    <section className="flex flex-col items-center justify-center pt-10 md:pt-16 pb-12 md:pb-24 animate-fadeIn max-w-4xl">
        <div className="mb-8 p-2 bg-highlight/10 rounded-full shadow-lg shadow-highlight/20">
            <FestFlowLogoIcon className="w-24 h-24 md:w-32 md:h-32 text-highlight" />
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-light mb-4 tracking-tight animate-fadeIn" style={{ animationDelay: '100ms' }}>
            Don't just plan an event. <span className="text-highlight">Orchestrate it.</span>
        </h2>
        <p className="text-lg md:text-xl text-text-secondary max-w-3xl mb-10 animate-fadeIn" style={{ animationDelay: '200ms' }}>
             FestFlow transforms your high-level goal into a perfectly executed event. Our specialized AI agents manage every detail, from logistics to marketing, so you can focus on the big picture.
        </p>
        <AuthForm />
        <p className="text-sm text-gray-500 mt-6 animate-fadeIn" style={{ animationDelay: '400ms' }}>No credit card required. Sign in to start planning.</p>
    </section>
);

const TeamShowcase: React.FC = () => (
    <section className="py-12 md:py-20 w-full max-w-6xl">
        <h3 className="text-3xl font-bold text-light mb-4">Meet Your AI Team</h3>
        <p className="text-lg text-text-secondary mb-12">More than just software. A dedicated crew of AI specialists, each an expert in their field.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredAgents.map((agentName, index) => {
                const agentDetail = AGENT_DETAILS[agentName];
                const AgentIcon = agentDetail.icon;
                return (
                    <div key={agentName} className="bg-secondary/70 backdrop-blur-sm p-6 rounded-xl border border-accent text-left animate-fadeIn transform transition-all duration-300 hover:border-highlight/80 hover:shadow-2xl hover:shadow-highlight/20 hover:scale-105" style={{ animationDelay: `${200 + 100 * index}ms` }}>
                        <div className="flex items-center space-x-3 mb-3">
                            <AgentIcon className={`w-8 h-8 ${agentDetail.color}`} />
                            <h4 className="text-xl font-bold text-light">{agentName}</h4>
                        </div>
                        <p className="text-text-secondary">{agentDetail.description}</p>
                    </div>
                )
            })}
        </div>
    </section>
);

const HowItWorks: React.FC = () => (
    <section className="py-12 md:py-20 w-full max-w-4xl mx-auto">
        <h3 className="text-3xl font-bold text-light mb-16">A Simple, Powerful Flow</h3>
        <div className="relative">
            <div className="absolute top-10 left-6 h-full w-0.5 bg-gradient-to-b from-highlight/50 via-highlight/20 to-transparent" aria-hidden="true"></div>
            {featureSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                    <div key={step.title} className="relative pl-16 pb-16 animate-fadeIn" style={{ animationDelay: `${200 + 100 * index}ms` }}>
                        <div className="absolute top-5 left-0 w-12 h-12 rounded-full bg-primary border-2 border-highlight flex items-center justify-center shadow-lg shadow-highlight/20">
                            <span className="text-xl font-bold text-highlight">{index + 1}</span>
                        </div>
                        <div className="bg-secondary/70 backdrop-blur-sm p-6 rounded-xl border border-accent transform transition-all duration-300 hover:border-highlight/80 hover:shadow-lg hover:shadow-highlight/10 text-left hover:scale-105">
                            <div className="mb-3 w-12 h-12 rounded-lg bg-primary/80 border border-accent flex items-center justify-center">
                                <Icon className="w-6 h-6 text-highlight" />
                            </div>
                            <h4 className="text-xl font-bold text-light mb-2">{step.title}</h4>
                            <p className="text-text-secondary">{step.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    </section>
);

const SimpleGoogleAuthButton: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const spinner = <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setAuthError(null);
        try {
            await signInWithGoogle();
        } catch (error: any) {
            let friendlyMessage = "An unexpected error occurred. Please try again.";
             if (error.code === 'auth/account-exists-with-different-credential') {
                friendlyMessage = "An account already exists with this email. Please sign in using the method you originally used (e.g., GitHub or Email).";
            }
            setAuthError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-4 animate-fadeIn">
            <button 
                onClick={handleGoogleSignIn} 
                disabled={isLoading} 
                className="w-full flex items-center justify-center space-x-4 py-4 px-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-light text-lg font-bold transform transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:scale-105 active:scale-100 disabled:opacity-50 shadow-lg"
            >
                {isLoading ? spinner : <><GoogleIcon className="w-6 h-6" /> <span>Start Planning Now</span></>}
            </button>
            {authError && <p className="text-danger text-sm bg-danger/10 border border-danger/50 p-3 rounded-lg mt-4">{authError}</p>}
        </div>
    );
};

const FinalCTA: React.FC = () => (
     <section className="py-12 md:py-20 w-full max-w-4xl text-center">
        <h3 className="text-4xl md:text-5xl font-bold text-light mb-6">Your Event's Success Story Starts Here.</h3>
        <p className="text-xl text-text-secondary mb-10">Experience the future of event management. It's powerful, intelligent, and free to start.</p>
        <SimpleGoogleAuthButton />
    </section>
);

const LandingFooter: React.FC = () => (
     <footer className="text-center p-6 mt-12">
        <p className="text-text-secondary [text-shadow:0_2px_4px_rgba(0,0,0,0.7)]">&copy; {new Date().getFullYear()} FestFlow. AI-Powered Event Orchestration.</p>
    </footer>
);

export const LoginScreen: React.FC = () => {
    const heroRef = useRef<HTMLElement>(null);

    return (
        <div className="min-h-screen bg-transparent text-light flex flex-col overflow-x-hidden">
            <div className="fixed inset-0 z-[-1]">
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-fixed" 
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
                ></div>
                <div className="absolute inset-0 bg-primary/80"></div>
            </div>
            
            <LandingHeader />

            <main ref={heroRef} className="flex-grow flex flex-col items-center p-4 md:p-8 text-center" style={{scrollMarginTop: '100px'}}>
                <Hero />
                <TeamShowcase />
                <HowItWorks />
                <FinalCTA />
            </main>
            
            <LandingFooter />
        </div>
    );
};
