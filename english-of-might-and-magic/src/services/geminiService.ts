import { GameState, Stats } from "../types";

// AI Backend URLs (same as educational coding game)
const AI_BASE_URL = 'https://gacha-girls.co:8080';
const AI_LOGIN_URL = `${AI_BASE_URL}/api/program/login`;
const AI_CHAT_URL = `${AI_BASE_URL}/api/program/chat`;

let aiToken: string | null = null;

// Login to get AI token
async function ensureAIToken() {
  if (aiToken) return;

  try {
    const loginRes = await fetch(AI_LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'hiddenboss123' })
    });

    if (!loginRes.ok) {
      const error = await loginRes.text();
      throw new Error(`Login failed (${loginRes.status}): ${error}`);
    }

    const loginData = await loginRes.json();
    aiToken = loginData.token;
  } catch (err) {
    console.error("AI Login Error:", err);
    throw err;
  }
}

export async function generateNextTurn(state: GameState, lastChoice?: string) {
  // Ensure we have a token
  await ensureAIToken();

  if (!aiToken) {
    throw new Error("Could not authenticate with AI.");
  }

  const systemInstruction = `
    You are the AI English Adventure Engine. Your goal is to guide the player through an immersive educational RPG.
    
    World: ${state.world}
    Difficulty: ${state.difficulty} stars (CEFR Level: ${getCEFR(state.difficulty)})
    Player: ${state.playerName} (${state.gender}, ${state.race} ${state.occupation})
    Goal: ${state.goal}
    
    Current Stats:
    HP: ${state.stats.hp}/100
    Hunger: ${state.stats.hunger}/100
    Lumes: ${state.stats.lumes}
    Silver: ${state.stats.silver}
    Weight: ${state.stats.weight}/${state.stats.maxWeight}
    Skill: ${state.skillName} (${state.stats.skill}%)
    Magic: ${state.specialName} (${state.stats.special}%)
    Alignment: ${state.stats.alignment} (-100 to 100, 0 is neutral)
    Int: ${state.stats.int}
    Str: ${state.stats.str}
    Weapon: ${state.weapon}
    Companion: ${state.companion}
    
    Rules:
    1. Story Text: 150-200 words in English. Match the CEFR level.
    2. Vocabulary: Extract 5-10 core words. In the story, mark them as **word** (Traditional Chinese translation).
    3. Choices: Provide EXACTLY 5 choices in both English and Traditional Chinese (Bilingual, e.g. 'English / 中文'). 
       - Make them varied (combat, exploration, dialogue, stealth, etc.).
    4. Logic: Maintain consistency with previous history.
    5. Character Growth: The character starts as a NEWBIE. They cannot perform "great magic" or "great sword skills" initially. They must grow slowly.
       - Users can learn NEW skills or magic during the journey.
       - To update 'skillName' or 'specialName', provide the new name in 'newSkillName' or 'newSpecialName'.
       - Use 'newWeapon' for new items/weapons.
    6. Stat Changes: Provide the numerical changes based on the story outcome. 
       - Hunger should decrease slowly based on in-game time passed (e.g., -1 for a quick action, -3 for a long journey). 
       - Silver is the in-game currency for buying, selling, and looting. Adjust it accordingly.
       - Lumes are a meta-currency ONLY for custom actions (Option 6). Reward them (+1 or +2) VERY rarely for incredible achievements.
       - Alignment: Adjust based on moral choices (-5 for evil, +5 for good).
    7. Context: Always consider the user's gender, occupation, race, and current weapons/companions in the narrative.
    
    IMPORTANT: You MUST respond with a valid JSON object matching this exact structure:
    {
      "story": "The 200-300 word English story text. IMPORTANT: You MUST bold 10 core vocabulary words like this: **word** (Traditional Chinese translation).",
      "imagePrompt": "A detailed visual description for the scene",
      "vocabulary": [
        {"word": "word", "translation": "translation", "example": "example sentence", "exampleTranslation": "翻譯"}
      ],
      "grammar": {
        "structure": "grammar structure",
        "explanation": "explanation",
        "example": "example sentence"
      },
      "choices": [
        {"text": "English / 中文", "action": "action description", "requirement": "optional requirement"}
      ],
      "statChanges": {
        "hp": 0,
        "hunger": 0,
        "skill": 0,
        "special": 0,
        "weight": 0,
        "alignment": 0,
        "lumes": 0,
        "silver": 0
      },
      "newWeapon": "",
      "newCompanion": "",
      "newSkillName": "",
      "newSpecialName": ""
    }
  `;

  const historyText = state.history.length > 0 ? `\n\nRecent Story History:\n${state.history.slice(-3).join('\n---\n')}` : '';

  const prompt = lastChoice
    ? `The player chose: ${lastChoice}.${historyText}\n\nContinue the story based on this choice and the current state.`
    : `Initialize the adventure. Set the scene and introduce the first challenge.`;

  const fullMessage = `${systemInstruction}\n\n${prompt}`;

  try {
    const startTime = performance.now();
    const res = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiToken}`
      },
      body: JSON.stringify({ message: fullMessage })
    });

    if (!res.ok) {
      throw new Error(`AI Chat error: ${res.status}`);
    }

    const data = await res.json();
    const responseText = data.text || "I'm sorry, I couldn't understand that.";
    
    // Strip markdown code blocks if present
    let cleanedText = responseText;
    if (responseText.startsWith('```json')) {
      cleanedText = responseText.slice(7); // Remove ```json
    } else if (responseText.startsWith('```')) {
      cleanedText = responseText.slice(3); // Remove ```
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3); // Remove trailing ```
    }
    cleanedText = cleanedText.trim();
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(cleanedText);
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`⏱️ AI response time: ${duration}s`);
      return parsed;
    } catch (e) {
      // If not valid JSON, return a fallback structure
      console.error("Failed to parse AI response as JSON:", e);
      return {
        story: responseText.substring(0, 500),
        imagePrompt: "Adventure scene",
        vocabulary: [],
        grammar: { structure: "", explanation: "", example: "" },
        choices: [
          { text: "Continue / 繼續", action: "Continue the adventure" },
          { text: "Rest / 休息", action: "Take a rest" },
          { text: "Explore / 探索", action: "Explore the area" },
          { text: "Fight / 戰鬥", action: "Engage in combat" },
          { text: "Flee / 逃跑", action: "Run away" }
        ],
        statChanges: { hp: 0, hunger: -1, skill: 0, special: 0, weight: 0, alignment: 0, lumes: 0, silver: 0 }
      };
    }
  } catch (err) {
    console.error("Chat API Error:", err);
    throw err;
  }
}

function getCEFR(difficulty: number) {
  switch (difficulty) {
    case 1: return "A1";
    case 2: return "A2";
    case 3: return "B1";
    case 4: return "B2";
    case 5: return "C1";
    default: return "A1";
  }
}
