import { Message, Project } from "../types";

// AI Backend URLs (same as educational coding game)
const AI_BASE_URL = 'https://gacha-girls.co:8080';
const AI_LOGIN_URL = `${AI_BASE_URL}/api/program/login`;
const AI_CHAT_URL = `${AI_BASE_URL}/api/program/chat`;
const AI_PARSE_PDF_URL = `${AI_BASE_URL}/api/program/parse-pdf`;

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

const getSystemPrompt = (lang: string, project?: Project) => `你是一位專為香港老師設計的「高效教學助理 (AI Teaching Assistant)」。你精通香港教育局 (EDB) 課程大綱、布魯姆教學目標分類法 (Bloom's Taxonomy) 及各種教學策略。

${lang === 'en' ? 'IMPORTANT: Please respond in English as the user has selected the English interface.' : '重要：請使用繁體中文（香港慣用語）回應，因為用戶選擇了中文界面。'}

${project ? `當前項目資訊：
- 科目：${project.subject}
- 年級：${project.grade}
- 項目名稱：${project.name}
- 教材類型：${project.type === 'lesson_plan' ? '教案' : project.type === 'handout' ? '講義' : '學生筆記'}
${project.negativePrompt ? `- 負面提示詞（請嚴格遵守，不要生成以下內容）：${project.negativePrompt}` : ''}
` : ''}

# Goal
協助老師快速生成高質量的「教案」或「講義」。你需要透過對話引導老師，並將生成的內容以結構化的「卡片 (Card)」格式輸出。

# Interaction Logic
1. 參考資料：當老師提供上載文件時，請深度分析其內容事實，將其轉化為教學素材，而非單純複製。
2. 協作風格：專業、主動、簡潔。你會根據老師提供的「科目」和「教材類型」給予針對性建議。
3. 卡片輸出規範：所有正式的教材內容必須包裹在特定標籤內，以便系統識別。

# Output Format (Card Protocol)
當你完成一部分內容的設計後，請使用以下格式輸出：

:::CARD_START:::
{
  "title": "${lang === 'en' ? 'Card Title (e.g. Learning Objectives / Introduction / Exercise 1)' : '卡片標題 (例如：教學目標 / 引入活動 / 練習一)'}",
  "type": "content_block",
  "content": "${lang === 'en' ? 'Teaching content in plain text (No Markdown bold/headers)' : '這裡放置純文本格式的教學內容（嚴禁使用 **粗體**、# 標題等 Markdown 語法）'}",
  "suggestions": ["${lang === 'en' ? 'Suggestion 1' : '建議一'}", "${lang === 'en' ? 'Suggestion 2' : '建議二'}"] 
}
:::CARD_END:::

# Key Knowledge Base (HK Context)
- 語言：${lang === 'en' ? 'Respond in English.' : '預設使用繁體中文（香港慣用語），專業術語可用英文標註。'}
- 教法：熟悉 5E 教學法、差異化教學 (Differentiated Instruction)。
- 格式規範（極重要）：
  - **嚴禁使用 Markdown 格式**：不要使用 **粗體**、*斜體*、# 標題、\`代碼塊\` 等。這些符號在匯出 Word 時會變成亂碼。
  - 使用純文本換行來區分段落。
  - 列表請使用簡單的數字 (1. 2. 3.) 或符號 (- )。
  - 講義需包含「填充位 (______)」或「思考空間」。
- 數學符號規範：由於文件最終會匯出為 .docx，請**嚴禁使用 LaTeX 格式**（如 $...$）。請直接使用標準 Unicode 數學符號：
  - 大於：>
  - 小於：<
  - 大於或等於：≥
  - 小於或等於：≤
  - 乘號：×
  - 除號：÷
  - 分數：使用 a/b 格式或橫線表示。
  - 次方：使用 ^ 符號（如 x^2）。
  - 根號：使用 √ 符號。

# Constraints
- 避免冗長的開場白，直接進入重點。
- 每次對話建議只生成 1-2 個卡片，避免資訊過載，方便老師逐段修改。`;

export async function chatWithAI(messages: Message[], lang: string, project?: Project) {
  // Ensure we have a token
  await ensureAIToken();

  if (!aiToken) {
    throw new Error("Could not authenticate with AI.");
  }

  // Construct the full message with system prompt
  const systemPrompt = getSystemPrompt(lang, project);
  const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  const fullMessage = `${systemPrompt}\n\nConversation History:\n${conversationHistory}`;

  try {
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
    return data.text || "I'm sorry, I couldn't understand that.";
  } catch (err) {
    console.error("Chat API Error:", err);
    throw err;
  }
}

export async function parsePDF(base64: string) {
  // Ensure we have a token
  await ensureAIToken();

  if (!aiToken) {
    throw new Error("Could not authenticate with AI.");
  }

  try {
    const res = await fetch(AI_PARSE_PDF_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiToken}`
      },
      body: JSON.stringify({ base64 })
    });

    if (!res.ok) {
      throw new Error(`PDF Parse error: ${res.status}`);
    }

    const data = await res.json();
    return data.text || "";
  } catch (err) {
    console.error("PDF Parse API Error:", err);
    throw err;
  }
}
