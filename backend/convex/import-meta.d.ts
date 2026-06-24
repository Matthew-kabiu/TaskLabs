interface ImportMeta {
  glob(
    pattern: string | string[],
  ): Record<string, () => Promise<Record<string, unknown>>>;
}
