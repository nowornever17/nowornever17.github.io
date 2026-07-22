import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // 改成你的 GitHub 用户名
  site: 'https://modusensus.github.io',
  // 如果仓库名不是 username.github.io，需要设置 base
  // base: '/blog/',
  integrations: [mdx()],
});
