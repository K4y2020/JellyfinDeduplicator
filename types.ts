export interface JellyfinCredentials {
  serverUrl: string;
  username: string;
  accessToken: string;
  userId: string;
}

export interface ProviderIds {
  Tmdb?: string;
  Imdb?: string;
}

export interface MediaStream {
  Type: string;
  Codec: string;
  Language?: string;
  Width?: number;
  Height?: number;
  BitRate?: number;
  IsDefault: boolean;
  ChannelLayout?: string;
}

export interface MediaSource {
  Id: string;
  Name: string;
  Path: string;
  Container: string;
  Size: number;
  Bitrate?: number;
  MediaStreams: MediaStream[];
}

export interface JellyfinItem {
  Id: string;
  Name: string;
  OriginalTitle?: string;
  ProductionYear?: number;
  ProviderIds: ProviderIds;
  MediaSources?: MediaSource[];
  Type: string;
  ImageTags: {
    Primary?: string;
  };
  OfficialRating?: string;
  RunTimeTicks?: number;
  DateCreated?: string;
}

export interface DuplicateGroup {
  id: string; // The common ID (e.g., tmdb-12345)
  title: string;
  year?: number;
  items: JellyfinItem[];
}