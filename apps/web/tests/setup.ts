import "fake-indexeddb/auto";

// jsdom does not implement ImageData — provide a spec-shaped polyfill for
// pixel-analysis unit tests.
class ImageDataPolyfill {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  readonly colorSpace = "srgb";
  constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = widthOrHeight;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = widthOrHeight;
      this.height = height ?? dataOrWidth.length / 4 / widthOrHeight;
    }
  }
}
(globalThis as Record<string, unknown>).ImageData = ImageDataPolyfill;
