import { Route } from '@/types';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    // 这里必须写完整的访问路径
    path: '/ankang/news',
    categories: ['government'],
    example: '/ankang/news',
    parameters: {},
    features: {
        requireConsole: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['ankang.gov.cn/Node-1466.html', 'ankang.gov.cn/'],
            target: '/ankang/news',
        },
    ],
    name: '安康市人民政府 - 要闻动态',
    maintainers: ['YourName'],
    handler: async (ctx) => {
        const rootUrl = 'https://www.ankang.gov.cn';
        const currentUrl = `${rootUrl}/Node-1466.html`;

        const response = await got(currentUrl);
        const $ = load(response.data);

        // 针对安康政府网的通用列表选择器
        // 尝试匹配常见的 ul > li 结构
        const list = $('ul.list li, .news-list li, .sub-list li')
            .toArray()
            .map((item) => {
                const $item = $(item);
                const a = $item.find('a');
                
                let link = a.attr('href') || '';
                // 处理相对链接
                if (link && !link.startsWith('http')) {
                    link = new URL(link, rootUrl).href;
                }

                return {
                    title: a.attr('title') || a.text().trim(),
                    link,
                    pubDate: parseDate($item.find('span').text()), 
                };
            })
            .filter((item) => item.link && item.title); // 过滤无效项

        const items = await Promise.all(
            list.map((item) =>
                ctx.cache.tryGet(item.link, async () => {
                    try {
                        const detailResponse = await got(item.link);
                        const content = load(detailResponse.data);
                        
                        // 匹配正文内容，尝试多种可能的选择器
                        const description = content('#zoom').html() || 
                                          content('.view').html() || 
                                          content('.article-content').html() ||
                                          content('.TRS_Editor').html();
                        
                        item.description = description || '正文提取失败，请点击标题查看原文';
                        return item;
                    } catch (e) {
                        return item;
                    }
                })
            )
        );

        return {
            title: $('title').text() || '安康市人民政府 - 要闻动态',
            link: currentUrl,
            item: items,
        };
    },
};
