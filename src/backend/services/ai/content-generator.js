const { aiManager } = require('./ai-service');

class ContentGenerator {
  constructor(options = {}) {
    this.defaultTone = options.defaultTone || 'professional';
    this.defaultLength = options.defaultLength || 'medium';
    this.seoEnabled = options.seoEnabled !== false;
    this.templateCache = new Map();
  }

  async generate(options) {
    const {
      type = 'general',
      topic,
      keywords = [],
      tone,
      length,
      language = 'zh-CN',
      provider,
      ...customOptions
    } = options;

    if (!topic) {
      throw new Error('Topic is required for content generation');
    }

    const template = this.getTemplate(type);
    const prompt = template.buildPrompt({
      topic,
      keywords,
      tone: tone || this.defaultTone,
      length: length || this.defaultLength,
      language,
      ...customOptions
    });

    const systemPrompt = template.getSystemPrompt({
      language,
      tone: tone || this.defaultTone,
      ...customOptions
    });

    try {
      const response = await aiManager.call(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        { provider, userId: customOptions.userId }
      );

      const content = response.content;
      const result = {
        content,
        metadata: {
          type,
          topic,
          keywords,
          tone: tone || this.defaultTone,
          length: length || this.defaultLength,
          language,
          tokens: response.usage?.total_tokens || 0,
          model: response.model
        }
      };

      if (this.seoEnabled && (type === 'blog' || type === 'article')) {
        result.seo = this.optimizeSEO(content, keywords);
      }

      return result;
    } catch (error) {
      console.error('Content generation failed:', error);
      throw error;
    }
  }

  async generateBatch(items, options = {}) {
    const results = [];
    for (const item of items) {
      try {
        const result = await this.generate({
          ...item,
          ...options
        });
        results.push({
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          success: false,
          topic: item.topic,
          error: error.message
        });
      }
    }
    return results;
  }

  getTemplate(type) {
    const templates = {
      blog: new BlogTemplate(),
      product: new ProductDescriptionTemplate(),
      email: new EmailTemplate(),
      social: new SocialMediaTemplate(),
      article: new ArticleTemplate(),
      faq: new FAQTemplate(),
      landing: new LandingPageTemplate()
    };

    return templates[type] || new GeneralTemplate();
  }

  optimizeSEO(content, keywords) {
    const seo = {
      title: this.generateTitle(content, keywords),
      metaDescription: this.generateMetaDescription(content),
      headings: this.extractHeadings(content),
      keywordDensity: this.calculateKeywordDensity(content, keywords),
      readability: this.calculateReadability(content)
    };

    seo.suggestions = this.getSEOSuggestions(seo, keywords);

    return seo;
  }

  generateTitle(content, keywords) {
    const firstLine = content.split('\n')[0];
    const title = firstLine.replace(/^#+\s*/, '').trim();
    return title.length > 60 ? title.substring(0, 57) + '...' : title;
  }

  generateMetaDescription(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const meta = sentences[0]?.trim() || '';
    return meta.length > 160 ? meta.substring(0, 157) + '...' : meta;
  }

  extractHeadings(content) {
    const headings = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        headings.push({
          level: line.match(/^#+/)[0].length,
          text: line.replace(/^#+\s/, '').trim()
        });
      }
    }

    return headings;
  }

  calculateKeywordDensity(content, keywords) {
    if (!keywords || keywords.length === 0) {
      return {};
    }

    const contentLower = content.toLowerCase();
    const wordCount = contentLower.split(/\s+/).length;
    const density = {};

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const count = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      density[keyword] = {
        count,
        percentage: ((count / wordCount) * 100).toFixed(2)
      };
    }

    return density;
  }

  calculateReadability(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = content.split(/\s+/);
    const syllables = words.reduce((sum, word) => sum + this.estimateSyllables(word), 0);

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const score = Math.max(0, Math.min(100,
      206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));

    return {
      score: Math.round(score),
      level: this.getReadabilityLevel(score),
      avgWordsPerSentence: Math.round(avgWordsPerSentence),
      totalWords: words.length,
      totalSentences: sentences.length
    };
  }

  estimateSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  getReadabilityLevel(score) {
    if (score >= 90) return '非常容易';
    if (score >= 80) return '容易';
    if (score >= 70) return '较容易';
    if (score >= 60) return '标准';
    if (score >= 50) return '较难';
    if (score >= 30) return '困难';
    return '非常困难';
  }

  getSEOSuggestions(seo, keywords) {
    const suggestions = [];

    if (seo.readability.score < 60) {
      suggestions.push('建议使用更简单的句子结构以提高可读性');
    }

    const densities = Object.values(seo.keywordDensity);
    for (const { keyword, percentage } of densities) {
      const pct = parseFloat(percentage);
      if (pct < 1) {
        suggestions.push(`关键词 "${keyword}" 出现频率过低，建议增加使用次数`);
      } else if (pct > 3) {
        suggestions.push(`关键词 "${keyword}" 出现频率过高，可能被视为关键词堆砌`);
      }
    }

    if (seo.headings.length === 0) {
      suggestions.push('建议添加标题标签以改善内容结构');
    }

    if (seo.metaDescription.length < 120) {
      suggestions.push('建议将元描述扩展到至少120个字符');
    }

    return suggestions;
  }
}

class ContentTemplate {
  buildPrompt(options) {
    throw new Error('buildPrompt must be implemented');
  }

  getSystemPrompt(options) {
    return '你是一个专业的内容创作助手。';
  }
}

class GeneralTemplate extends ContentTemplate {
  buildPrompt({ topic, tone, length, language }) {
    const lengthGuide = this.getLengthGuide(length);
    return `请创作一篇关于"${topic}"的${lengthGuide}内容。
    
要求：
- 语气：${this.getToneDescription(tone)}
- 语言：${language}
- 确保内容结构清晰、逻辑连贯
- 提供有价值的信息和建议`;
  }

  getLengthGuide(length) {
    const guides = {
      short: '简短（200-400字）',
      medium: '中等（500-800字）',
      long: '详细（1000-1500字）',
      extended: '详尽（2000字以上）'
    };
    return guides[length] || guides.medium;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、正式',
      casual: '轻松、随意',
      friendly: '友好、亲切',
      authoritative: '权威、有说服力',
      humorous: '幽默、有趣'
    };
    return tones[tone] || tones.professional;
  }
}

class BlogTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone, length, language }) {
    const lengthGuide = this.getLengthGuide(length);
    return `请为博客创作一篇关于"${topic}"的文章。

要求：
- 标题：吸引人的SEO友好标题
- 开篇：引人入胜的引言
- 正文：${lengthGuide}，包含${keywords.length > 0 ? keywords.join('、') : '相关内容'}
- 结尾：总结和行动号召
- 语气：${this.getToneDescription(tone)}
- 语言：${language}

格式要求：
- 使用Markdown格式
- 包含适当的标题层级（H1, H2, H3）
- 包含项目符号列表提高可读性`;
  }

  getSystemPrompt({ language }) {
    return `你是一个专业的博客内容创作者。
- 擅长创作SEO友好的博客内容
- 精通${language === 'zh-CN' ? '中文' : language}写作
- 注重内容的实用性和可读性
- 善用故事性和情感共鸣`;
  }

  getLengthGuide(length) {
    const guides = {
      short: '600-800字',
      medium: '1000-1500字',
      long: '2000-2500字',
      extended: '3000字以上'
    };
    return guides[length] || guides.medium;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业但平易近人',
      casual: '轻松活泼，像朋友聊天',
      friendly: '温暖亲切，有代入感',
      authoritative: '专业权威，值得信赖',
      informative: '信息丰富，客观中立'
    };
    return tones[tone] || tones.friendly;
  }
}

class ProductDescriptionTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone, length }) {
    return `为产品"${topic}"创作一段产品描述。

要求：
- 突出产品核心卖点和价值
- ${keywords.length > 0 ? `包含关键词：${keywords.join(', ')}` : '自然融入相关关键词'}
- 语言简洁有力
- 语气：${this.getToneDescription(tone)}
- 长度：${length === 'short' ? '50-100字' : length === 'long' ? '200-400字' : '100-200字'}

格式：
- 产品名称
- 核心特点（3-5点）
- 适用场景
- 使用效果/收益`;
  }

  getSystemPrompt() {
    return `你是一个专业的电商产品文案专家。
- 擅长撰写高转化率的产品描述
- 了解消费者心理和购买决策因素
- 能够突出产品差异化卖点
- 注重语言的表现力和感染力`;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、可靠',
      persuasive: '有说服力、令人信服',
      enthusiastic: '热情洋溢、充满感染力',
      elegant: '优雅、高端',
      friendly: '亲切、接地气'
    };
    return tones[tone] || tones.friendly;
  }
}

class EmailTemplate extends ContentTemplate {
  buildPrompt({ topic, tone, length, ...customOptions }) {
    const emailType = customOptions.emailType || 'general';

    const templates = {
      welcome: `撰写一封欢迎邮件，介绍我们的服务"${topic}"。`,
      promotional: `撰写一封促销邮件，推广"${topic}"。`,
      newsletter: `撰写一期Newsletter，主题是"${topic}"。`,
      followup: `撰写一封跟进邮件，关于"${topic}"。`,
      notification: `撰写一封通知邮件，内容是"${topic}"。`,
      general: `撰写一封关于"${topic}"的邮件。`
    };

    return `${templates[emailType]}

要求：
- 主题行：吸引注意力，提高打开率
- 开场：友好的问候和引入
- 正文：清晰简洁，重点突出
- 结尾：明确的行动号召
- 语气：${this.getToneDescription(tone)}
- 签名：专业但亲切的落款

注意事项：
- 邮件长度要适中，便于移动端阅读
- 避免过度营销化语言
- 保持邮件的个人化感觉`;
  }

  getSystemPrompt({ emailType }) {
    const prompts = {
      welcome: '你是一个客户关系专家，擅长撰写温暖专业的欢迎邮件。',
      promotional: '你是一个营销文案专家，擅长创作高转化率的促销邮件。',
      newsletter: '你是一个内容编辑专家，擅长撰写信息丰富的Newsletter。',
      followup: '你是一个客服专家，擅长撰写礼貌而有效的跟进邮件。',
      notification: '你是一个企业沟通专家，擅长撰写清晰准确的通知邮件。',
      general: '你是一个专业的商业沟通专家。'
    };
    return prompts[emailType] || prompts.general;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、正式',
      friendly: '友好、亲切',
      urgent: '紧迫、行动导向',
      casual: '轻松、自然',
      persuasive: '有说服力'
    };
    return tones[tone] || tones.professional;
  }
}

class SocialMediaTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone, length }) {
    return `为社交媒体创作关于"${topic}"的内容。

平台：${keywords.includes('weibo') ? '微博' : ''} ${keywords.includes('twitter') ? 'Twitter' : ''} ${keywords.includes('linkedin') ? 'LinkedIn' : ''} ${keywords.includes('instagram') ? 'Instagram' : ''}

要求：
- 长度：${length === 'short' ? '50-100字（适合快速浏览）' : '150-300字（适合深度内容）'}
- 语气：${this.getToneDescription(tone)}
- 包含适当的标签/话题
- 加入吸引互动的元素（提问、投票、号召等）`;
  }

  getSystemPrompt() {
    return `你是一个社交媒体内容专家。
- 精通各平台的内容风格和用户习惯
- 擅长创作病毒式传播潜力内容
- 了解如何最大化用户互动
- 能够平衡品牌调性和平台特性`;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、有深度',
      casual: '轻松日常',
      witty: '机智幽默',
      inspirational: '励志鼓舞',
      informative: '知识分享',
      entertaining: '有趣有料'
    };
    return tones[tone] || tones.casual;
  }
}

class ArticleTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone, length, language }) {
    const lengthGuide = this.getLengthGuide(length);
    return `撰写一篇深度文章，主题："${topic}"。

要求：
- 类型：深度分析/教程/指南/评论（根据主题选择最合适的）
- 长度：${lengthGuide}
- 结构：
  * 引言：引入话题，说明文章价值
  * 主体：${lengthGuide}，分为3-5个主要部分
  * 结论：总结要点，提供行动建议
- 关键词：${keywords.length > 0 ? keywords.join('、') : '根据主题自然融入'}
- 语气：${this.getToneDescription(tone)}
- 语言：${language}

格式：使用Markdown，包含适当的标题和列表`;
  }

  getSystemPrompt({ language }) {
    return `你是一个专业的深度内容创作者。
- 擅长创作有深度、有见地的文章
- 能够进行全面的分析和独到的见解
- 文章结构清晰，逻辑严谨
- 精通${language === 'zh-CN' ? '中文' : language}写作`;
  }

  getLengthGuide(length) {
    const guides = {
      short: '1500-2000字',
      medium: '2500-3500字',
      long: '4000-5000字',
      extended: '6000字以上'
    };
    return guides[length] || guides.medium;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、严谨',
      analytical: '分析性强、逻辑清晰',
      balanced: '客观中立',
      critical: '批判性思维',
      educational: '教育性、循序渐进'
    };
    return tones[tone] || tones.professional;
  }
}

class FAQTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone }) {
    return `为"${topic}"创建FAQ（常见问题解答）。

要求：
- 生成5-10个最常见的问题
- 每个问题包含清晰的答案
- 涵盖用户最关心的方面
- 语气：${this.getToneDescription(tone)}
- ${keywords.length > 0 ? `包含关键词：${keywords.join(', ')}` : '自然融入相关关键词'}

格式：
Q1: [问题]
A1: [详细答案]

Q2: [问题]
A2: [详细答案]`;
  }

  getSystemPrompt() {
    return `你是一个客户支持专家。
- 擅长预测和解答用户常见问题
- 回答清晰、准确、易懂
- 能够在有限篇幅内提供最大价值
- 善于使用简单语言解释复杂概念`;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、可靠',
      friendly: '友好、耐心',
      concise: '简洁、直接',
      supportive: '支持性、鼓励性'
    };
    return tones[tone] || tones.friendly;
  }
}

class LandingPageTemplate extends ContentTemplate {
  buildPrompt({ topic, keywords, tone, length }) {
    return `为"${topic}"创建着陆页内容。

要求：
- Hero区域：吸引眼球的标题和副标题
- 价值主张：清晰说明产品/服务优势
- 功能特点：3-6个核心卖点
- 社会证明：客户评价、案例、数据
- 行动号召：明确的CTA按钮文案
- 语气：${this.getToneDescription(tone)}
- 长度：${length === 'short' ? '简洁版（适合快速扫描）' : '详细版（适合深度阅读）'}

包含${keywords.length > 0 ? `关键词：${keywords.join(', ')}` : '相关关键词'}`;
  }

  getSystemPrompt() {
    return `你是一个着陆页文案专家。
- 擅长创作高转化率的着陆页内容
- 深谙用户决策心理
- 能够用简洁有力的语言传达价值
- 了解如何设计有效的行动号召`;
  }

  getToneDescription(tone) {
    const tones = {
      professional: '专业、可信赖',
      persuasive: '有说服力',
      urgent: '紧迫感、限时',
      elegant: '高端、品质',
      friendly: '亲切、易接近'
    };
    return tones[tone] || tones.persuasive;
  }
}

const contentGenerator = new ContentGenerator();

module.exports = {
  ContentGenerator,
  contentGenerator,
  ContentTemplate,
  BlogTemplate,
  ProductDescriptionTemplate,
  EmailTemplate,
  SocialMediaTemplate,
  ArticleTemplate,
  FAQTemplate,
  LandingPageTemplate
};
