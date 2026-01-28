import { Globe, Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { SUPPORTED_LANGUAGES } from '@/hooks/useUserPreferences';
import { cn } from '@/lib/utils';

interface LanguageSettingsProps {
  language: string;
  onUpdate: (language: string) => void;
}

export function LanguageSettings({ language, onUpdate }: LanguageSettingsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Globe className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Language
        </h3>
      </div>
      
      <GlassCard className="p-2">
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onUpdate(lang.code)}
              className={cn(
                "flex items-center justify-between gap-2 p-3 rounded-xl transition-all text-left",
                "hover:bg-secondary/50",
                language === lang.code 
                  ? "bg-primary/20 border border-primary/50" 
                  : "border border-transparent"
              )}
            >
              <div>
                <p className="font-medium text-sm">{lang.nativeName}</p>
                <p className="text-xs text-muted-foreground">{lang.name}</p>
              </div>
              {language === lang.code && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
