export const PROFILE = {
  name: "CLOUD",
  role: "Video Editor & Motion Designer",
  tagline: "I turn raw footage into stories that stop the scroll.",
  location: "Remote · Worldwide",
  discord: "_cloudx1",
  email: "cloudcreates7@gmail.com",
  ytjobs: "https://ytjobs.co/talent/profile/638933",
  age: 19,
  basedIn: "India",
  languages: ["Hindi", "English"],
  availability: "Available for projects or as full-time video editor",
  timelines: {
    motionGraphics: "1 week",
    longForm20minPlus: "1 week",
    longForm10minPlus: "4-5 days",
    shortForm: "2-3 days",
  },
  pricing: {
    policy: "50% payment in advance before work starts; the rest on delivery",
    methods: ["PayPal", "Wise", "UPI", "Direct Bank Transfer"],
    tiers: ["Below $100", "Below $500", "Below $1000", "$1000 or more"],
  },
};

export const STATS = [
  { value: "80+", label: "Projects delivered" },
  { value: "2+", label: "Years of Experience" },
  { value: "50M+", label: "Views generated" },
  { value: "20+", label: "Happy Clients" },
];

export const MANIFESTO = [
  {
    no: "01",
    title: "Rhythm is everything",
    body: "Every cut lands on a beat. Pacing, tension and release are engineered so the viewer never reaches for the skip button.",
  },
  {
    no: "02",
    title: "Motion with meaning",
    body: "Graphics aren't decoration. Every animated element guides the eye, reinforces the message and earns its place on screen.",
  },
  {
    no: "03",
    title: "Story first, always",
    body: "Tools change, the craft doesn't. I obsess over the narrative before touching a single keyframe or transition.",
  },
];

export const SERVICES = [
  "Long form Editing", "Short form editing", "Motion graphics", "UI animation", "Sound Design",
];

export const TOOLS = ["After Effects", "Higgsfield", "Premiere Pro", "Photoshop", "Adobe Podcast", "Topaz", "Audacity", "Canva", "Frame.io"];

// Category structure
export const MOTION_SUBS = ["All", "SaaS and UI", "Mograph Edits", "Story Telling Edits"];
export const VIDEO_SUBS = ["All", "Long Form", "Short Form", "Phonk Style Edits"];

// Embeds. source: "youtube" | "vimeo" | "drive". ratio: "16/9" | "9/16" | "1/1".
const yt = (sub, id, ratio = "16/9") => ({ id: `yt-${id}`, sub, source: "youtube", videoId: id, ratio });
const vimeo = (sub, id, ratio = "16/9") => ({ id: `vm-${id}`, sub, source: "vimeo", videoId: id, ratio });
const drive = (sub, id, ratio = "16/9") => ({ id: `gd-${id}`, sub, source: "drive", fileId: id, ratio });

export const MOTION_PROJECTS = [
  // SaaS and UI
  vimeo("SaaS and UI", "1231871420"),
  vimeo("SaaS and UI", "1231885231", "9/16"),
  vimeo("SaaS and UI", "1231885230", "9/16"),
  // Mograph Edits
  vimeo("Mograph Edits", "1231883714", "1/1"),
  vimeo("Mograph Edits", "1231861389", "1/1"),
  vimeo("Mograph Edits", "1231861390", "1/1"),
  // Story Telling Edits
  vimeo("Story Telling Edits", "1231883713", "9/16"),
  vimeo("Story Telling Edits", "1231883717", "9/16"),
];

export const VIDEO_PROJECTS = [
  // Short Form
  drive("Short Form", "1DkGL-gMN6qF3z3LTyBfCNvc4QWASBrah", "9/16"),
  drive("Short Form", "1Qkb1jpeAZ5Q02hixygQn2-EaBmAA_YTs", "9/16"),
  yt("Short Form", "AvnEGWKUITE", "9/16"),
  yt("Short Form", "yEq5YdWN99E"),
  yt("Short Form", "qGHNtTndSCs"),
  yt("Short Form", "5kyTTm9OXFc", "9/16"),
  drive("Short Form", "1VFKZ8GybiAe9DhqxEtRB5JTCUD35NZGq", "9/16"),
  yt("Short Form", "ISN9XQ7cu_s", "9/16"),
  // Long Form
  yt("Long Form", "woASKPbiItA"),
  yt("Long Form", "BAlIsiEf38M"),
  drive("Long Form", "1Aoofmf_spcRHZjhRFimXf1cFV9_Plc1P"),
  // Phonk Style Edits
  yt("Phonk Style Edits", "c_J4VykkFl4", "9/16"),
  yt("Phonk Style Edits", "9BZDLP92gnk", "9/16"),
  yt("Phonk Style Edits", "ukU4fuU07Lw", "9/16"),
  yt("Phonk Style Edits", "ixSx-JsdOiU", "9/16"),
  yt("Phonk Style Edits", "WXRgUMqRwbo", "9/16"),
  yt("Phonk Style Edits", "OGXlzFnmIzo", "9/16"),
];