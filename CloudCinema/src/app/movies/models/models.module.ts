export interface MovieInfo{
  id?:string;
  name?:string;
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

export interface Subscription{
  id?:string,
  email?: string,
  timestamp?:string,
  type?:string,
  subscription?:string
}
