import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { normalizeRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  selector?: string;
  route?: string;
};

const ONBOARDING_VERSION = 'v1';

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function getOnboardingSteps(role: string, isMobile: boolean): OnboardingStep[] {
  const navSelector = isMobile
    ? '[data-onboarding="bottom-nav"]'
    : '[data-onboarding="sidebar-nav"]';

  if (role === 'player') {
    return [
      {
        id: 'welcome',
        title: 'Welcome to SportBooker',
        description:
          'This quick tour shows where to discover matches, manage bookings, and update your account.',
        route: '/home',
      },
      {
        id: 'navigation',
        title: 'Main navigation',
        description:
          'Use this area to move between your main pages: Home, Bookings, Wallet, and Profile.',
        selector: navSelector,
      },
      {
        id: 'home',
        title: 'Home page',
        description:
          'Home is where you discover available matches and explore details before booking.',
        selector: '[data-onboarding="player-home"]',
        route: '/home',
      },
      {
        id: 'bookings',
        title: 'Bookings page',
        description:
          'Track confirmed bookings and waitlist positions from the Bookings page.',
        selector: '[data-onboarding="player-bookings"]',
        route: '/bookings',
      },
      {
        id: 'wallet',
        title: 'Wallet page',
        description:
          'Top up your balance and review payment activity from your Wallet.',
        selector: '[data-onboarding="player-wallet"]',
        route: '/wallet',
      },
      {
        id: 'profile',
        title: 'Profile and account',
        description:
          'Open this menu to access your profile settings or sign out securely.',
        selector: '[data-onboarding="profile-menu"]',
      },
    ];
  }

  if (role === 'platform_admin') {
    return [
      {
        id: 'welcome',
        title: 'Welcome to SportBooker Admin',
        description:
          'This quick tour highlights where to manage tenants and your platform account.',
        route: '/admin/tenants',
      },
      {
        id: 'brand',
        title: 'Platform context',
        description:
          'The top-left badge confirms you are in platform-level administration.',
        selector: '[data-onboarding="brand"]',
      },
      {
        id: 'navigation',
        title: 'Admin navigation',
        description:
          'Use this sidebar to switch between tenant management and your account.',
        selector: navSelector,
      },
      {
        id: 'tenants',
        title: 'Tenants page',
        description:
          'Open the Tenants page to create, review, and update tenant organizations.',
        selector: '[data-onboarding="admin-tenants"]',
        route: '/admin/tenants',
      },
      {
        id: 'content',
        title: 'Workspace area',
        description:
          'This main section displays lists, forms, and details for the selected admin page.',
        selector: '[data-onboarding="content"]',
      },
      {
        id: 'profile',
        title: 'Profile menu',
        description:
          'Use this menu for account actions like opening profile settings or logging out.',
        selector: '[data-onboarding="profile-menu"]',
      },
    ];
  }

  return [
    {
      id: 'welcome',
      title: 'Welcome to SportBooker Operator',
      description:
        'This quick tour introduces the areas used to manage matches, venues, and players.',
      route: '/operator/dashboard',
    },
    {
      id: 'brand',
      title: 'Tenant context',
      description:
        'This branding section keeps you aware of the active tenant space you are managing.',
      selector: '[data-onboarding="brand"]',
    },
    {
      id: 'navigation',
      title: 'Operator navigation',
      description:
        'Use this menu to move between dashboard, matches, venues, players, and profile pages.',
      selector: navSelector,
    },
    {
      id: 'dashboard',
      title: 'Dashboard page',
      description:
        'Start here for a quick view of activity, occupancy, and key performance indicators.',
      selector: '[data-onboarding="operator-dashboard"]',
      route: '/operator/dashboard',
    },
    {
      id: 'matches',
      title: 'Matches page',
      description:
        'Manage match schedules, statuses, and details from this page.',
      selector: '[data-onboarding="operator-matches"]',
      route: '/operator/matches',
    },
    {
      id: 'content',
      title: 'Workspace area',
      description:
        'This section shows the active page content and where your main operations happen.',
      selector: '[data-onboarding="content"]',
    },
    {
      id: 'profile',
      title: 'Profile menu',
      description:
        'Open your user menu to manage account settings or safely log out.',
      selector: '[data-onboarding="profile-menu"]',
    },
  ];
}

function getStorageKey(role: string) {
  return `sportbooker-onboarding-${ONBOARDING_VERSION}:${role}`;
}

export function OnboardingTour() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobileViewport();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const role = useAuthStore((s) => normalizeRole(s.user?.role ?? ''));

  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const onboardingSteps = useMemo(
    () => getOnboardingSteps(role, isMobile),
    [isMobile, role],
  );

  const currentStep = onboardingSteps[stepIndex] ?? null;
  const isBlockedPath =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/403';

  useEffect(() => {
    if (
      isOpen ||
      !isSessionReady ||
      !isAuthenticated ||
      !role ||
      isBlockedPath
    ) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    const key = getStorageKey(role);
    const hasCompleted = window.localStorage.getItem(key) === 'done';
    if (hasCompleted) {
      return;
    }

    const timer = window.setTimeout(() => {
      setStepIndex(0);
      setIsOpen(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isBlockedPath, isOpen, isSessionReady, role]);

  useEffect(() => {
    if (!isOpen || !currentStep?.route) return;
    if (location.pathname === currentStep.route) return;
    navigate(currentStep.route);
  }, [currentStep?.route, isOpen, location.pathname, navigate]);

  useEffect(() => {
    const selector = currentStep?.selector;
    if (!isOpen || !selector) return;

    let intervalId: number | null = null;
    let animationFrameId = 0;

    const updateRect = () => {
      const target = document.querySelector(selector);
      setTargetRect(target ? target.getBoundingClientRect() : null);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateRect);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    let attempts = 0;
    intervalId = window.setInterval(() => {
      attempts += 1;
      scheduleUpdate();
      if (document.querySelector(selector) || attempts > 16) {
        if (intervalId != null) {
          window.clearInterval(intervalId);
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      cancelAnimationFrame(animationFrameId);
      if (intervalId != null) {
        window.clearInterval(intervalId);
      }
    };
  }, [currentStep?.selector, currentStep?.route, isOpen, location.pathname]);

  const completeTour = () => {
    if (typeof window !== 'undefined' && role) {
      window.localStorage.setItem(getStorageKey(role), 'done');
    }
    setIsOpen(false);
    setStepIndex(0);
  };

  const goNext = () => {
    if (stepIndex >= onboardingSteps.length - 1) {
      completeTour();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  const goBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  if (!isOpen || !currentStep) {
    return null;
  }

  const activeTargetRect = currentStep.selector ? targetRect : null;

  const viewportWidth =
    typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : 800;

  const tooltipMaxWidth = Math.min(360, viewportWidth - 32);
  let tooltipStyle: CSSProperties = {
    width: tooltipMaxWidth,
  };

  if (activeTargetRect) {
    const spacing = 12;
    const tooltipHeightEstimate = 210;
    const preferredTop = activeTargetRect.bottom + spacing;
    const fallbackTop = activeTargetRect.top - spacing - tooltipHeightEstimate;
    const canPlaceBelow = preferredTop + tooltipHeightEstimate < viewportHeight;
    const top = canPlaceBelow ? preferredTop : Math.max(16, fallbackTop);
    const left = Math.min(
      Math.max(
        16,
        activeTargetRect.left +
          activeTargetRect.width / 2 -
          tooltipMaxWidth / 2,
      ),
      viewportWidth - tooltipMaxWidth - 16,
    );

    tooltipStyle = {
      ...tooltipStyle,
      position: 'fixed',
      top,
      left,
    };
  }

  const isLastStep = stepIndex === onboardingSteps.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-120">
      <div className="absolute inset-0 bg-black/60" />

      {activeTargetRect && (
        <div
          className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-all duration-200"
          style={{
            left: activeTargetRect.left - 6,
            top: activeTargetRect.top - 6,
            width: activeTargetRect.width + 12,
            height: activeTargetRect.height + 12,
          }}
        />
      )}

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Onboarding tour"
        className={cn(
          'pointer-events-auto fixed rounded-xl border border-border bg-card p-4 text-card-foreground shadow-2xl',
          !activeTargetRect &&
            'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={tooltipStyle}
      >
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Step {stepIndex + 1} of {onboardingSteps.length}
        </p>
        <h3 className="text-base font-semibold">{currentStep.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {currentStep.description}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={completeTour}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
