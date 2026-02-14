"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { 
  FileSearch, 
  Zap, 
  Shield, 
  BarChart3, 
  Workflow, 
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play
} from "lucide-react";
import { SpotlightOverlay } from "@/hooks/use-spotlight";
import { FadeIn, Stagger, StaggerItem, GlowCard } from "@/lib/animations";

const features = [
  {
    icon: FileSearch,
    title: "Intelligent Extraction",
    description: "AI-powered OCR extracts key fields from medical records with confidence scores and bounding boxes.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "Instant Processing",
    description: "Process documents in seconds, not hours. Automated workflows handle the heavy lifting.",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC 2 compliant with end-to-end encryption. Your data stays protected at every step.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Workflow,
    title: "Visual Workflows",
    description: "Drag-and-drop workflow builder automates routing, approvals, and integrations.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track throughput, accuracy, and team performance with beautiful dashboards.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Sparkles,
    title: "Continuous Learning",
    description: "Model improves from corrections. The more you use it, the smarter it gets.",
    gradient: "from-indigo-500 to-blue-500",
  },
];

const stats = [
  { value: "99.2%", label: "Extraction Accuracy" },
  { value: "10x", label: "Faster Processing" },
  { value: "50K+", label: "Documents Daily" },
  { value: "100%", label: "SOC 2 Compliant" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Spotlight Effect */}
      <SpotlightOverlay className="opacity-60" />

      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-blue-500/20 via-transparent to-transparent blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-violet-500/20 via-transparent to-transparent blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.05] bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"
            >
              <FileSearch className="w-4 h-4 text-white" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              MedicalOCR
            </span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              href="#features" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link 
              href="#stats" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Stats
            </Link>
            <Link 
              href="/login"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-indigo-400">Intelligent Document Processing</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
                Transform Medical
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Documents into Data
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              AI-powered extraction with human-in-the-loop review. 
              Automate your medical document workflow with confidence scores, 
              visual verification, and seamless integrations.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/login"
                className="group relative px-8 py-4 text-lg font-semibold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white overflow-hidden shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700"
                  initial={{ x: "100%" }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
              
              <button className="group flex items-center gap-3 px-6 py-4 text-lg font-medium rounded-xl border border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] transition-all">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Play className="w-4 h-4 text-foreground ml-0.5" />
                </div>
                Watch Demo
              </button>
            </motion.div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="relative rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-transparent p-2 shadow-2xl shadow-black/20">
              <div className="rounded-xl overflow-hidden bg-card border border-white/[0.05]">
                {/* Mock Dashboard */}
                <div className="h-[400px] bg-gradient-to-br from-card via-card/95 to-card/90 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-4 text-sm text-muted-foreground">Dashboard</span>
                  </div>
                  
                  {/* Mock KPI Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Processed", value: "12,847", color: "from-blue-500 to-cyan-500" },
                      { label: "Pending", value: "234", color: "from-amber-500 to-orange-500" },
                      { label: "Accuracy", value: "99.2%", color: "from-emerald-500 to-teal-500" },
                      { label: "Avg Time", value: "2.3s", color: "from-violet-500 to-purple-500" },
                    ].map((kpi, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kpi.color} mb-3`} />
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <div className="text-sm text-muted-foreground">{kpi.label}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Mock Chart */}
                  <div className="h-32 flex items-end gap-2 px-4">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.8 + i * 0.05, duration: 0.5, type: "spring" }}
                        className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/50 to-purple-500/50"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                automate documents
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete platform for intelligent document processing, from upload to export.
            </p>
          </FadeIn>

          <Stagger className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <StaggerItem key={i}>
                <GlowCard className="p-6 h-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </GlowCard>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Social Proof / CTA Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden"
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-90" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            
            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to transform your document workflow?
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
                  Join thousands of healthcare organizations using MedicalOCR to automate 
                  their document processing.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/login"
                    className="px-8 py-4 text-lg font-semibold rounded-xl bg-white text-indigo-600 hover:bg-white/90 transition-colors shadow-xl"
                  >
                    Start Free Trial
                  </Link>
                  <button className="px-8 py-4 text-lg font-semibold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-colors">
                    Contact Sales
                  </button>
                </div>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="mt-12 pt-8 border-t border-white/20"
              >
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/60">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SOC 2 Certified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>HIPAA Compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>99.9% Uptime SLA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>24/7 Support</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <FileSearch className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">MedicalOCR</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 MedicalOCR. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
