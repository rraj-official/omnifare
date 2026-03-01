"use client";

import { motion } from "framer-motion";
import { Mountain, TreePine, Send } from "lucide-react";

const leftTreeHeights = [28, 22, 34, 26, 32];
const rightTreeHeights = [30, 24, 36, 20, 28];

export function HeroSection() {
  return (
    <div className="relative flex h-[280px] items-center justify-center overflow-hidden bg-gradient-to-b from-navy-800 via-navy-900 to-navy-950">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-40">
          <svg viewBox="0 0 1200 200" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0,200 L0,120 Q100,60 200,100 Q300,140 400,80 Q500,20 600,60 Q700,100 800,50 Q900,0 1000,40 Q1100,80 1200,30 L1200,200 Z" fill="rgba(15,32,56,0.6)" />
            <path d="M0,200 L0,150 Q150,100 300,130 Q450,160 600,110 Q750,60 900,90 Q1050,120 1200,80 L1200,200 Z" fill="rgba(22,45,77,0.5)" />
          </svg>
        </div>

        <motion.div
          initial={{ left: "-5%", top: "30%" }}
          animate={{ left: "105%", top: "15%" }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute"
        >
          <Send className="h-5 w-5 -rotate-12 text-electric-light/40" />
        </motion.div>

        <div className="absolute bottom-8 left-[10%] flex gap-1">
          {leftTreeHeights.map((h, i) => (
            <TreePine key={i} className="text-navy-700" style={{ height: h }} />
          ))}
        </div>
        <div className="absolute bottom-8 right-[10%] flex gap-1">
          {rightTreeHeights.map((h, i) => (
            <TreePine key={i} className="text-navy-700" style={{ height: h }} />
          ))}
        </div>

        <Mountain className="absolute bottom-12 left-[30%] h-32 w-32 text-navy-700/50" />
        <Mountain className="absolute bottom-12 right-[25%] h-40 w-40 text-navy-700/30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <h1 className="text-5xl font-light tracking-tight text-white">Flights</h1>
        <p className="mt-2 text-sm text-electric-light/70">
          Comparing prices across 190+ countries to find you the best deal
        </p>
      </motion.div>
    </div>
  );
}
