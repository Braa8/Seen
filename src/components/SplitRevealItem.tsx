"use client";

import React, { ReactNode } from "react";
import { motion, useInView } from "framer-motion";

export interface SplitRevealItemProps {
  id?: string;
  className?: string;
  reverse?: boolean;
  children: ReactNode;
}

const SplitRevealItem: React.FC<SplitRevealItemProps> = ({
  id,
  className = "",
  reverse = false,
  children
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { amount: 0.4 });

  return (
    <motion.div
      id={id}
      ref={ref}
      className={`relative py-12 ${className}`.trim()}
      initial={{ opacity: 0, x: reverse ? 140 : -140 }}
      animate={{ opacity: isInView ? 1 : 0, x: isInView ? 0 : reverse ? 140 : -140 }}
      transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl border border-white/15 bg-transparent backdrop-blur-sm shadow-[0_30px_80px_rgba(15,23,42,0.25)] p-8 sm:p-10 lg:p-12"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: isInView ? 1 : 0, y: isInView ? 0 : 28 }}
        transition={{ duration: 2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative z-10 space-y-4 text-lg sm:text-xl text-slate-100 leading-relaxed">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SplitRevealItem;
