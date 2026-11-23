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

  // Potential endpoints: OpenAI-compatible /v1/chat/completions or root
  const candidateUrls = [
    `${modalBaseUrl}/v1/chat/completions`,
    modalBaseUrl,
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.MODAL_PROXY_TOKEN) {
    headers["Authorization"] = `Bearer ${env.MODAL_PROXY_TOKEN}`;
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);

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
      // Continue to next candidate or fallback
    }
  }

  return null;
}

/**
 * Fallback contextual engine if all external inference providers fail or are unauthenticated.
 */
function generateContextualFallback(messages: ChatMessage[]): string {
  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user")?.content?.toLowerCase() || "";

  const isTamil =
    /[\u0B80-\u0BFF]/.test(lastUserMessage) ||
    /\b(vanakkam|eppadi|enge|theriyuma|enna|solunga|nandri|iruka)\b/i.test(lastUserMessage);

  if (
    lastUserMessage.includes("event") ||
    lastUserMessage.includes("meetup") ||
    lastUserMessage.includes("நிகழ்வு") ||
    lastUserMessage.includes("ஈவென்ட்") ||
    lastUserMessage.includes("மீட்டப்")
  ) {
    if (isTamil) {
      return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டியின் (CSC Circle) அடுத்த நிகழ்வுகள் மற்றும் மீட்டப்களைப் பற்றி அறிய விரும்புகிறீர்களா?\n\nநமது வரவிருக்கும் நிகழ்வுகளைக் காண மற்றும் பதிவு செய்ய:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nவேறு ஏதேனும் விவரங்கள் தேவைப்பட்டால் தயங்காமல் கேளுங்கள்!";
    }
    return "Hello! Here are the upcoming events at Coimbatore Startup Community (CSC Circle).\n\nYou can view all scheduled events and reserve your pass here:\n🔗 https://csc.logicintelligencetechnologies.in/events\n\nLet me know if you would like details on any specific event!";
  }

  if (
    lastUserMessage.includes("membership") ||
    lastUserMessage.includes("member") ||
    lastUserMessage.includes("உறுப்பினர்") ||
    lastUserMessage.includes("card") ||
    lastUserMessage.includes("id")
  ) {
    if (isTamil) {
      return "வணக்கம்! CSC Circle உறுப்பினர் அட்டை (Membership Card) மற்றும் நிலையை சரிபார்க்க விரும்புகிறீர்களா?\n\nஉறுப்பினர் அடையாள அட்டைக்கான அங்கீகாரம் 5 நிமிடங்களுக்குள் தானாகவே செயல்படுத்தப்படுகிறது.\n\n• உங்கள் கணக்கின் நிலையை அல்லது டிஜிட்டல் கார்டைப் பார்க்க:\n🔗 https://csc.logicintelligencetechnologies.in/member/card\n• புதிய உறுப்பினராக இணைய:\n🔗 https://csc.logicintelligencetechnologies.in/join";
    }
    return "Welcome to Coimbatore Startup Community (CSC Circle)!\n\nMembership claims are automatically approved within 5 minutes of submission.\n\n• To check your membership or view your digital pass: https://csc.logicintelligencetechnologies.in/member/card\n• To apply for membership: https://csc.logicintelligencetechnologies.in/join\n\nIf you have already applied, reply with your registered email or phone number to check your status.";
  }

  if (isTamil) {
    return "வணக்கம்! கோயம்புத்தூர் ஸ்டார்ட்அப் கம்யூனிட்டிக்கு (CSC Circle) உங்களை அன்போடு வரவேற்கிறோம். நான் உங்கள் AI உதவியாளர்.\n\nநிகழ்வுகள், ஸ்டார்ட்அப் வழிகாட்டிகள், மற்றும் உறுப்பினர் சேர்க்கை தொடர்பான எந்தவொரு கேள்விகளுக்கும் உதவ தயாராக உள்ளேன்.\n\nஇணையதளம்: https://csc.logicintelligencetechnologies.in";
  }

  return "Welcome to Coimbatore Startup Community (CSC Circle)! I am your 24/7 community intelligence assistant.\n\nI can assist you with upcoming events, membership applications, startup directory listings, and ecosystem partnerships.\n\nWebsite: https://csc.logicintelligencetechnologies.in\nHow may I help you today?";
}
