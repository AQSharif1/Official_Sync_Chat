import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePWA } from "@/hooks/usePWA";
import { useState } from "react";

export const PWAInstallPrompt = () => {
  const { isInstallable, installApp } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Install Group Harmony</h3>
          <p className="text-xs text-muted-foreground">
            Add to your home screen for quick access
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={installApp}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};