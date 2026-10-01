import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { ArrowRight, Copy, Check, ExternalLink, Sparkles, Undo2 } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { PROFILE } from "../data/portfolio";
import { streamSSE } from "../lib/sse";
import { FileDropzone } from "./FileDropzone";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TYPES = ["Motion Graphics", "Gaming", "Reaction", "IRL", "Vlogs", "Podcast", "Other"];
const BUDGETS = ["Below 100$", "Below 500$", "Below 1000$", "1000$ or more"];

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", project_type: "", budget: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [original, setOriginal] = useState(null);
  const [files, setFiles] = useState([]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const polish = async () => {
    const idea = form.message.trim();
    if (idea.length < 10) {
      toast.error("Write a few words about your project first.");
      return;
    }
    setPolishing(true);
    setOriginal(idea);
    set("message", "");
    try {
      await streamSSE(
        "/ai/brief",
        { idea, project_type: form.project_type || null, budget: form.budget || null },
        (_, acc) => set("message", acc)
      );
      toast.success("Brief polished — edit anything before sending.");
    } catch (err) {
      set("message", idea);
      setOriginal(null);
      toast.error(err.message || "Couldn't polish right now.");
    } finally {
      setPolishing(false);
    }
  };

  const undoPolish = () => {
    set("message", original);
    setOriginal(null);
  };

  const copyDiscord = () => {
    navigator.clipboard.writeText(PROFILE.discord);
    setCopied(true);
    toast.success("Discord handle copied");
    setTimeout(() => setCopied(false), 1800);
  };

  const uploading = files.some((f) => f.status === "uploading");

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in name, email and message.");
      return;
    }
    if (uploading) {
      toast.error("Please wait for attachments to finish uploading.");
      return;
    }
    setLoading(true);
    try {
      const attachments = files.filter((f) => f.status === "done").map((f) => f.id);
      await axios.post(`${API}/contact`, { ...form, attachments });
      toast.success("Message sent — I'll get back to you soon.");
      setForm({ name: "", email: "", project_type: "", budget: "", message: "" });
      setOriginal(null);
      setFiles([]);
    } catch (err) {
      toast.error("Something went wrong. Try Discord instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" className="relative z-10 py-24 md:py-32 px-6 md:px-12 lg:px-24">
      <motion.h2
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="font-heading text-[16vw] lg:text-[11vw] font-black uppercase tracking-tighter leading-none"
      >
        Let&apos;s talk<span className="text-[#2997FF]">.</span>
      </motion.h2>

      <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 mt-12">
        <div className="lg:col-span-4 flex flex-col gap-8">
          <p className="text-lg text-[#a1a1aa] leading-relaxed">
            Got a project, a channel to grow, or footage that needs magic? Drop the details and I&apos;ll reply within 24 hours.
          </p>
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#a1a1aa]">Email</span>
            <a href={`mailto:${PROFILE.email}`} data-testid="contact-email-link" className="block font-heading text-xl mt-1 hover:text-[#2997FF] transition-colors">
              {PROFILE.email}
            </a>
          </div>
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#a1a1aa]">Discord</span>
            <button onClick={copyDiscord} data-testid="contact-discord-copy" data-cursor className="flex items-center gap-2 font-heading text-xl mt-1 hover:text-[#2997FF] transition-colors">
              {PROFILE.discord}
              {copied ? <Check size={16} className="text-[#2997FF]" /> : <Copy size={15} />}
            </button>
            <a
              href={PROFILE.ytjobs}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="contact-ytjobs-btn"
              data-cursor
              className="group mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white hover:text-black transition-colors duration-300"
            >
              Hire me on YTJobs
              <ExternalLink size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>

        <form onSubmit={submit} data-testid="contact-form" className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Name</label>
            <Input id="name" data-testid="contact-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" className="h-12 bg-[#111] border-white/15 rounded-xl focus-visible:ring-[#2997FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Email</label>
            <Input id="email" type="email" data-testid="contact-email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" className="h-12 bg-[#111] border-white/15 rounded-xl focus-visible:ring-[#2997FF]" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Project type</label>
            <Select value={form.project_type} onValueChange={(v) => set("project_type", v)}>
              <SelectTrigger data-testid="contact-type" className="h-12 bg-[#111] border-white/15 rounded-xl">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/15 text-white">
                {TYPES.map((t) => <SelectItem key={t} value={t} data-testid={`type-opt-${t}`}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Budget</label>
            <Select value={form.budget} onValueChange={(v) => set("budget", v)}>
              <SelectTrigger data-testid="contact-budget" className="h-12 bg-[#111] border-white/15 rounded-xl">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/15 text-white">
                {BUDGETS.map((b) => <SelectItem key={b} value={b} data-testid={`budget-opt-${b}`}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="message" className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Message</label>
              <div className="flex items-center gap-2">
                {original !== null && !polishing && (
                  <button
                    type="button"
                    onClick={undoPolish}
                    data-testid="contact-brief-undo"
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[#a1a1aa] hover:text-white transition-colors"
                  >
                    <Undo2 size={12} /> Undo
                  </button>
                )}
                <button
                  type="button"
                  onClick={polish}
                  disabled={polishing || loading}
                  data-testid="contact-brief-polish"
                  data-cursor
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2997FF]/40 bg-[#2997FF]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#2997FF] hover:bg-[#2997FF] hover:text-white transition-colors disabled:opacity-60"
                >
                  <Sparkles size={12} className={polishing ? "animate-spin" : ""} />
                  {polishing ? "Polishing…" : "Polish with AI"}
                </button>
              </div>
            </div>
            <Textarea id="message" data-testid="contact-message" value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Tell me about the project — rough notes are fine, AI can tidy them up…" rows={6} className="bg-[#111] border-white/15 rounded-xl resize-none focus-visible:ring-[#2997FF]" />
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="font-mono text-xs uppercase tracking-[0.15em] text-[#a1a1aa]">Attachments <span className="text-[#71717a]">(optional)</span></label>
            <FileDropzone items={files} onChange={setFiles} disabled={loading} />
          </div>
          <button
            type="submit"
            disabled={loading || uploading}
            data-testid="contact-submit"
            data-cursor
            className="md:col-span-2 group inline-flex items-center justify-center gap-3 rounded-full bg-white text-black px-8 py-4 font-medium hover:bg-[#2997FF] hover:text-white transition-colors duration-300 disabled:opacity-60"
          >
            {loading ? "Sending…" : uploading ? "Uploading attachments…" : "Send message"}
            <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </form>
      </div>
    </section>
  );
};
