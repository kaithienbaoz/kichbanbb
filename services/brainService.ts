import { BrainActiveData, CharacterKnowledge } from "../types";
import { fetchCharacterNamesFromSheet } from "./sheetService";

const STORAGE_KEY = "bb_brain_active_data";

const DEFAULT_DATA: BrainActiveData = {
  characters: [],
  generalPlot: "- The Bold and the Beautiful follows the Forrester, Logan, and Spencer families in the fashion world of Los Angeles.\n- Major conflicts revolve around Forrester Creations and complex romantic entanglements.",
  pastPlots: [],
  timeline: [],
  lastGlobalUpdate: new Date().toISOString(),
  perplexityTemplate: "Based on the current plot of The Bold and the Beautiful, Write an article of 1500 to 2200 words in English, talking about the issue: \"NỘI DUNG\"\n\nWrite an article that presents the events above without going into too much analysis, while creating an interesting and engaging plot to attract readers. Don't talk too much about the past, just focus on the points I mentioned above, don't write too long. The above details are fictional, but please write a complete article. Write in a clear order, and add a little dialogue for the characters.",
  customPromptTemplate: "Write a high-quality analysis for the following spoiler: \"NỘI DUNG\"",
  articlePromptTemplate: "Role: Professional Narrator for \"The Bold and the Beautiful\". Core data: \"NỘI DUNG\". Write a detailed article.",
  backupLink1: "",
  backupLink2: "",
};

export const loadBrainData = (): BrainActiveData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_DATA;
  try {
    const parsed = JSON.parse(stored);
    // Merge with DEFAULT_DATA to ensure new fields like pastPlots exist
    const characters = Array.isArray(parsed.characters) ? parsed.characters : [];
    
    // Deduplicate characters by name (case-insensitive)
    const uniqueCharacters = Array.from(
      new Map(
        characters
          .filter((c: any) => c && c.name && c.name.trim())
          .map((c: any) => [c.name.trim().toLowerCase(), { ...c, name: c.name.trim() }])
      ).values()
    );

    return {
      ...DEFAULT_DATA,
      ...parsed,
      characters: uniqueCharacters,
      pastPlots: Array.isArray(parsed.pastPlots) ? parsed.pastPlots : [],
      timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
      lastGlobalUpdate: parsed.lastGlobalUpdate || DEFAULT_DATA.lastGlobalUpdate,
      backupLink1: parsed.backupLink1 || "",
      backupLink2: parsed.backupLink2 || ""
    };
  } catch (e) {
    console.error("Failed to parse brain data", e);
    return DEFAULT_DATA;
  }
};

export const saveBrainData = (data: BrainActiveData): void => {
  // Final safety check: Deduplicate characters by name (case-insensitive and trimmed)
  const uniqueCharsMap = new Map<string, CharacterKnowledge>();
  
  (data.characters || []).forEach(char => {
    const key = char.name.trim().toLowerCase();
    if (key) {
      // If duplicate found, keep the one with more content or the existing one
      uniqueCharsMap.set(key, { ...char, name: char.name.trim() });
    }
  });

  const cleanData: BrainActiveData = {
    ...data,
    characters: Array.from(uniqueCharsMap.values())
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
};

export const updateCharacterKnowledge = (knowledge: CharacterKnowledge): void => {
  const data = loadBrainData();
  const trimmedName = knowledge.name.trim();
  const index = data.characters.findIndex(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase());
  
  const updatedKnowledge = { ...knowledge, name: trimmedName };
  
  if (index >= 0) {
    data.characters[index] = updatedKnowledge;
  } else {
    data.characters.push(updatedKnowledge);
  }
  
  saveBrainData(data);
};

export const getCharacterKnowledge = (name: string): CharacterKnowledge | undefined => {
  const data = loadBrainData();
  const trimmedName = name.trim().toLowerCase();
  return data.characters.find(c => c.name.trim().toLowerCase() === trimmedName);
};

export const updateGlobalPlot = (newPlot: string): void => {
  const data = loadBrainData();
  
  // If the new plot is different from the current one, archive the old one
  if (data.generalPlot && data.generalPlot.trim() !== newPlot.trim()) {
    // Add old plot to pastPlots
    data.pastPlots = [
      {
        id: `plot-${Date.now()}`,
        content: data.generalPlot,
        date: data.lastGlobalUpdate
      },
      ...data.pastPlots
    ].slice(0, 50); // Keep last 50 past plots
  }
  
  data.generalPlot = newPlot;
  data.lastGlobalUpdate = new Date().toISOString();
  saveBrainData(data);
};

export const updateManyCharacters = (characters: CharacterKnowledge[]): void => {
  const data = loadBrainData();
  const currentCharsMap = new Map<string, CharacterKnowledge>(
    data.characters.map(c => [c.name.trim().toLowerCase(), c])
  );

  characters.forEach(char => {
    const trimmedName = char.name.trim();
    if (trimmedName) {
      const key = trimmedName.toLowerCase();
      
      // Try exact match first
      let targetKey = currentCharsMap.has(key) ? key : null;
      
      // If no exact match, try to find if any existing name is part of the returned name
      // or if the returned name is part of an existing name (fuzzy matching)
      if (!targetKey) {
        for (const existingKey of currentCharsMap.keys()) {
          // Check if one contains the other (e.g., "Brooke" vs "Brooke Logan")
          if (key.includes(existingKey) || existingKey.includes(key)) {
            targetKey = existingKey;
            break;
          }
        }
      }

      if (targetKey) {
        const existing = currentCharsMap.get(targetKey)!;
        currentCharsMap.set(targetKey, { 
          ...existing, 
          ...char, 
          name: existing.name, // Keep original name/casing from the list
          lastUpdated: new Date().toISOString() 
        });
      }
    }
  });

  data.characters = Array.from(currentCharsMap.values());
  saveBrainData(data);
};

export const addTimelineEntry = (contentTitle: string, content: string): void => {
  const data = loadBrainData();
  const newEntry = {
    id: `tl-${Date.now()}`,
    fedDate: new Date().toLocaleDateString('vi-VN'),
    contentTitle,
    content
  };
  data.timeline = [newEntry, ...(data.timeline || [])];
  saveBrainData(data);
};

export interface SyncResult {
  added: string[];
  removed: string[];
  total: number;
}

export const syncCharactersFromSheet = async (): Promise<SyncResult | null> => {
  try {
    const names = await fetchCharacterNamesFromSheet();
    if (!names || names.length === 0) {
      console.log("No character names found in sheet.");
      return { added: [], removed: [], total: 0 }; // Return empty result instead of null to avoid "cannot connect" error if it's just empty
    }

    const data = loadBrainData();
    const currentCharsMap = new Map<string, CharacterKnowledge>(
      data.characters.map(c => [c.name.trim().toLowerCase(), c])
    );

    const sheetNamesLower = new Set(names.map(n => n.trim().toLowerCase()));
    const currentNamesLower = new Set(currentCharsMap.keys());

    const added: string[] = [];
    const removed: string[] = [];

    // Find added
    names.forEach(name => {
      if (!currentNamesLower.has(name.trim().toLowerCase())) {
        added.push(name.trim());
      }
    });

    // Find removed
    data.characters.forEach(char => {
      if (!sheetNamesLower.has(char.name.trim().toLowerCase())) {
        removed.push(char.name.trim());
      }
    });

    console.log(`Sync check: ${added.length} added, ${removed.length} removed.`);

    if (added.length === 0 && removed.length === 0) {
      return { added: [], removed: [], total: data.characters.length };
    }

    // Create new character list based on sheet names
    const newCharacters: CharacterKnowledge[] = names.map(name => {
      const key = name.trim().toLowerCase();
      if (currentCharsMap.has(key)) {
        // Preserve existing data
        return { ...currentCharsMap.get(key)!, name: name.trim() };
      } else {
        // Create new character with empty data
        return {
          name: name.trim(),
          past: "",
          relationships: "",
          status: "",
          currentPlot: "",
          lastUpdated: new Date().toISOString()
        };
      }
    });

    data.characters = newCharacters;
    saveBrainData(data);
    console.log("Brain data saved after sync.");
    return { added, removed, total: data.characters.length };
  } catch (error) {
    console.error("Failed to sync characters from sheet:", error);
    throw error;
  }
};

export const deleteCharacter = (name: string): void => {
  if (!name) return;
  const data = loadBrainData();
  const trimmedName = name.trim().toLowerCase();
  
  const initialLength = data.characters.length;
  data.characters = (data.characters || []).filter(c => {
    if (!c || !c.name) return false;
    return c.name.trim().toLowerCase() !== trimmedName;
  });
  
  // Only save if something was actually removed
  if (data.characters.length !== initialLength) {
    saveBrainData(data);
  }
};
