import {
	createChatCompletion,
	limitMarkdown,
	optionalString,
	parseJsonOutput,
	readStdinJson,
	requireString,
	uniqueStrings,
	validateModelProviders,
} from './openai-compatible-client.mjs';

try {
	validateModelProviders();
	const payload = await readStdinJson();
	const title = requireString(payload.title, 'title');
	const slug = requireString(payload.slug, 'slug');
	const markdown = limitMarkdown(requireString(payload.markdown, 'markdown'));
	const existingTags = Array.isArray(payload.existingTags) ? uniqueStrings(payload.existingTags) : [];
	const instruction = optionalString(
		payload.instruction,
		'根据文章内容选择 frontmatter tags。优先从 existingTags 中选择；只有 existingTags 不足以表达主题时才新增标签。输出 JSON 字符串数组，不要输出 Markdown 或解释。',
	);
	const content = await createChatCompletion(
		[
			{
				role: 'system',
				content:
					'你是中文技术博客的信息架构助手。你只输出 JSON 字符串数组，例如 ["自然语言处理", "深度学习"]。不要输出 Markdown、解释或对象包装。',
			},
			{
				role: 'user',
				content: JSON.stringify(
					{
						title,
						slug,
						existingTags,
						instruction,
						markdown,
					},
					null,
					2,
				),
			},
		],
		{ maxTokens: 180 },
	);
	const parsed = parseJsonOutput(content);
	const tags = uniqueStrings(Array.isArray(parsed) ? parsed : parsed.tags);

	if (tags.length === 0) {
		throw new Error(`Model returned no tags for ${slug}.`);
	}

	console.log(JSON.stringify(tags));
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
