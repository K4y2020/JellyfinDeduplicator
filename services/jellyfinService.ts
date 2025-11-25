import { JellyfinCredentials, JellyfinItem } from '../types';

/**
 * Normalizes the server URL to remove trailing slashes
 */
export const normalizeUrl = (url: string): string => {
  return url.replace(/\/$/, '');
};

/**
 * Generates a random device ID to prevent session conflicts
 */
const getDeviceId = () => {
  let deviceId = localStorage.getItem('jellyfin_device_id');
  if (!deviceId) {
    deviceId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('jellyfin_device_id', deviceId);
  }
  return deviceId;
};

/**
 * Authenticates with the Jellyfin server
 */
export const loginToJellyfin = async (serverUrl: string, username: string, password?: string) => {
  const normalizedUrl = normalizeUrl(serverUrl);
  const url = `${normalizedUrl}/Users/AuthenticateByName`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Emby-Authorization': `MediaBrowser Client="Jellyfin Deduplicator", Device="Web Client", DeviceId="${getDeviceId()}", Version="1.0.0"`
      },
      body: JSON.stringify({
        Username: username,
        Pw: password || ''
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid username or password.');
      }
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.AccessToken,
      userId: data.User.Id,
      serverUrl: normalizedUrl,
      username: data.User.Name
    };
  } catch (error: any) {
    // Helper to detect Mixed Content / CORS issues
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Connection failed. This is often caused by Mixed Content (HTTPS app connecting to HTTP server) or CORS issues.');
    }
    throw error;
  }
};

/**
 * Fetches all libraries (Views) for the user
 */
export const fetchLibraries = async (creds: JellyfinCredentials): Promise<JellyfinItem[]> => {
  const url = `${creds.serverUrl}/Users/${creds.userId}/Views`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Emby-Token': creds.accessToken
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch libraries.');
  }

  const data = await response.json();
  return data.Items || [];
};

/**
 * Fetches all movies from the library
 * @param parentId Optional ID of the library/folder to scan
 */
export const fetchMovies = async (creds: JellyfinCredentials, parentId?: string): Promise<JellyfinItem[]> => {
  const params = new URLSearchParams({
    IncludeItemTypes: 'Movie',
    Recursive: 'true',
    Fields: 'ProviderIds,MediaSources,Path,MediaStreams,DateCreated,Width,Height',
    SortBy: 'SortName'
  });

  if (parentId) {
    params.append('ParentId', parentId);
  }

  const url = `${creds.serverUrl}/Users/${creds.userId}/Items?${params.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Emby-Token': creds.accessToken
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch movies.');
  }

  const data = await response.json();
  return data.Items || [];
};

/**
 * Deletes an item from the library
 */
export const deleteItem = async (creds: JellyfinCredentials, itemId: string): Promise<void> => {
  const url = `${creds.serverUrl}/Items/${itemId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Emby-Token': creds.accessToken
    }
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Permission denied. Ensure the user has "Allow Media Deletion" enabled in Jellyfin Dashboard.');
    }
    throw new Error(`Failed to delete item. Status: ${response.status}`);
  }
};

/**
 * Helper to construct image URLs
 */
export const getImageUrl = (creds: JellyfinCredentials, itemId: string, tag?: string) => {
  if (!tag) return null;
  return `${creds.serverUrl}/Items/${itemId}/Images/Primary?tag=${tag}&maxHeight=400&quality=90`;
};
