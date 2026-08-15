import React from 'react';
import { View } from '@react-pdf/renderer';

/**
 * Akıştaki bloklar arası boşluk.
 *
 * Neden marginBottom değil: react-pdf `endOfPresence` hesabına marginBottom'u
 * dahil eder; bu yüzden sayfa sonundaki bir blok, kendi yüksekliği sığsa bile
 * alt boşluğu sığmadığı için sonraki sayfaya atılır. Ayrı bir boşluk View'ı
 * sayfa sonunda kalır ve bu yanlış kırılmayı tamamen ortadan kaldırır.
 *
 * Ayrıca marginTop yerine spacer tercih edilir: marginTop, blok sonraki sayfaya
 * taşındığında sayfanın en üstünde istenmeyen ek boşluk bırakır.
 *
 * @see ./pdfPagination.ts
 */
export const PdfFlowGap = ({ heightPt }: { heightPt: number }) => (
  <View style={{ height: heightPt, width: '100%' }} />
);

/**
 * Blok listesinin ARASINA boşluk ekler (baştan ve sondan boşluk eklemez).
 * Fragment kullanılmaz; react-pdf düz element dizisiyle çalışır.
 */
export function withFlowGaps(
  blocks: React.ReactNode[],
  gapPt: number,
  keyPrefix = 'gap'
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  blocks.forEach((block, index) => {
    if (block === null || block === undefined || block === false) return;
    if (result.length > 0) {
      result.push(<PdfFlowGap key={`${keyPrefix}-${index}`} heightPt={gapPt} />);
    }
    result.push(block);
  });
  return result;
}
