"use client";

import { HeroSection } from "@/components/omni/HeroSection";
import { SearchBar } from "@/components/omni/SearchBar";
import { motion } from "framer-motion";
import { TrendingUp, MapPin, Globe, Shield } from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Global POS Comparison",
    description: "Compare prices from 50+ countries to find the cheapest point of sale for every flight.",
  },
  {
    icon: TrendingUp,
    title: "Price Tracking",
    description: "Set alerts and track price changes across all points of sale in real time.",
  },
  {
    icon: MapPin,
    title: "Smart Routing",
    description: "Discover hidden-city ticketing and multi-POS booking strategies to save more.",
  },
  {
    icon: Shield,
    title: "Risk Assessment",
    description: "Know the booking risks for each POS — ID requirements, payment restrictions, and more.",
  },
];

const popularRoutes = [
  { from: "New Delhi", to: "Bengaluru", price: "₹4,890", flag: "🇹🇷", pos: "Turkey" },
  { from: "Mumbai", to: "Dubai", price: "₹8,200", flag: "🇧🇷", pos: "Brazil" },
  { from: "Delhi", to: "London", price: "₹28,500", flag: "🇹🇷", pos: "Turkey" },
  { from: "Bengaluru", to: "Singapore", price: "₹11,200", flag: "🇸🇬", pos: "Singapore" },
];

export default function Home() {
  return (
    <div>
      <HeroSection />
      <SearchBar />

      {/* Popular routes */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mx-auto mt-12 max-w-4xl px-4 sm:px-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Popular routes with POS savings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {popularRoutes.map((route, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="group flex cursor-pointer items-center justify-between rounded-xl border border-navy-700/50 bg-navy-900 p-4 transition-all hover:border-electric/30"
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {route.from} → {route.to}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Best via {route.flag} {route.pos}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-electric">{route.price}</div>
                <div className="text-[10px] text-success">Save up to 15%</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mx-auto mt-12 max-w-4xl px-4 pb-24 sm:px-6"
      >
        <h2 className="mb-6 text-center text-lg font-semibold text-white">
          Why OmniFare?
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="rounded-xl border border-navy-700/50 bg-navy-900 p-5 text-center"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-electric/10">
                <f.icon className="h-5 w-5 text-electric" />
              </div>
              <h3 className="mb-1.5 text-sm font-medium text-white">{f.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
