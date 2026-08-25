declare module "html2canvas" {
  interface Html2CanvasOptions {
    scale?: number;
    backgroundColor?: string | null;
    useCORS?: boolean;
    [key: string]: unknown;
  }
  export default function html2canvas(
    element: HTMLElement,
    options?: Html2CanvasOptions
  ): Promise<HTMLCanvasElement>;
}
