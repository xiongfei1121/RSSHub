import { Route, DataItem } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/gov/:nodeId',
    categories: ['government'],
    example: '/ankang/gov/1466',
    parameters: { nodeId: '栏目ID，如 1466(安康要闻)、866(县市区新闻)、865(部门动态)' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
    },
    radar: [
        {
            source: ['www.ankang.gov.cn/Node-:nodeId.html'],
            target: '/gov/:nodeId',
        },
    ],
    name: '安康市政府',
    description: '安康市政府官网政务信息订阅',
    maintainers: ['xiongfei1121'],
    handler,
};

const categoryNames: Record<string, string> = {
    '1466': '安康要闻',
    '866': '县市区新闻',
    '865': '部门动态',
};

async function handler(ctx) {
    const { nodeId } = ctx.req.param();
    const targetUrl = `https://www.ankang.gov.cn/Node-${nodeId}.html`;
    const categoryName = categoryNames[nodeId] || '政务信息';

    const html = await ofetch(targetUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.ankang.gov.cn/',
        },
    });

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : `${categoryName} - 安康市政府`;

    const newsPattern = /<li><span class="date">(\d{4}-\d{2}-\d{2})<\/span><a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/gi;
    const items: DataItem[] = [];
    let match;

    while ((match = newsPattern.exec(html)) !== null) {
        const dateStr = match[1];
        let link = match[2];
        const title = match[3];

        if (!link.startsWith('http')) {
            link = 'https://www.ankang.gov.cn' + link;
        }

        items.push({
            title,
            link,
            description: title,
            pubDate: parseDate(dateStr, 'YYYY-MM-DD'),
            author: '安康市政府',
            category: categoryName,
        });
    }

    return {
        title: pageTitle,
        link: targetUrl,
        description: `${pageTitle} - 安康市政府官网政务信息订阅源`,
        language: 'zh-cn',
        item: items,
    };
}
