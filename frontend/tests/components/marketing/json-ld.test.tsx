import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { JsonLd } from '@/components/marketing/json-ld';

function renderScript(data: Record<string, unknown>): string {
  const { container } = render(<JsonLd data={data} />);
  const script = container.querySelector('script[type="application/ld+json"]');
  expect(script).not.toBeNull();
  return script!.innerHTML;
}

describe('JsonLd', () => {
  it('never emits a raw closing script tag from user-controlled values', () => {
    const html = renderScript({
      '@type': 'SoftwareApplication',
      name: 'Evil </script><script>alert(1)</script>',
    });

    expect(html).not.toContain('</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('\\u003c');
  });

  it('escapes angle brackets and ampersands', () => {
    const html = renderScript({ name: '<a & b>' });

    expect(html).not.toContain('<');
    expect(html).not.toContain('>');
    expect(html).not.toContain('&');
    expect(html).toContain('\\u003c');
    expect(html).toContain('\\u003e');
    expect(html).toContain('\\u0026');
  });

  it('escapes U+2028 and U+2029 line terminators', () => {
    const html = renderScript({ name: 'a\u2028b\u2029c' });

    expect(html).not.toContain(String.fromCharCode(0x2028));
    expect(html).not.toContain(String.fromCharCode(0x2029));
    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
  });

  it('still round-trips to the original data', () => {
    const data = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'TaskLabs </script>',
      count: 3,
      nested: { ok: true },
    };

    expect(JSON.parse(renderScript(data))).toEqual(data);
  });
});
