// Sistema de cache otimizado para API AnimeThemes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Tipos específicos para dados de rating
export interface RatingData {
  averageScore: number | null;
  ratingCount: number;
  userScore: number | null;
}

// Tipo para dados gerais do cache
type CacheableData = Record<string, unknown>;

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly RATINGS_TTL = 2 * 60 * 1000; // 2 minutos para ratings
  private readonly ANIME_TTL = 10 * 60 * 1000; // 10 minutos para dados de anime

  // Cache com TTL customizável
  set<T>(key: string, data: T, customTtl?: number): void {
    const ttl = customTtl || this.DEFAULT_TTL;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Buscar do cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Verificar se expirou
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Verificar se existe no cache
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Limpar cache expirado
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Limpar todo o cache
  clear(): void {
    this.cache.clear();
  }

  // Métodos específicos para diferentes tipos de dados
  setAnimeData<T>(animeSlug: string, data: T): void {
    this.set(`anime:${animeSlug}`, data, this.ANIME_TTL);
  }

  getAnimeData<T>(animeSlug: string): T | null {
    return this.get<T>(`anime:${animeSlug}`);
  }

  setRatingData(animeSlug: string, themeSlug: string, data: RatingData): void {
    this.set(`rating:${animeSlug}:${themeSlug}`, data, this.RATINGS_TTL);
  }

  getRatingData(animeSlug: string, themeSlug: string): RatingData | null {
    return this.get(`rating:${animeSlug}:${themeSlug}`);
  }

  setThemeData<T>(themeId: number, data: T): void {
    this.set(`theme:${themeId}`, data, this.ANIME_TTL);
  }

  getThemeData<T>(themeId: number): T | null {
    return this.get<T>(`theme:${themeId}`);
  }

  setArtistData<T>(artistSlug: string, data: T): void {
    this.set(`artist:${artistSlug}`, data, this.ANIME_TTL);
  }

  getArtistData<T>(artistSlug: string): T | null {
    return this.get<T>(`artist:${artistSlug}`);
  }

  // Cache para listas de temas
  setThemesList<T>(filters: string, data: T): void {
    this.set(`themes:${filters}`, data, this.DEFAULT_TTL);
  }

  getThemesList<T>(filters: string): T | null {
    return this.get<T>(`themes:${filters}`);
  }

  // Estatísticas do cache
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Implementar contador de hits se necessário
    };
  }
}

// Cache para localStorage (persistente)
class LocalStorageCache {
  private readonly PREFIX = 'anisongs_cache_';
  private readonly RATINGS_KEY = 'ratings_cache';
  private readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

  // Salvar ratings no localStorage
  saveRatings(ratings: Map<string, RatingData>): void {
    try {
      const data = {
        ratings: Array.from(ratings.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem(this.PREFIX + this.RATINGS_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Erro ao salvar ratings no localStorage:', error);
    }
  }

  // Carregar ratings do localStorage
  loadRatings(): Map<string, RatingData> | null {
    try {
      const stored = localStorage.getItem(this.PREFIX + this.RATINGS_KEY);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Verificar se não expirou
      if (Date.now() - data.timestamp > this.MAX_AGE) {
        this.clearRatings();
        return null;
      }

      return new Map(data.ratings);
    } catch (error) {
      console.warn('Erro ao carregar ratings do localStorage:', error);
      return null;
    }
  }

  // Limpar ratings do localStorage
  clearRatings(): void {
    try {
      localStorage.removeItem(this.PREFIX + this.RATINGS_KEY);
    } catch (error) {
      console.warn('Erro ao limpar ratings do localStorage:', error);
    }
  }

  // Salvar dados gerais
  save(key: string, data: CacheableData, ttl: number = this.MAX_AGE): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
    }
  }

  // Carregar dados gerais
  load<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(this.PREFIX + key);
      if (!stored) return null;

      const cacheData = JSON.parse(stored);
      
      // Verificar se não expirou
      if (Date.now() - cacheData.timestamp > cacheData.ttl) {
        this.remove(key);
        return null;
      }

      return cacheData.data as T;
    } catch (error) {
      console.warn('Erro ao carregar do localStorage:', error);
      return null;
    }
  }

  // Remover item
  remove(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch (error) {
      console.warn('Erro ao remover do localStorage:', error);
    }
  }

  // Limpar todo o cache
  clearAll(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith(this.PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Erro ao limpar localStorage:', error);
    }
  }
}

// Instâncias globais
export const apiCache = new ApiCache();
export const localCache = new LocalStorageCache();

// Limpeza automática do cache a cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000);
}

// Função utilitária para criar chaves de cache
export function createCacheKey(type: string, ...params: (string | number)[]): string {
  return `${type}:${params.join(':')}`;
}

// Função para fetch com cache automático e retry
export async function fetchWithCache<T>(
  url: string,
  cacheKey: string,
  ttl?: number,
  options?: RequestInit
): Promise<T> {
  // Tentar buscar do cache primeiro
  const cached = apiCache.get<T>(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit: ${cacheKey}`);
    return cached;
  }

  console.log(`🌐 Cache miss, fetching: ${url}`);
  
  // Buscar da API com retry
  const data = await fetchWithRetry<T>(url, options);
  
  // Salvar no cache
  apiCache.set(cacheKey, data, ttl);
  
  return data;
}

// Função de fetch com retry automático e backoff exponencial
export async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });

      if (!response.ok) {
        // Erros 4xx (exceto 429) não devem ser retentados — falha imediata
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw Object.assign(
            new Error(`Client error: ${response.status} ${response.statusText}`),
            { nonRetryable: true }
          );
        }
        throw new Error(
          response.status === 429
            ? `Rate limited: ${response.status}`
            : `Server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      if (attempt > 0) {
        console.log(`✅ Sucesso após ${attempt} tentativas para: ${url}`);
      }
      return data as T;
    } catch (error) {
      lastError = error as Error;

      // Não retentar erros de cliente (4xx)
      if ((lastError as Error & { nonRetryable?: boolean }).nonRetryable) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * delay;
        const totalDelay = delay + jitter;
        console.log(`⚠️ Tentativa ${attempt + 1} falhou para ${url}. Tentando novamente em ${Math.round(totalDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }

  console.error(`❌ Todas as ${maxRetries + 1} tentativas falharam para: ${url}`);
  throw lastError;
}

// Função específica para API AnimeThemes com configurações otimizadas
export async function fetchAnimeThemesApi<T>(
  endpoint: string,
  params?: URLSearchParams,
  cacheKey?: string
): Promise<T> {
  const url = params ? `${endpoint}?${params.toString()}` : endpoint;
  const key = cacheKey || createCacheKey('api', endpoint, params?.toString() || '');
  
  return fetchWithCache<T>(url, key, undefined, {
    // Configurações específicas para AnimeThemes API
    signal: AbortSignal.timeout(30000), // 30 segundos timeout
  });
}

const cacheService = { apiCache, localCache, fetchWithCache, createCacheKey };
export default cacheService;