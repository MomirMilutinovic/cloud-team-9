export interface MovieInfo{
  id?:string;
  name?:string;
  episode?:string;
  description?:string;
  genres?:string[];
  actors?:string[];
  director?:string;
  year?:number;
  timestamp?:number;
}

export interface SubscriptionInfo{
  email: string;
  actors: string[];
  directors: string[];
  genres: string[];
}

export interface WatchInfo{
  email: string;
  movie_id?:string;
  genres?:string[];
  actors?:string[];
}

export interface RatingInfo{
  email: string;
  movie_id?:string;
  rate: number;
  genres?: string[];
  actors?: string[];
}

export interface Subscription{
  id?:string,
  email?: string,
  timestamp?:string,
  type?:string,
  subscription?:string
}

export interface PresignedUrl {
  uploadUrl: string;
}

