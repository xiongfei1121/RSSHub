import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://www.ankang.gov.cn';

export const route: Route = {
    path: '/:path?',
    categories: ['government'],
    example: '/ankang/newslist-1466',
    parameters: { path: '路径，默认为 `Node-1466`' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '安康政府网站通用',
    maintainers: ['YourName'],
    handler,
    description: `:::tip
  路径处填写对应页面 URL 中 \`https://www.ankang.gov.cn/\` 和 \`.html\` 之间的字段。下面是一个例子。

  若订阅 [新闻资讯](https://www.ankang.gov.cn/Node-1466.html) 则将对应页面 URL \`https://www.ankang.gov.cn/Node-1466.html\` 中 \`https://www.ankang.gov.cn/\` 和 \`.html\` 之间的字段 \`Node-1466\` 作为路径填入。此时路由为 [\`/ankang/Node-1466\`](https://rsshub.app/ankang/Node-1466)
  :::`,
};

async function handler(ctx) {
    const { path = 'Node-1466' } = ctx.req.param();
    const link = `${baseUrl}/${path}.html`;
    const { data: response } = await got(link, {
        https: {
            rejectUnauthorized: false,
        },
    });
    const $ = load(response);

    const list = $('.newslist a')  // 假设新闻列表的链接在 class 为 'newslist' 的元素中
        .toArray()
        .map((item) => {
            item = $(item);
            return {
                title: item.attr('title'),
                link: `${baseUrl}${item.attr('href')}`,
                pubDate: parseDate(item.find('.date').text(), 'YYYY-MM-DD'),  // 假设日期在 class 为 'date' 的元素中
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: response } = await got(item.link, {
                    https: {
                        rejectUnauthorized: false,
                    },
                });
                const $ = load(response);
                item.description = $('.content').html();  // 假设文章内容在 class 为 'content' 的元素中
                item.author = $('.author')
                    .text()
                    .match(/作者：(.*)\s+来源/)[1];  // 假设作者信息在 class 为 'author' 的元素中
                return item;
            })
        )
    );

    return {
        title: $('head title').text(),
        link,
        image: 'https://www.ankang.gov.cn/favicon.ico',
        item: items,
    };
}
