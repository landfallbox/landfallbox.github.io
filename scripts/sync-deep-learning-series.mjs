import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './load-env.mjs';

loadDotEnv();

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, '..');
const sourceDir = getRequiredPathEnv('DL_NOTES_DIR');
const blogDir = path.join(repoRoot, 'src/content/blog');
const seriesFile = path.join(repoRoot, 'src/content/series/deep-learning-basics.md');
const imageDir = 'images';
const defaultSeries = {
	title: '深度学习简史',
	description: '回顾深度学习的部分发展历程',
};
const defaultTags = ['深度学习'];
const preservedSlugTerms = new Map([
	['GPT-4V', 'gpt-4v'],
	['OpenAI', 'openai'],
	['Word2Vec', 'word2vec'],
	['Seq2Seq', 'seq2seq'],
	['MoE', 'moe'],
	['CoT', 'cot'],
	['ViT', 'vit'],
]);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const dryRun = checkOnly || args.has('--dry-run');

if (args.has('--help')) {
	console.log('Usage: npm run sync:dl [-- --check|--dry-run]');
	process.exit(0);
}

if (!existsSync(sourceDir)) {
	throw new Error(`Source directory does not exist: ${sourceDir}`);
}

const changed = [];
const sourceNotes = await getSourceNotes(sourceDir);
const existingPosts = await getExistingPosts(blogDir);
const existingTags = getExistingTags(existingPosts);
const series = parseSeries(await readTextIfExists(seriesFile));
const syncedPosts = [];

if (sourceNotes.length === 0) {
	throw new Error(`No source notes found in ${sourceDir}`);
}

for (const sourceNote of sourceNotes) {
	const existingPost = existingPosts.get(sourceNote.number);
	const sourceMarkdown = await readFile(sourceNote.filePath, 'utf8');
	const sourceTitle = getFirstHeadingTitle(sourceMarkdown) || sourceNote.fallbackTitle;
	const slug = existingPost?.slug || createSlug(sourceNote.number, sourceTitle, sourceNote.fallbackTitle);
	const targetFile = existingPost?.filePath || path.join(blogDir, `${slug}.md`);
	const metadata = await buildPostMetadata(
		existingPost?.metadata,
		sourceMarkdown,
		sourceTitle,
		slug,
		existingTags,
	);
	const body = transformMarkdown(sourceMarkdown, metadata.title);

	syncedPosts.push(metadata);
	await writeIfChanged(targetFile, renderPost(metadata, body), changed);
}

await writeIfChanged(seriesFile, renderSeries(series, syncedPosts), changed);
await syncImages(path.join(sourceDir, imageDir), path.join(blogDir, imageDir), changed);

printResult(changed, sourceNotes.length);

if (checkOnly && changed.length > 0) {
	process.exitCode = 1;
}

function resolveFromRoot(value) {
	return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function getRequiredPathEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} must be set in .env or the process environment.`);
	}

	return resolveFromRoot(value);
}

async function getSourceNotes(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const notes = entries
		.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
		.map((entry) => parseSourceNote(dir, entry.name))
		.filter(Boolean);

	return notes.sort((left, right) => {
		const numberCompare = Number(left.number) - Number(right.number);
		return numberCompare || left.source.localeCompare(right.source, 'zh-CN');
	});
}

function parseSourceNote(dir, source) {
	const match = source.match(/^(\d+)[_-](.+)\.md$/i);
	if (!match) {
		return null;
	}

	return {
		number: match[1],
		source,
		filePath: path.join(dir, source),
		fallbackTitle: match[2].replace(/[_-]+/g, ' ').trim(),
	};
}

async function getExistingPosts(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const posts = new Map();

	for (const entry of entries) {
		if (!entry.isFile() || !/\.mdx?$/i.test(entry.name)) {
			continue;
		}

		const match = entry.name.match(/^(\d+)-(.+)\.(mdx?)$/i);
		if (!match) {
			continue;
		}

		const number = match[1];
		const filePath = path.join(dir, entry.name);
		const markdown = await readFile(filePath, 'utf8');

		if (posts.has(number)) {
			throw new Error(`Multiple target posts use number ${number}.`);
		}

		posts.set(number, {
			slug: entry.name.replace(/\.mdx?$/i, ''),
			filePath,
			metadata: parsePostMetadata(markdown),
		});
	}

	return posts;
}

async function buildPostMetadata(existing, sourceMarkdown, sourceTitle, slug, existingTags) {
	const title = existing?.title || sourceTitle;

	return {
		...existing,
		slug,
		title,
		description: existing?.description || (await generateDescription(sourceMarkdown, title, slug)),
		pubDate: existing?.pubDate || getLocalDateString(new Date()),
		updatedDate: existing?.updatedDate,
		tags: existing?.tags?.length ? existing.tags : await generateTags(sourceMarkdown, title, slug, existingTags),
	};
}

function getExistingTags(posts) {
	const tags = new Set(defaultTags);

	for (const post of posts.values()) {
		for (const tag of post.metadata.tags) {
			if (tag) {
				tags.add(tag);
			}
		}
	}

	return [...tags].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function parsePostMetadata(markdown) {
	const data = parseFrontmatter(markdown);

	return {
		...data,
		tags: Array.isArray(data.tags) ? data.tags : [],
	};
}

function parseSeries(markdown) {
	const data = parseFrontmatter(markdown || '');

	return {
		title: data.title || defaultSeries.title,
		description: data.description || defaultSeries.description,
	};
}

function parseFrontmatter(markdown) {
	const normalized = normalizeLineEndings(markdown).replace(/^\uFEFF/, '');
	const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
	if (!match) {
		return {};
	}

	const data = {};
	const lines = match[1].split('\n');

	for (let index = 0; index < lines.length; index += 1) {
		const field = lines[index].match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
		if (!field) {
			continue;
		}

		const key = field[1];
		const value = field[2] || '';

		if (value !== '') {
			data[key] = parseYamlScalar(value);
			continue;
		}

		const items = [];
		while (index + 1 < lines.length) {
			const item = lines[index + 1].match(/^\s+-\s+(.+)$/);
			if (!item) {
				break;
			}

			items.push(parseYamlScalar(item[1]));
			index += 1;
		}

		data[key] = items;
	}

	return data;
}

function parseYamlScalar(value) {
	const trimmed = value.trim();
	if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
		return trimmed.slice(1, -1).replaceAll("''", "'");
	}

	if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
		return trimmed.slice(1, -1).replaceAll('\\"', '"');
	}

	return trimmed;
}

function renderPost(post, body) {
	const frontmatter = renderFrontmatter(post, ['slug']);

	return `---\n${frontmatter}\n---\n\n${body.trimEnd()}\n`;
}

function renderSeries(series, posts) {
	const postList = posts.map((post) => `  - ${post.slug}`).join('\n');

	return `---\ntitle: ${quoteYamlString(series.title)}\ndescription: ${quoteYamlString(series.description)}\nposts:\n${postList}\n---\n`;
}

function quoteYamlString(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

function renderFrontmatter(data, omittedKeys = []) {
	const omitted = new Set(omittedKeys);
	const orderedKeys = [
		'title',
		'description',
		'pubDate',
		'updatedDate',
		'tags',
		...Object.keys(data).filter(
			(key) => !['title', 'description', 'pubDate', 'updatedDate', 'tags'].includes(key),
		),
	].filter((key, index, keys) => !omitted.has(key) && data[key] !== undefined && keys.indexOf(key) === index);

	return orderedKeys.map((key) => renderYamlField(key, data[key])).join('\n');
}

function renderYamlField(key, value) {
	if (Array.isArray(value)) {
		const items = value.map((item) => `  - ${renderYamlArrayItem(item)}`).join('\n');
		return `${key}:\n${items}`;
	}

	return `${key}: ${renderYamlScalar(value)}`;
}

function renderYamlArrayItem(value) {
	if (typeof value === 'string' && isPlainYamlScalar(value)) {
		return value;
	}

	return renderYamlScalar(value);
}

function renderYamlScalar(value) {
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (value === null) {
		return 'null';
	}

	return quoteYamlString(value);
}

function isPlainYamlScalar(value) {
	return (
		value.trim() === value &&
		value !== '' &&
		!/[\r\n#:[\]{},&*!|>'"%@`]/.test(value) &&
		!/^[-?]\s/.test(value) &&
		!/^(?:null|true|false|yes|no|on|off)$/i.test(value)
	);
}

function getFirstHeadingTitle(markdown) {
	const lines = stripFrontmatter(markdown).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
	const heading = lines.find((line) => /^#\s+/.test(line));

	return heading?.replace(/^#\s+/, '').replace(/\s*#*\s*$/, '').trim();
}

async function generateDescription(markdown, title, slug) {
	const command = process.env.DL_DESCRIPTION_COMMAND?.trim();
	if (!command) {
		throw new Error(
			`Missing description for ${slug}. Set DL_DESCRIPTION_COMMAND to a model command that reads JSON from stdin and writes one description line to stdout.`,
		);
	}

	const output = await runModelCommand(command, {
		title,
		slug,
		markdown: stripFrontmatter(markdown).trim(),
		instruction:
			'用简体中文总结这篇博客文章，输出一句适合作为 frontmatter description 的简介。不要复述原文首段，不要使用 Markdown，不要加引号，建议 40 到 90 个汉字。',
	});
	const description = normalizeModelDescription(output);

	if (!description) {
		throw new Error(`Model command returned an empty description for ${slug}.`);
	}

	return description;
}

async function generateTags(markdown, title, slug, existingTags) {
	const command = process.env.DL_TAGS_COMMAND?.trim();
	if (!command) {
		throw new Error(
			`Missing tags for ${slug}. Set DL_TAGS_COMMAND to a model command that reads JSON from stdin and writes a JSON string array to stdout.`,
		);
	}

	const output = await runModelCommand(command, {
		title,
		slug,
		markdown: stripFrontmatter(markdown).trim(),
		existingTags,
		instruction:
			'根据文章内容选择 frontmatter tags。优先从 existingTags 中选择；只有 existingTags 不足以表达主题时才新增标签。输出 JSON 字符串数组，不要输出 Markdown 或解释。',
	});
	const tags = normalizeModelTags(output);

	if (tags.length === 0) {
		throw new Error(`Model command returned no tags for ${slug}.`);
	}

	return tags;
}

function runModelCommand(command, payload) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, {
			cwd: repoRoot,
			shell: true,
			stdio: ['pipe', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk;
		});
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) {
				resolve(stdout);
				return;
			}

			reject(new Error(`Model command failed with exit code ${code}: ${stderr.trim()}`));
		});

		child.stdin.end(JSON.stringify(payload));
	});
}

function normalizeModelDescription(value) {
	return value
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.join(' ')
		.replace(/^['"]|['"]$/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeModelTags(value) {
	const trimmed = value.trim();
	let parsed;

	try {
		parsed = JSON.parse(trimmed);
	} catch {
		parsed = trimmed
			.replace(/^tags\s*:/i, '')
			.split(/[\n,，]/)
			.map((tag) => tag.replace(/^[-*]\s*/, '').trim())
			.filter(Boolean);
	}

	if (!Array.isArray(parsed)) {
		throw new Error('Tags model command must return a JSON string array.');
	}

	const tags = [];
	for (const tag of parsed) {
		if (typeof tag !== 'string') {
			continue;
		}

		const normalized = tag.trim();
		if (normalized && !tags.includes(normalized)) {
			tags.push(normalized);
		}
	}

	return tags;
}

function getLocalDateString(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function createSlug(number, title, fallbackTitle) {
	const suffix = slugify(title) || slugify(fallbackTitle) || 'post';
	return `${number}-${suffix}`;
}

function slugify(value) {
	return preserveSlugTerms(value)
		.normalize('NFKD')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^\x00-\x7F]/g, ' ')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function preserveSlugTerms(value) {
	let normalized = value;

	for (const [term, replacement] of preservedSlugTerms) {
		const pattern = new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(term)}(?=$|[^A-Za-z0-9])`, 'g');
		normalized = normalized.replace(pattern, `$1${replacement}`);
	}

	return normalized;
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function transformMarkdown(markdown, title) {
	const withoutFrontmatter = stripFrontmatter(markdown);
	const lines = withoutFrontmatter.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');

	while (lines[0] === '') {
		lines.shift();
	}

	const firstHeading = lines[0]?.match(/^#\s+(.+?)\s*#*\s*$/);
	if (firstHeading && normalizeHeading(firstHeading[1]) === normalizeHeading(title)) {
		lines.shift();
		while (lines[0] === '') {
			lines.shift();
		}
	}

	return trimTrailingWhitespaceOutsideFences(demoteHeadings(lines.join('\n')));
}

function stripFrontmatter(markdown) {
	return markdown.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function normalizeHeading(value) {
	return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function demoteHeadings(markdown) {
	const lines = markdown.split('\n');
	const result = [];
	let fenceMarker = null;
	let fenceLength = 0;

	for (const line of lines) {
		const fence = line.match(/^ {0,3}(`{3,}|~{3,})/);

		if (fence) {
			const marker = fence[1][0];
			const length = fence[1].length;

			if (!fenceMarker) {
				fenceMarker = marker;
				fenceLength = length;
			} else if (marker === fenceMarker && length >= fenceLength) {
				fenceMarker = null;
				fenceLength = 0;
			}

			result.push(line);
			continue;
		}

		if (!fenceMarker && /^(#{1,5})([ \t].*)$/.test(line)) {
			result.push(`#${line}`);
		} else {
			result.push(line);
		}
	}

	return result.join('\n');
}

function trimTrailingWhitespaceOutsideFences(markdown) {
	const lines = markdown.split('\n');
	let fenceMarker = null;
	let fenceLength = 0;

	return lines
		.map((line) => {
			const fence = line.match(/^ {0,3}(`{3,}|~{3,})/);

			if (fence) {
				const marker = fence[1][0];
				const length = fence[1].length;
				const trimmedLine = line.replace(/[ \t]+$/g, '');

				if (!fenceMarker) {
					fenceMarker = marker;
					fenceLength = length;
				} else if (marker === fenceMarker && length >= fenceLength) {
					fenceMarker = null;
					fenceLength = 0;
				}

				return trimmedLine;
			}

			return fenceMarker ? line : line.replace(/[ \t]+$/g, '');
		})
		.join('\n');
}

async function writeIfChanged(filePath, contents, changed) {
	const current = await readTextIfExists(filePath);
	if (current !== null && normalizeForCompare(current) === normalizeForCompare(contents)) {
		return;
	}

	changed.push(toRepoPath(filePath));

	if (!dryRun) {
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, formatForExistingFile(contents, current), 'utf8');
	}
}

function normalizeLineEndings(value) {
	return value.replace(/\r\n?/g, '\n');
}

function normalizeForCompare(value) {
	return normalizeLineEndings(value).trimEnd();
}

function formatForExistingFile(contents, current) {
	if (current?.includes('\r\n')) {
		return contents.replace(/\n/g, '\r\n');
	}

	return contents;
}

async function readTextIfExists(filePath) {
	try {
		return await readFile(filePath, 'utf8');
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

async function syncImages(sourceDir, targetDir, changed) {
	if (!existsSync(sourceDir)) {
		return;
	}

	const files = await listFiles(sourceDir);

	for (const sourceFile of files) {
		const relativePath = path.relative(sourceDir, sourceFile);
		const targetFile = path.join(targetDir, relativePath);
		const sourceBuffer = await readFile(sourceFile);
		const targetBuffer = await readBufferIfExists(targetFile);

		if (targetBuffer?.equals(sourceBuffer)) {
			continue;
		}

		changed.push(toRepoPath(targetFile));

		if (!dryRun) {
			await mkdir(path.dirname(targetFile), { recursive: true });
			await copyFile(sourceFile, targetFile);
		}
	}
}

async function listFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await listFiles(fullPath)));
		} else if (entry.isFile()) {
			files.push(fullPath);
		} else if ((await stat(fullPath)).isFile()) {
			files.push(fullPath);
		}
	}

	return files.sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

async function readBufferIfExists(filePath) {
	try {
		return await readFile(filePath);
	} catch (error) {
		if (error.code === 'ENOENT') {
			return null;
		}

		throw error;
	}
}

function toRepoPath(filePath) {
	return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function printResult(changed, scannedCount) {
	if (changed.length === 0) {
		console.log(`Deep learning series is already in sync. Scanned ${scannedCount} source note(s).`);
		return;
	}

	const action = dryRun ? 'Would update' : 'Updated';
	console.log(`${action} ${changed.length} file(s) from ${scannedCount} source note(s):`);
	for (const file of changed) {
		console.log(`- ${file}`);
	}
}
