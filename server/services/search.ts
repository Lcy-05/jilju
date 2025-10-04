import { storage, type BenefitSearchOptions } from "../storage";
import { Benefit, Merchant } from "@shared/schema";

interface SearchResult {
  id: string;
  type: 'benefit' | 'merchant';
  title: string;
  description?: string;
  score: number;
  merchant?: {
    id: string;
    name: string;
    address: string;
  };
  benefit?: Benefit;
}

interface AutocompleteResult {
  text: string;
  type: 'category' | 'merchant' | 'region' | 'benefit';
  id?: string;
  subtitle?: string;
}

class SearchService {
  private recentSearches = new Map<string, string[]>(); // userId -> searches
  private popularSearches = new Map<string, number>(); // search term -> count

  async searchBenefits(query: string, options: BenefitSearchOptions = {}): Promise<any[]> {
    try {
      // Track search for analytics
      this.trackSearch(query);

      // Use storage search with BM25-like scoring
      const results = await storage.searchBenefits(query, options);
      
      // Apply additional scoring based on query relevance
      const scoredResults = results.map(result => ({
        ...result,
        _score: this.calculateRelevanceScore(query, result as any)
      }));

      // Sort by score descending
      scoredResults.sort((a, b) => (b as any)._score - (a as any)._score);

      return scoredResults;
    } catch (error) {
      console.error('Benefit search failed:', error);
      return [];
    }
  }

  async searchMerchants(query: string): Promise<Merchant[]> {
    try {
      this.trackSearch(query);
      return await storage.searchMerchants(query);
    } catch (error) {
      console.error('Merchant search failed:', error);
      return [];
    }
  }

  async getAutocomplete(query: string, userId?: string): Promise<AutocompleteResult[]> {
    if (!query || query.length < 2) {
      return this.getRecentSearches(userId);
    }

    const results: AutocompleteResult[] = [];

    try {
      // Categories
      const categories = await storage.getCategories();
      const matchingCategories = categories
        .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(cat => ({
          text: cat.name,
          type: 'category' as const,
          id: cat.id,
          subtitle: '카테고리'
        }));

      results.push(...matchingCategories);

      // Regions
      const regions = await storage.getRegions();
      const matchingRegions = regions
        .filter(region => region.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(region => ({
          text: region.name,
          type: 'region' as const,
          id: region.id,
          subtitle: '지역'
        }));

      results.push(...matchingRegions);

      // Merchants (top matches)
      const merchants = await storage.searchMerchants(query);
      const merchantSuggestions = merchants
        .slice(0, 3)
        .map(merchant => ({
          text: merchant.name,
          type: 'merchant' as const,
          id: merchant.id,
          subtitle: merchant.address
        }));

      results.push(...merchantSuggestions);

      // Benefits (top matches)
      const benefits = await storage.searchBenefits(query);
      const benefitSuggestions = benefits
        .slice(0, 2)
        .map(benefit => ({
          text: (benefit as any).title,
          type: 'benefit' as const,
          id: (benefit as any).id,
          subtitle: (benefit as any).merchant?.name
        }));

      results.push(...benefitSuggestions);

      return results.slice(0, 10);
    } catch (error) {
      console.error('Autocomplete failed:', error);
      return [];
    }
  }

  getRecentSearches(userId?: string): AutocompleteResult[] {
    if (!userId) return [];

    const recent = this.recentSearches.get(userId) || [];
    return recent.slice(0, 5).map(search => ({
      text: search,
      type: 'recent' as any,
      subtitle: '최근 검색'
    }));
  }

  getPopularSearches(limit = 10): AutocompleteResult[] {
    const sorted = Array.from(this.popularSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);

    return sorted.map(([text, count]) => ({
      text,
      type: 'popular' as any,
      subtitle: `${count}회 검색`
    }));
  }

  addRecentSearch(userId: string, query: string) {
    const recent = this.recentSearches.get(userId) || [];
    
    // Remove if already exists
    const filtered = recent.filter(item => item !== query);
    
    // Add to front
    filtered.unshift(query);
    
    // Keep only last 10
    this.recentSearches.set(userId, filtered.slice(0, 10));
  }

  clearRecentSearches(userId: string) {
    this.recentSearches.delete(userId);
  }

  private trackSearch(query: string) {
    const current = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, current + 1);
  }

  private calculateRelevanceScore(query: string, item: any): number {
    let score = 0;
    const lowerQuery = query.toLowerCase();
    const searchableText = [
      item.title || '',
      item.name || '',
      item.description || '',
      (item.merchant?.name || ''),
      (item.address || '')
    ].join(' ').toLowerCase();

    // Exact match boost
    if (searchableText.includes(lowerQuery)) {
      score += 10;
    }

    // Word match boost
    const queryWords = lowerQuery.split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 1 && searchableText.includes(word)) {
        score += 5;
      }
    });

    // Title/name match boost (more important than description)
    const titleText = (item.title || item.name || '').toLowerCase();
    if (titleText.includes(lowerQuery)) {
      score += 15;
    }

    // Prefix match boost
    const words = searchableText.split(/\s+/);
    words.forEach(word => {
      if (word.startsWith(lowerQuery)) {
        score += 8;
      }
    });

    // Length penalty for very long matches
    if (searchableText.length > 100) {
      score -= 2;
    }

    // Boost for active/valid items
    if (item.status === 'ACTIVE') {
      score += 3;
    }

    // Boost for items with valid dates
    if (item.validTo && new Date(item.validTo) > new Date()) {
      score += 2;
    }

    return Math.max(0, score);
  }

  // Korean text processing helpers
  private normalizeKorean(text: string): string {
    // Handle Korean character normalization if needed
    return text.trim().toLowerCase();
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - could be enhanced with Korean NLP
    return text
      .toLowerCase()
      .split(/[\s,\.!?]+/)
      .filter(word => word.length > 1)
      .slice(0, 10);
  }

  // Search analytics
  getSearchStats(): {
    totalSearches: number;
    uniqueQueries: number;
    topSearches: Array<{ query: string; count: number }>;
  } {
    const totalSearches = Array.from(this.popularSearches.values())
      .reduce((sum, count) => sum + count, 0);

    const topSearches = Array.from(this.popularSearches.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches,
      uniqueQueries: this.popularSearches.size,
      topSearches
    };
  }
}

export const searchService = new SearchService();
