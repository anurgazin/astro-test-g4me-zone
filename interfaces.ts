export interface Article {
  _id: string;
  title: string;
  text: string;
  rating: number;
  date: Date;
  image: string;
  genre: string;
  release_date: Date;
  author: string;
  approved: boolean;
}

export interface Comment {
  article: string;
  text: string;
  author: string;
  date: Date;
}

export interface Page {
  data: Article[];
  start: number;
  end: number;
  size: number;
  total: number;
  currentPage: number;
  lastPage: number;
  url: {
    current: string;
    next: string;
    prev: string;
  };
}
