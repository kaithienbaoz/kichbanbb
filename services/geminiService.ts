
import { GoogleGenAI, Type } from "@google/genai";
import { Spoiler, GroundingSource, LongArticleResult, BrainActiveData, CharacterKnowledge } from "../types";
import { loadBrainData, saveBrainData, updateCharacterKnowledge, updateGlobalPlot, updateManyCharacters } from "./brainService";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

/**
 * Updates the Brain Active knowledge base by searching for 20+ recent articles.
 */
export const updateBrainFromSearch = async (topic: string): Promise<void> => {
  const model = "gemini-3-pro-preview";
  const brainData = loadBrainData();
  
  const prompt = `
    Role: Senior Researcher for "The Bold and the Beautiful".
    Task: Search for at least 20 recent articles about "${topic}" and update the show's knowledge base (BRAIN ACTIVE).
    
    CURRENT BRAIN KNOWLEDGE (To be updated):
    - Global Plot: 
    ${brainData.generalPlot}
    
    - Characters Knowledge:
    ${brainData.characters.map(c => `* ${c.name}: ${c.currentPlot}`).join("\n")}
    
    Instructions:
    1. Use Google Search to find the 20+ most recent public articles (2025/2026).
    2. Identify "${topic}" and ANY other major characters mentioned in the most recent plotlines.
    3. IMPORTANT: Only update characters that are present in the "Characters Knowledge" list above.
    4. For each character identified, UPDATE their existing knowledge by merging the new information.
    5. Use the EXACT name from the "Characters Knowledge" list for the "name" field in the JSON response. Do not add surnames if they are not in the list.
    6. Keep the information SELECTIVE and SUMMARIZED.
    5. For each character, provide:
       - Name
       - Past events: A list of key past events (merged).
       - Current relationships: A list of current allies and enemies (merged).
       - Current status: A list of current roles, locations, or conditions (merged).
       - Current plotlines: A list of specific events currently happening to them (merged).
    6. Update the "Current Global Plot" by merging the new events with the existing ones.
    
    FORMATTING RULES:
    - Every field (except "name") MUST be a bulleted list where each line starts with "- ".
    - IMPORTANT: Each bullet point MUST be on a NEW LINE.
    
    Output Format: Return a JSON object with the following structure:
    {
      "characters": [
        {
          "name": "...",
          "past": "...",
          "relationships": "...",
          "status": "...",
          "currentPlot": "..."
        }
      ],
      "generalPlot": "..."
    }
    
    STRICT: Ensure all data is from the most recent 2025/2026 articles.
    LANGUAGE: All extracted information (characters, generalPlot) MUST be in English. Do not use Vietnamese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  past: { type: Type.STRING },
                  relationships: { type: Type.STRING },
                  status: { type: Type.STRING },
                  currentPlot: { type: Type.STRING }
                },
                required: ["name", "past", "relationships", "status", "currentPlot"]
              }
            },
            generalPlot: { type: Type.STRING }
          },
          required: ["characters", "generalPlot"]
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.characters && Array.isArray(result.characters)) {
      updateManyCharacters(result.characters);
    }
    
    if (result.generalPlot) {
      updateGlobalPlot(result.generalPlot);
    }
  } catch (error) {
    console.error("Error updating brain from search:", error);
    throw new Error("Không thể cập nhật BRAIN ACTIVE từ tìm kiếm.");
  }
};

/**
 * Updates the Brain Active knowledge base using specific grounding sources.
 */
export const updateBrainFromSpecificSources = async (sources: GroundingSource[]): Promise<void> => {
  if (sources.length === 0) return;
  
  const model = "gemini-3-pro-preview";
  const urls = sources.map(s => s.uri).slice(0, 20); // Limit to 20 URLs
  const brainData = loadBrainData();
  
  const prompt = `
    Role: Senior Continuity Editor for "The Bold and the Beautiful".
    Task: Analyze the provided URLs and update the show's knowledge base (BRAIN ACTIVE).
    
    CURRENT BRAIN KNOWLEDGE (To be updated):
    - Global Plot: 
    ${brainData.generalPlot}
    
    - Characters Knowledge:
    ${brainData.characters.map(c => `* ${c.name}: ${c.currentPlot}`).join("\n")}
    
    URLs to analyze:
    ${urls.join("\n")}
    
    Instructions:
    1. For each character mentioned in these sources, UPDATE their existing knowledge by merging the new information.
    2. IMPORTANT: Only update characters that are present in the "Characters Knowledge" list above.
    3. Use the EXACT name from the "Characters Knowledge" list for the "name" field in the JSON response. Do not add surnames if they are not in the list.
    4. Keep the information SELECTIVE and SUMMARIZED.
    3. For each character, provide:
       - Name
       - Past events: A list of key past events (merged).
       - Current relationships: A list of current allies and enemies (merged).
       - Current status: A list of current roles, locations, or conditions (merged).
       - Current plotlines: A list of specific events currently happening to them (merged).
    4. Update the "Current Global Plot" by merging the new events with the existing ones.
    
    FORMATTING RULES:
    - Every field (except "name") MUST be a bulleted list where each line starts with "- ".
    - IMPORTANT: Each bullet point MUST be on a NEW LINE.
    
    Output Format: Return a JSON object with the following structure:
    {
      "characters": [
        {
          "name": "...",
          "past": "...",
          "relationships": "...",
          "status": "...",
          "currentPlot": "..."
        }
      ],
      "generalPlot": "..."
    }
    
    STRICT: Ensure all data is from the most recent 2025/2026 articles.
    LANGUAGE: All extracted information (characters, generalPlot) MUST be in English. Do not use Vietnamese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  past: { type: Type.STRING },
                  relationships: { type: Type.STRING },
                  status: { type: Type.STRING },
                  currentPlot: { type: Type.STRING }
                },
                required: ["name", "past", "relationships", "status", "currentPlot"]
              }
            },
            generalPlot: { type: Type.STRING }
          },
          required: ["characters", "generalPlot"]
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.characters && Array.isArray(result.characters)) {
      updateManyCharacters(result.characters);
    }
    
    if (result.generalPlot) {
      updateGlobalPlot(result.generalPlot);
    }
  } catch (error) {
    console.error("Error updating brain from specific sources:", error);
  }
};

/**
 * Analyzes a provided article/text to update multiple characters and the global plot.
 */
export const analyzeArticleForBrain = async (articleText: string): Promise<void> => {
  const model = "gemini-3-pro-preview";
  const brainData = loadBrainData();
  
  const prompt = `
    Role: Expert Continuity Editor for "The Bold and the Beautiful".
    Task: Analyze the following text (recap, spoiler, or news article) and selectively update the show's knowledge base (BRAIN ACTIVE).
    
    CURRENT BRAIN KNOWLEDGE (To be updated):
    - Global Plot: 
    ${brainData.generalPlot}
    
    - Characters Knowledge:
    ${brainData.characters.map(c => `* ${c.name}: ${c.currentPlot}`).join("\n")}
    
    NEW TEXT TO ANALYZE:
    """
    ${articleText}
    """
    
    Instructions:
    1. Identify all characters mentioned in the NEW TEXT.
    2. IMPORTANT: Only update characters that are present in the "Characters Knowledge" list above.
    3. For each such character, UPDATE their existing knowledge by merging the new information. 
    4. Use the EXACT name from the "Characters Knowledge" list for the "name" field in the JSON response. Do not add surnames if they are not in the list.
    5. Keep the information SELECTIVE and SUMMARIZED.
    4. For each character, provide:
       - Name
       - Past events: A list of key past events (merged).
       - Current relationships: A list of current allies and enemies (merged).
       - Current status: A list of current roles, locations, or conditions (merged).
       - Current plotlines: A list of specific events currently happening to them (merged).
    5. Update the "Current Global Plot" by merging the new events with the existing ones.
    
    FORMATTING RULES:
    - Every field (except "name") MUST be a bulleted list where each point starts with "- ".
    - IMPORTANT: Each bullet point MUST be on a NEW LINE.
    
    Output Format: Return a JSON object with the following structure:
    {
      "characters": [
        {
          "name": "...",
          "past": "...",
          "relationships": "...",
          "status": "...",
          "currentPlot": "..."
        }
      ],
      "generalPlot": "..."
    }
    
    STRICT: Only include information found in the text or existing knowledge.
    LANGUAGE: All extracted information (characters, generalPlot) MUST be in English. Do not use Vietnamese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  past: { type: Type.STRING },
                  relationships: { type: Type.STRING },
                  status: { type: Type.STRING },
                  currentPlot: { type: Type.STRING }
                },
                required: ["name", "past", "relationships", "status", "currentPlot"]
              }
            },
            generalPlot: { type: Type.STRING }
          },
          required: ["characters", "generalPlot"]
        }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    if (result.characters && Array.isArray(result.characters)) {
      updateManyCharacters(result.characters);
    }
    
    if (result.generalPlot) {
      updateGlobalPlot(result.generalPlot);
    }
  } catch (error) {
    console.error("Error analyzing article for brain:", error);
    throw new Error("Không thể phân tích dữ liệu nạp vào.");
  }
};

/**
 * Generates a formatted title for a timeline entry based on its content.
 * Format: [D/M/YYYY] | <TYPE> <DATE_RANGE>
 */
export const generateTimelineTitle = async (articleText: string, currentDate: string): Promise<string> => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Role: Expert Content Classifier for "The Bold and the Beautiful".
    Task: Analyze the following text and determine the appropriate title for a timeline entry.
    
    Current Date: ${currentDate}
    Text to analyze:
    """
    ${articleText}
    """
    
    Instructions:
    1. Identify the TYPE of content: "NEXT WEEK", "NEXT 2 WEEKS", "NEXT 3 WEEKS", or "PREVIEW MONTH".
    2. Extract the DATE RANGE mentioned in the text (e.g., "9 To 13 March 2026").
    3. Format the final title exactly as: [${currentDate}] | <TYPE> <DATE_RANGE>
    
    Example Output: [${currentDate}] | NEXT WEEK 9 To 13 March 2026
    
    STRICT: Return ONLY the formatted title string. No other text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return (response.text || "").trim();
  } catch (error) {
    console.error("Error generating timeline title:", error);
    return `[${currentDate}] | New Timeline Entry`;
  }
};

export interface SpoilerResponse {
  spoilers: Spoiler[];
}

export const generateSpoilers = async (userTopic?: string, excludeTitles: string[] = []): Promise<SpoilerResponse> => {
  const model = "gemini-3-pro-preview";
  const brainData = loadBrainData();
  
  // Get specific character context if available
  const charContext = userTopic ? brainData.characters.find(c => c.name.toLowerCase() === userTopic.toLowerCase()) : null;
  
  const brainContext = `
    BRAIN ACTIVE KNOWLEDGE (Current Truth):
    - Global Plot: ${brainData.generalPlot}
    ${charContext ? `
    - Character Focus: ${charContext.name}
    - Past: ${charContext.past}
    - Relationships: ${charContext.relationships}
    - Status: ${charContext.status}
    - Current Plot: ${charContext.currentPlot}
    ` : ""}
  `;

  let topicConstraint = "";
  if (userTopic && userTopic.trim().length > 0) {
    topicConstraint = `
    RÀNG BUỘC CHỦ ĐỀ CỨNG: 
    - Tập trung tuyệt đối vào: "${userTopic}".
    - TẤT CẢ 10 kịch bản PHẢI lấy "${userTopic}" làm trọng tâm mâu thuẫn hoặc nhân vật chính.
    - TÍNH ĐỘC LẬP TUYỆT ĐỐI (PARALLEL SCENARIOS): Coi mỗi kịch bản là một "vũ trụ song song" hoặc một khả năng xảy ra riêng biệt.
    - KHÔNG LIÊN KẾT: Kịch bản số 2 không được liên quan đến kịch bản số 1. Kịch bản số 3 không được là hậu quả của kịch bản số 2.
    - KHÔNG NỐI TIẾP: Tuyệt đối không viết theo dạng "Part 1, Part 2" hoặc một chuỗi sự kiện kéo dài.
    `;
  } else {
    topicConstraint = "Tạo ra 10 kịch bản độc lập hoàn toàn, mỗi kịch bản xoay quanh một mâu thuẫn hoặc tuyến nhân vật khác nhau, không có sự liên kết về mặt logic hay thời gian giữa chúng.";
  }

  const prompt = `
    Bối cảnh: Bạn là Trưởng biên kịch của phim "The Bold and the Beautiful". 
    
    DỮ LIỆU THAM CHIẾU TỪ BRAIN ACTIVE:
    ${brainContext}

    NGUYÊN TẮC SÁNG TẠO MỚI (QUAN TRỌNG):
    1. NỀN TẢNG THỰC TẾ: Sử dụng các "Nguồn đối soát thực tế" (recaps/spoilers mới nhất) CHỈ làm nền tảng cốt lõi.
    2. PHÓNG ĐẠI & BIẾN TẤU: Từ nền tảng đó, bạn PHẢI thực hiện việc "phóng đại" và "biến tấu" để tạo ra những cú twist (bước ngoặt) cực kỳ gay cấn, những bí mật kinh hoàng hoặc những sự phản bội gây sốc.
    3. PHONG CÁCH DRAMA CAO TRÀO: Chuyển sang lối viết đậm chất drama, kịch tính mạnh mẽ. Không được viết theo kiểu tóm tắt báo chí khô khan. Nội dung phải "nóng" và hấp dẫn hơn nhiều so với thông tin gốc.
    4. TÍNH NHẤT QUÁN: Dù sáng tạo thêm, bạn vẫn PHẢI đối chiếu với BRAIN ACTIVE để giữ đúng tính cách, lịch sử và logic của nhân vật trong phim.

    QUY TRÌNH NỘI BỘ:
    1. Sử dụng Google Search truy cập 20+ bài recap mới nhất để nắm bắt tình hình phim hiện tại.
    2. Áp dụng NGUYÊN TẮC SÁNG TẠO MỚI để nhào nặn thông tin thành các kịch bản drama đỉnh cao.
    3. Đảm bảo trạng thái nhân vật khớp với BRAIN ACTIVE.

    YÊU CẦU ĐẦU RA (OUTPUT):
    Bạn phải trả về một đối tượng JSON chứa:
    1. "spoilers": Danh sách 10 kịch bản spoilers kịch tính nhất. 
       - ĐỘ DÀI: Mỗi kịch bản PHẢI dài khoảng 500 ký tự (đảm bảo đủ không gian cho các tình tiết drama).
       - NỘI DUNG: Mỗi kịch bản phải chứa nhiều ý tưởng/tình tiết khác nhau, kịch tính, bí ẩn và đầy bất ngờ.
       - ĐỘC LẬP TUYỆT ĐỐI: Mỗi kịch bản là một khả năng riêng biệt. Tuyệt đối không có sự liên kết hay nối tiếp giữa 10 kịch bản này.
       - PHONG CÁCH: Viết theo lối văn chương drama cao trào, lôi cuốn.
       - TUYỆT ĐỐI KHÔNG SỬ DỤNG DẤU NGOẶC ĐƠN ( ) trong toàn bộ nội dung.
       - NGUỒN ĐỐI SOÁT: Với mỗi kịch bản, bạn PHẢI tìm và liệt kê 2 đến 4 link bài báo thực tế (recaps/spoilers) mới nhất (2025/2026) làm nền tảng cho kịch bản đó. Định dạng: "[Tiêu đề](URL)".

    ${topicConstraint}
    
    LANGUAGE: Spoilers (title, content) MUST be in Vietnamese.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            spoilers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  sources: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        uri: { type: Type.STRING }
                      },
                      required: ["title", "uri"]
                    }
                  }
                },
                required: ["title", "content", "sources"]
              }
            }
          },
          required: ["spoilers"]
        },
        thinkingConfig: { thinkingBudget: 1000 }
      },
    });

    const result = JSON.parse(response.text || "{}");
    
    const spoilers: Spoiler[] = (result.spoilers || []).map((s: any, index: number) => ({
      id: `bb-drama-${Date.now()}-${index}`,
      title: s.title.replace(/\(|\)/g, ""),
      content: s.content.replace(/\(|\)/g, ""),
      sources: s.sources
    }));

    return {
      spoilers
    };
  } catch (error) {
    console.error("Error generating spoilers:", error);
    throw new Error("Lỗi khi tạo kịch bản drama.");
  }
};

export const generateLongArticle = async (editedLines: string[], customTemplate?: string): Promise<LongArticleResult> => {
  throw new Error("Tính năng 'Tự viết' đã bị gỡ bỏ theo yêu cầu.");
};

/**
 * Updates a specific English paragraph based on its modified Vietnamese counterpart.
 */
export const updateEnglishParagraph = async (vietnameseParagraph: string, originalEnglish: string): Promise<string> => {
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Role: Professional Translator for "The Bold and the Beautiful".
    Task: Translate the following Vietnamese paragraph into English. 
    Maintain the style and tone of the original English version provided as reference.
    
    Original English Reference:
    """
    ${originalEnglish}
    """
    
    New Vietnamese Paragraph to Translate:
    """
    ${vietnameseParagraph}
    """
    
    Instructions:
    1. Provide ONLY the English translation.
    2. Do NOT include any meta-commentary or titles.
    3. Ensure the translation is accurate and fits the context of the show.
    4. NO PARENTHESES.
    
    Output: The translated English text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }
      },
    });

    return (response.text || "").replace(/\(|\)/g, "").trim();
  } catch (error) {
    console.error("Error updating English paragraph:", error);
    return originalEnglish; // Fallback to original if error
  }
};
