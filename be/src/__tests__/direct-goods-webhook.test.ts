import { extractDirectGoodsTransferCandidates } from '../modules/direct-payment-v2/direct-goods-payment-webhook.service';

describe('direct goods SePay webhook parsing', () => {
  test('extracts an exact contract transfer code from SePay code', () => {
    expect(extractDirectGoodsTransferCandidates({
      code: ' prnpre20260001p2 ',
      content: 'Thanh toan hop dong',
    })).toEqual(['PRNPRE20260001P2']);
  });

  test('extracts a contract code from transfer content', () => {
    expect(extractDirectGoodsTransferCandidates({
      content: 'CK PRNPRE20260009P1 thanh toan dot 1',
    })).toEqual(['PRNPRE20260009P1']);
  });

  test('never routes platform fee codes into goods payments', () => {
    expect(extractDirectGoodsTransferCandidates({
      code: 'PRNFEPFABCDEF123456',
      content: 'PRNFEPFABCDEF123456',
    })).toEqual([]);
  });
});
