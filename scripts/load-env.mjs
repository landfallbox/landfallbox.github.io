import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadedEnvKeys = [];

export function loadDotEnv(filePath = path.join(repoRoot, '.env')) {
	if (!existsSync(filePath)) {
		return;
	}

	const contents = readFileSync(filePath, 'utf8');
	for (const line of contents.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const parsed = parseEnvLine(line);
		if (!parsed) {
			continue;
		}

		loadedEnvKeys.push(parsed.key);
		if (process.env[parsed.key] !== undefined) {
			continue;
		}

		process.env[parsed.key] = parsed.value;
	}
}

export function getLoadedEnvKeys() {
	return [...loadedEnvKeys];
}

function parseEnvLine(line) {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) {
		return null;
	}

	const equalsIndex = trimmed.indexOf('=');
	if (equalsIndex === -1) {
		return null;
	}

	const key = trimmed.slice(0, equalsIndex).trim();
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
		return null;
	}

	return {
		key,
		value: parseEnvValue(trimmed.slice(equalsIndex + 1).trim()),
	};
}

function parseEnvValue(value) {
	if (value.startsWith("'") && value.endsWith("'")) {
		return value.slice(1, -1);
	}

	if (value.startsWith('"') && value.endsWith('"')) {
		return value
			.slice(1, -1)
			.replace(/\\n/g, '\n')
			.replace(/\\r/g, '\r')
			.replace(/\\t/g, '\t')
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, '\\');
	}

	return stripInlineComment(value).trim();
}

function stripInlineComment(value) {
	const commentIndex = value.search(/\s#/);
	return commentIndex === -1 ? value : value.slice(0, commentIndex);
}