import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useRTL } from '@/shared/hooks/useRTL';
import { useLocaleStore } from '@/stores/localeStore';

function App() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { t } = useTranslation('common');
  const { t: tAuth } = useTranslation('auth');
  const dir = useRTL();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6 text-foreground">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          {t('sample.title')} · {t('appName')}
        </h1>
        <p className="text-balance text-sm text-muted-foreground">
          {t('sample.description')}
        </p>
        <p className="text-xs text-muted-foreground">
          {tAuth('login')} / {tAuth('register')} ·{' '}
          <span className="font-mono">
            dir={dir} · locale={locale}
          </span>
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={locale === 'en' ? 'default' : 'outline'}
            onClick={() => setLocale('en')}
          >
            English
          </Button>
          <Button
            type="button"
            size="sm"
            variant={locale === 'ar' ? 'default' : 'outline'}
            onClick={() => setLocale('ar')}
          >
            العربية
          </Button>
        </div>
        <div className="flex justify-center gap-2">
          <Badge>New</Badge>
          <Badge variant="secondary">secondary</Badge>
        </div>
      </div>

      <Card className="w-full max-w-md border-border shadow-md">
        <CardHeader>
          <CardTitle>UI kit</CardTitle>
          <CardDescription>
            Button, Input, Card, Badge, Dialog, DropdownMenu
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input placeholder="you@example.com" type="email" />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button">Primary</Button>
            <Button type="button" variant="outline">
              Outline
            </Button>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                render={<Button type="button" variant="secondary" />}
              >
                Open dialog
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dialog</DialogTitle>
                  <DialogDescription>
                    Rendered with @base-ui/react/dialog.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button type="button" onClick={() => setDialogOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="ghost" />}
              >
                Menu
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Tailwind check: bg-background, text-primary, border-border
        </CardFooter>
      </Card>
    </div>
  );
}

export default App;
