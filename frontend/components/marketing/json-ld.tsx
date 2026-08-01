/**
 * Serializes JSON-LD for injection into a <script> tag.
 *
 * `JSON.stringify` does not escape characters that terminate a script element,
 * so a value containing `</script>` (a task title, workspace name, or any other
 * user-controlled string that reaches structured data) would break out of the
 * script context and execute as markup. Escaping `<`, `>` and `&` as unicode
 * escapes keeps the payload valid JSON while making breakout impossible.
 * U+2028/U+2029 are escaped because they are literal line terminators in older
 * JS parsers.
 */
function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(
      /[\u2028\u2029]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16)}`,
    );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
