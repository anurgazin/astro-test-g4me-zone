export interface Article{
	_id: string,
	title: string,
    text: string,
    rating: number,
    date: Date,
    image: string,
    genre: string,
    release_date: Date,
    author: string,
    approved: boolean
}

export interface Comment{
    article: string,
    text: string,
    author: string,
    date: Date
}