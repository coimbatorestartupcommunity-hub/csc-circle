import { getWorkerEnv, WorkerEnv } from "../config/env.js";
import { logger } from "../utils/logger.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Resilient multi-tier AI inference pipeline:
 * Tier 1: Groq API (High-speed LLaMA-3.3-70b-versatile)
 * Tier 2: Modal Direct Endpoint fallback (when Groq hits rate-limit 429, downtime, or downgrade)
 * Tier 3: Deterministic Authoritative Contextual Rule Engine (100% uptime guaranteed)
 */
export async function callAIModel(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<string> {
  const env = getWorkerEnv();
  const apiKey =
    process.env.GROK_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    "";

  // If API key is present, attempt Tier 1 (Groq)
  if (apiKey) {
    const isGroq = apiKey.startsWith("gsk_") || !apiKey.startsWith("xai-");
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.x.ai/v1/chat/completions";

    let rawModel =
      options?.model ||
      process.env.GROK_MODEL ||
      process.env.GROQ_MODEL ||
      "llama-3.3-70b-versatile";
    let model = rawModel;
    if (isGroq) {
      if (rawModel.toLowerCase().includes("grok") || rawModel.toLowerCase() === "default") {
        model = "llama-3.3-70b-versatile";
      }
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const reply = data.choices?.[0]?.message?.content?.trim();
        if (reply) return reply;
      } else {
        const errText = await res.text();
        logger.warn(
          `Groq API degraded/rate-limited (HTTP ${res.status}). Initiating Modal endpoint fallback.`,
          { status: String(res.status), error: errText }
        );
      }
    } catch (err) {
      logger.warn("Groq API call exception. Initiating Modal endpoint fallback.", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logger.info("No Groq API key set. Checking Modal fallback endpoint...");
  }

  // Tier 2: Modal Endpoint Fallback
  const modalReply = await callModalFallback(messages, env, options);
  if (modalReply) {
    return modalReply;
  }

  // Tier 3: Deterministic Contextual Rule Engine
  return generateContextualFallback(messages);
}

/**
 * Invokes the user's Modal endpoint as a fallback for high-availability inference.
 */
async function callModalFallback(
  messages: ChatMessage[],
  env: WorkerEnv,
  options?: ChatOptions
): Promise<string | null> {
  const modalBaseUrl = env.MODAL_AI_ENDPOINT?.trim().replace(/\/+$/, "");
  if (!modalBaseUrl) return null;

  const url = `${modalBaseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.MODAL_PROXY_TOKEN) {
    headers["Authorization"] = `Bearer ${env.MODAL_PROXY_TOKEN}`;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "default",
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens ?? 1000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = (await res.json()) as any;
      const reply =
        data?.choices?.[0]?.message?.content ||
        data?.text ||
        data?.output ||
        data?.response;

      if (reply && typeof reply === "string") {
        logger.info("Successfully received AI response from Modal fallback endpoint");
        return reply.trim();
      }
    }
  } catch {
    // Quick failover to deterministic contextual fallback
  }

  return null;
}

/**
 * Fallback contextual engine supporting English, Pure Tamil, and Tanglish.
 */
function generateContextualFallback(messages: ChatMessage[]): string {
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user")?.content?.trim() || "";

  const lower = lastUserMessage.toLowerCase();

  // 1. Detect Pure Tamil (Tamil script unicode)
  const isPureTamil = /[\u0B80-\u0BFF]/.test(lastUserMessage);

  // 2. Detect Tanglish (Tamil words written in English letters)
  const isTanglish =
    !isPureTamil &&
    /\b(vanakkam|epadi|eppadi|enge|engae|theriyuma|enna|solunga|sollunga|nandri|iruka|irukeenga|irukinga|panlam|pannalam|panna|venum|kedaikuma|bro|thala|machan|nanba|kooda|unga|namba|romba|aachu|aagala|sollu|paaru|paru|edhavadhu|eppovum|eppa|eppo)\b/i.test(lower);

  // Events / Meetups
  if (
    lower.includes("event") ||
    lower.includes("meetup") ||
    lower.includes("நிகழ்வு") ||
    lower.includes("ஈவென்ட்") ||
    lower.includes("மீட்டப்")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் (CSC Circle) அடுத்த நிகழ்வுகள் மற்றும் மீட்டப்களைப் பற்றி அறிய விரும்புகிறீர்களா?\n\nநமது வரவிருக்கும் நிகழ்வுகளைக் காண மற்றும் பதிவு செய்ய:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nவேறு ஏதேனும் விவரங்கள் தேவைப்பட்டால் தயங்காமல் கேளுங்கள்! ✨";
    }
    if (isTanglish) {
      return "Vanakkam! CSC Circle oda upcoming events & meetups pathi therinjika virumbureengala? Scheduled events paaka and pass book panna:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nSpecific event pathi info venumna kooda sollunga, naan guide panren! ✨";
    }
    return "Hello! Here are the upcoming events at Coimbatore Startup Community (CSC Circle).\n\nYou can view all scheduled events and reserve your pass here:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nLet me know if you would like details on any specific event! ✨";
  }

  // Membership & Passes
  if (
    lower.includes("membership") ||
    lower.includes("member") ||
    lower.includes("உறுப்பினர்") ||
    lower.includes("card") ||
    lower.includes("id")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! CSC Circle உறுப்பினர் அட்டை (Membership Card) மற்றும் நிலையை சரிபார்க்க விரும்புகிறீர்களா?\n\nஉறுப்பினர் அடையாள அட்டைக்கான அங்கீகாரம் 5 நிமிடங்களுக்குள் தானாகவே செயல்படுத்தப்படுகிறது.\n\n• உங்கள் கணக்கின் நிலையை அல்லது டிஜிட்டல் கார்டைப் பார்க்க:\n🔗 https://csc.logicintelligencetechnologies.in/member/card\n• புதிய உறுப்பினராக இணைய:\n🔗 https://csc.logicintelligencetechnologies.in/join\n\nஏற்கனவே விண்ணப்பித்திருந்தால், உங்கள் மின்னஞ்சல் முகவரியை அனுப்பவும்.";
    }
    if (isTanglish) {
      return "Vanakkam! CSC Circle membership claim panna & digital pass paaka virumbureengala? Membership claims 5 mins kula automatically approve aagidum.\n\n• Unga pass/card paaka: https://csc.logicintelligencetechnologies.in/member/card\n• New member apply panna: https://csc.logicintelligencetechnologies.in/join\n\nAlready apply pannirundha unga registered email address share pannunga, verify pannikalam!";
    }
    return "Welcome to Coimbatore Startup Community (CSC Circle)!\n\nMembership claims are automatically approved within 5 minutes of submission.\n\n• To check your membership or view your digital pass: https://csc.logicintelligencetechnologies.in/member/card\n• To apply for membership: https://csc.logicintelligencetechnologies.in/join\n\nIf you have already applied, reply with your registered email or phone number to check your status.";
  }

  // Startup Directory
  if (
    lower.includes("startup") ||
    lower.includes("directory") ||
    lower.includes("founder") ||
    lower.includes("நிறுவனம்")
  ) {
    if (isPureTamil) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் நிறுவனங்களின் விபரங்களை ஆராய விரும்புகிறீர்களா?\n\n• முழு ஸ்டார்ட்அப் பட்டியல்:\n🔗 https://csc.logicintelligencetechnologies.in/directory\n• உங்கள் நிறுவனத்தை சேர்க்க:\n🔗 https://csc.logicintelligencetechnologies.in/profile/startups/new";
    }
    if (isTanglish) {
      return "Vanakkam! Coimbatore startup directory & founders list paaka virumbureengala?\n\n• Full Startup Directory: https://csc.logicintelligencetechnologies.in/directory\n• Unga startup-ah list panna: https://csc.logicintelligencetechnologies.in/profile/startups/new";
    }
    return "Explore the thriving ecosystem of Coimbatore startups!\n\n• View the Startup Directory: https://csc.logicintelligencetechnologies.in/directory\n• Register your startup: https://csc.logicintelligencetechnologies.in/profile/startups/new";
  }

  // General Greetings
  if (isPureTamil) {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு (CSC Circle) உங்களை அன்போடு வரவேற்கிறோம். ✨\n\nஉங்களுக்கு என்ன உதவி வேண்டும்? வரவிருக்கும் நிகழ்வுகள், உறுப்பினர் சேர்க்கை, ஸ்டார்ட்அப் பட்டியல் அல்லது கம்யூனிட்டி வழிகாட்டிகள் எதுவாக இருந்தாலும் சொல்லுங்கள், உடனடியாக உதவுகிறேன்!\n\n🌐 இணையதளம்: https://csc.logicintelligencetechnologies.in";
  }

  if (isTanglish) {
    return "Vanakkam! Welcome to Coimbatore Startup Community (CSC Circle)! ✨\n\nUngaluku enna help venum? Upcoming events, membership claim, startup directory and ecosystem updates pathi therinjikkanuma? Sollunga, immediately help panren!\n\n🌐 Website: https://csc.logicintelligencetechnologies.in";
  }

  return "Welcome to Coimbatore Startup Community (CSC Circle)! ✨\n\nHow can I help you today? Tell me what you're looking for — upcoming events, membership passes, startup directory, or community connections, and I will assist you right away!\n\n🌐 Website: https://csc.logicintelligencetechnologies.in";
}
