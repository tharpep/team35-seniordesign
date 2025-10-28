/**
 * Materials Service
 * 
 * Handles study artifacts (materials) API calls for mobile app
 * Fetches flashcards, equations, MCQs, and insights for sessions
 */

import { API_ENDPOINTS } from '../config/api';
import { apiService, ApiResponse } from './api.service';

export type MaterialType = 'flashcard' | 'equation' | 'multiple_choice' | 'insights';

export interface Material {
  id: number;
  session_id: number;
  type: MaterialType;
  title: string;
  content: string; // JSON string or plain text
  created_at: string;
}

export interface MaterialsResponse {
  materials: Material[];
}

export interface MaterialDetailResponse {
  material: Material;
}

// Parsed content types
export interface FlashcardContent {
  question: string;
  answer: string;
}

export interface EquationContent {
  formula: string;
  description?: string;
  variables?: Record<string, string>;
}

export interface MultipleChoiceContent {
  question: string;
  options: string[];
  correct: number;
}

class MaterialsService {
  /**
   * Get all materials for a specific session
   */
  async getMaterialsBySession(sessionId: number): Promise<ApiResponse<MaterialsResponse>> {
    return apiService.get<MaterialsResponse>(API_ENDPOINTS.MATERIALS.LIST(sessionId));
  }

  /**
   * Get a specific material by ID
   */
  async getMaterialById(materialId: number): Promise<ApiResponse<MaterialDetailResponse>> {
    return apiService.get<MaterialDetailResponse>(API_ENDPOINTS.MATERIALS.GET(materialId));
  }

  /**
   * Parse material content based on type
   */
  parseContent<T>(material: Material): T | string {
    try {
      // Try to parse as JSON
      return JSON.parse(material.content) as T;
    } catch {
      // Return as string if not valid JSON (e.g., insights)
      return material.content;
    }
  }

  /**
   * Get materials grouped by type
   */
  groupMaterialsByType(materials: Material[]): Record<MaterialType, Material[]> {
    return materials.reduce((acc, material) => {
      if (!acc[material.type]) {
        acc[material.type] = [];
      }
      acc[material.type].push(material);
      return acc;
    }, {} as Record<MaterialType, Material[]>);
  }

  /**
   * Count materials by type
   */
  countMaterialsByType(materials: Material[]): Record<string, number> {
    return materials.reduce((acc, material) => {
      const typeKey = material.type === 'multiple_choice' ? 'questions' : 
                     material.type === 'flashcard' ? 'flashcards' : 
                     material.type === 'equation' ? 'equations' : 'insights';
      
      acc[typeKey] = (acc[typeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get display icon for material type
   */
  getTypeIcon(type: MaterialType): string {
    const icons: Record<MaterialType, string> = {
      flashcard: '📚',
      equation: '⚡',
      multiple_choice: '❓',
      insights: '💡'
    };
    return icons[type] || '📄';
  }

  /**
   * Get display name for material type
   */
  getTypeName(type: MaterialType): string {
    const names: Record<MaterialType, string> = {
      flashcard: 'Flashcard',
      equation: 'Equation',
      multiple_choice: 'Multiple Choice',
      insights: 'Insights'
    };
    return names[type] || type;
  }

  /**
   * Get plural display name for material type
   */
  getTypePluralName(type: MaterialType): string {
    const names: Record<MaterialType, string> = {
      flashcard: 'Flashcards',
      equation: 'Equations',
      multiple_choice: 'Questions',
      insights: 'Insights'
    };
    return names[type] || type;
  }
}

// Export singleton instance
export const materialsService = new MaterialsService();
