import {
	cleanPlainText,
	createChatCompletion,
	limitMarkdown,
	optionalString,
	readStdinJson,
	requireString,
	validateModelProviders,
} from './openai-compatible-client.mjs';

try {
	validateModelProviders();
	const payload = await readStdinJson();
	const title = requireString(payload.title, 'title');
	const slug = requireString(payload.slug, 'slug');
	const markdown = limitMarkdown(requireString(payload.markdown, 'markdown'));
	const instruction = optionalString(
		payload.instruction,
		'用简体中文总结这篇博客文章，输出一句适合作为 frontmatter description 的简介。不要复述原文首段，不要使用 Markdown，不要加引号，建议 40 到 90 个汉字。',
	);
	const content = await createChatCompletion(
		[
			{
				role: 'system',
				content:
					'你是中文技术博客编辑。你只输出最终 description，不输出推理过程、Markdown、引号或额外说明。',
			},
			{
				role: 'user',
				content: JSON.stringify(
					{
						title,
						slug,
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
	const description = cleanPlainText(content);

	if (!description) {
		throw new Error(`Model returned an empty description for ${slug}.`);
	}

	console.log(description);
} catch (error) {
	console.error(error.message);
	process.exitCode = 1;
}
