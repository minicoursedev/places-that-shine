declare module 'designer-og-manifest' {
  const images: Record<string, {
    url: string;
    width: number;
    height: number;
    type: string;
    alt: string;
  }>;

  export default images;
}
