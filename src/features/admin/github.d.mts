import type { GalleryContent, BannerConfiguration } from '../../content/gallery-content.mjs';
import type { Category } from '../gallery/types';
export interface PortfolioSnapshot { gallery: GalleryContent; banners: BannerConfiguration; categories: Category[] }
export class GitHubError extends Error { code: string; retryAfter: number | null }
export class GitHubPortfolio {
  constructor(repository: string, branch: string, token: string, fetcher?: typeof fetch);
  repository: string;
  branch: string;
  head: string | null;
  load(): Promise<PortfolioSnapshot>;
  imageURL(sourcePath: string): string;
  save(gallery: GalleryContent, banners: BannerConfiguration): Promise<string>;
  disconnect(): void;
}
