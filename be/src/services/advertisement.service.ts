import { AppDataSource } from '../config/database';
import { AdvertisementCampaign } from '../models/AdvertisementCampaign.entity';
import { User } from '../models/User.entity';
import { postAdvertisingFeeWithManager } from '../modules/direct-payment-v2/fee-ledger.service';
import { makeError } from '../utils/error.util';
import { lockByIdOrFail, runLockedTransaction } from '../utils/transaction-lock.util';

export const ADVERTISEMENT_DAILY_RATE = Math.max(
  1_000,
  Number(process.env.ADVERTISEMENT_DAILY_RATE_VND || 49_000)
);

const clampDays = (value: unknown): number => {
  const days = Math.floor(Number(value));
  if (!Number.isFinite(days) || days < 1 || days > 90) {
    throw makeError('Số ngày quảng cáo phải từ 1 đến 90', 400);
  }
  return days;
};

const cleanText = (value: unknown, max: number, label: string): string => {
  const text = String(value || '').trim();
  if (!text) throw makeError(`${label} là bắt buộc`, 400);
  if (text.length > max) throw makeError(`${label} không được vượt quá ${max} ký tự`, 400);
  return text;
};

const publicCampaign = (campaign: AdvertisementCampaign) => ({
  id: campaign.id,
  title: campaign.title,
  content: campaign.content,
  bannerUrl: campaign.bannerUrl,
  targetUrl: campaign.targetUrl,
  province: campaign.province,
  district: campaign.district,
  startsAt: campaign.startsAt,
  endsAt: campaign.endsAt,
  farmer: campaign.farmer ? {
    id: campaign.farmer.id,
    name: campaign.farmer.farmName || campaign.farmer.fullName || 'Nông hộ Farmora',
    avatar: campaign.farmer.avatar,
    reputationScore: campaign.farmer.reputationScore,
  } : null,
});

export const getPricing = () => ({
  currency: 'VND',
  dailyRate: ADVERTISEMENT_DAILY_RATE,
  minimumDays: 1,
  maximumDays: 90,
  billingMode: 'monthly_platform_statement',
});

export const listPublic = async (province?: string) => {
  const now = new Date();
  const normalizedProvince = String(province || '').trim();
  const query = AppDataSource.getRepository(AdvertisementCampaign)
    .createQueryBuilder('campaign')
    .leftJoinAndSelect('campaign.farmer', 'farmer')
    .where("campaign.status = 'active'")
    .andWhere('campaign.startsAt <= :now AND campaign.endsAt > :now', { now })
    .take(12);

  // TypeORM cannot safely parse a raw CASE expression passed directly to
  // orderBy() when SQL Server pagination is enabled. Select it with a stable
  // alias first, then order by that alias.
  if (normalizedProvince) {
    query
      .addSelect('CASE WHEN campaign.province = :province THEN 0 ELSE 1 END', 'provincePriority')
      .setParameter('province', normalizedProvince)
      .orderBy('provincePriority', 'ASC')
      .addOrderBy('campaign.createdAt', 'DESC');
  } else {
    query.orderBy('campaign.createdAt', 'DESC');
  }

  const campaigns = await query.getMany();

  return campaigns.map(publicCampaign);
};

export const listMine = async (farmerId: string) => {
  const campaigns = await AppDataSource.getRepository(AdvertisementCampaign).find({
    where: { farmerId },
    order: { createdAt: 'DESC' },
  });
  const now = Date.now();
  return campaigns.map((campaign) => ({
    ...campaign,
    displayStatus: campaign.status === 'active' && new Date(campaign.endsAt).getTime() <= now
      ? 'expired'
      : campaign.status,
  }));
};

export const create = async (farmerId: string, body: any, bannerUrl: string) => {
  if (!bannerUrl) throw makeError('Vui lòng tải lên ảnh banner', 400);

  const title = cleanText(body.title, 140, 'Tên quảng cáo');
  const content = cleanText(body.content, 800, 'Nội dung quảng cáo');
  const durationDays = clampDays(body.durationDays);
  const totalAmount = durationDays * ADVERTISEMENT_DAILY_RATE;
  const targetUrl = String(body.targetUrl || '').trim() || null;
  if (targetUrl && !/^\/products\/[0-9a-f-]+$/i.test(targetUrl)) {
    throw makeError('Liên kết đích không hợp lệ', 400);
  }

  return runLockedTransaction(async (manager) => {
    const farmer = await lockByIdOrFail(
      manager,
      User,
      farmerId,
      () => makeError('Không tìm thấy Farmer', 404)
    );
    if (farmer.role !== 'farmer') throw makeError('Chỉ Farmer được tạo quảng cáo', 403);

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const repo = manager.getRepository(AdvertisementCampaign);
    const campaign = await repo.save(repo.create({
      farmerId,
      title,
      content,
      bannerUrl,
      targetUrl,
      province: farmer.province || null,
      district: farmer.district || null,
      durationDays,
      dailyRate: ADVERTISEMENT_DAILY_RATE,
      totalAmount,
      status: 'active',
      startsAt,
      endsAt,
      impressionCount: 0,
      clickCount: 0,
    }));

    await postAdvertisingFeeWithManager(manager, {
      userId: farmerId,
      campaignId: campaign.id,
      amount: totalAmount,
      description: `Quảng cáo “${title}” trong ${durationDays} ngày`,
    });

    return campaign;
  }, { label: 'advertisement.create' });
};

export const cancel = async (farmerId: string, campaignId: string) => (
  runLockedTransaction(async (manager) => {
    const campaign = await lockByIdOrFail(
      manager,
      AdvertisementCampaign,
      campaignId,
      () => makeError('Không tìm thấy chiến dịch', 404)
    );
    if (campaign.farmerId !== farmerId) throw makeError('Bạn không có quyền hủy chiến dịch này', 403);
    if (campaign.status !== 'active') throw makeError('Chiến dịch không còn hoạt động', 409);
    campaign.status = 'cancelled';
    return manager.getRepository(AdvertisementCampaign).save(campaign);
  }, { label: 'advertisement.cancel' })
);

export const track = async (campaignId: string, event: 'impression' | 'click') => {
  const column = event === 'click' ? 'ClickCount' : 'ImpressionCount';
  await AppDataSource.getRepository(AdvertisementCampaign)
    .createQueryBuilder()
    .update(AdvertisementCampaign)
    .set({ [event === 'click' ? 'clickCount' : 'impressionCount']: () => `[${column}] + 1` } as any)
    .where('AdvertisementCampaignId = :campaignId', { campaignId })
    .andWhere("Status = 'active'")
    .andWhere('EndsAt > SYSUTCDATETIME()')
    .execute();
};
