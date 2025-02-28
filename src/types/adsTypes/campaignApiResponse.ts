export interface CampaignApiReport {
    name: string;
    campaignType: string;
    targetingType: string;
    status: string;
    budgetType: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    dailyBudget: number;
    rollover: boolean;
    advertiserId: number;
    campaignId: number;
    biddingStrategy: object;
    channel: string;
    store_id: number;
}
