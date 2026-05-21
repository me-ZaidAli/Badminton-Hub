import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CloudSun, 
  ChevronDown, 
  Check, 
  MapPin, 
  Activity, 
  CalendarDays, 
  Clock, 
  Dumbbell, 
  Users, 
  Tag, 
  Lightbulb, 
  Droplets,
  Trophy,
  ArrowRight,
  Sparkles,
  Flame,
  Award
} from "lucide-react";

const BannerSection = () => (
  <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5865F2] via-[#EB459E] to-[#7289DA] p-12 text-center shadow-[0_0_40px_rgba(88,101,242,0.3)] animate-fade-in group">
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="absolute bg-white/30 rounded-full particle"
          style={{
            width: `${Math.random() * 15 + 5}px`,
            height: `${Math.random() * 15 + 5}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${Math.random() * 4 + 4}s`
          }}
        />
      ))}
    </div>
    <div className="relative z-10 space-y-6">
      <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md">
        Welcome to your Club Master Dashboard
      </h1>
      <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto font-medium">
        Your daily racket-sports home screen. Check your schedule, track your training, and stay updated.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 pt-6">
        <Button className="bg-white text-[#5865F2] hover:bg-[#f0f0f0] hover:scale-[1.03] transition-all duration-300 rounded-full px-8 py-6 text-lg font-bold shadow-xl">
          Subscribe
        </Button>
        <Button className="bg-black/20 text-white hover:bg-black/30 hover:scale-[1.03] transition-all duration-300 rounded-full px-8 py-6 text-lg font-bold border border-white/20 backdrop-blur-md">
          <Sparkles className="w-5 h-5 mr-2 text-[#EB459E]" /> Gift Premium
        </Button>
      </div>
    </div>
  </section>
);

const NewsSection = () => (
  <section className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
    <h2 className="text-sm font-bold text-[#B9BBBE] tracking-wider uppercase pl-1">Badminton News & Updates</h2>
    <div className="gradient-border-wrapper group">
      <div className="glass-card rounded-[20px] p-6 flex flex-col md:flex-row gap-8 transition-transform duration-300 group-hover:-translate-y-1 relative z-10 bg-[#2B2D31]">
        <div className="flex-1 space-y-4 relative">
          <Badge className="bg-[#EB459E] hover:bg-[#EB459E]/90 text-white border-none absolute -top-2 -left-2 shadow-lg">Featured</Badge>
          <div className="h-48 rounded-xl bg-gradient-to-br from-[#5865F2]/20 to-[#9932CC]/20 flex items-end p-6 border border-white/5">
            <h3 className="text-2xl font-bold text-white drop-shadow-md">All England Open 2026: Finals Preview & Predictions</h3>
          </div>
          <div className="flex items-center gap-2 justify-center pt-2">
            <div className="w-2 h-2 rounded-full bg-[#5865F2]"></div>
            <div className="w-2 h-2 rounded-full bg-white/20"></div>
            <div className="w-2 h-2 rounded-full bg-white/20"></div>
          </div>
        </div>
        <div className="flex-1 space-y-4 flex flex-col justify-between">
          {[
            { title: "Club Master Summer Tournament Registrations Open", date: "2 hrs ago", icon: Trophy, color: "text-[#EB459E]" },
            { title: "New Squash Courts Setup Completed in West Wing", date: "5 hrs ago", icon: Flame, color: "text-[#5865F2]" },
            { title: "Local League: Our Team Secures Division 1 Promotion!", date: "1 day ago", icon: Award, color: "text-[#7289DA]" }
          ].map((news, i) => (
            <div key={i} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group/item">
              <div className={`p-2 rounded-lg bg-black/20 ${news.color} group-hover/item:scale-110 transition-transform`}>
                <news.icon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white/90 group-hover/item:text-white transition-colors">{news.title}</h4>
                <p className="text-sm text-[#B9BBBE] mt-1">{news.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const CustomizeSection = () => (
  <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
    <div className="gradient-border-wrapper group h-full">
      <div className="glass-card rounded-[20px] p-6 h-full flex flex-col items-center justify-center bg-[#2B2D31] transition-transform duration-300 group-hover:-translate-y-1">
        <div className="w-full max-w-[200px] aspect-square rounded-xl bg-[#202225] border border-white/10 p-3 grid grid-cols-2 gap-2 shadow-inner">
          <div className="col-span-2 h-8 rounded-md bg-gradient-to-r from-[#5865F2] to-[#7289DA]"></div>
          <div className="h-12 rounded-md bg-[#313338] border border-white/5"></div>
          <div className="h-12 rounded-md bg-[#313338] border border-white/5"></div>
          <div className="col-span-2 flex justify-center gap-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-[#5865F2] shadow-[0_0_10px_#5865F2]"></div>
            <div className="w-6 h-6 rounded-full bg-[#EB459E]"></div>
            <div className="w-6 h-6 rounded-full bg-[#9932CC]"></div>
          </div>
        </div>
      </div>
    </div>
    <div className="flex flex-col justify-center space-y-4 p-4">
      <h2 className="text-3xl font-extrabold text-white">Customise Your Space</h2>
      <p className="text-[#B9BBBE] text-lg">Choose from multiple colour themes, layouts, and styles to make this dashboard yours.</p>
      <div className="pt-2">
        <Button className="pulse-glow bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-6 py-6 text-md font-bold transition-all">
          Go to Themes <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  </section>
);

const MembershipSection = () => (
  <section className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-sm font-bold text-[#B9BBBE] tracking-wider uppercase pl-1">Pick Your Membership Plan</h2>
      <div className="relative">
        <select className="appearance-none bg-[#313338] border border-white/10 text-white rounded-lg px-4 py-2 pr-10 outline-none focus:ring-2 focus:ring-[#5865F2]">
          <option>All Clubs</option>
          <option>Downtown Rackets</option>
          <option>Westside Smash</option>
          <option>Pro Arena</option>
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B9BBBE] pointer-events-none" />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-card bg-[#2B2D31] rounded-[20px] p-8 border border-white/5 flex flex-col hover:-translate-y-1 transition-transform duration-300">
        <h3 className="text-2xl font-bold text-white mb-2">Basic Membership</h3>
        <div className="text-4xl font-extrabold text-white mb-6">£0<span className="text-xl text-[#B9BBBE] font-medium">/mo</span></div>
        <ul className="space-y-4 mb-8 flex-1">
          {["Access to basic scheduling", "Join public community events", "Standard support", "Limited court booking"].map((feature, i) => (
            <li key={i} className="flex items-center text-[#B9BBBE]">
              <Check className="w-5 h-5 mr-3 text-[#5865F2]" /> {feature}
            </li>
          ))}
        </ul>
        <Button className="w-full bg-[#313338] hover:bg-[#3f4147] text-white border border-white/10 py-6 rounded-xl font-bold">Request to Join</Button>
      </div>

      <div className="gradient-border-wrapper group h-full">
        <div className="glass-card bg-[#2B2D31] rounded-[20px] p-8 relative flex flex-col h-full z-10 transition-transform duration-300 group-hover:-translate-y-1">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-[#EB459E] to-[#9932CC] text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-[18px] uppercase tracking-wider">
            Popular
          </div>
          <h3 className="text-2xl font-bold text-[#EB459E] mb-2 drop-shadow-[0_0_10px_rgba(235,69,158,0.3)]">Premium Membership</h3>
          <div className="text-4xl font-extrabold text-white mb-6">£9.99<span className="text-xl text-[#B9BBBE] font-medium">/mo</span></div>
          <ul className="space-y-4 mb-8 flex-1">
            {[
              "Unlimited court booking", 
              "Priority scheduling & alerts", 
              "Advanced player analytics", 
              "Exclusive premium tournaments",
              "20% discount at Pro Shop",
              "Discord Nitro styled themes",
              "24/7 Priority support"
            ].map((feature, i) => (
              <li key={i} className="flex items-center text-white/90">
                <Check className="w-5 h-5 mr-3 text-[#EB459E]" /> {feature}
              </li>
            ))}
          </ul>
          <Button className="w-full bg-gradient-to-r from-[#5865F2] to-[#9932CC] hover:opacity-90 text-white py-6 rounded-xl font-bold shadow-[0_0_20px_rgba(88,101,242,0.4)] hover:scale-[1.02] transition-transform">
            Request to Join
          </Button>
        </div>
      </div>
    </div>

    <div className="rounded-2xl bg-gradient-to-r from-[#313338] to-[#2B2D31] border border-[#5865F2]/30 p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(88,101,242,0.1)]">
      <div className="text-center md:text-left">
        <h3 className="text-2xl font-extrabold text-white uppercase tracking-tight">What are you waiting for?</h3>
        <p className="text-[#B9BBBE] mt-1">Join a membership today and unlock all features!</p>
      </div>
      <div className="flex gap-4">
        <Button className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-full px-6 font-bold shadow-lg">Sign Up</Button>
        <Button className="bg-transparent hover:bg-white/5 text-white border border-white/20 rounded-full px-6 font-bold">Learn More</Button>
      </div>
    </div>
  </section>
);

const WidgetGrid = () => {
  const WidgetWrapper = ({ title, children, delay }: { title: string, children: React.ReactNode, delay: string }) => (
    <div className="space-y-3 animate-fade-in" style={{ animationDelay: delay }}>
      <h3 className="text-xs font-bold text-[#B9BBBE] tracking-wider uppercase pl-1">{title}</h3>
      <div className="gradient-border-wrapper group h-[160px]">
        <div className="glass-card bg-[#2B2D31] rounded-2xl p-5 h-full relative z-10 transition-transform duration-300 group-hover:-translate-y-1 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
      <WidgetWrapper title="Your Location" delay="0.4s">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center text-[#B9BBBE] mb-2"><MapPin className="w-4 h-4 mr-1" /> London, UK</div>
            <div className="text-4xl font-light text-white">18°<span className="text-xl text-[#B9BBBE]">C</span></div>
            <div className="text-sm text-[#5865F2] mt-1 font-medium">Mostly Sunny</div>
          </div>
          <CloudSun className="w-16 h-16 text-[#EB459E] opacity-80" />
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="At A Glance" delay="0.45s">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[#B9BBBE] text-sm mb-1">Sessions</div>
            <div className="text-2xl font-bold text-white">12</div>
          </div>
          <div>
            <div className="text-[#B9BBBE] text-sm mb-1">Wins</div>
            <div className="text-2xl font-bold text-[#5865F2]">4</div>
          </div>
          <div className="col-span-2">
            <div className="text-[#B9BBBE] text-sm mb-1 flex justify-between">
              <span>Attendance</span>
              <span className="text-[#EB459E]">87%</span>
            </div>
            <div className="w-full bg-[#1E1F22] rounded-full h-2 mt-1 overflow-hidden">
              <div className="bg-gradient-to-r from-[#5865F2] to-[#EB459E] h-2 rounded-full" style={{ width: '87%' }}></div>
            </div>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="This Week" delay="0.5s">
        <div className="flex justify-between items-center h-full">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className={`flex flex-col items-center gap-2 ${i === 2 ? 'scale-110' : 'opacity-50'}`}>
              <div className="text-xs font-medium">{day}</div>
              <div className={`w-8 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                i === 2 
                  ? 'bg-gradient-to-b from-[#5865F2] to-[#9932CC] text-white shadow-[0_0_10px_rgba(88,101,242,0.5)]' 
                  : 'bg-[#1E1F22] text-[#B9BBBE]'
              }`}>
                {12 + i}
              </div>
            </div>
          ))}
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="Up Next" delay="0.55s">
        <div className="flex items-start gap-4">
          <div className="bg-[#1E1F22] rounded-xl p-3 text-center min-w-[60px] border border-white/5">
            <div className="text-xs text-[#EB459E] font-bold uppercase">Wed</div>
            <div className="text-xl font-bold text-white">14</div>
          </div>
          <div>
            <h4 className="font-bold text-white text-lg">Social Doubles</h4>
            <div className="flex items-center text-[#B9BBBE] text-sm mt-1">
              <Clock className="w-3 h-3 mr-1" /> 18:30 - 20:00
            </div>
            <div className="flex items-center text-[#B9BBBE] text-sm mt-1">
              <MapPin className="w-3 h-3 mr-1" /> Court 3 & 4
            </div>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="Training" delay="0.6s">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#7289DA]/20 rounded-lg text-[#7289DA]">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white">Today's Challenge</div>
            <div className="text-xs text-[#B9BBBE]">30 Pushups</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-[#1E1F22] rounded-full h-3 overflow-hidden">
            <div className="bg-[#7289DA] h-full rounded-full" style={{ width: '66%' }}></div>
          </div>
          <span className="text-sm font-bold text-white w-10 text-right">20<span className="text-[#B9BBBE] font-normal">/30</span></span>
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="Live Courts" delay="0.65s">
        <div className="space-y-3">
          {[
            { name: "Court 1", status: "In Use", color: "bg-[#EB459E]" },
            { name: "Court 2", status: "In Use", color: "bg-[#EB459E]" },
            { name: "Court 3", status: "Free", color: "bg-[#5865F2]" },
          ].map((court, i) => (
            <div key={i} className="flex justify-between items-center bg-[#1E1F22] px-4 py-2 rounded-lg border border-white/5">
              <span className="text-sm font-medium text-white">{court.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#B9BBBE]">{court.status}</span>
                <div className={`w-2 h-2 rounded-full ${court.color} shadow-[0_0_5px_${court.color}]`}></div>
              </div>
            </div>
          ))}
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="Today's Deal" delay="0.7s">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#9932CC] to-[#5865F2] flex items-center justify-center shadow-lg">
            <Tag className="w-8 h-8 text-white" />
          </div>
          <div>
            <Badge className="bg-[#EB459E]/20 text-[#EB459E] hover:bg-[#EB459E]/30 border-none mb-1">PRO SHOP</Badge>
            <div className="font-bold text-white text-lg">20% Off</div>
            <div className="text-sm text-[#B9BBBE]">Yonex Nanoflare Rackets</div>
          </div>
        </div>
      </WidgetWrapper>

      <WidgetWrapper title="Pro Tip" delay="0.75s">
        <div className="flex gap-3">
          <Lightbulb className="w-6 h-6 text-[#FEE75C] shrink-0" />
          <p className="text-sm text-white/90 italic leading-relaxed">
            "Keep your racket head up when waiting to receive a smash. It cuts reaction time in half."
          </p>
        </div>
        <div className="text-right mt-2 text-xs text-[#B9BBBE] font-medium">— Coach Sarah</div>
      </WidgetWrapper>

      <WidgetWrapper title="Hydration" delay="0.8s">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#00A8FC]" />
            <span className="font-bold text-white">Water Intake</span>
          </div>
          <span className="text-sm font-bold text-white">5<span className="text-[#B9BBBE] font-normal">/8 glasses</span></span>
        </div>
        <div className="flex gap-1 h-8">
          {[...Array(8)].map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 rounded-sm ${i < 5 ? 'bg-[#00A8FC] shadow-[0_0_8px_rgba(0,168,252,0.4)]' : 'bg-[#1E1F22]'}`}
            ></div>
          ))}
        </div>
      </WidgetWrapper>
    </section>
  );
}

export function Dashboard() {
  return (
    <div className="min-h-screen bg-[#202225] text-white selection:bg-[#5865F2] selection:text-white font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
          100% { transform: translateY(0) scale(1); opacity: 0.3; }
        }
        .particle {
          animation: float infinite ease-in-out;
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(88, 101, 242, 0); }
          100% { box-shadow: 0 0 0 0 rgba(88, 101, 242, 0); }
        }
        .pulse-glow {
          animation: pulse-glow 2s infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
        
        /* Glassmorphism utilities */
        .glass-card {
          background: rgba(43, 45, 49, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        
        /* Gradient Border Wrapper */
        .gradient-border-wrapper {
          position: relative;
          border-radius: 20px;
          z-index: 1;
        }
        .gradient-border-wrapper::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 21px;
          background: linear-gradient(135deg, rgba(88,101,242,0.5), rgba(235,69,158,0.5), rgba(114,137,218,0.5));
          z-index: -1;
          opacity: 0.3;
          transition: opacity 0.3s ease;
        }
        .gradient-border-wrapper:hover::before {
          opacity: 1;
          background: linear-gradient(135deg, #5865F2, #EB459E, #7289DA);
        }
      `}} />
      
      <div className="max-w-[1200px] mx-auto p-4 md:p-8 space-y-12">
        <BannerSection />
        <NewsSection />
        <CustomizeSection />
        <MembershipSection />
        <WidgetGrid />
      </div>
    </div>
  );
}
