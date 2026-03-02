import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Globe, 
  Facebook, 
  Twitter, 
  Instagram, 
  Send, 
  Plus, 
  Trash2, 
  ExternalLink,
  Share2
} from "lucide-react";
import { SiTiktok, SiYoutube, SiLinkedin, SiWhatsapp, SiDiscord } from "react-icons/si";

export interface SocialLink {
  platform: string;
  url: string;
}

export const SOCIAL_PLATFORMS = [
  { id: "website", label: "Website", icon: Globe, color: "text-blue-600 dark:text-blue-400" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-[#1877F2]" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, color: "text-foreground" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-[#E4405F]" },
  { id: "telegram", label: "Telegram", icon: Send, color: "text-[#0088CC]" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, color: "text-foreground" },
  { id: "youtube", label: "YouTube", icon: SiYoutube, color: "text-[#FF0000]" },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin, color: "text-[#0A66C2]" },
  { id: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, color: "text-[#25D366]" },
  { id: "discord", label: "Discord", icon: SiDiscord, color: "text-[#5865F2]" },
  { id: "other", label: "Other", icon: Globe, color: "text-muted-foreground" },
] as const;

function getPlatformInfo(platformId: string) {
  return SOCIAL_PLATFORMS.find(p => p.id === platformId) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
}

export function SocialLinksEditor({ 
  links, 
  onChange 
}: { 
  links: SocialLink[]; 
  onChange: (links: SocialLink[]) => void;
}) {
  const addLink = () => {
    onChange([...links, { platform: "website", url: "" }]);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {links.map((link, index) => (
        <div key={index} className="flex items-start gap-2" data-testid={`social-link-row-${index}`}>
          <Select 
            value={link.platform} 
            onValueChange={(v) => updateLink(index, "platform", v)}
          >
            <SelectTrigger className="w-[140px] h-9" data-testid={`select-social-platform-${index}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOCIAL_PLATFORMS.map(p => {
                const Icon = p.icon;
                return (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                      {p.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Input
            value={link.url}
            onChange={(e) => updateLink(index, "url", e.target.value)}
            placeholder="https://..."
            className="flex-1 h-9"
            data-testid={`input-social-url-${index}`}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={() => removeLink(index)}
            data-testid={`button-remove-social-${index}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={addLink} 
        className="w-full"
        data-testid="button-add-social-link"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Social Link
      </Button>
    </div>
  );
}

export function SocialLinksDisplay({ 
  links, 
  variant = "default",
  showLabel = true
}: { 
  links: SocialLink[]; 
  variant?: "default" | "compact" | "buttons";
  showLabel?: boolean;
}) {
  const validLinks = (links || []).filter(l => l.url && l.url.trim());
  if (validLinks.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 flex-wrap" data-testid="social-links-compact">
        {validLinks.map((link, i) => {
          const info = getPlatformInfo(link.platform);
          const Icon = info.icon;
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={info.label}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted/50 hover:bg-muted transition-colors ${info.color}`}
              data-testid={`social-link-${link.platform}-${i}`}
            >
              <Icon className="w-4 h-4" />
            </a>
          );
        })}
      </div>
    );
  }

  if (variant === "buttons") {
    return (
      <div className="flex items-center gap-2 flex-wrap" data-testid="social-links-buttons">
        {validLinks.map((link, i) => {
          const info = getPlatformInfo(link.platform);
          const Icon = info.icon;
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`social-link-${link.platform}-${i}`}
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Icon className={`w-4 h-4 ${info.color}`} />
                {info.label}
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Button>
            </a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="social-links-display">
      {showLabel && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Share2 className="w-4 h-4 text-primary" />
          Follow Us
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {validLinks.map((link, i) => {
          const info = getPlatformInfo(link.platform);
          const Icon = info.icon;
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-muted/60 hover:bg-muted border border-border/50 transition-colors ${info.color}`}
              data-testid={`social-link-${link.platform}-${i}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {info.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
