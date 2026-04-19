import { motion, useReducedMotion } from 'framer-motion';

type PageTransitionProps = {
  routeKey: string;
  children: React.ReactNode;
};

export function PageTransition({ routeKey, children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={routeKey}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0 : 0.18,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex min-h-full flex-1 flex-col overflow-x-clip"
    >
      {children}
    </motion.div>
  );
}
