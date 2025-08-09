import axios from 'axios';
// src/services/api.ts
interface ThemeFilters {
  year?: string;
  season?: string;
  type?: string;
}

interface Theme {
  id: string;
  title: string;
  type: string;
  year: string;
  season: string;
}

interface ArtistDetails {
  id: string;
  name: string;
  biography: string;
  themes: Theme[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function fetchThemes(filters: ThemeFilters): Promise<Theme[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.year) queryParams.append('year', filters.year);
    if (filters.season) queryParams.append('season', filters.season);
    if (filters.type) queryParams.append('type', filters.type);
    
    const response = await axios.get<Theme[]>(`${API_BASE_URL}/themes?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching themes:', error);
    throw new Error('Failed to fetch themes');
  }
}

export async function fetchArtistDetails(slug: string): Promise<ArtistDetails> {
  try {
    const response = await axios.get<ArtistDetails>(`${API_BASE_URL}/artists/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching artist details:', error);
    throw new Error('Failed to fetch artist details');
  }
}